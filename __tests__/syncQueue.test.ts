import { resolveConflict } from '../src/lib/sync/merge';
import { MemoryJobStore, NonRetryableError, SyncQueue, type Job } from '../src/lib/sync/queue';

function setup(options: { maxAttempts?: number } = {}) {
  let now = 1_000;
  let id = 0;
  const store = new MemoryJobStore();
  const queue = new SyncQueue(store, {
    now: () => now,
    newId: () => `job-${++id}`,
    baseDelayMs: 100,
    maxDelayMs: 1_000,
    ...options,
  });
  return { store, queue, advance: (ms: number) => (now += ms), online: () => true };
}

describe('SyncQueue', () => {
  it('runs jobs in FIFO order and removes them on success', async () => {
    const { queue, advance, online } = setup();
    await queue.enqueue('sync.push', 'a', 1);
    advance(1);
    await queue.enqueue('sync.push', 'b', 2);

    const seen: unknown[] = [];
    const result = await queue.process({ 'sync.push': async (j) => void seen.push(j.payload) }, online);

    expect(seen).toEqual([1, 2]);
    expect(result.succeeded).toBe(2);
    expect(await queue.pending()).toHaveLength(0);
  });

  it('coalesces jobs with the same kind and key, keeping the latest payload', async () => {
    const { queue } = setup();
    await queue.enqueue('ai.process', 'note-1', { rev: 1 });
    await queue.enqueue('ai.process', 'note-1', { rev: 2 });
    await queue.enqueue('ai.process', 'note-2', { rev: 1 });

    const pending = await queue.pending();
    expect(pending).toHaveLength(2);
    expect(pending.find((j) => j.key === 'note-1')?.payload).toEqual({ rev: 2 });
  });

  it('does nothing while offline and leaves jobs queued', async () => {
    const { queue } = setup();
    await queue.enqueue('sync.push', 'a', null);
    const handler = jest.fn();

    const result = await queue.process({ 'sync.push': handler }, () => false);

    expect(handler).not.toHaveBeenCalled();
    expect(result.stoppedOffline).toBe(true);
    expect(await queue.pending()).toHaveLength(1);
  });

  it('retries with exponential backoff, then parks the job as dead', async () => {
    const { queue, advance, online } = setup({ maxAttempts: 3 });
    await queue.enqueue('ai.process', 'n', null);
    const failing = { 'ai.process': async () => Promise.reject(new Error('503')) };

    await queue.process(failing, online);
    let [job] = await queue.pending();
    expect(job.attempts).toBe(1);
    expect(job.nextRunAt).toBe(1_000 + 100);

    // Not due yet: nothing runs.
    expect((await queue.process(failing, online)).retried).toBe(0);

    advance(100);
    await queue.process(failing, online);
    [job] = await queue.pending();
    expect(job.attempts).toBe(2);
    expect(job.nextRunAt).toBe(1_100 + 200);

    advance(200);
    const result = await queue.process(failing, online);
    expect(result.dead).toBe(1);
    expect(await queue.pending()).toHaveLength(0);
    const [dead] = await queue.dead();
    expect(dead.lastError).toBe('503');
  });

  it('caps backoff at maxDelayMs', () => {
    const { queue } = setup();
    expect(queue.backoffMs(1)).toBe(100);
    expect(queue.backoffMs(4)).toBe(800);
    expect(queue.backoffMs(10)).toBe(1_000);
  });

  it('fails non-retryable errors immediately', async () => {
    const { queue, online } = setup();
    await queue.enqueue('ai.process', 'n', null);
    const result = await queue.process(
      { 'ai.process': async () => Promise.reject(new NonRetryableError('quota exceeded')) },
      online,
    );
    expect(result.dead).toBe(1);
  });

  it('revives dead jobs with retryDead', async () => {
    const { queue, online } = setup({ maxAttempts: 1 });
    await queue.enqueue('ai.process', 'n', null);
    await queue.process({ 'ai.process': async () => Promise.reject(new Error('x')) }, online);
    expect(await queue.retryDead()).toBe(1);
    const [job] = await queue.pending();
    expect(job.attempts).toBe(0);
    expect(job.lastError).toBeNull();
  });

  it('marks jobs with no handler as dead', async () => {
    const { queue, online } = setup();
    await queue.enqueue('unknown', 'x', null);
    expect((await queue.process({}, online)).dead).toBe(1);
  });

  it('keeps a job that was re-enqueued while its handler was running', async () => {
    const { queue, online } = setup();
    await queue.enqueue('sync.push', 'note-1', { rev: 1 });

    const payloads: unknown[] = [];
    const handlers = {
      'sync.push': async (job: Job) => {
        payloads.push(job.payload);
        if ((job.payload as { rev: number }).rev === 1) await queue.enqueue('sync.push', 'note-1', { rev: 2 });
      },
    };

    await queue.process(handlers, online);
    expect((await queue.pending()).map((j) => j.payload)).toEqual([{ rev: 2 }]);

    await queue.process(handlers, online);
    expect(payloads).toEqual([{ rev: 1 }, { rev: 2 }]);
    expect(await queue.pending()).toHaveLength(0);
  });

  it('is single-flight: concurrent process calls share one run', async () => {
    const { queue, online } = setup();
    await queue.enqueue('sync.push', 'a', null);
    const handler = jest.fn(async () => new Promise<void>((r) => setTimeout(r, 5)));

    const [a, b] = await Promise.all([
      queue.process({ 'sync.push': handler }, online),
      queue.process({ 'sync.push': handler }, online),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('stops mid-run when the connection drops', async () => {
    const { queue, advance } = setup();
    await queue.enqueue('sync.push', 'a', null);
    advance(1);
    await queue.enqueue('sync.push', 'b', null);
    let online = true;
    const handler = jest.fn(async () => {
      online = false;
    });

    const result = await queue.process({ 'sync.push': handler }, () => online);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.stoppedOffline).toBe(true);
    expect((await queue.pending()).map((j) => j.key)).toEqual(['b']);
  });
});

describe('resolveConflict (last write wins)', () => {
  it('takes remote rows that are new locally', () => {
    expect(resolveConflict(null, { id: '1', updated_at: 5 })).toBe('take-remote');
  });

  it('keeps a newer local edit and takes a newer remote edit', () => {
    expect(resolveConflict({ id: '1', updated_at: 10, dirty: 1 }, { id: '1', updated_at: 5 })).toBe('keep-local');
    expect(resolveConflict({ id: '1', updated_at: 5, dirty: 1 }, { id: '1', updated_at: 10 })).toBe('take-remote');
  });

  it('breaks ties in favour of the remote copy so devices converge', () => {
    expect(resolveConflict({ id: '1', updated_at: 7 }, { id: '1', updated_at: 7 })).toBe('take-remote');
  });
});
