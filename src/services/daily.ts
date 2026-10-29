import { getTagsForNotes } from '../db/graph';
import { appendToNote, getNote, listNotesBetween } from '../db/notes';
import type { Note } from '../db/types';
import { keyedId } from '../lib/crypto/encryption';
import { getDataKey } from '../lib/crypto/keyStore';
import { deviceLocale } from '../i18n';
import { useSettings } from '../store/settings';
import { weeklyDigest } from './ai';
import { captureNote } from './capture';

const DAY = 86_400_000;

export function dateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Same day on two devices → same id, so daily notes merge instead of duplicating. */
async function dailyNoteId(key: string): Promise<string> {
  const hex = keyedId(await getDataKey(), `daily:${key}`);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function getOrCreateDailyNote(date = new Date()): Promise<Note> {
  const key = dateKey(date);
  const id = await dailyNoteId(key);
  const existing = await getNote(id);
  if (existing && !existing.deleted_at) return existing;
  const title = date.toLocaleDateString(deviceLocale, { weekday: 'long', month: 'long', day: 'numeric' });
  return captureNote({ id, kind: 'daily', title, body: '', dailyDate: key });
}

export async function quickAddToToday(text: string): Promise<void> {
  const note = await getOrCreateDailyNote();
  const time = new Date().toLocaleTimeString(deviceLocale, { hour: '2-digit', minute: '2-digit' });
  await appendToNote(note.id, `• ${time} ${text.trim()}`);
}

export function weekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Weekly digest from the last 7 days of AI-enabled notes. Only titles,
 * AI summaries, tags and mood are sent — not full note bodies.
 * Returns null when there isn't enough to summarize.
 */
export async function generateWeeklyDigest(): Promise<Note | null> {
  const to = Date.now();
  const notes = (await listNotesBetween(to - 7 * DAY, to)).filter(
    (n) => n.ai_enabled && n.summary && n.kind !== 'digest',
  );
  if (notes.length < 2) return null;
  const tags = await getTagsForNotes(notes.map((n) => n.id));
  const fmt = (ms: number) => new Date(ms).toLocaleDateString(deviceLocale, { month: 'short', day: 'numeric' });
  const label = `${fmt(to - 7 * DAY)} – ${fmt(to)}`;

  const digest = await weeklyDigest(
    label,
    deviceLocale,
    notes.map((n) => ({
      title: n.title,
      date: dateKey(new Date(n.created_at)),
      summary: n.summary ?? '',
      tags: (tags.get(n.id) ?? []).map((t) => t.name),
      mood: n.mood,
    })),
  );
  const note = await captureNote({
    kind: 'digest',
    title: digest.title || label,
    body: digest.body,
    aiEnabled: false,
  });
  useSettings.getState().set({ lastDigestWeek: weekKey() });
  return note;
}
