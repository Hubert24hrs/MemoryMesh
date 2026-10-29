export type NoteKind = 'text' | 'voice' | 'clip' | 'daily' | 'digest';
export type AiStatus = 'off' | 'pending' | 'done' | 'failed';
export type Mood = 'positive' | 'neutral' | 'negative' | 'mixed';

export interface ActionItem {
  text: string;
  done: boolean;
}

/** Row shape of the local `notes` table (JSON columns stored as text). */
export interface Note {
  id: string;
  title: string;
  title_by_user: number;
  body: string;
  summary: string | null;
  kind: NoteKind;
  source_url: string | null;
  mood: Mood | null;
  language: string | null;
  action_items: string | null;
  attachments: string | null;
  ai_enabled: number;
  ai_status: AiStatus;
  daily_date: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
}

export interface Tag {
  id: string;
  name: string;
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
}

export interface NoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  source: 'ai' | 'user';
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
}

export interface Link {
  id: string;
  source_id: string;
  target_id: string;
  score: number | null;
  kind: 'ai' | 'user';
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
}

export interface Collection {
  id: string;
  name: string;
  ai_suggested: number;
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
}

export interface CollectionNote {
  id: string;
  collection_id: string;
  note_id: string;
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
}

export function parseActionItems(note: Pick<Note, 'action_items'>): ActionItem[] {
  if (!note.action_items) return [];
  try {
    const items = JSON.parse(note.action_items) as ActionItem[];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function parseAttachments(note: Pick<Note, 'attachments'>): string[] {
  if (!note.attachments) return [];
  try {
    const items = JSON.parse(note.attachments) as string[];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
