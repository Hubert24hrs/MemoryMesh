import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db } from '../db/database';
import { getLinkedNotes, getTagsForNotes, listCollections, getCollectionNotes } from '../db/graph';
import { listAllNotes } from '../db/notes';
import { parseActionItems } from '../db/types';

async function buildExport() {
  const notes = await listAllNotes();
  const tags = await getTagsForNotes(notes.map((n) => n.id));
  const collections = await listCollections();
  const exported = [];
  for (const n of notes) {
    exported.push({
      id: n.id,
      title: n.title,
      body: n.body,
      summary: n.summary,
      kind: n.kind,
      sourceUrl: n.source_url,
      tags: (tags.get(n.id) ?? []).map((t) => t.name),
      actionItems: parseActionItems(n),
      mood: n.mood,
      language: n.language,
      aiEnabled: !!n.ai_enabled,
      linkedNoteIds: (await getLinkedNotes(n.id)).map((l) => l.id),
      createdAt: new Date(n.created_at).toISOString(),
      updatedAt: new Date(n.updated_at).toISOString(),
    });
  }
  const groups = [];
  for (const c of collections) {
    groups.push({ id: c.id, name: c.name, noteIds: (await getCollectionNotes(c.id)).map((n) => n.id) });
  }
  return { app: 'MemoryMesh', version: 1, exportedAt: new Date().toISOString(), notes: exported, collections: groups };
}

async function share(fileName: string, contents: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
}

export async function exportJson(): Promise<void> {
  const data = await buildExport();
  await share(`memorymesh-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export async function exportMarkdown(): Promise<void> {
  const data = await buildExport();
  const parts = data.notes.map((n) => {
    const meta = [
      `- Created: ${n.createdAt}`,
      n.tags.length ? `- Tags: ${n.tags.map((t) => `#${t.replace(/\s+/g, '-')}`).join(' ')}` : '',
      n.sourceUrl ? `- Source: ${n.sourceUrl}` : '',
    ].filter(Boolean);
    const tasks = n.actionItems.map((a) => `- [${a.done ? 'x' : ' '}] ${a.text}`);
    return [
      `## ${n.title || 'Untitled'}`,
      meta.join('\n'),
      n.summary ? `> ${n.summary}` : '',
      n.body,
      tasks.length ? `### Action items\n${tasks.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  });
  await share(
    `memorymesh-${new Date().toISOString().slice(0, 10)}.md`,
    `# MemoryMesh export\n\nExported ${data.exportedAt}\n\n${parts.join('\n\n---\n\n')}\n`,
    'text/markdown',
  );
}

export async function countLocalNotes(): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM notes WHERE deleted_at IS NULL');
  return row?.n ?? 0;
}
