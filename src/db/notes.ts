import * as Crypto from 'expo-crypto';

import { JOB, enqueueJob, requestSync } from '../services/jobs';
import { notifyDataChanged } from './changes';
import { db } from './database';
import type { ActionItem, Mood, Note, NoteKind } from './types';

export interface NewNote {
  /** Deterministic id (e.g. daily notes, so devices converge on one note per day). */
  id?: string;
  body: string;
  kind?: NoteKind;
  title?: string;
  sourceUrl?: string | null;
  attachments?: string[];
  aiEnabled: boolean;
  dailyDate?: string | null;
  /** False to defer AI (e.g. voice notes wait for the Whisper transcript). */
  processAi?: boolean;
}

export async function createNote(input: NewNote): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: input.id ?? Crypto.randomUUID(),
    title: input.title?.trim() ?? '',
    title_by_user: input.title?.trim() ? 1 : 0,
    body: input.body,
    summary: null,
    kind: input.kind ?? 'text',
    source_url: input.sourceUrl ?? null,
    mood: null,
    language: null,
    action_items: null,
    attachments: input.attachments?.length ? JSON.stringify(input.attachments) : null,
    ai_enabled: input.aiEnabled ? 1 : 0,
    ai_status: input.aiEnabled ? 'pending' : 'off',
    daily_date: input.dailyDate ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    dirty: 1,
  };
  await db.runAsync(
    `INSERT INTO notes (id, title, title_by_user, body, summary, kind, source_url, mood, language, action_items,
       attachments, ai_enabled, ai_status, daily_date, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    note.id,
    note.title,
    note.title_by_user,
    note.body,
    note.summary,
    note.kind,
    note.source_url,
    note.mood,
    note.language,
    note.action_items,
    note.attachments,
    note.ai_enabled,
    note.ai_status,
    note.daily_date,
    note.created_at,
    note.updated_at,
    note.deleted_at,
    note.dirty,
  );
  notifyDataChanged();
  if (note.ai_enabled && note.body.trim() && input.processAi !== false) await enqueueJob(JOB.aiProcess, note.id);
  await requestSync();
  return note;
}

export interface NotePatch {
  title?: string;
  body?: string;
  aiEnabled?: boolean;
  actionItems?: ActionItem[];
}

/**
 * `processAi: false` saves without queueing AI (the editor autosaves while
 * typing and calls `queueAiProcessing` once when the user leaves the note).
 */
export async function updateNote(id: string, patch: NotePatch, options: { processAi?: boolean } = {}): Promise<void> {
  const processAi = options.processAi ?? true;
  const current = await getNote(id);
  if (!current) return;
  // An empty title from the editor means "keep the AI title", unless the user had set their own.
  if (patch.title !== undefined && !patch.title.trim() && !current.title_by_user) {
    patch = { ...patch, title: undefined };
  }
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  const contentChanged =
    (patch.body !== undefined && patch.body !== current.body) ||
    (patch.title !== undefined && patch.title !== current.title);

  if (patch.title !== undefined && patch.title !== current.title) {
    sets.push('title = ?', 'title_by_user = ?');
    params.push(patch.title, patch.title.trim() ? 1 : 0);
  }
  if (patch.body !== undefined && patch.body !== current.body) {
    sets.push('body = ?');
    params.push(patch.body);
  }
  if (patch.actionItems) {
    sets.push('action_items = ?');
    params.push(JSON.stringify(patch.actionItems));
  }
  const aiEnabled = patch.aiEnabled ?? !!current.ai_enabled;
  if (patch.aiEnabled !== undefined && patch.aiEnabled !== !!current.ai_enabled) {
    sets.push('ai_enabled = ?', 'ai_status = ?');
    params.push(aiEnabled ? 1 : 0, aiEnabled ? 'pending' : 'off');
  } else if (contentChanged && aiEnabled && processAi) {
    sets.push('ai_status = ?');
    params.push('pending');
  }
  if (!sets.length) return;

  sets.push('updated_at = ?', 'dirty = 1');
  params.push(Date.now());
  await db.runAsync(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
  notifyDataChanged();

  if (patch.aiEnabled === false && current.ai_enabled) await enqueueJob(JOB.aiForget, id);
  else if (aiEnabled && ((contentChanged && processAi) || patch.aiEnabled === true)) await enqueueJob(JOB.aiProcess, id);
  await requestSync();
}

export async function queueAiProcessing(id: string): Promise<void> {
  const note = await getNote(id);
  if (!note || note.deleted_at || !note.ai_enabled || !note.body.trim()) return;
  await setAiStatus(id, 'pending');
  await enqueueJob(JOB.aiProcess, id);
}

export async function deleteNote(id: string): Promise<void> {
  const note = await getNote(id);
  if (!note) return;
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE notes SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', now, now, id);
    await db.runAsync('UPDATE note_tags SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE note_id = ?', now, now, id);
    await db.runAsync(
      'UPDATE links SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE source_id = ? OR target_id = ?',
      now,
      now,
      id,
      id,
    );
    await db.runAsync(
      'UPDATE collection_notes SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE note_id = ?',
      now,
      now,
      id,
    );
  });
  notifyDataChanged();
  if (note.ai_enabled) await enqueueJob(JOB.aiForget, id);
  await requestSync();
}

export function getNote(id: string): Promise<Note | null> {
  return db.getFirstAsync<Note>('SELECT * FROM notes WHERE id = ?', id);
}

export async function getNotesByIds(ids: string[]): Promise<Note[]> {
  if (!ids.length) return [];
  const rows = await db.getAllAsync<Note>(
    `SELECT * FROM notes WHERE deleted_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`,
    ...ids,
  );
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function listRecentNotes(limit = 50, offset = 0): Promise<Note[]> {
  return db.getAllAsync<Note>(
    `SELECT * FROM notes WHERE deleted_at IS NULL AND kind != 'daily'
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
}

export function listNotesBetween(from: number, to: number): Promise<Note[]> {
  return db.getAllAsync<Note>(
    'SELECT * FROM notes WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ? ORDER BY created_at',
    from,
    to,
  );
}

export function listAllNotes(): Promise<Note[]> {
  return db.getAllAsync<Note>('SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY created_at');
}

export async function countNotesCreatedSince(since: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM notes WHERE created_at >= ? AND kind NOT IN ('daily', 'digest')`,
    since,
  );
  return row?.n ?? 0;
}

export interface NoteFilters {
  tagIds?: string[];
  kinds?: NoteKind[];
  since?: number | null;
}

/**
 * Keyword search over the local database. Uses per-term LIKE matching rather
 * than FTS so it behaves the same for every script (CJK, Thai, Arabic…).
 */
export async function keywordSearch(query: string, filters: NoteFilters = {}, limit = 50): Promise<Note[]> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
  const where: string[] = ['n.deleted_at IS NULL'];
  const params: (string | number)[] = [];
  for (const term of terms) {
    const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(
      `(lower(n.title) LIKE ? ESCAPE '\\' OR lower(n.body) LIKE ? ESCAPE '\\' OR lower(coalesce(n.summary, '')) LIKE ? ESCAPE '\\')`,
    );
    params.push(like, like, like);
  }
  appendFilters(where, params, filters);
  return db.getAllAsync<Note>(
    `SELECT n.* FROM notes n WHERE ${where.join(' AND ')} ORDER BY n.created_at DESC LIMIT ?`,
    ...params,
    limit,
  );
}

/** Restrict an id list (e.g. semantic hits) to the given filters, keeping order. */
export async function filterNoteIds(ids: string[], filters: NoteFilters): Promise<Note[]> {
  if (!ids.length) return [];
  const where = [`n.deleted_at IS NULL`, `n.id IN (${ids.map(() => '?').join(',')})`];
  const params: (string | number)[] = [...ids];
  appendFilters(where, params, filters);
  const rows = await db.getAllAsync<Note>(`SELECT n.* FROM notes n WHERE ${where.join(' AND ')}`, ...params);
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

function appendFilters(where: string[], params: (string | number)[], filters: NoteFilters) {
  if (filters.kinds?.length) {
    where.push(`n.kind IN (${filters.kinds.map(() => '?').join(',')})`);
    params.push(...filters.kinds);
  }
  if (filters.since) {
    where.push('n.created_at >= ?');
    params.push(filters.since);
  }
  for (const tagId of filters.tagIds ?? []) {
    where.push('EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = n.id AND nt.tag_id = ? AND nt.deleted_at IS NULL)');
    params.push(tagId);
  }
}

export interface OrganizeUpdate {
  title?: string;
  summary: string;
  mood: Mood | null;
  language: string | null;
  actionItems: ActionItem[];
  body?: string;
}

export async function applyOrganizeResult(id: string, update: OrganizeUpdate): Promise<void> {
  const sets = ['summary = ?', 'mood = ?', 'language = ?', 'action_items = ?', `ai_status = 'done'`];
  const params: (string | number | null)[] = [
    update.summary,
    update.mood,
    update.language,
    JSON.stringify(update.actionItems),
  ];
  if (update.title !== undefined) {
    sets.push('title = ?');
    params.push(update.title);
  }
  if (update.body !== undefined) {
    sets.push('body = ?');
    params.push(update.body);
  }
  sets.push('updated_at = ?', 'dirty = 1');
  params.push(Date.now());
  await db.runAsync(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
  notifyDataChanged();
}

export async function setAiStatus(id: string, status: Note['ai_status']): Promise<void> {
  await db.runAsync('UPDATE notes SET ai_status = ? WHERE id = ?', status, id);
  notifyDataChanged();
}

export async function appendToNote(id: string, line: string): Promise<void> {
  const note = await getNote(id);
  if (!note) return;
  const body = note.body.trim() ? `${note.body.trimEnd()}\n${line}` : line;
  await updateNote(id, { body });
}
