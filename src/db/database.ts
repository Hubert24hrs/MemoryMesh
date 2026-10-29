import * as SQLite from 'expo-sqlite';

/**
 * Local-first store. Everything the UI shows is read from here; the network
 * is only used to sync and to run AI jobs.
 */
export const db = SQLite.openDatabaseSync('memorymesh.db');

const MIGRATIONS: string[] = [
  `
  CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    title_by_user INTEGER NOT NULL DEFAULT 0,
    body TEXT NOT NULL DEFAULT '',
    summary TEXT,
    kind TEXT NOT NULL DEFAULT 'text',
    source_url TEXT,
    mood TEXT,
    language TEXT,
    action_items TEXT,
    attachments TEXT,
    ai_enabled INTEGER NOT NULL DEFAULT 0,
    ai_status TEXT NOT NULL DEFAULT 'off',
    daily_date TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX notes_created ON notes (deleted_at, created_at DESC);
  CREATE INDEX notes_daily ON notes (daily_date);
  CREATE INDEX notes_dirty ON notes (dirty);

  CREATE TABLE tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    dirty INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE note_tags (
    id TEXT PRIMARY KEY NOT NULL,
    note_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    source TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX note_tags_note ON note_tags (note_id);
  CREATE INDEX note_tags_tag ON note_tags (tag_id);

  CREATE TABLE links (
    id TEXT PRIMARY KEY NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    score REAL,
    kind TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX links_source ON links (source_id);
  CREATE INDEX links_target ON links (target_id);

  CREATE TABLE collections (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    ai_suggested INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    dirty INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE collection_notes (
    id TEXT PRIMARY KEY NOT NULL,
    collection_id TEXT NOT NULL,
    note_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX collection_notes_collection ON collection_notes (collection_id);

  CREATE TABLE jobs (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    key TEXT NOT NULL,
    payload TEXT,
    attempts INTEGER NOT NULL,
    next_run_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    last_error TEXT,
    version INTEGER NOT NULL
  );

  CREATE TABLE meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,
];

let ready: Promise<void> | null = null;

export function initDatabase(): Promise<void> {
  if (!ready) ready = migrate();
  return ready;
}

async function migrate(): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = OFF;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(sql);
    });
    version++;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM meta WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string | null): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
}

/** Wipes all local data (used after account deletion or sign-out with wipe). */
export async function resetDatabase(): Promise<void> {
  await db.execAsync(`
    DELETE FROM notes; DELETE FROM tags; DELETE FROM note_tags; DELETE FROM links;
    DELETE FROM collections; DELETE FROM collection_notes; DELETE FROM jobs; DELETE FROM meta;
  `);
}
