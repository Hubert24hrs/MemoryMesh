import { notifyDataChanged } from '../db/changes';
import { db, getMeta, setMeta } from '../db/database';
import { DecryptionError, decryptJson, encryptJson } from '../lib/crypto/encryption';
import { getDataKey, secureRandomBytes } from '../lib/crypto/keyStore';
import { supabase } from '../lib/supabase';
import { resolveConflict } from '../lib/sync/merge';
import { NonRetryableError } from '../lib/sync/queue';

/**
 * Bidirectional sync between local SQLite and Supabase.
 *
 * Push: every row flagged `dirty` is upserted. Sensitive columns are packed
 * into one AES-256-GCM `payload` whose AAD is `<table>:<id>`.
 * Pull: rows with `server_updated_at` after the stored cursor are fetched,
 * decrypted and merged last-write-wins.
 */

interface TableSpec {
  name: string;
  /** Columns encrypted into `payload`. */
  secret: string[];
  /** Columns stored in plaintext on the server. */
  plain: string[];
  /** Plain columns that are booleans on the server and 0/1 locally. */
  bools?: string[];
}

const TABLES: TableSpec[] = [
  { name: 'tags', secret: ['name'], plain: [] },
  { name: 'collections', secret: ['name'], plain: ['ai_suggested'], bools: ['ai_suggested'] },
  {
    name: 'notes',
    secret: [
      'title',
      'title_by_user',
      'body',
      'summary',
      'source_url',
      'mood',
      'language',
      'action_items',
      'daily_date',
      'ai_status',
    ],
    plain: ['kind', 'ai_enabled', 'created_at'],
    bools: ['ai_enabled'],
  },
  { name: 'note_tags', secret: [], plain: ['note_id', 'tag_id', 'source'] },
  { name: 'links', secret: [], plain: ['source_id', 'target_id', 'score', 'kind'] },
  { name: 'collection_notes', secret: [], plain: ['collection_id', 'note_id'] },
];

const PAGE = 500;
const PULL_OVERLAP_MS = 60_000;

type Row = Record<string, unknown> & { id: string; updated_at: number; deleted_at: number | null; dirty?: number };

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const ms = (value: unknown) => (value === null || value === undefined ? null : Date.parse(String(value)));

export interface SyncReport {
  pushed: number;
  pulled: number;
  undecryptable: number;
}

let lastReport: SyncReport | null = null;
export const getLastSyncReport = () => lastReport;

export async function syncAll(): Promise<SyncReport> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new NonRetryableError('Not signed in');

  const key = await getDataKey();
  const report: SyncReport = { pushed: 0, pulled: 0, undecryptable: 0 };
  for (const spec of TABLES) report.pushed += await push(spec, key, userId);
  for (const spec of TABLES) {
    const { pulled, undecryptable } = await pull(spec, key);
    report.pulled += pulled;
    report.undecryptable += undecryptable;
  }
  lastReport = report;
  await setMeta('sync.lastAt', String(Date.now()));
  if (report.pulled) notifyDataChanged();
  return report;
}

async function push(spec: TableSpec, key: Uint8Array, userId: string): Promise<number> {
  const rows = await db.getAllAsync<Row>(`SELECT * FROM ${spec.name} WHERE dirty = 1 LIMIT 1000`);
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const remote = batch.map((row) => toRemote(spec, row, key, userId));
    const { error } = await supabase.from(spec.name).upsert(remote, { onConflict: 'id' });
    if (error) {
      if (error.message.includes('free_plan_note_limit')) {
        throw new NonRetryableError('Free plan limit reached: upgrade to sync more notes this month');
      }
      throw new Error(`Sync push failed for ${spec.name}: ${error.message}`);
    }
    // Clear the flag only if the row wasn't edited again while uploading.
    for (const row of batch) {
      await db.runAsync(`UPDATE ${spec.name} SET dirty = 0 WHERE id = ? AND updated_at = ?`, row.id, row.updated_at);
    }
  }
  return rows.length;
}

function toRemote(spec: TableSpec, row: Row, key: Uint8Array, userId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: row.id,
    user_id: userId,
    updated_at: iso(row.updated_at),
    deleted_at: iso(row.deleted_at),
  };
  for (const col of spec.plain) {
    if (col === 'created_at') out[col] = iso(row[col] as number);
    else if (spec.bools?.includes(col)) out[col] = !!row[col];
    else out[col] = row[col];
  }
  if (spec.secret.length) {
    const secret = Object.fromEntries(spec.secret.map((c) => [c, row[c] ?? null]));
    out.payload = encryptJson(key, secret, secureRandomBytes, `${spec.name}:${row.id}`);
  }
  return out;
}

async function pull(spec: TableSpec, key: Uint8Array): Promise<{ pulled: number; undecryptable: number }> {
  const cursorKey = `sync.cursor.${spec.name}`;
  const stored = await getMeta(cursorKey);
  // Re-read a small window to catch rows committed out of order; merges are idempotent.
  let since = stored ? new Date(Date.parse(stored) - PULL_OVERLAP_MS).toISOString() : '1970-01-01T00:00:00Z';
  let maxSeen = stored;
  let pulled = 0;
  let undecryptable = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(spec.name)
      .select('*')
      .gt('server_updated_at', since)
      .order('server_updated_at', { ascending: true })
      .limit(PAGE);
    if (error) throw new Error(`Sync pull failed for ${spec.name}: ${error.message}`);
    if (!data?.length) break;

    for (const remote of data as Record<string, unknown>[]) {
      const row = fromRemote(spec, remote, key);
      if (!row) {
        undecryptable++;
        continue;
      }
      const local = await db.getFirstAsync<Row>(`SELECT id, updated_at, dirty FROM ${spec.name} WHERE id = ?`, row.id);
      if (resolveConflict(local, row) === 'take-remote') {
        await writeRow(spec.name, row);
        pulled++;
      }
    }
    since = String(data[data.length - 1].server_updated_at);
    if (!maxSeen || Date.parse(since) > Date.parse(maxSeen)) maxSeen = since;
    if (data.length < PAGE) break;
  }
  if (maxSeen) await setMeta(cursorKey, maxSeen);
  return { pulled, undecryptable };
}

function fromRemote(spec: TableSpec, remote: Record<string, unknown>, key: Uint8Array): Row | null {
  const row: Row = {
    id: String(remote.id),
    updated_at: ms(remote.updated_at) ?? 0,
    deleted_at: ms(remote.deleted_at),
    dirty: 0,
  };
  for (const col of spec.plain) {
    if (col === 'created_at') row[col] = ms(remote[col]);
    else if (spec.bools?.includes(col)) row[col] = remote[col] ? 1 : 0;
    else row[col] = remote[col];
  }
  if (spec.secret.length) {
    try {
      Object.assign(row, decryptJson<Record<string, unknown>>(key, String(remote.payload), `${spec.name}:${row.id}`));
    } catch (error) {
      if (error instanceof DecryptionError || error instanceof SyntaxError) return null;
      throw error;
    }
  }
  return row;
}

// Upsert only synced columns so local-only ones (e.g. note attachments) survive.
async function writeRow(table: string, row: Row): Promise<void> {
  const cols = Object.keys(row);
  const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`);
  await db.runAsync(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
     ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}`,
    ...cols.map((c) => row[c] as string | number | null),
  );
}

/** Forget sync cursors so the next sync re-downloads everything (e.g. after importing a recovery key). */
export async function resetSyncCursors(): Promise<void> {
  for (const spec of TABLES) await setMeta(`sync.cursor.${spec.name}`, null);
}
