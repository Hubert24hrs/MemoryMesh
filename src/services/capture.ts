import { Directory, File, Paths } from 'expo-file-system';
import type { ShareIntent } from 'expo-share-intent';

import { countNotesCreatedSince, createNote, type NewNote } from '../db/notes';
import type { Note } from '../db/types';
import { isPro } from '../store/session';
import { useSettings } from '../store/settings';

export const FREE_MONTHLY_NOTES = 50;

export class NoteLimitError extends Error {
  constructor() {
    super('Free plan monthly note limit reached');
    this.name = 'NoteLimitError';
  }
}

function startOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export async function notesLeftThisMonth(): Promise<number | null> {
  if (isPro()) return null;
  return Math.max(0, FREE_MONTHLY_NOTES - (await countNotesCreatedSince(startOfMonth())));
}

/** Create a note from any capture surface, applying plan limits and the AI default. */
export async function captureNote(input: Omit<NewNote, 'aiEnabled'> & { aiEnabled?: boolean }): Promise<Note> {
  const exempt = input.kind === 'daily' || input.kind === 'digest';
  if (!exempt) {
    const left = await notesLeftThisMonth();
    if (left !== null && left <= 0) throw new NoteLimitError();
  }
  return createNote({ ...input, aiEnabled: input.aiEnabled ?? useSettings.getState().aiByDefault });
}

/** Turn a share-sheet payload (link, text, images) into a clip note. */
export async function captureShare(share: ShareIntent): Promise<Note | null> {
  const url = share.webUrl ?? extractUrl(share.text ?? '');
  const text = (share.text ?? '').trim();
  const attachments: string[] = [];

  const images = (share.files ?? []).filter((f) => f.mimeType.startsWith('image/'));
  if (images.length) {
    const dir = new Directory(Paths.document, 'attachments');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    for (const image of images) {
      const source = new File(image.path.startsWith('file://') ? image.path : `file://${image.path}`);
      const target = new File(dir, `${Date.now()}-${image.fileName.replace(/[^\w.-]/g, '_')}`);
      source.copy(target);
      attachments.push(target.uri);
    }
  }
  if (!url && !text && !attachments.length) return null;

  const body = [text && text !== url ? text : '', url ?? ''].filter(Boolean).join('\n\n');
  return captureNote({
    kind: 'clip',
    body: body || images.map((i) => i.fileName).join(', '),
    sourceUrl: url,
    attachments,
  });
}

function extractUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s]+/i)?.[0] ?? null;
}
