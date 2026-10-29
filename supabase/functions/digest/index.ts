// Weekly AI digest from the summaries of a week's AI-enabled notes.

import { HttpError, consumeQuota, readJson, requireString, serve } from '../_shared/http.ts';
import { createRouter } from '../_shared/providers.ts';
import { digestRequest, validateDigest, type DigestNote } from '../_shared/tasks.ts';

interface Body {
  periodLabel: string;
  locale?: string;
  notes: DigestNote[];
}

const router = createRouter();

serve(async (req, ctx) => {
  const body = await readJson<Body>(req, 400_000);
  const periodLabel = requireString(body.periodLabel, 'periodLabel', 100);
  if (!Array.isArray(body.notes) || !body.notes.length) throw new HttpError(400, 'notes are required', 'bad_request');
  const notes = body.notes.slice(0, 150).map((n) => ({
    title: String(n.title ?? '').slice(0, 200),
    date: String(n.date ?? '').slice(0, 40),
    summary: String(n.summary ?? '').slice(0, 1_000),
    tags: Array.isArray(n.tags) ? n.tags.slice(0, 5).map((t) => String(t).slice(0, 40)) : [],
    mood: n.mood ? String(n.mood).slice(0, 20) : null,
  }));
  await consumeQuota(ctx, 'digest');

  const result = await router.completeJson(
    'digest',
    digestRequest(periodLabel, notes, String(body.locale ?? 'en').slice(0, 20)),
    { plan: ctx.plan, preferred: ctx.preferred },
    validateDigest,
  );
  return { ...result.value, provider: result.provider };
});
