// Semantic lookup by meaning. Used by Search, Chat retrieval and the editor
// Copilot. Returns note ids and scores only; the app resolves them locally.

import { HttpError, consumeQuota, readJson, requireString, serve } from '../_shared/http.ts';
import { queryVectors } from '../_shared/pinecone.ts';
import { createRouter } from '../_shared/providers.ts';

interface Body {
  text: string;
  topK?: number;
  minScore?: number;
  excludeId?: string;
}

const router = createRouter();

serve(async (req, ctx) => {
  const body = await readJson<Body>(req);
  const text = requireString(body.text, 'text', 20_000).slice(0, 6_000);
  const topK = Math.min(Math.max(Math.trunc(body.topK ?? 20), 1), 50);
  const minScore = Math.min(Math.max(body.minScore ?? 0.25, 0), 1);
  if (body.excludeId !== undefined && typeof body.excludeId !== 'string') {
    throw new HttpError(400, 'excludeId must be a string', 'bad_request');
  }
  await consumeQuota(ctx, 'search');

  const { value: [vector] } = await router.embed([text], { plan: ctx.plan, preferred: ctx.preferred });
  const matches = await queryVectors(ctx.userId, vector, topK + 1);
  return {
    matches: matches.filter((m) => m.id !== body.excludeId && m.score >= minScore).slice(0, topK),
  };
});
