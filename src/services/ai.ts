import { FunctionsHttpError } from '@supabase/supabase-js';

import type { Mood } from '../db/types';
import { supabase } from '../lib/supabase';

/** Client for the AI Edge Functions. No provider keys exist in the app. */

export class AIError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AIError';
  }
  /** Quota, plan and validation errors won't succeed on retry. */
  get permanent(): boolean {
    return this.status === 400 || this.status === 401 || this.status === 413;
  }
}

async function invoke<T>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body: body as Record<string, unknown> });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      let message = error.message;
      let code = 'error';
      try {
        const payload = await res.json();
        message = payload.error ?? message;
        code = payload.code ?? code;
      } catch {
        // non-JSON error body
      }
      throw new AIError(message, code, res.status);
    }
    throw new AIError(error.message, 'network');
  }
  return data as T;
}

export interface Match {
  id: string;
  score: number;
}

export interface ProcessNoteResult {
  title: string;
  summary: string;
  tags: string[];
  actionItems: string[];
  mood: Mood;
  language: string;
  cleanedText: string;
  related: Match[];
  truncated: boolean;
}

export function processNote(input: {
  noteId: string;
  kind: string;
  text: string;
  title?: string;
  sourceUrl?: string | null;
  existingTags: string[];
}): Promise<ProcessNoteResult> {
  return invoke('process-note', { op: 'upsert', ...input, sourceUrl: input.sourceUrl ?? undefined });
}

export function forgetNote(noteId: string): Promise<{ deleted: boolean }> {
  return invoke('process-note', { op: 'delete', noteId });
}

export async function semanticSearch(
  text: string,
  options: { topK?: number; minScore?: number; excludeId?: string } = {},
): Promise<Match[]> {
  const { matches } = await invoke<{ matches: Match[] }>('semantic-search', { text, ...options });
  return matches;
}

export interface ChatSourceInput {
  id: string;
  title: string;
  date: string;
  excerpt: string;
}

export interface ChatAnswer {
  answer: string;
  citations: { n: number; id: string }[];
  followups: string[];
}

export function askNotes(
  question: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  sources: ChatSourceInput[],
): Promise<ChatAnswer> {
  return invoke('chat', { question, history, sources });
}

export async function transcribeAudio(uri: string): Promise<{ text: string; language?: string }> {
  const form = new FormData();
  const name = uri.split('/').pop() || 'recording.m4a';
  // React Native's FormData accepts a { uri, name, type } file descriptor.
  form.append('file', { uri, name, type: name.endsWith('.wav') ? 'audio/wav' : 'audio/m4a' } as unknown as Blob);
  return invoke('transcribe', form);
}

export interface DigestResult {
  title: string;
  body: string;
  themes: string[];
}

export function weeklyDigest(
  periodLabel: string,
  locale: string,
  notes: { title: string; date: string; summary: string; tags: string[]; mood: string | null }[],
): Promise<DigestResult> {
  return invoke('digest', { periodLabel, locale, notes });
}

export function deleteAccountRemote(): Promise<{ deleted: boolean }> {
  return invoke('delete-account', {});
}
