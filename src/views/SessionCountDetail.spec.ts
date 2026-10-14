import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitForSessionTeardown } from "@/services/sessionSyncLifecycle";

// Unit doubles at the worker/API boundary; this is submit and teardown ordering
// coverage, not HotWax backend validation.
const state = vi.hoisted(() => ({ enter: null as any, leave: null as any, session: vi.fn(), create: vi.fn(), aggs: [] as any[], heartbeats: [] as any[], order: [] as string[], flush: vi.fn(), stop: vi.fn(), update: vi.fn(), lock: vi.fn(), release: vi.fn(), replace: vi.fn(), push: vi.fn(), toast: vi.fn() }));
vi.mock("@common", () => ({
  translate: (value: string) => value,
  commonUtil: { showToast: state.toast, getOmsURL: () => "", getOMSInstanceName: () => "unit-only", getMaargURL: () => "", getToken: () => "", getProductIdentificationValue: () => "" },
}));
vi.mock("@ionic/vue", async () => ({ ...await vi.importActual<any>("@ionic/vue"), onIonViewDidEnter: (fn: any) => { state.enter = fn; }, onIonViewDidLeave: (fn: any) => { state.leave = fn; } }));
vi.mock("@common/core/workerFactory", () => ({ WorkerFactory: { createWorker: (...args: any[]) => state.create(...args) } }));
vi.mock("@/router", () => ({ default: { replace: state.replace, push: state.push } }));
vi.mock("@/services/uiUtils", () => ({ loader: { present: vi.fn(), dismiss: vi.fn() } }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getCurrentFacility: { facilityId: "F1" }, getProductIdentificationPref: {}, getGoodIdentificationOptions: [], getBarcodeIdentificationPref: "SKU" }) }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ hasPermission: () => true, getUserProfile: { username: "unit-only" }, getDeviceId: "unit-device" }) }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({
  updateSession: state.update, releaseSession: state.release, getSessionLock: state.lock,
  getInventoryCountImportSession: state.session,
  getInventoryCountImportItemCount: () => Promise.resolve({ status: 200, data: { count: 1 } }), getInventoryCountImportItemsCount: () => Promise.resolve(1),
  getSessionProductIds: () => Promise.resolve([]), getUnmatchedItems: () => Promise.resolve([]), getCountedItems: () => Promise.resolve([]), getUncountedItems: () => Promise.resolve([]),
  getUndirectedItems: () => Promise.resolve([]), getScanEvents: () => Promise.resolve([]), getTotalCountedUnits: () => Promise.resolve(0), recordScan: vi.fn()
}) }));
vi.mock("@/composables/useInventoryCountRun", () => ({ useInventoryCountRun: () => ({ getWorkEffort: () => Promise.resolve({ status: 200, data: { workEffortId: "W1" } }) }) }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({}) }));
vi.mock("@/services/appInitializer", () => ({ db: {} }));
vi.mock("@/services/scanFeedback", () => ({ playScanSuccessFeedback: vi.fn(), prepareScanSuccessFeedback: vi.fn() }));
vi.mock("@/services/cameraScanProduct", () => ({ createCameraScanProductLookupContext: vi.fn() }));
vi.mock("@/components/Image.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/CameraScanner.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/PendingItemCountSheet.vue", () => ({ default: { template: "<div />" } }));
import SessionCountDetail from "@/views/SessionCountDetail.vue";

let wrapper: any;
const complete = { aggregated: 1, synced: 1, pendingScans: 0, pendingRecords: 0, unmatchedRecords: 0 };
const ownLock = { status: 200, data: { entityValueList: [{ userId: "unit-only", deviceId: "unit-device", fromDate: 5 }] } };
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(done => { resolve = done; });

  return { promise, resolve };
}
beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  [state.flush, state.stop, state.update, state.lock, state.release, state.session].forEach(mock => mock.mockReset());
  state.session.mockResolvedValue({ status: 200, data: { statusId: "SESSION_ASSIGNED" } });
  state.flush.mockResolvedValue(complete); state.stop.mockResolvedValue(undefined); state.update.mockResolvedValue({ status: 200 });
  state.lock.mockResolvedValue(ownLock); state.release.mockResolvedValue({ status: 200 });
  state.aggs.length = 0; state.heartbeats.length = 0; state.order.length = 0;
  state.create.mockImplementation((url: URL) => {
    if(String(url).includes("lockHeartbeatWorker")) {
      const handle = { worker: { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null as any }, api: { startHeartbeat: vi.fn(() => Promise.resolve()), stopHeartbeat: vi.fn(() => Promise.resolve()) } };
      state.heartbeats.push(handle);

      return handle;
    }
    const id = state.aggs.length;
    const worker = { postMessage: vi.fn(), terminate: vi.fn(() => { state.order.push(`worker-stop:${id}`); }) };
    const handle = { worker, api: { flushSession: state.flush, stopScheduling: state.stop } };
    state.aggs.push(handle); state.order.push(`worker-start:${id}`);

    return handle;
  });
  wrapper = mount(SessionCountDetail, { props: { workEffortId: "W1", inventoryCountImportId: "S1", inventoryCountTypeId: "DIRECTED_COUNT" }, shallow: true });
  await state.enter();
  vi.clearAllMocks();
});
afterEach(async () => { state.leave(); await waitForSessionTeardown(); wrapper.unmount(); vi.useRealTimers(); });

describe("session submission", () => {
  it("waits for the flush, blocks new scans and duplicate submits, then submits", async () => {
    const sync = deferred();
    state.flush.mockReturnValueOnce(sync.promise);
    const submit = wrapper.vm.confirmSubmit(); await flushPromises();
    expect(state.update).not.toHaveBeenCalled();
    expect(wrapper.vm.isSessionMutable).toBe(false);
    await expect(wrapper.vm.recordScannedCode("SKU-1")).resolves.toBe(false);
    await wrapper.vm.confirmSubmit();
    expect(state.flush).toHaveBeenCalledOnce();
    sync.resolve(complete); await submit;
    expect(state.update).toHaveBeenCalledWith({ inventoryCountImportId: "S1", statusId: "SESSION_SUBMITTED" });
    expect(state.replace).toHaveBeenCalledWith("/count-progress-review/W1");
  });

  it.each(["failure", "pending records", "pending scans", "unmatched"])("keeps the session editable after %s", async reason => {
    if(reason === "failure") {
      state.flush.mockRejectedValueOnce(new Error("worker unavailable"));
    } else {
      state.flush.mockResolvedValueOnce({ ...complete, pendingRecords: reason === "pending records" ? 1 : 0, pendingScans: reason === "pending scans" ? 1 : 0, unmatchedRecords: reason === "unmatched" ? 1 : 0 });
    }
    await wrapper.vm.confirmSubmit();
    expect(state.update).not.toHaveBeenCalled();
    expect(state.replace).not.toHaveBeenCalled();
    expect(wrapper.vm.inventoryCountImport.statusId).toBe("SESSION_ASSIGNED");
    expect(wrapper.vm.isSessionMutable).toBe(true);
    expect(state.aggs[0].worker.terminate).not.toHaveBeenCalled();
    expect(state.toast).toHaveBeenCalled();
  });
});

describe("session teardown", () => {
  it("stops scheduling and waits for the final flush before terminating", async () => {
    const sync = deferred();
    state.flush.mockReturnValueOnce(sync.promise);
    state.leave(); await flushPromises();
    expect(state.stop).toHaveBeenCalledOnce();
    expect(state.aggs[0].worker.terminate).not.toHaveBeenCalled();
    sync.resolve(complete); await waitForSessionTeardown();
    expect(state.aggs[0].worker.terminate).toHaveBeenCalledOnce();
  });

  it("does not start a new worker until the previous one has finished", async () => {
    const sync = deferred();
    state.flush.mockReturnValueOnce(sync.promise);
    state.leave(); await flushPromises();
    const entering = state.enter(); await flushPromises();
    expect(state.aggs).toHaveLength(1);
    sync.resolve(complete); await entering;
    expect(state.aggs).toHaveLength(2);
    expect(state.order.indexOf("worker-stop:0")).toBeLessThan(state.order.indexOf("worker-start:1"));
  });

  it("still terminates and allows re-entry when the final flush fails", async () => {
    state.flush.mockRejectedValueOnce(new Error("worker unavailable"));
    state.leave();
    await state.enter();
    expect(state.aggs[0].worker.terminate).toHaveBeenCalledOnce();
    expect(state.aggs).toHaveLength(2);
  });
});

describe("async work that finishes after the user leaves", () => {
  async function reenter() {
    state.leave();
    await state.enter();
  }

  it("does not start sync or heartbeat workers when the user leaves while the session loads", async () => {
    state.leave(); await waitForSessionTeardown();
    const lock = deferred();
    state.lock.mockReturnValueOnce(lock.promise);
    const entering = state.enter();
    for(let i = 0; i < 5 && !state.lock.mock.calls.length; i++) {await flushPromises();}
    expect(state.lock).toHaveBeenCalledOnce();
    state.leave();
    lock.resolve(ownLock); await entering;
    expect(state.aggs).toHaveLength(1);
    expect(state.heartbeats).toHaveLength(1);
  });

  it("does not submit when the user leaves while the final sync runs", async () => {
    const sync = deferred();
    state.flush.mockReturnValueOnce(sync.promise);
    const submit = wrapper.vm.confirmSubmit(); await flushPromises();
    state.leave();
    sync.resolve(complete); await submit;
    expect(state.update).not.toHaveBeenCalled();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("reloads the later visit's status after a late submit response without touching its lock", async () => {
    const response = deferred();
    state.update.mockReturnValueOnce(response.promise);
    const submit = wrapper.vm.confirmSubmit(); await flushPromises();
    expect(state.update).toHaveBeenCalledOnce();
    // The re-entered visit loads the session before the submit commits.
    await reenter();
    state.session.mockResolvedValue({ status: 200, data: { statusId: "SESSION_SUBMITTED" } });
    response.resolve({ status: 200 }); await submit;
    expect(wrapper.vm.inventoryCountImport.statusId).toBe("SESSION_SUBMITTED");
    expect(wrapper.vm.isSessionMutable).toBe(false);
    expect(state.release).not.toHaveBeenCalled();
    expect(state.heartbeats[1].api.stopHeartbeat).not.toHaveBeenCalled();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("does not start a heartbeat for a reopen that completes after leaving", async () => {
    const response = deferred();
    state.update.mockReturnValueOnce(response.promise);
    const reopening = wrapper.vm.reopen(); await flushPromises();
    state.leave();
    response.resolve({ status: 200 }); await reopening;
    expect(state.lock).not.toHaveBeenCalled();
    expect(state.heartbeats).toHaveLength(1);
  });

  it("ignores heartbeat messages from an earlier visit", async () => {
    const earlier = state.heartbeats[0].worker;
    await reenter();
    await earlier.onmessage({ data: { type: "lockExpired" } });
    expect(state.release).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();
  });
});
