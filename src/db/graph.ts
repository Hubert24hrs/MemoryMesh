import * as Crypto from 'expo-crypto';

import { keyedId } from '../lib/crypto/encryption';
import { getDataKey } from '../lib/crypto/keyStore';
import { requestSync } from '../services/jobs';
import { notifyDataChanged } from './changes';
import { db } from './database';
import type { Collection, Note, Tag } from './types';

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export function normalizeTag(name: string): string {
  return name.trim().replace(/^#/, '').replace(/\s+/g, ' ').toLowerCase().slice(0, 40);
}

async function ensureTag(name: string, now: number): Promise<string> {
  const normalized = normalizeTag(name);
  const id = keyedId(await getDataKey(), `tag:${normalized}`);
  await db.runAsync(
    `INSERT INTO tags (id, name, updated_at, deleted_at, dirty) VALUES (?, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET deleted_at = NULL, updated_at = excluded.updated_at, dirty = 1
     WHERE tags.deleted_at IS NOT NULL`,
    id,
    normalized,
    now,
  );
  return id;
}

async function attachTag(noteId: string, tagId: string, source: 'ai' | 'user', now: number) {
  await db.runAsync(
    `INSERT INTO note_tags (id, note_id, tag_id, source, updated_at, deleted_at, dirty) VALUES (?, ?, ?, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET deleted_at = NULL, source = excluded.source, updated_at = excluded.updated_at, dirty = 1
     WHERE note_tags.deleted_at IS NOT NULL OR note_tags.source != excluded.source`,
    `${noteId}:${tagId}`,
    noteId,
    tagId,
    source,
    now,
  );
}

/** Replace the AI-assigned tags on a note; user-added tags are never touched. */
export async function setAiTags(noteId: string, names: string[]): Promise<void> {
  const now = Date.now();
  const wanted = new Set<string>();
  for (const name of names.map(normalizeTag).filter(Boolean)) wanted.add(await ensureTag(name, now));

  const existing = await db.getAllAsync<{ tag_id: string; source: string }>(
    'SELECT tag_id, source FROM note_tags WHERE note_id = ? AND deleted_at IS NULL',
    noteId,
  );
  for (const row of existing) {
    if (row.source === 'ai' && !wanted.has(row.tag_id)) {
      await db.runAsync(
        'UPDATE note_tags SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
        now,
        now,
        `${noteId}:${row.tag_id}`,
      );
    }
  }
  const userTags = new Set(existing.filter((r) => r.source === 'user').map((r) => r.tag_id));
  for (const tagId of wanted) if (!userTags.has(tagId)) await attachTag(noteId, tagId, 'ai', now);
  notifyDataChanged();
}

export async function addUserTag(noteId: string, name: string): Promise<void> {
  if (!normalizeTag(name)) return;
  const now = Date.now();
  await attachTag(noteId, await ensureTag(name, now), 'user', now);
  notifyDataChanged();
  await requestSync();
}

export async function removeTag(noteId: string, tagId: string): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE note_tags SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
    now,
    now,
    `${noteId}:${tagId}`,
  );
  notifyDataChanged();
  await requestSync();
}

export async function getTagsForNotes(noteIds: string[]): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>();
  if (!noteIds.length) return map;
  const rows = await db.getAllAsync<Tag & { note_id: string }>(
    `SELECT t.*, nt.note_id FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
     WHERE nt.deleted_at IS NULL AND t.deleted_at IS NULL AND nt.note_id IN (${noteIds.map(() => '?').join(',')})
     ORDER BY t.name`,
    ...noteIds,
  );
  for (const row of rows) {
    const list = map.get(row.note_id) ?? [];
    list.push(row);
    map.set(row.note_id, list);
  }
  return map;
}

export interface TagCount extends Tag {
  count: number;
}

export function listTagsWithCounts(limit = 200): Promise<TagCount[]> {
  return db.getAllAsync<TagCount>(
    `SELECT t.*, COUNT(n.id) AS count FROM tags t
     JOIN note_tags nt ON nt.tag_id = t.id AND nt.deleted_at IS NULL
     JOIN notes n ON n.id = nt.note_id AND n.deleted_at IS NULL
     WHERE t.deleted_at IS NULL GROUP BY t.id ORDER BY count DESC, t.name LIMIT ?`,
    limit,
  );
}

// ---------------------------------------------------------------------------
// Links (undirected; id is the sorted pair)
// ---------------------------------------------------------------------------

const linkId = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

export async function setAiLinks(noteId: string, related: { id: string; score: number }[]): Promise<void> {
  const now = Date.now();
  const ids = related.map((r) => r.id).filter((id) => id !== noteId);
  const present = ids.length
    ? new Set(
        (
          await db.getAllAsync<{ id: string }>(
            `SELECT id FROM notes WHERE deleted_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`,
            ...ids,
          )
        ).map((r) => r.id),
      )
    : new Set<string>();
  const keep = new Set<string>();
  for (const r of related) {
    if (!present.has(r.id)) continue;
    const id = linkId(noteId, r.id);
    keep.add(id);
    await db.runAsync(
      `INSERT INTO links (id, source_id, target_id, score, kind, updated_at, deleted_at, dirty) VALUES (?, ?, ?, ?, 'ai', ?, NULL, 1)
       ON CONFLICT(id) DO UPDATE SET score = excluded.score, deleted_at = NULL, updated_at = excluded.updated_at, dirty = 1
       WHERE links.kind = 'ai'`,
      id,
      noteId,
      r.id,
      r.score,
      now,
    );
  }
  const stale = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM links WHERE kind = 'ai' AND deleted_at IS NULL AND (source_id = ? OR target_id = ?)`,
    noteId,
    noteId,
  );
  for (const row of stale) {
    if (!keep.has(row.id)) {
      await db.runAsync('UPDATE links SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', now, now, row.id);
    }
  }
  notifyDataChanged();
}

export async function addUserLink(a: string, b: string): Promise<void> {
  if (a === b) return;
  await db.runAsync(
    `INSERT INTO links (id, source_id, target_id, score, kind, updated_at, deleted_at, dirty) VALUES (?, ?, ?, NULL, 'user', ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET kind = 'user', deleted_at = NULL, updated_at = excluded.updated_at, dirty = 1`,
    linkId(a, b),
    a,
    b,
    Date.now(),
  );
  notifyDataChanged();
  await requestSync();
}

export async function removeLink(a: string, b: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE links SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', now, now, linkId(a, b));
  notifyDataChanged();
  await requestSync();
}

export type LinkedNote = Note & { link_kind: 'ai' | 'user'; link_score: number | null };

export function getLinkedNotes(noteId: string): Promise<LinkedNote[]> {
  return db.getAllAsync<LinkedNote>(
    `SELECT n.*, l.kind AS link_kind, l.score AS link_score FROM links l
     JOIN notes n ON n.id = CASE WHEN l.source_id = ? THEN l.target_id ELSE l.source_id END
     WHERE l.deleted_at IS NULL AND n.deleted_at IS NULL AND (l.source_id = ? OR l.target_id = ?)
     ORDER BY l.kind = 'user' DESC, l.score DESC`,
    noteId,
    noteId,
    noteId,
  );
}

export async function getLinkCounts(noteIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!noteIds.length) return map;
  const marks = noteIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ note_id: string; n: number }>(
    `SELECT note_id, COUNT(*) AS n FROM (
       SELECT source_id AS note_id FROM links WHERE deleted_at IS NULL AND source_id IN (${marks})
       UNION ALL
       SELECT target_id AS note_id FROM links WHERE deleted_at IS NULL AND target_id IN (${marks})
     ) GROUP BY note_id`,
    ...noteIds,
    ...noteIds,
  );
  for (const row of rows) map.set(row.note_id, row.n);
  return map;
}

// ---------------------------------------------------------------------------
// Collections (optional; notes never need one)
// ---------------------------------------------------------------------------

export type CollectionWithCount = Collection & { count: number };

export function listCollections(): Promise<CollectionWithCount[]> {
  return db.getAllAsync<CollectionWithCount>(
    `SELECT c.*, (SELECT COUNT(*) FROM collection_notes cn JOIN notes n ON n.id = cn.note_id
       WHERE cn.collection_id = c.id AND cn.deleted_at IS NULL AND n.deleted_at IS NULL) AS count
     FROM collections c WHERE c.deleted_at IS NULL ORDER BY c.name COLLATE NOCASE`,
  );
}

export async function createCollection(name: string, aiSuggested = false, noteIds: string[] = []): Promise<string> {
  const id = Crypto.randomUUID();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO collections (id, name, ai_suggested, updated_at, deleted_at, dirty) VALUES (?, ?, ?, ?, NULL, 1)',
    id,
    name.trim(),
    aiSuggested ? 1 : 0,
    now,
  );
  for (const noteId of noteIds) await addToCollection(id, noteId, false);
  notifyDataChanged();
  await requestSync();
  return id;
}

export async function deleteCollection(id: string): Promise<void> {
  const now = Date.now();
  await db.runAsync('UPDATE collections SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?', now, now, id);
  await db.runAsync(
    'UPDATE collection_notes SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE collection_id = ?',
    now,
    now,
    id,
  );
  notifyDataChanged();
  await requestSync();
}

export async function addToCollection(collectionId: string, noteId: string, sync = true): Promise<void> {
  await db.runAsync(
    `INSERT INTO collection_notes (id, collection_id, note_id, updated_at, deleted_at, dirty) VALUES (?, ?, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET deleted_at = NULL, updated_at = excluded.updated_at, dirty = 1`,
    `${collectionId}:${noteId}`,
    collectionId,
    noteId,
    Date.now(),
  );
  if (sync) {
    notifyDataChanged();
    await requestSync();
  }
}

export async function removeFromCollection(collectionId: string, noteId: string): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE collection_notes SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?',
    now,
    now,
    `${collectionId}:${noteId}`,
  );
  notifyDataChanged();
  await requestSync();
}

export function getCollectionNotes(collectionId: string): Promise<Note[]> {
  return db.getAllAsync<Note>(
    `SELECT n.* FROM collection_notes cn JOIN notes n ON n.id = cn.note_id
     WHERE cn.collection_id = ? AND cn.deleted_at IS NULL AND n.deleted_at IS NULL ORDER BY n.created_at DESC`,
    collectionId,
  );
}

export async function getCollectionIdsForNote(noteId: string): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ collection_id: string }>(
    'SELECT collection_id FROM collection_notes WHERE note_id = ? AND deleted_at IS NULL',
    noteId,
  );
  return new Set(rows.map((r) => r.collection_id));
}

export interface CollectionSuggestion {
  name: string;
  noteIds: string[];
}

/**
 * Suggest collections from AI-assigned tags that cluster enough notes and
 * aren't already a collection.
 */
export async function suggestCollections(minNotes = 4): Promise<CollectionSuggestion[]> {
  const [tags, collections] = await Promise.all([listTagsWithCounts(50), listCollections()]);
  const existing = new Set(collections.map((c) => c.name.toLowerCase()));
  const out: CollectionSuggestion[] = [];
  for (const tag of tags) {
    if (tag.count < minNotes || existing.has(tag.name.toLowerCase())) continue;
    const rows = await db.getAllAsync<{ note_id: string }>(
      `SELECT nt.note_id FROM note_tags nt JOIN notes n ON n.id = nt.note_id
       WHERE nt.tag_id = ? AND nt.deleted_at IS NULL AND n.deleted_at IS NULL`,
      tag.id,
    );
    out.push({ name: tag.name.charAt(0).toUpperCase() + tag.name.slice(1), noteIds: rows.map((r) => r.note_id) });
    if (out.length >= 5) break;
  }
  return out;
}
