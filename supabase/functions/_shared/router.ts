/**
 * Provider-agnostic AI router with automatic fallback.
 *
 * Pure TypeScript with no Deno or Node globals: the Edge Functions import it,
 * and the app's Jest suite tests it directly.
 */

export type ProviderId = 'anthropic' | 'kimi' | 'openai';
export type Plan = 'free' | 'pro';
export type Tier = 'fast' | 'quality';

export type TextTask = 'chat' | 'organize' | 'digest';
export type Task = TextTask | 'embed' | 'transcribe';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface JsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface TextRequest {
  system: string;
  messages: ChatTurn[];
  json?: JsonSchema;
  maxTokens?: number;
}

export interface TextCompletion {
  text: string;
  model: string;
}

export interface Transcription {
  text: string;
  language?: string;
}

export interface Provider {
  id: ProviderId;
  /** False when the provider's API key is not set; the router skips it. */
  configured: boolean;
  complete?(req: TextRequest, tier: Tier, signal: AbortSignal): Promise<TextCompletion>;
  embed?(texts: string[], signal: AbortSignal): Promise<number[][]>;
  transcribe?(audio: Blob, filename: string, signal: AbortSignal): Promise<Transcription>;
}

export class ProviderError extends Error {
  constructor(
    readonly provider: ProviderId,
    message: string,
    readonly status?: number,
  ) {
    super(`${provider}: ${message}`);
    this.name = 'ProviderError';
  }
}

export interface Attempt {
  provider: ProviderId;
  ok: boolean;
  error?: string;
  ms: number;
}

export class AllProvidersFailedError extends Error {
  constructor(
    readonly task: Task,
    readonly attempts: Attempt[],
  ) {
    super(
      attempts.length
        ? `All providers failed for ${task}: ${attempts.map((a) => a.error).join('; ')}`
        : `No configured provider can handle ${task}`,
    );
    this.name = 'AllProvidersFailedError';
  }
}

/**
 * Default preference order per task:
 * - Claude for conversational / long-context work (chat, weekly digest)
 * - Kimi for fast, multilingual structuring (titles, tags, transcript cleanup)
 * - OpenAI for Whisper and embeddings
 *
 * Embeddings and transcription do not fall back across providers on purpose:
 * vectors from different embedding models are not comparable in one index.
 */
export const ROUTES: Record<Task, ProviderId[]> = {
  chat: ['anthropic', 'kimi', 'openai'],
  digest: ['anthropic', 'kimi', 'openai'],
  organize: ['kimi', 'anthropic', 'openai'],
  embed: ['openai'],
  transcribe: ['openai'],
};

/** Free plan gets "basic AI": fast models, and Claude is reserved for Pro. */
export const FREE_PLAN_EXCLUDED: ProviderId[] = ['anthropic'];

export interface RouteContext {
  plan: Plan;
  /** Pro users may pin a preferred provider; it moves to the front of the chain. */
  preferred?: ProviderId | null;
}

export interface RouterOptions {
  timeoutMs?: number;
  now?: () => number;
}

export interface Routed<T> {
  value: T;
  provider: ProviderId;
  attempts: Attempt[];
}

export class AIRouter {
  private readonly byId: Map<ProviderId, Provider>;
  private readonly timeoutMs: number;
  private readonly now: () => number;

  constructor(providers: Provider[], options: RouterOptions = {}) {
    this.byId = new Map(providers.map((p) => [p.id, p]));
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.now = options.now ?? Date.now;
  }

  chain(task: Task, ctx: RouteContext): Provider[] {
    let order = [...ROUTES[task]];
    if (ctx.plan === 'free' && task !== 'embed' && task !== 'transcribe') {
      order = order.filter((id) => !FREE_PLAN_EXCLUDED.includes(id));
    }
    if (ctx.plan === 'pro' && ctx.preferred && order.includes(ctx.preferred)) {
      order = [ctx.preferred, ...order.filter((id) => id !== ctx.preferred)];
    }
    const capability = task === 'embed' ? 'embed' : task === 'transcribe' ? 'transcribe' : 'complete';
    return order
      .map((id) => this.byId.get(id))
      .filter((p): p is Provider => !!p && p.configured && typeof p[capability] === 'function');
  }

  tierFor(ctx: RouteContext): Tier {
    return ctx.plan === 'pro' ? 'quality' : 'fast';
  }

  async completeText(task: TextTask, req: TextRequest, ctx: RouteContext): Promise<Routed<TextCompletion>> {
    const tier = this.tierFor(ctx);
    return this.run(task, ctx, (p, signal) => p.complete!(req, tier, signal));
  }

  /**
   * Structured completion. Invalid JSON, or output that fails `validate`,
   * counts as a provider failure and triggers fallback to the next provider.
   */
  async completeJson<T>(
    task: TextTask,
    req: TextRequest,
    ctx: RouteContext,
    validate: (value: unknown) => T,
  ): Promise<Routed<T>> {
    const tier = this.tierFor(ctx);
    return this.run(task, ctx, async (p, signal) => {
      const { text } = await p.complete!(req, tier, signal);
      let parsed: unknown;
      try {
        parsed = JSON.parse(extractJson(text));
      } catch {
        throw new ProviderError(p.id, 'returned invalid JSON');
      }
      try {
        return validate(parsed);
      } catch (error) {
        throw new ProviderError(p.id, `returned unexpected JSON (${errorMessage(error)})`);
      }
    });
  }

  async embed(texts: string[], ctx: RouteContext): Promise<Routed<number[][]>> {
    return this.run('embed', ctx, (p, signal) => p.embed!(texts, signal));
  }

  async transcribe(audio: Blob, filename: string, ctx: RouteContext): Promise<Routed<Transcription>> {
    return this.run('transcribe', ctx, (p, signal) => p.transcribe!(audio, filename, signal));
  }

  private async run<T>(
    task: Task,
    ctx: RouteContext,
    call: (provider: Provider, signal: AbortSignal) => Promise<T>,
  ): Promise<Routed<T>> {
    const attempts: Attempt[] = [];
    for (const provider of this.chain(task, ctx)) {
      const started = this.now();
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new ProviderError(provider.id, `timed out after ${this.timeoutMs}ms`));
          }, this.timeoutMs);
        });
        const value = await Promise.race([call(provider, controller.signal), timeout]);
        attempts.push({ provider: provider.id, ok: true, ms: this.now() - started });
        return { value, provider: provider.id, attempts };
      } catch (error) {
        attempts.push({ provider: provider.id, ok: false, error: errorMessage(error), ms: this.now() - started });
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    throw new AllProvidersFailedError(task, attempts);
  }
}

/** Accept bare JSON or JSON wrapped in a markdown code fence. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text.trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
