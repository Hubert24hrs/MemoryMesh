# MemoryMesh

A fast, notes-first AI notebook for iOS and Android. You write; AI does the filing.
Notes are stored on the device first, encrypted before they sync, and AI is opt-in per note.

Built with Expo SDK 58 (React Native 0.88), TypeScript, SQLite, Supabase and Pinecone.

## What's implemented

**Capture**
- Always-open composer on the Notes tab; one tap to save.
- Daily note per day (same note on every device) with quick-add lines from Notes or Capture.
- Voice: hold to record, live on-device transcription while you speak, then (with AI on) a Whisper transcript and an AI-cleaned note with summary and action items. The audio file is deleted after transcription.
- Share-sheet clipper: share links, text or images from any app into a "clip" note. For short link shares the server fetches the page text so AI can title, summarize and tag it. Images are attached locally (not synced, not sent to AI).

**AI organization** (only for notes with AI turned on)
- On save the note is titled, summarized, tagged (reusing your existing tags), given action items, mood and language, and auto-linked to related notes by vector similarity.
- Copilot in the editor: related notes appear as you type (debounced); tap one to insert a `[[link]]` and create the link. Offline, or with AI off for the note, it falls back to local keyword overlap that never leaves the device.
- Collections are optional: create them manually, or accept suggestions built from tags that cluster four or more notes.

**Retrieval**
- Search by meaning (embeddings) merged with keyword search, filterable by tag, date range and note type. Keyword search works offline and for every script (it doesn't rely on a tokenizer).
- Chat with your notes: answers grounded in your AI-enabled notes, with tappable `[n]` citations, a source list and follow-up suggestions.
- Insights: notes per day this week vs last week, top topics, mood mix, and resurfaced notes (a week / a month / a year ago, plus a well-linked older note).
- Weekly AI digest on demand from Insights, saved as a note.

**Privacy & security**
- Client-side AES-256-GCM (`@noble/ciphers`) for all synced content. The 256-bit key is generated on device and kept in the iOS Keychain / Android Keystore via `expo-secure-store`. Each ciphertext is bound to its table and row id (AAD).
- Tag ids are keyed HMACs, so devices converge on one tag without the server seeing tag names.
- Recovery key export/import to read your synced notes on a new device.
- Optional biometric lock (also hides content in the app switcher).
- Export everything as JSON or Markdown; erase local data; delete your account (server rows cascade, vectors deleted).
- Settings states plainly that AI needs plaintext: what is sent, to whom, and that AI-off notes never leave the device unencrypted.

**Offline-first sync**
- Local SQLite is the source of truth for the UI.
- A durable job queue (coalescing, exponential backoff, dead-letter + retry) runs AI jobs and sync when you're online and signed in.
- Bidirectional Supabase sync with last-write-wins merge.

**AI routing** (server-side only)
- Provider-agnostic router with automatic fallback: Claude for chat and digests, Kimi for fast multilingual organizing, OpenAI for Whisper and embeddings. Providers without a key are skipped; invalid JSON from one provider falls through to the next.
- Embeddings and transcription intentionally do not fall back across providers (vectors from different models aren't comparable).
- Every call goes through authenticated Supabase Edge Functions with per-user daily quotas. No AI or Pinecone key exists in the app.

**Monetization**
- Free: 50 new notes per month (daily notes and digests don't count; enforced on device and in Postgres), banner ads (non-personalized), Kimi/OpenAI with lower daily AI limits.
- Pro (monthly or lifetime via RevenueCat): unlimited notes, Claude plus all providers with an optional preferred provider, higher limits, no ads. Prices come from the store listing (configure $9.99/month and $49.99 lifetime in App Store Connect / Play Console).

**Multilingual**
- Whisper and embeddings handle 100+ languages; AI writes titles, summaries and tags in the note's own language; on-device speech recognition uses the device locale.
- UI strings are in `src/i18n/locales/en.json` (English only so far; i18next-ready).

## Not yet implemented

- Translations other than English.
- AI understanding of image content in clips (images are stored locally only).
- Real-time sync (sync runs on launch, foreground, reconnect, after edits and every minute while open).
- Push notifications / scheduled digests (the digest is generated on demand).
- Web and tablet-optimized layouts.
- End-to-end tests and UI component tests.

## Project layout

```
App.tsx                     app shell: DB init, worker, auth, purchases, providers
src/
  db/                       SQLite schema, repositories, job store
  lib/crypto/               AES-256-GCM envelope, key storage, encoding
  lib/sync/                 SyncQueue and conflict resolution
  services/                 AI client, organizer jobs, sync, search, chat, daily, insights, export, account, purchases
  screens/                  Onboarding, Notes, Editor, Search, Chat, Capture, Collections, Insights, Settings, Paywall, SignIn
  components/, theme/, i18n/, navigation/, store/
supabase/
  migrations/               tables, RLS, quotas, free-plan cap
  functions/                process-note, semantic-search, chat, transcribe, digest, delete-account, revenuecat-webhook
  functions/_shared/        router (pure TS, unit-tested), providers, Pinecone, prompts
__tests__/                  AI router, encryption, sync queue
```

## Development

Requires Node 20+. The app uses native modules (speech recognition, share extension, ads, purchases), so it runs in a development build, not Expo Go.

```bash
npm install
cp .env.example .env        # fill in Supabase URL + anon key, RevenueCat public keys
npx expo run:ios            # or: npx expo run:android
```

The app works without a backend: notes stay local and AI/sync are disabled until Supabase is configured and you sign in.

```bash
npm test                    # Jest: router, encryption, sync queue
npm run type-check
npm run lint
```

See [DEPLOYMENT.md](DEPLOYMENT.md) to set up Supabase, Pinecone, the AI providers, RevenueCat and EAS builds.
