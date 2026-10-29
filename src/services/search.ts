import { filterNoteIds, getNotesByIds, keywordSearch, type NoteFilters } from '../db/notes';
import type { Note } from '../db/types';
import { semanticSearch } from './ai';
import { canUseAI } from './online';

export interface SearchHit {
  note: Note;
  via: 'meaning' | 'keyword';
  score?: number;
}

/**
 * Deep search: semantic matches first (by meaning, any language), then
 * keyword matches. Falls back to keyword-only when offline, signed out or
 * when the semantic call fails.
 */
export async function searchNotes(query: string, filters: NoteFilters): Promise<SearchHit[]> {
  const q = query.trim();
  const keyword = await keywordSearch(q, filters, 60);
  if (q.length < 3 || !(await canUseAI())) return keyword.map((note) => ({ note, via: 'keyword' }));

  let semantic: SearchHit[] = [];
  try {
    const matches = await semanticSearch(q, { topK: 25, minScore: 0.25 });
    const scores = new Map(matches.map((m) => [m.id, m.score]));
    const notes = await filterNoteIds(
      matches.map((m) => m.id),
      filters,
    );
    semantic = notes.map((note) => ({ note, via: 'meaning', score: scores.get(note.id) }));
  } catch {
    // keyword results still render
  }
  const seen = new Set(semantic.map((h) => h.note.id));
  return [...semantic, ...keyword.filter((n) => !seen.has(n.id)).map((note) => ({ note, via: 'keyword' as const }))];
}

/**
 * Copilot suggestions while typing. Semantic when the note has AI enabled
 * (the draft is sent for embedding), otherwise a local keyword-overlap
 * heuristic that never leaves the device.
 */
export async function relatedToDraft(
  draft: string,
  excludeId: string | undefined,
  allowRemote: boolean,
): Promise<{ notes: Note[]; offline: boolean }> {
  if (allowRemote && (await canUseAI())) {
    try {
      const matches = await semanticSearch(draft.slice(0, 4000), { topK: 6, minScore: 0.35, excludeId });
      return { notes: await getNotesByIds(matches.map((m) => m.id)), offline: false };
    } catch {
      // fall through to local matching
    }
  }
  const words = [...new Set(draft.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [])]
    .sort((a, b) => b.length - a.length)
    .slice(0, 6);
  const scored = new Map<string, { note: Note; hits: number }>();
  for (const word of words) {
    for (const note of await keywordSearch(word, {}, 10)) {
      if (note.id === excludeId) continue;
      const entry = scored.get(note.id) ?? { note, hits: 0 };
      entry.hits++;
      scored.set(note.id, entry);
    }
  }
  const notes = [...scored.values()]
    .filter((e) => e.hits >= Math.min(2, words.length))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 5)
    .map((e) => e.note);
  return { notes, offline: true };
}
