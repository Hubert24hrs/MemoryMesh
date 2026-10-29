# Deployment

## 0. Rotate leaked keys first

An earlier commit (`530e435`) contained a real `.env`. It has been removed from the working tree,
but **it is still in git history**, so treat every value in it as public and rotate it:

| Key that was in `.env` | Where to rotate |
| --- | --- |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | console.anthropic.com → API keys (revoke, create new) |
| `EXPO_PUBLIC_KIMI_API_KEY` | platform.moonshot.ai → API keys |
| `EXPO_PUBLIC_OPENAI_API_KEY` | platform.openai.com → API keys |
| `EXPO_PUBLIC_PINECONE_API_KEY` | app.pinecone.io → API keys |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (rotate JWT secret / API keys) |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat → Project → API keys |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry → Project → Client keys (Sentry is no longer used; delete the key) |
| `EXPO_PUBLIC_MIXPANEL_TOKEN` | Mixpanel → Project settings (Mixpanel is no longer used; reset it) |
| `EXPO_PUBLIC_ADMOB_*_APP_ID` | Public identifiers; no rotation needed |

Rotating is what actually protects you. Optionally, also scrub history with
[`git filter-repo`](https://github.com/newren/git-filter-repo) (`git filter-repo --path .env --invert-paths`)
and force-push; that rewrites every commit and requires all clones to re-clone.

Only the new provider keys go into **Supabase secrets** (step 3). The app ships with nothing but the
Supabase URL/anon key and RevenueCat public SDK keys.

## 1. Supabase project

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                       # applies supabase/migrations
```

Auth settings (Dashboard → Authentication):
- Enable the **Email** provider.
- Edit the **Magic Link** email template so it contains the one-time code: `Your code is {{ .Token }}`.
  The app signs in with a 6-digit code (`verifyOtp`), not a link.

## 2. Pinecone

Create a **serverless index** with dimension **1536** and metric **cosine** (matches `text-embedding-3-small`).
Copy the index **host** URL. Each user's vectors live in their own namespace (their user id) with no metadata.

If you change `OPENAI_EMBED_MODEL` to a model with a different dimension, create a new index.

## 3. Edge Function secrets and deploy

```bash
cp supabase/.env.example supabase/.env      # fill in keys (never commit this file)
supabase secrets set --env-file supabase/.env
supabase functions deploy process-note semantic-search chat transcribe digest delete-account
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

Any subset of AI providers works; the router skips providers without a key. For full functionality:
- `OPENAI_API_KEY` is required for embeddings (search, related notes, Copilot) and Whisper.
- `KIMI_API_KEY` and/or `OPENAI_API_KEY` serve Free-plan text tasks.
- `ANTHROPIC_API_KEY` serves Pro chat and digests (Claude Opus 5.5 by default, `CLAUDE_MODEL` to override).

Daily AI quotas per plan are in `supabase/functions/_shared/http.ts` (`DAILY_LIMITS`).

## 4. RevenueCat

1. Create products in App Store Connect and Google Play: a monthly auto-renewing subscription
   ($9.99) and a non-consumable lifetime purchase ($49.99). Use a product id containing `lifetime`
   for the lifetime product (the webhook uses this to store it as non-expiring).
2. In RevenueCat, create an entitlement with identifier **`pro`** and attach both products.
3. Create the **current** offering with a `$rc_monthly` (Monthly) and a `$rc_lifetime` (Lifetime) package.
4. Integrations → Webhooks: URL `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`,
   Authorization header `Bearer <REVENUECAT_WEBHOOK_SECRET>` (same value as the Supabase secret).
5. Put the public iOS/Android SDK keys in the app env (step 6).

The app logs in to RevenueCat with the Supabase user id; the webhook updates `profiles.plan`, which the
Edge Functions use for quotas and Claude access.

## 5. AdMob

Create iOS and Android apps and one banner unit each. Without them, Google's sample IDs are used
(development builds always use test ads). Ads are requested as non-personalized only.

## 6. App environment and builds (EAS)

```bash
npm i -g eas-cli
eas login
eas init                               # creates the EAS project; set EAS_PROJECT_ID from its id
```

Create EAS environment variables (`eas env:create`) for the `development`, `preview` and `production` environments:

| Variable | Visibility | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | plain text | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | plain text | public by design; RLS protects data |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | plain text | public SDK keys |
| `EXPO_PUBLIC_ADMOB_BANNER_IOS`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | plain text | banner unit ids |
| `ADMOB_IOS_APP_ID`, `ADMOB_ANDROID_APP_ID` | plain text | read by `app.config.ts` at build time |
| `EAS_PROJECT_ID` | plain text | |

Never add AI or Pinecone keys here: anything prefixed `EXPO_PUBLIC_` is embedded in the app bundle.

```bash
eas build --profile development --platform ios      # dev client for local work
eas build --profile production --platform all
eas submit --platform ios && eas submit --platform android
```

The iOS share extension is generated by the `expo-share-intent` config plugin; EAS will prompt to create
its bundle identifier and provisioning profile on the first build.

## 7. Verify

- Sign in with an email code, create a note with AI on: within a few seconds it gets a title, tags and summary.
- Search for a paraphrase of that note and see a "By meaning" result.
- Ask Chat a question about it and tap the citation.
- Settings → Show recovery key, then on a second device: sign in, Use a recovery key, Sync now.
- Delete account from Settings and confirm the user is gone from Supabase Auth and the Pinecone namespace is empty.
