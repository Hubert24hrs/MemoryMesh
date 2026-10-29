import { getNetworkStateAsync } from 'expo-network';

import { listTagsWithCounts, setAiLinks, setAiTags } from '../db/graph';
import { applyOrganizeResult, getNote, setAiStatus } from '../db/notes';
import { parseActionItems } from '../db/types';
import { isBackendConfigured } from '../lib/env';
import { supabase } from '../lib/supabase';
import { NonRetryableError, type Job } from '../lib/sync/queue';
import { AIError, forgetNote, processNote } from './ai';
import { JOB, configureWorker, requestSync } from './jobs';
import { syncAll } from './sync';

/** Auto-organize: runs when an AI-enabled note is saved (queued, offline-safe). */
async function organize(job: Job): Promise<void> {
  const note = await getNote(job.key);
  if (!note || note.deleted_at || !note.ai_enabled || !note.body.trim()) return;

  const tags = await listTagsWithCounts(200);
  try {
    const result = await processNote({
      noteId: note.id,
      kind: note.kind,
      text: note.body,
      title: note.title_by_user ? note.title : undefined,
      sourceUrl: note.source_url,
      existingTags: tags.map((t) => t.name),
    });

    // Keep "done" ticks the user already set on matching action items.
    const previous = new Map(parseActionItems(note).map((a) => [a.text, a.done]));
    await applyOrganizeResult(note.id, {
      title: note.title_by_user || note.kind === 'daily' ? undefined : result.title,
      summary: result.summary,
      mood: result.mood,
      language: result.language,
      actionItems: result.actionItems.map((text) => ({ text, done: previous.get(text) ?? false })),
      // Voice transcripts are cleaned once, on first processing (never after the user edits).
      body: note.kind === 'voice' && note.summary === null && result.cleanedText.trim() ? result.cleanedText : undefined,
    });
    await setAiTags(note.id, result.tags);
    await setAiLinks(note.id, result.related);
    await requestSync();
  } catch (error) {
    if (error instanceof AIError && (error.permanent || error.status === 429)) {
      await setAiStatus(note.id, 'failed');
      throw new NonRetryableError(error.message);
    }
    throw error;
  }
}

async function forget(job: Job): Promise<void> {
  await forgetNote(job.key);
}

async function canRunJobs(): Promise<boolean> {
  if (!isBackendConfigured) return false;
  const [network, { data }] = await Promise.all([getNetworkStateAsync(), supabase.auth.getSession()]);
  return !!network.isConnected && network.isInternetReachable !== false && !!data.session;
}

export function startBackgroundWork(): void {
  configureWorker(
    {
      [JOB.aiProcess]: organize,
      [JOB.aiForget]: forget,
      [JOB.sync]: async () => {
        await syncAll();
      },
    },
    canRunJobs,
  );
}
