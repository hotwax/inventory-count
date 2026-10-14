import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STATUS_CHANGE_WAIT_MS, trackSessionStatusChange, waitForSessionStatusChanges } from "@/services/sessionSyncLifecycle";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });

  return { promise, resolve };
}
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
describe("waiting for session status changes", () => {
  it("waits until a pending status change settles", async () => {
    const request = deferred();
    trackSessionStatusChange("S1", () => request.promise);
    let waited = false;
    const waiting = waitForSessionStatusChanges("S1").then(() => { waited = true; });
    await flushPromises();
    expect(waited).toBe(false);
    request.resolve(); await waiting;
    expect(waited).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("stops waiting for a hung status change at the deadline", async () => {
    const hung = deferred();
    trackSessionStatusChange("S2", () => hung.promise);
    let waited = false;
    const waiting = waitForSessionStatusChanges("S2").then(() => { waited = true; });
    await vi.advanceTimersByTimeAsync(STATUS_CHANGE_WAIT_MS - 1);
    expect(waited).toBe(false);
    await vi.advanceTimersByTimeAsync(1); await waiting;
    expect(waited).toBe(true);
    hung.resolve(); await flushPromises();
  });
  it("returns at once when nothing is pending for the session", async () => {
    await waitForSessionStatusChanges("S3");
    expect(vi.getTimerCount()).toBe(0);
  });
});
