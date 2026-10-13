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
