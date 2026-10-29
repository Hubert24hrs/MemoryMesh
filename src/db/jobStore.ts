import type { Job, JobStore } from '../lib/sync/queue';
import { db } from './database';

interface JobRow {
  id: string;
  kind: string;
  key: string;
  payload: string | null;
  attempts: number;
  next_run_at: number;
  created_at: number;
  status: Job['status'];
  last_error: string | null;
  version: number;
}

const toJob = (row: JobRow): Job => ({
  id: row.id,
  kind: row.kind,
  key: row.key,
  payload: row.payload === null ? null : JSON.parse(row.payload),
  attempts: row.attempts,
  nextRunAt: row.next_run_at,
  createdAt: row.created_at,
  status: row.status,
  lastError: row.last_error,
  version: row.version,
});

export const sqliteJobStore: JobStore = {
  async all() {
    return (await db.getAllAsync<JobRow>('SELECT * FROM jobs')).map(toJob);
  },
  async get(id) {
    const row = await db.getFirstAsync<JobRow>('SELECT * FROM jobs WHERE id = ?', id);
    return row ? toJob(row) : null;
  },
  async put(job) {
    await db.runAsync(
      `INSERT OR REPLACE INTO jobs (id, kind, key, payload, attempts, next_run_at, created_at, status, last_error, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      job.id,
      job.kind,
      job.key,
      job.payload === undefined ? null : JSON.stringify(job.payload),
      job.attempts,
      job.nextRunAt,
      job.createdAt,
      job.status,
      job.lastError,
      job.version,
    );
  },
  async remove(id) {
    await db.runAsync('DELETE FROM jobs WHERE id = ?', id);
  },
};
