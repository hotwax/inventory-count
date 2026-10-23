/* eslint-disable require-await -- Async mocks preserve worker/API contracts. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ locks: [] as any[], acquire: vi.fn(), workers: [] as any[], status: "SESSION_ASSIGNED",
  heartbeat: vi.fn(), flush: vi.fn(), session: vi.fn() }));
vi.mock("@common", () => ({ commonUtil: { hasError: (r: any) => !!r.data?.errors,
  getOmsURL: () => "", getOMSInstanceName: () => "test", getMaargURL: () => "", getToken: () => "" } }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ getUserProfile: { username: "user" }, getDeviceId: "D1" }) }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getCurrentFacility: { facilityId: "F1" }, getBarcodeIdentificationPref: "SKU" }) }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({
  getInventoryCountImportSession: state.session,
  getSessionLock: async () => ({ status: 200, data: { entityValueList: state.locks } }), lockSession: state.acquire
}) }));
vi.mock("@common/core/workerFactory", () => ({ WorkerFactory: { createWorker: () => {
  const worker = { onmessage: undefined as any, onerror: undefined as any, postMessage: vi.fn(), terminate: vi.fn() };
  const api = { startHeartbeat: state.heartbeat, stopHeartbeat: vi.fn(), stopScheduling: vi.fn(), flushSession: state.flush };
  const result = { worker, api }; state.workers.push(result);

  return result;
} } }));
import { useHandCountSession } from "@/composables/useHandCountSession";
import { waitForSessionTeardown } from "@/services/sessionSyncLifecycle";

const owned = () => ({ userId: "user", deviceId: "D1", fromDate: 1, thruDate: Date.now() + 300000 });
beforeEach(async () => {
  await waitForSessionTeardown();
  vi.clearAllMocks(); state.locks = []; state.workers = []; state.status = "SESSION_ASSIGNED";
  state.session.mockReset().mockImplementation(async () => ({ status: 200, data: { statusId: state.status } }));
  state.acquire.mockReset().mockImplementation(async () => {
    state.locks = [owned()];

    return { status: 200, data: { inventoryCountImportId: "S1", fromDate: String(state.locks[0].fromDate) } };
  });
  state.heartbeat.mockReset().mockResolvedValue(undefined);
  state.flush.mockReset().mockResolvedValue({ pendingScans: 0, pendingRecords: 0, unmatchedRecords: 0 });
});
describe("direct handcount session ownership", () => {
  it("acquires a lease before enabling edits and starts its own sync worker", async () => {
    let finish!: () => void;
    state.heartbeat.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const session = useHandCountSession(); const started = session.start("S1");
    await vi.waitFor(() => expect(state.heartbeat).toHaveBeenCalled());
    expect(session.mutable.value).toBe(false);
    expect(state.acquire).toHaveBeenCalledWith(expect.objectContaining({ inventoryCountImportId: "S1", userId: "user", deviceId: "D1" }));
    finish(); await started;
    expect(session.mutable.value).toBe(true);
    expect(state.workers[1].worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "schedule" }));
    expect(await session.flush()).toBe(true);
    expect(state.flush).toHaveBeenCalledWith("S1", expect.objectContaining({ facilityId: "F1", inventoryCountTypeId: "DIRECTED_COUNT" }));
    session.stop(); await waitForSessionTeardown();
  });
  it("resumes an owned lock and flushes before terminating workers on leave", async () => {
    state.locks = [owned()]; const session = useHandCountSession(); await session.start("S1");
    expect(state.acquire).not.toHaveBeenCalled(); expect(await session.checkMutable()).toBe(true);
    session.stop(); expect(session.mutable.value).toBe(false); await waitForSessionTeardown();
    expect(state.workers[1].api.stopScheduling).toHaveBeenCalled();
    expect(state.flush).toHaveBeenCalled();
    expect(state.workers.every(x => x.worker.terminate.mock.calls.length === 1)).toBe(true);
  });
  it("does not create a writer for a foreign lock or a closed session", async () => {
    state.locks = [{ ...owned(), deviceId: "D2" }]; const session = useHandCountSession(); await session.start("S1");
    expect(session.mutable.value).toBe(false); expect(state.workers).toHaveLength(0);
    state.locks = []; state.status = "SESSION_SUBMITTED"; await session.start("S1");
    expect(state.acquire).not.toHaveBeenCalled(); session.stop();
  });
  it.each(["lockForceReleased", "lockExpired", "reacquireLock", "heartbeatError"])("disables edits and sync when the heartbeat reports %s", async type => {
    const session = useHandCountSession(); await session.start("S1");
    state.workers[0].worker.onmessage({ data: { type } });
    expect(session.mutable.value).toBe(false); await waitForSessionTeardown();
    expect(state.flush).not.toHaveBeenCalled();
    expect(state.workers[1].api.stopScheduling).toHaveBeenCalled();
  });
  it("rejects a save if the lock disappears rather than treating an empty list as permission", async () => {
    const session = useHandCountSession(); await session.start("S1"); state.locks = [];
    expect(await session.checkMutable()).toBe(false); expect(session.mutable.value).toBe(false);
    await waitForSessionTeardown(); expect(state.flush).not.toHaveBeenCalled();
  });
  it("does not start workers when a lock request completes after leaving", async () => {
    let finish!: (result: any) => void;
    state.acquire.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const session = useHandCountSession(); const started = session.start("S1");
    await vi.waitFor(() => expect(state.acquire).toHaveBeenCalled()); session.stop();
    finish({ status: 200, data: owned() }); await started;
    expect(state.workers).toHaveLength(0); expect(session.mutable.value).toBe(false);
  });
  it("reports unresolved pending records after an attempted flush", async () => {
    const session = useHandCountSession(); await session.start("S1");
    state.flush.mockResolvedValue({ pendingScans: 0, pendingRecords: 1, unmatchedRecords: 0 });
    expect(await session.flush()).toBe(false); session.stop(); await waitForSessionTeardown();
  });
});
