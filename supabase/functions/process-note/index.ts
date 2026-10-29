// Auto-organize a note on save: title, summary, tags, action items, mood,
// language and (for voice) a cleaned transcript; then embed it and return the
// most related notes for auto-linking. Plaintext is processed in memory only.

import { HttpError, consumeQuota, readJson, requireString, serve } from '../_shared/http.ts';
import { deleteVectors, queryVectors, upsertVector } from '../_shared/pinecone.ts';
import { createRouter } from '../_shared/providers.ts';
import { organizeRequest, validateOrganize } from '../_shared/tasks.ts';

const MAX_NOTE_CHARS = 24_000;
const EMBED_CHARS = 6_000;
const RELATED_MIN_SCORE = 0.45;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Body {
  op?: 'upsert' | 'delete';
  noteId: string;
  kind?: string;
  title?: string;
  text?: string;
  sourceUrl?: string;
  existingTags?: string[];
}

const router = createRouter();

serve(async (req, ctx) => {
  const body = await readJson<Body>(req);
  if (!UUID.test(body.noteId ?? '')) throw new HttpError(400, 'noteId must be a UUID', 'bad_request');

  if (body.op === 'delete') {
    await deleteVectors(ctx.userId, [body.noteId]);
    return { deleted: true };
  }

  const text = requireString(body.text, 'text', 200_000);
  await consumeQuota(ctx, 'organize');

  const kind = ['text', 'voice', 'clip', 'daily', 'digest'].includes(body.kind ?? '') ? body.kind! : 'text';
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\//i.test(body.sourceUrl) ? body.sourceUrl : undefined;
  const pageText = kind === 'clip' && sourceUrl && text.length < 2_000 ? await fetchReadableText(sourceUrl) : undefined;
  const truncated = text.length > MAX_NOTE_CHARS;

  const route = { plan: ctx.plan, preferred: ctx.preferred };
  const organized = await router.completeJson(
    'organize',
    organizeRequest({
      kind,
      text: text.slice(0, MAX_NOTE_CHARS),
      userTitle: body.title?.trim() || undefined,
      sourceUrl,
      pageText,
      existingTags: (body.existingTags ?? []).filter((t) => typeof t === 'string').slice(0, 200),
      truncated,
    }),
    route,
    validateOrganize,
  );
  const result = organized.value;

  const embedText = [result.title, result.summary, result.cleanedText || text, pageText ?? '']
    .join('\n')
    .slice(0, EMBED_CHARS);
  const { value: [vector] } = await router.embed([embedText], route);
  const matches = await queryVectors(ctx.userId, vector, 8);
  await upsertVector(ctx.userId, body.noteId, vector);

  return {
    ...result,
    related: matches.filter((m) => m.id !== body.noteId && m.score >= RELATED_MIN_SCORE).slice(0, 5),
    provider: organized.provider,
    truncated,
  };
});

/** Fetch a shared web page and reduce it to readable text (best effort). */
async function fetchReadableText(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
      headers: { 'User-Agent': 'MemoryMeshClipper/1.0', Accept: 'text/html,text/plain' },
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/text\/(html|plain)/.test(type)) return undefined;
    const raw = (await res.text()).slice(0, 1_500_000);
    if (type.includes('text/plain')) return raw.slice(0, 12_000);
    const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
    const description =
      raw.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? '';
    const bodyText = raw
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    return [title, description, bodyText].filter(Boolean).join('\n').slice(0, 12_000);
  } catch {
    return undefined;
  }
}
