import {
  AIRouter,
  AllProvidersFailedError,
  ProviderError,
  extractJson,
  type Provider,
  type ProviderId,
  type TextRequest,
} from '../supabase/functions/_shared/router.ts';

const req: TextRequest = { system: 'sys', messages: [{ role: 'user', content: 'hi' }] };

function textProvider(
  id: ProviderId,
  reply: string | Error | (() => Promise<string>),
  configured = true,
): Provider & { calls: number; tiers: string[] } {
  const p = {
    id,
    configured,
    calls: 0,
    tiers: [] as string[],
    async complete(_req: TextRequest, tier: string) {
      p.calls++;
      p.tiers.push(tier);
      if (reply instanceof Error) throw reply;
      const text = typeof reply === 'function' ? await reply() : reply;
      return { text, model: `${id}-model` };
    },
  };
  return p;
}

describe('AIRouter chain selection', () => {
  it('uses Claude first for chat on Pro and Kimi first for organize', () => {
    const router = new AIRouter([
      textProvider('anthropic', 'a'),
      textProvider('kimi', 'k'),
      textProvider('openai', 'o'),
    ]);
    expect(router.chain('chat', { plan: 'pro' }).map((p) => p.id)).toEqual(['anthropic', 'kimi', 'openai']);
    expect(router.chain('organize', { plan: 'pro' }).map((p) => p.id)).toEqual(['kimi', 'anthropic', 'openai']);
  });

  it('excludes Claude on the free plan', () => {
    const router = new AIRouter([textProvider('anthropic', 'a'), textProvider('kimi', 'k'), textProvider('openai', 'o')]);
    expect(router.chain('chat', { plan: 'free' }).map((p) => p.id)).toEqual(['kimi', 'openai']);
  });

  it('honours a preferred provider for Pro only', () => {
    const router = new AIRouter([textProvider('anthropic', 'a'), textProvider('kimi', 'k'), textProvider('openai', 'o')]);
    expect(router.chain('chat', { plan: 'pro', preferred: 'openai' }).map((p) => p.id)).toEqual([
      'openai',
      'anthropic',
      'kimi',
    ]);
    expect(router.chain('chat', { plan: 'free', preferred: 'anthropic' }).map((p) => p.id)).toEqual(['kimi', 'openai']);
  });

  it('skips providers without an API key', () => {
    const router = new AIRouter([textProvider('anthropic', 'a', false), textProvider('kimi', 'k')]);
    expect(router.chain('chat', { plan: 'pro' }).map((p) => p.id)).toEqual(['kimi']);
  });

  it('never falls back to another provider for embeddings', () => {
    const openai: Provider = { id: 'openai', configured: false, embed: async () => [[1]] };
    const kimi: Provider = { id: 'kimi', configured: true, embed: async () => [[2]] };
    const router = new AIRouter([openai, kimi]);
    expect(router.chain('embed', { plan: 'pro' })).toEqual([]);
  });
});

describe('AIRouter fallback', () => {
  it('falls back to the next provider when one fails', async () => {
    const claude = textProvider('anthropic', new ProviderError('anthropic', 'overloaded', 529));
    const kimi = textProvider('kimi', 'from kimi');
    const router = new AIRouter([claude, kimi]);

    const result = await router.completeText('chat', req, { plan: 'pro' });

    expect(result.value.text).toBe('from kimi');
    expect(result.provider).toBe('kimi');
    expect(result.attempts.map((a) => [a.provider, a.ok])).toEqual([
      ['anthropic', false],
      ['kimi', true],
    ]);
  });

  it('times out a hanging provider and moves on', async () => {
    const hanging = textProvider('kimi', () => new Promise<string>(() => undefined));
    const openai = textProvider('openai', 'ok');
    const router = new AIRouter([hanging, openai], { timeoutMs: 20 });

    const result = await router.completeText('organize', req, { plan: 'free' });

    expect(result.provider).toBe('openai');
    expect(result.attempts[0].error).toMatch(/timed out/);
  });

  it('throws AllProvidersFailedError with every attempt when all fail', async () => {
    const router = new AIRouter([textProvider('kimi', new Error('boom')), textProvider('openai', new Error('down'))]);
    await expect(router.completeText('organize', req, { plan: 'free' })).rejects.toMatchObject({
      name: 'AllProvidersFailedError',
      attempts: [
        expect.objectContaining({ provider: 'kimi', ok: false }),
        expect.objectContaining({ provider: 'openai', ok: false }),
      ],
    });
  });

  it('reports a clear error when no provider is configured', async () => {
    const router = new AIRouter([]);
    const error = await router.completeText('chat', req, { plan: 'pro' }).catch((e) => e);
    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect(error.message).toMatch(/No configured provider/);
  });

  it('passes the fast tier to free users and quality tier to Pro', async () => {
    const kimi = textProvider('kimi', 'x');
    const router = new AIRouter([kimi]);
    await router.completeText('organize', req, { plan: 'free' });
    await router.completeText('organize', req, { plan: 'pro' });
    expect(kimi.tiers).toEqual(['fast', 'quality']);
  });
});

describe('AIRouter structured output', () => {
  const validate = (v: unknown) => {
    const value = v as { title?: unknown };
    if (typeof value.title !== 'string') throw new Error('title missing');
    return { title: value.title };
  };

  it('parses JSON, including fenced JSON', async () => {
    const router = new AIRouter([textProvider('kimi', '```json\n{"title":"Groceries"}\n```')]);
    const result = await router.completeJson('organize', req, { plan: 'free' }, validate);
    expect(result.value).toEqual({ title: 'Groceries' });
  });

  it('treats invalid or wrong-shaped JSON as a failure and falls back', async () => {
    const bad = textProvider('kimi', 'not json at all');
    const wrong = textProvider('anthropic', '{"name":"x"}');
    const good = textProvider('openai', '{"title":"Fixed"}');
    const router = new AIRouter([bad, wrong, good]);

    const result = await router.completeJson('organize', req, { plan: 'pro' }, validate);

    expect(result.value.title).toBe('Fixed');
    expect(result.attempts.map((a) => a.error ?? 'ok')).toEqual([
      'kimi: returned invalid JSON',
      'anthropic: returned unexpected JSON (title missing)',
      'ok',
    ]);
  });

  it('extractJson trims prose around an object', () => {
    expect(extractJson('Sure! {"a":1} hope that helps')).toBe('{"a":1}');
  });
});
