// Ionic does not await asynchronous leave hooks. Keep the handoff outside the
// cached page so a different page instance also waits for the previous writer.
let pendingTeardown: Promise<void> = Promise.resolve();

export function waitForSessionTeardown(): Promise<void> {
  return pendingTeardown;
}

export function finishSessionTeardown(work: () => Promise<void>): Promise<void> {
  const task = pendingTeardown.then(work);
  // A failed final attempt leaves device records pending, but must not prevent
  // a new session entry from retrying them with a fresh worker.
  pendingTeardown = task.catch(() => undefined);

  return task;
}

// Status writes outlive cached page instances too. A re-entered page must read
// server status only after an earlier submit/discard/reopen request settles.
const pendingStatusChanges = new Map<string, Set<Promise<unknown>>>();

export function trackSessionStatusChange<T>(sessionId: string, work: () => Promise<T>): Promise<T> {
  const task = Promise.resolve().then(work);
  const tasks = pendingStatusChanges.get(sessionId) || new Set<Promise<unknown>>();
  tasks.add(task);
  pendingStatusChanges.set(sessionId, tasks);
  const settled = () => {
    tasks.delete(task);
    if (!tasks.size) pendingStatusChanges.delete(sessionId);
  };
  task.then(settled, settled);
  return task;
}

// The API client has no request timeout, so a hung status write must not keep a
// re-entered page read-only forever. After this long the page reads server status anyway.
export const STATUS_CHANGE_WAIT_MS = 15000;

export async function waitForSessionStatusChanges(sessionId: string, timeoutMs = STATUS_CHANGE_WAIT_MS): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  const deadline = new Promise<void>(resolve => {
    timer = setTimeout(() => {
      expired = true;
      resolve();
    }, timeoutMs);
  });

  try {
    while(!expired && pendingStatusChanges.has(sessionId)) {
      await Promise.race([Promise.allSettled([...pendingStatusChanges.get(sessionId)!]), deadline]);
    }
  } finally {
    clearTimeout(timer);
  }
}
