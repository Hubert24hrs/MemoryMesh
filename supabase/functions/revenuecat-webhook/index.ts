// RevenueCat → Supabase entitlement sync. The app logs in to RevenueCat with
// the Supabase user id, so `app_user_id` is the profile id.
// Deployed with verify_jwt = false; authenticated by a shared secret instead.

import { adminClient, json } from '../_shared/http.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GRANTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  // Cancellation/billing issues keep access until the expiration date.
  'CANCELLATION',
  'BILLING_ISSUE',
]);

interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  expiration_at_ms?: number | null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const auth = req.headers.get('Authorization') ?? '';
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return json({ error: 'unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const { event } = (await req.json()) as { event?: RevenueCatEvent };
  if (!event) return json({ error: 'missing event' }, 400);

  const userId = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].find(
    (id): id is string => !!id && UUID.test(id),
  );
  if (!userId) return json({ ignored: 'no supabase user id' });

  const lifetime = /lifetime/i.test(event.product_id ?? '') || event.type === 'NON_RENEWING_PURCHASE';
  let update: Record<string, unknown> | null = null;
  if (event.type === 'EXPIRATION') {
    update = lifetime ? null : { plan: 'free', plan_source: null, plan_expires_at: null };
  } else if (GRANTS.has(event.type)) {
    update = {
      plan: 'pro',
      plan_source: lifetime ? 'lifetime' : 'monthly',
      plan_expires_at: lifetime || !event.expiration_at_ms ? null : new Date(event.expiration_at_ms).toISOString(),
    };
  }
  if (!update) return json({ ignored: event.type });

  const { error } = await adminClient()
    .from('profiles')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    console.error(error);
    return json({ error: 'update failed' }, 500);
  }
  return json({ ok: true });
});
