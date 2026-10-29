// Chat with your notes. The app retrieves and decrypts the relevant notes on
// device and sends excerpts as numbered sources; the answer cites them.

import { HttpError, consumeQuota, readJson, requireString, serve } from '../_shared/http.ts';
import { createRouter } from '../_shared/providers.ts';
import type { ChatTurn } from '../_shared/router.ts';
import { chatRequest, validateChat, type ChatSource } from '../_shared/tasks.ts';

interface Body {
  question: string;
  history?: ChatTurn[];
  sources?: ChatSource[];
}

const router = createRouter();

serve(async (req, ctx) => {
  const body = await readJson<Body>(req, 400_000);
  const question = requireString(body.question, 'question', 4_000);
  const history = (body.history ?? [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .map((t) => ({ role: t.role, content: t.content.slice(0, 4_000) }));
  if (history.length && history[0].role !== 'user') throw new HttpError(400, 'history must start with user', 'bad_request');
  const sources = (body.sources ?? []).slice(0, 12).map((s, i) => ({
    n: i + 1,
    id: String(s.id),
    title: String(s.title ?? '').slice(0, 200),
    date: String(s.date ?? '').slice(0, 40),
    excerpt: String(s.excerpt ?? '').slice(0, 2_500),
  }));
  await consumeQuota(ctx, 'chat');

  const result = await router.completeJson(
    'chat',
    chatRequest(question, history, sources),
    { plan: ctx.plan, preferred: ctx.preferred },
    (v) => validateChat(v, sources.length),
  );
  return {
    ...result.value,
    citations: result.value.citations.map((n) => ({ n, id: sources[n - 1].id })),
    provider: result.provider,
  };
});
