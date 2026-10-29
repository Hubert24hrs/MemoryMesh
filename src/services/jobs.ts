import { notifyDataChanged } from '../db/changes';
import { sqliteJobStore } from '../db/jobStore';
import { SyncQueue, type JobHandler } from '../lib/sync/queue';

export const JOB = {
  aiProcess: 'ai.process',
  aiForget: 'ai.forget',
  sync: 'sync',
} as const;

export const queue = new SyncQueue(sqliteJobStore);

let handlers: Record<string, JobHandler> = {};
let canRun: () => Promise<boolean> = async () => false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Called once at startup; `gate` returns true when online and signed in. */
export function configureWorker(jobHandlers: Record<string, JobHandler>, gate: () => Promise<boolean>): void {
  handlers = jobHandlers;
  canRun = gate;
}

export async function runWorker(): Promise<void> {
  const result = await queue.process(handlers, canRun);
  if (result.succeeded || result.dead) notifyDataChanged();
}

export function kickWorker(delayMs = 1500): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    runWorker().catch(() => undefined);
  }, delayMs);
}

export async function enqueueJob(kind: string, key: string, payload: unknown = null): Promise<void> {
  await queue.enqueue(kind, key, payload);
  kickWorker();
}

export function requestSync(): Promise<void> {
  return enqueueJob(JOB.sync, 'all');
}
