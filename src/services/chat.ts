import { getNotesByIds, keywordSearch } from '../db/notes';
import type { Note } from '../db/types';
import { askNotes, semanticSearch, type ChatAnswer } from './ai';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { n: number; id: string }[];
  sources?: { id: string; title: string }[];
  followups?: string[];
  error?: boolean;
}

const MAX_SOURCES = 8;

/**
 * Retrieval for chat. Only notes with AI enabled are ever sent; everything
 * else stays on the device.
 */
async function retrieve(question: string): Promise<Note[]> {
  const matches = await semanticSearch(question, { topK: 16, minScore: 0.2 }).catch(() => []);
  const semantic = (await getNotesByIds(matches.map((m) => m.id))).filter((n) => n.ai_enabled);
  if (semantic.length >= 3) return semantic.slice(0, MAX_SOURCES);
  const keyword = (await keywordSearch(question, {}, 20)).filter((n) => n.ai_enabled);
  const seen = new Set(semantic.map((n) => n.id));
  return [...semantic, ...keyword.filter((n) => !seen.has(n.id))].slice(0, MAX_SOURCES);
}

function excerpt(note: Note): string {
  return [note.summary ? `Summary: ${note.summary}` : '', note.body.slice(0, 1500)].filter(Boolean).join('\n');
}

export async function answer(question: string, history: ChatMessage[]): Promise<ChatAnswer & { sources: Note[] }> {
  const sources = await retrieve(question);
  const turns = history
    .filter((m) => !m.error)
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const result = await askNotes(
    question,
    turns,
    sources.map((n) => ({
      id: n.id,
      title: n.title || n.body.slice(0, 60),
      date: new Date(n.created_at).toISOString().slice(0, 10),
      excerpt: excerpt(n),
    })),
  );
  return { ...result, sources };
}
