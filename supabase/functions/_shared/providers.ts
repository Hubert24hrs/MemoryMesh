import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';

import { AIRouter, ProviderError, type Provider, type ProviderId, type TextRequest, type Tier } from './router.ts';

/** Claude: conversational answers over notes and long-context digests. */
function anthropicProvider(): Provider {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const model = Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5';
  const client = apiKey ? new Anthropic({ apiKey, maxRetries: 1 }) : null;

  return {
    id: 'anthropic',
    configured: !!client,
    async complete(req: TextRequest, tier: Tier, signal: AbortSignal) {
      try {
        const response = await client!.beta.messages.create(
          {
            model,
            max_tokens: req.maxTokens ?? 16000,
            // On a policy decline, re-run server-side on Anthropic's recommended fallback model.
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: {
              effort: tier === 'quality' ? 'medium' : 'low',
              ...(req.json ? { format: { type: 'json_schema' as const, schema: req.json.schema } } : {}),
            },
            system: req.system,
            messages: req.messages,
          },
          { signal },
        );
        if (response.stop_reason === 'refusal') throw new ProviderError('anthropic', 'declined the request');
        if (response.stop_reason === 'max_tokens') throw new ProviderError('anthropic', 'response was cut off');
        const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
        return { text, model: response.model };
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        if (error instanceof Anthropic.APIError) {
          throw new ProviderError('anthropic', `API error ${error.status ?? ''}`.trim(), error.status);
        }
        throw new ProviderError('anthropic', error instanceof Error ? error.message : String(error));
      }
    },
  };
}

interface OpenAICompatOptions {
  id: ProviderId;
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  /** Kimi supports json_object only; OpenAI supports strict json_schema. */
  strictJsonSchema: boolean;
}

/** Kimi (Moonshot) and OpenAI share the chat-completions wire format. */
function openAICompatChat(opts: OpenAICompatOptions): Provider['complete'] {
  return async (req, _tier, signal) => {
    const system = req.json && !opts.strictJsonSchema
      ? `${req.system}\n\nRespond with a single JSON object matching this JSON Schema:\n${JSON.stringify(req.json.schema)}`
      : req.system;
    const res = await fetch(`${opts.baseUrl}/chat/completions`, {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        messages: [{ role: 'system', content: system }, ...req.messages],
        max_completion_tokens: req.maxTokens ?? 4096,
        ...(req.json
          ? {
              response_format: opts.strictJsonSchema
                ? { type: 'json_schema', json_schema: { name: req.json.name, schema: req.json.schema, strict: true } }
                : { type: 'json_object' },
            }
          : {}),
      }),
    });
    if (!res.ok) throw new ProviderError(opts.id, `HTTP ${res.status}`, res.status);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new ProviderError(opts.id, 'empty response');
    return { text, model: String(data.model ?? opts.model) };
  };
}

function kimiProvider(): Provider {
  const apiKey = Deno.env.get('KIMI_API_KEY');
  return {
    id: 'kimi',
    configured: !!apiKey,
    complete: openAICompatChat({
      id: 'kimi',
      apiKey,
      baseUrl: Deno.env.get('KIMI_BASE_URL') ?? 'https://api.moonshot.ai/v1',
      model: Deno.env.get('KIMI_MODEL') ?? 'kimi-k2-turbo-preview',
      strictJsonSchema: false,
    }),
  };
}

const OPENAI_BASE = 'https://api.openai.com/v1';

function openAIProvider(): Provider {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const headers = { Authorization: `Bearer ${apiKey}` };
  return {
    id: 'openai',
    configured: !!apiKey,
    complete: openAICompatChat({
      id: 'openai',
      apiKey,
      baseUrl: OPENAI_BASE,
      model: Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-5-mini',
      strictJsonSchema: true,
    }),
    async embed(texts, signal) {
      const res = await fetch(`${OPENAI_BASE}/embeddings`, {
        method: 'POST',
        signal,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: Deno.env.get('OPENAI_EMBED_MODEL') ?? 'text-embedding-3-small', input: texts }),
      });
      if (!res.ok) throw new ProviderError('openai', `embeddings HTTP ${res.status}`, res.status);
      const data = await res.json();
      return (data.data as { embedding: number[]; index: number }[])
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    },
    async transcribe(audio, filename, signal) {
      const form = new FormData();
      form.append('file', audio, filename);
      form.append('model', Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'whisper-1');
      form.append('response_format', 'verbose_json');
      const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, { method: 'POST', signal, headers, body: form });
      if (!res.ok) throw new ProviderError('openai', `transcription HTTP ${res.status}`, res.status);
      const data = await res.json();
      return { text: String(data.text ?? ''), language: data.language ? String(data.language) : undefined };
    },
  };
}

export function createRouter(): AIRouter {
  return new AIRouter([anthropicProvider(), kimiProvider(), openAIProvider()], { timeoutMs: 45_000 });
}
