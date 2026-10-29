/**
 * Durable, offline-first job queue used for both AI processing and sync.
 *
 * - Jobs are coalesced by (kind, key): enqueueing the same note twice keeps a
 *   single job with the latest payload.
 * - Failures back off exponentially; after `maxAttempts` a job is parked as
 *   `dead` (it can be revived with `retryDead`).
 * - A job re-enqueued while its handler is running is not lost: the version
 *   check keeps the newer copy for the next run.
 * - Processing is single-flight and stops as soon as the device goes offline.
 *
 * Storage is injected so the same logic runs on SQLite in the app and in
 * memory under test.
 */

export type JobStatus = 'pending' | 'dead';

export interface Job<P = unknown> {
  id: string;
  kind: string;
  key: string;
  payload: P;
  attempts: number;
  nextRunAt: number;
  createdAt: number;
  status: JobStatus;
  lastError: string | null;
  version: number;
}

export interface JobStore {
  all(): Promise<Job[]>;
  get(id: string): Promise<Job | null>;
  put(job: Job): Promise<void>;
  remove(id: string): Promise<void>;
}

export type JobHandler = (job: Job) => Promise<void>;

/** Throw from a handler to fail a job permanently without retries. */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export interface QueueOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  now?: () => number;
  newId?: () => string;
}

export interface ProcessResult {
  succeeded: number;
  retried: number;
  dead: number;
  stoppedOffline: boolean;
}

let idCounter = 0;
const defaultId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export class SyncQueue {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly now: () => number;
  private readonly newId: () => string;
  private running: Promise<ProcessResult> | null = null;

  constructor(
    private readonly store: JobStore,
    options: QueueOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 6;
    this.baseDelayMs = options.baseDelayMs ?? 2_000;
    this.maxDelayMs = options.maxDelayMs ?? 10 * 60_000;
    this.now = options.now ?? Date.now;
    this.newId = options.newId ?? defaultId;
  }

  backoffMs(attempts: number): number {
    return Math.min(this.baseDelayMs * 2 ** Math.max(0, attempts - 1), this.maxDelayMs);
  }

  async enqueue<P>(kind: string, key: string, payload: P): Promise<Job<P>> {
    const existing = (await this.store.all()).find((j) => j.kind === kind && j.key === key);
    const now = this.now();
    const job: Job<P> = existing
      ? {
          ...existing,
          payload,
          attempts: 0,
          nextRunAt: now,
          status: 'pending',
          lastError: null,
          version: existing.version + 1,
        }
      : {
          id: this.newId(),
          kind,
          key,
          payload,
          attempts: 0,
          nextRunAt: now,
          createdAt: now,
          status: 'pending',
          lastError: null,
          version: 1,
        };
    await this.store.put(job);
    return job;
  }

  async pending(): Promise<Job[]> {
    return (await this.store.all()).filter((j) => j.status === 'pending');
  }

  async dead(): Promise<Job[]> {
    return (await this.store.all()).filter((j) => j.status === 'dead');
  }

  async retryDead(): Promise<number> {
    const dead = await this.dead();
    const now = this.now();
    for (const job of dead) {
      await this.store.put({ ...job, status: 'pending', attempts: 0, nextRunAt: now, lastError: null });
    }
    return dead.length;
  }

  process(
    handlers: Record<string, JobHandler>,
    isOnline: () => boolean | Promise<boolean>,
  ): Promise<ProcessResult> {
    if (!this.running) {
      this.running = this.drain(handlers, isOnline).finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async drain(
    handlers: Record<string, JobHandler>,
    isOnline: () => boolean | Promise<boolean>,
  ): Promise<ProcessResult> {
    const result: ProcessResult = { succeeded: 0, retried: 0, dead: 0, stoppedOffline: false };
    const due = (await this.pending())
      .filter((j) => j.nextRunAt <= this.now())
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const job of due) {
      if (!(await isOnline())) {
        result.stoppedOffline = true;
        break;
      }
      const handler = handlers[job.kind];
      if (!handler) {
        await this.store.put({ ...job, status: 'dead', lastError: `No handler for ${job.kind}` });
        result.dead++;
        continue;
      }
      try {
        await handler(job);
        const latest = await this.store.get(job.id);
        // Only remove the job if nobody re-enqueued it while we were working.
        if (latest && latest.version === job.version) await this.store.remove(job.id);
        result.succeeded++;
      } catch (error) {
        const latest = await this.store.get(job.id);
        if (latest && latest.version !== job.version) continue; // newer payload supersedes this failure
        const message = error instanceof Error ? error.message : String(error);
        const attempts = job.attempts + 1;
        if (error instanceof NonRetryableError || attempts >= this.maxAttempts) {
          await this.store.put({ ...job, attempts, status: 'dead', lastError: message });
          result.dead++;
        } else {
          await this.store.put({
            ...job,
            attempts,
            lastError: message,
            nextRunAt: this.now() + this.backoffMs(attempts),
          });
          result.retried++;
        }
      }
    }
    return result;
  }
}

/** Simple in-memory store; used by tests and as a fallback. */
export class MemoryJobStore implements JobStore {
  private jobs = new Map<string, Job>();
  async all() {
    return [...this.jobs.values()].map((j) => ({ ...j }));
  }
  async get(id: string) {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }
  async put(job: Job) {
    this.jobs.set(job.id, { ...job });
  }
  async remove(id: string) {
    this.jobs.delete(id);
  }
}
