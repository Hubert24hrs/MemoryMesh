import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import { AllProvidersFailedError, type Plan, type ProviderId } from './router.ts';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'error',
  ) {
    super(message);
  }
}

export type QuotaBucket = 'organize' | 'search' | 'chat' | 'transcribe' | 'digest';

/** Daily AI quotas per plan. */
export const DAILY_LIMITS: Record<Plan, Record<QuotaBucket, number>> = {
  free: { organize: 60, search: 200, chat: 15, transcribe: 10, digest: 2 },
  pro: { organize: 1000, search: 2000, chat: 300, transcribe: 200, digest: 20 },
};

export interface RequestContext {
  userId: string;
  plan: Plan;
  preferred: ProviderId | null;
  admin: SupabaseClient;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticate(req: Request): Promise<RequestContext> {
  const header = req.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Sign in required', 'unauthenticated');
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(header.slice(7));
  if (error || !data.user) throw new HttpError(401, 'Invalid session', 'unauthenticated');

  const userId = data.user.id;
  const [{ data: plan }, { data: profile }] = await Promise.all([
    admin.rpc('effective_plan', { p_user: userId }),
    admin.from('profiles').select('preferred_provider').eq('id', userId).maybeSingle(),
  ]);
  return {
    userId,
    plan: plan === 'pro' ? 'pro' : 'free',
    preferred: (profile?.preferred_provider as ProviderId | null) ?? null,
    admin,
  };
}

export async function consumeQuota(ctx: RequestContext, bucket: QuotaBucket): Promise<void> {
  const { data, error } = await ctx.admin.rpc('consume_ai_quota', {
    p_user: ctx.userId,
    p_bucket: bucket,
    p_limit: DAILY_LIMITS[ctx.plan][bucket],
  });
  if (error) throw new HttpError(500, 'Quota check failed');
  if (!data) {
    throw new HttpError(
      429,
      ctx.plan === 'free' ? 'Daily AI limit reached. Upgrade to Pro for more.' : 'Daily AI limit reached.',
      'quota_exceeded',
    );
  }
}

/** Wraps a handler with CORS, POST-only, authentication and error mapping. */
export function serve(handler: (req: Request, ctx: RequestContext) => Promise<unknown>): void {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed', code: 'method' }, 405);
    try {
      const ctx = await authenticate(req);
      return json(await handler(req, ctx));
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
      if (error instanceof AllProvidersFailedError) {
        console.error(error.message);
        return json({ error: 'AI is temporarily unavailable', code: 'ai_unavailable' }, 503);
      }
      console.error(error);
      return json({ error: 'Internal error', code: 'internal' }, 500);
    }
  });
}

export async function readJson<T>(req: Request, maxBytes = 512_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Request too large', 'too_large');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON body', 'bad_request');
  }
}

export function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${field} is required`, 'bad_request');
  if (value.length > maxLength) throw new HttpError(413, `${field} is too long`, 'too_large');
  return value;
}
