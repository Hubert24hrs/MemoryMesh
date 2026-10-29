// Whisper transcription of a voice capture (multipart field `file`).
// Audio is forwarded to the provider and not stored.

import { HttpError, consumeQuota, serve } from '../_shared/http.ts';
import { createRouter } from '../_shared/providers.ts';

const MAX_BYTES = 24 * 1024 * 1024; // provider limit is 25 MB

const router = createRouter();

serve(async (req, ctx) => {
  const form = await req.formData().catch(() => {
    throw new HttpError(400, 'Expected multipart form data', 'bad_request');
  });
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'file is required', 'bad_request');
  if (file.size > MAX_BYTES) throw new HttpError(413, 'Recording is too long', 'too_large');
  await consumeQuota(ctx, 'transcribe');

  const { value, provider } = await router.transcribe(file, file.name || 'audio.m4a', {
    plan: ctx.plan,
    preferred: ctx.preferred,
  });
  return { ...value, provider };
});
