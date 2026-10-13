import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ enter: null as any, leave: null as any, lock: vi.fn(), release: vi.fn(), push: vi.fn(), create: vi.fn(), session: vi.fn(), aggs: [] as any[], heartbeats: [] as any[], order: [] as string[], flush: vi.fn(), stop: vi.fn(), update: vi.fn(), replace: vi.fn(), toast: vi.fn(), emit: vi.fn(), worker: { postMessage: vi.fn(), terminate: vi.fn() } }));
vi.mock("@common", () => ({
  translate: (value: string) => value, emitter: { emit: state.emit },
  commonUtil: { showToast: state.toast, getOmsURL: () => "", getOMSInstanceName: () => "unit-only", getMaargURL: () => "", getToken: () => "", getProductIdentificationValue: () => "" },
}));
vi.mock("@ionic/vue", async () => ({ ...await vi.importActual<any>("@ionic/vue"), onIonViewDidEnter: (fn: any) => { state.enter = fn; }, onIonViewWillLeave: (fn: any) => { state.leave = fn; }, loadingController: { create: () => Promise.resolve({ present: vi.fn(), dismiss: vi.fn() }) } }));
vi.mock("@common/core/workerFactory", () => ({ WorkerFactory: { createWorker: (...args: any[]) => state.create(...args) } }));
vi.mock("@/router", () => ({ default: { replace: state.replace, push: state.push } }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getCurrentFacility: { facilityId: "F1" }, getProductIdentificationPref: {}, getGoodIdentificationOptions: [], getBarcodeIdentificationPref: "SKU" }) }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ hasPermission: () => true, getUserProfile: { username: "unit-only" }, getDeviceId: "unit-device" }) }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({ updateSession: state.update, getSessionLock: state.lock, releaseSession: state.release,
  getInventoryCountImportSession: state.session,
  getInventoryCountImportItemCount: () => Promise.resolve({ status: 200, data: { count: 1 } }), getInventoryCountImportItemsCount: () => Promise.resolve(1),
  getSessionProductIds: () => Promise.resolve([]), getUnmatchedItems: () => Promise.resolve([]), getCountedItems: () => Promise.resolve([]), getUncountedItems: () => Promise.resolve([]),
  getUndirectedItems: () => Promise.resolve([]), getScanEvents: () => Promise.resolve([]), getTotalCountedUnits: () => Promise.resolve(0)
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
beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks(); [state.flush, state.stop, state.update].forEach(mock => mock.mockReset()); state.flush.mockResolvedValue(complete); state.stop.mockResolvedValue(undefined); state.update.mockResolvedValue({ status: 200 });
  state.aggs.length = 0; state.heartbeats.length = 0; state.order.length = 0;
  state.session.mockResolvedValue({ status: 200, data: { statusId: "SESSION_ASSIGNED" } });
  state.create.mockImplementation((url: URL) => {
    if(String(url).includes("lockHeartbeatWorker")) {
      const id = state.heartbeats.length;
      const api = { startHeartbeat: vi.fn(() => {
        state.order.push(`heartbeat-start:${id}`);

        return Promise.resolve();
      }), stopHeartbeat: vi.fn(() => {
        state.order.push(`heartbeat-stop:${id}`);

        return Promise.resolve();
      }) };
      state.heartbeats.push(api);

      return { worker: { postMessage: vi.fn(), terminate: vi.fn() }, api };
    }
    const id = state.aggs.length;
    const worker = { postMessage: vi.fn(), terminate: vi.fn(() => { state.order.push(`worker-stop:${id}`); }) };
    const api = { flushSession: state.flush, stopScheduling: state.stop };
    const handle = { worker, api }; state.aggs.push(handle); state.order.push(`worker-start:${id}`);

    return handle;
  });
  state.lock.mockResolvedValue({ status: 200, data: { entityValueList: [{ userId: "unit-only", deviceId: "unit-device", fromDate: 5 }] } });
  state.release.mockResolvedValue({ status: 200 });
  wrapper = mount(SessionCountDetail, { props: { workEffortId: "W1", inventoryCountImportId: "S1", inventoryCountTypeId: "DIRECTED_COUNT" }, shallow: true });
  await state.enter();
  state.worker = state.aggs[0].worker;
  vi.clearAllMocks();

});
afterEach(async () => { await state.leave(); wrapper.unmount(); vi.useRealTimers(); });


describe("session submission and teardown", () => {
  it("waits for flush, blocks new scans and duplicate submits, then navigates", async () => {
    let finish!: (value: any) => void;
    state.flush.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const submit = wrapper.vm.confirmSubmit(); await flushPromises();
    expect(state.update).not.toHaveBeenCalled(); expect(state.replace).not.toHaveBeenCalled();
    expect(wrapper.vm.isSessionMutable).toBe(false);
    await wrapper.vm.confirmSubmit(); expect(state.flush).toHaveBeenCalledOnce();
    finish(complete); await submit;
    expect(state.update).toHaveBeenCalledWith({ inventoryCountImportId: "S1", statusId: "SESSION_SUBMITTED" });
    expect(state.replace).toHaveBeenCalledWith("/count-progress-review/W1");
  });
  it.each(["failure", "pending records", "pending scans", "unmatched"])("keeps the session editable after %s", async reason => {
    if(reason === "failure") {state.flush.mockRejectedValueOnce(new Error("network unavailable"));} else {state.flush.mockResolvedValueOnce({ ...complete, pendingRecords: reason === "pending records" ? 1 : 0, pendingScans: reason === "pending scans" ? 1 : 0, unmatchedRecords: reason === "unmatched" ? 1 : 0 });}
    await wrapper.vm.confirmSubmit();
    expect(state.update).not.toHaveBeenCalled(); expect(state.replace).not.toHaveBeenCalled();
    expect(wrapper.vm.inventoryCountImport.statusId).toBe("SESSION_ASSIGNED");
    expect(wrapper.vm.isSessionMutable).toBe(true); expect(state.worker.terminate).not.toHaveBeenCalled();
    expect(state.toast).toHaveBeenCalled();
  });
  it("does not navigate when the status update fails", async () => {
    state.update.mockResolvedValueOnce({ status: 500 });
    await wrapper.vm.confirmSubmit();
    expect(state.replace).not.toHaveBeenCalled();
    expect(wrapper.vm.inventoryCountImport.statusId).toBe("SESSION_ASSIGNED");
  });
  it("waits for final work before terminating on leave", async () => {
    let finish!: (value: any) => void;
    state.flush.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const leaving = state.leave(); await flushPromises();
    expect(state.worker.terminate).not.toHaveBeenCalled();
    finish(complete); await leaving;
    expect(state.worker.terminate).toHaveBeenCalledOnce();
  });
  it("does not submit or return to the count after the view leaves during sync", async () => {
    let finish!: (value: any) => void;
    state.flush.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const submit = wrapper.vm.confirmSubmit();
    await flushPromises();
    const leave = state.leave();
    await flushPromises();
    finish(complete);
    await Promise.all([submit, leave]);
    expect(state.update).not.toHaveBeenCalled();
    expect(state.replace).not.toHaveBeenCalled();
  });
  it("does not terminate a replacement worker after an older leave flush finishes", async () => {
    let finish!: (value: any) => void;
    state.flush.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const leave = state.leave();
    await flushPromises();
    const replacement = { postMessage: vi.fn(), terminate: vi.fn() };
    wrapper.vm.aggregationWorker = replacement;
    finish(complete);
    await leave;
    expect(state.worker.terminate).toHaveBeenCalledOnce();
    expect(replacement.terminate).not.toHaveBeenCalled();
    expect(wrapper.vm.aggregationWorker).toBe(replacement);
  });

  it("keeps the original API when the view re-enters before scheduling stops", async () => {
    let stopped!: () => void;
    state.stop.mockReturnValueOnce(new Promise<void>(resolve => { stopped = resolve; }));
    const leave = state.leave();
    await flushPromises();
    const replacement = { postMessage: vi.fn(), terminate: vi.fn() };
    const replacementApi = { stopScheduling: vi.fn(), flushSession: vi.fn() };
    wrapper.vm.aggregationWorker = replacement;
    wrapper.vm.aggregationWorkerApi = replacementApi;
    stopped();
    await leave;
    expect(state.flush).toHaveBeenCalledOnce();
    expect(replacementApi.flushSession).not.toHaveBeenCalled();
    expect(replacement.terminate).not.toHaveBeenCalled();
  });

  it("resumes background counting when a discard flush fails", async () => {
    state.flush.mockRejectedValueOnce(new Error("network unavailable"));
    await wrapper.vm.confirmDiscard();
    expect(state.update).not.toHaveBeenCalled();
    expect(state.worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "schedule" }));
    expect(wrapper.vm.isSessionMutable).toBe(true);
  });

});

function deferred() {
  let resolve!: (value: any) => void; let reject!: (value: any) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });

  return { promise, resolve, reject };
}

describe("entry handoff and stale actions", () => {
  it.each(["success", "failure"])("waits for the leaving worker before re-entry after sync %s", async outcome => {
    const sync = deferred(); state.flush.mockReturnValueOnce(sync.promise);
    const oldHeartbeat = state.heartbeats[0];
    const leaving = state.leave(); await flushPromises();
    const entering = state.enter(); await flushPromises();
    const workersBeforeCompletion = state.aggs.length;
    const mutableBeforeCompletion = wrapper.vm.isSessionMutable;
    if(outcome === "success") {sync.resolve(complete);} else {sync.reject(new Error("sync failed"));}
    await Promise.all([leaving, entering]);
    expect(workersBeforeCompletion).toBe(1);
    expect(mutableBeforeCompletion).toBe(false);
    expect(state.aggs).toHaveLength(2);
    expect(state.order.indexOf("worker-stop:0")).toBeLessThan(state.order.indexOf("worker-start:1"));
    expect(oldHeartbeat.stopHeartbeat).toHaveBeenCalledOnce();
    expect(state.heartbeats).toHaveLength(2);
    expect(state.heartbeats[1].stopHeartbeat).not.toHaveBeenCalled();
    expect(wrapper.vm.lockWorker).toBe(state.heartbeats[1]);
    expect(wrapper.vm.isSessionMutable).toBe(true);
  });

  it.each(["success", "failure"])("ignores an old submit status response after re-entry when it ends with %s", async outcome => {
    const response = deferred(); state.update.mockReturnValueOnce(response.promise);
    const submitting = wrapper.vm.confirmSubmit(); await flushPromises();
    const leaving = state.leave(); await flushPromises();
    await wrapper.setProps({ inventoryCountImportId: "S2", workEffortId: "W2" });
    const entering = state.enter(); await flushPromises();
    const workersBeforeCompletion = state.aggs.length;
    if(outcome === "success") {response.resolve({ status: 200 });} else {response.reject(new Error("status unavailable"));}
    await Promise.all([submitting, leaving, entering]);
    expect(workersBeforeCompletion).toBe(1);
    expect(state.update).toHaveBeenCalledWith({ inventoryCountImportId: "S1", statusId: "SESSION_SUBMITTED" });
    if(outcome === "success") {expect(state.emit).toHaveBeenCalledWith("inventory-count:session-synced", { workEffortId: "W1" });} else {expect(state.emit).not.toHaveBeenCalled();}
    expect(wrapper.vm.inventoryCountImport.statusId).toBe("SESSION_ASSIGNED");
    expect(state.release).not.toHaveBeenCalled();
    expect(state.replace).not.toHaveBeenCalled();
    expect(state.heartbeats[1].stopHeartbeat).not.toHaveBeenCalled();
    expect(state.toast.mock.calls.flat()).not.toContain("Session submitted successfully");
    expect(state.toast.mock.calls.flat()).not.toContain("Could not sync and submit this session. Your counts are saved on this device. Please try again.");
  });

  it("cancels an old discard before its status request when the view re-enters during flush", async () => {
    const sync = deferred(); state.flush.mockReturnValueOnce(sync.promise);
    const discarding = wrapper.vm.confirmDiscard(); await flushPromises();
    const mutableDuringDiscard = wrapper.vm.isSessionMutable;
    const leaving = state.leave(); await flushPromises();
    const entering = state.enter(); await flushPromises();
    sync.resolve(complete); await Promise.all([discarding, leaving, entering]);
    expect(mutableDuringDiscard).toBe(false);
    expect(state.update).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();
    expect(wrapper.vm.inventoryCountImport.statusId).toBe("SESSION_ASSIGNED");
  });

  it("does not release a reopened lock after a late discard status response", async () => {
    const response = deferred(); state.update.mockReturnValueOnce(response.promise);
    const discarding = wrapper.vm.confirmDiscard(); await flushPromises();
    const leaving = state.leave(); await flushPromises();
    const entering = state.enter(); await flushPromises();
    response.resolve({ status: 200 }); await Promise.all([discarding, leaving, entering]);
    expect(state.release).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();
    expect(wrapper.vm.inventoryCountImport.statusId).toBe("SESSION_ASSIGNED");
    expect(state.heartbeats[1].stopHeartbeat).not.toHaveBeenCalled();
  });

  it("keeps a failed discard editable and resumes background sync", async () => {
    state.update.mockResolvedValueOnce({ status: 500 });
    await wrapper.vm.confirmDiscard();
    expect(wrapper.vm.inventoryCountImport.statusId).toBe("SESSION_ASSIGNED");
    expect(wrapper.vm.isSessionMutable).toBe(true);
    expect(state.push).not.toHaveBeenCalled();
    expect(state.worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "schedule" }));
  });

  it("does not start a worker for an entry that leaves while its session fetch is pending", async () => {
    await state.leave(); const response = deferred(); state.session.mockReturnValueOnce(response.promise);
    const entering = state.enter(); await flushPromises();
    const leaving = state.leave(); await flushPromises();
    response.resolve({ status: 200, data: { statusId: "SESSION_ASSIGNED" } });
    await Promise.all([entering, leaving]);
    expect(state.aggs).toHaveLength(1);
    expect(wrapper.vm.aggregationWorker).toBeNull();
  });
});

describe("cached page and lock acquisition", () => {
  it("ignores a failed old heartbeat lock request after re-entry", async () => {
    const response = deferred(); state.lock.mockReturnValueOnce(response.promise);
    const oldLockRequest = wrapper.vm.handleSessionLock(); await flushPromises();
    await state.leave(); await state.enter();
    response.reject(new Error("old lock request failed")); await oldLockRequest;
    expect(wrapper.vm.sessionLocked).toBe(false);
    expect(wrapper.vm.isSessionMutable).toBe(true);
    expect(state.toast.mock.calls.flat()).not.toContain("Error while acquiring session lock.");
  });

  it("waits for another cached page's writer before creating a new worker", async () => {
    const sync = deferred(); state.flush.mockReturnValueOnce(sync.promise);
    const oldEnter = state.enter, oldLeave = state.leave;
    const leaving = oldLeave(); await flushPromises();
    const other = mount(SessionCountDetail, { props: { workEffortId: "W1", inventoryCountImportId: "S1", inventoryCountTypeId: "DIRECTED_COUNT" }, shallow: true });
    const entering = state.enter(); await flushPromises();
    const workersBeforeCompletion = state.aggs.length;
    sync.resolve(complete); await Promise.all([leaving, entering]);
    const newHeartbeat = state.heartbeats[1];
    const oldStopIndex = state.order.indexOf("worker-stop:0"), newStartIndex = state.order.indexOf("worker-start:1");
    await state.leave(); other.unmount(); state.enter = oldEnter; state.leave = oldLeave;
    expect(workersBeforeCompletion).toBe(1);
    expect(oldStopIndex).toBeLessThan(newStartIndex);
    expect(newHeartbeat.startHeartbeat).toHaveBeenCalledOnce();
  });

  it("does not start a heartbeat after a reopening lock request outlives the view", async () => {
    const response = deferred(); state.lock.mockReturnValueOnce(response.promise);
    wrapper.vm.inventoryCountImport = { statusId: "SESSION_SUBMITTED" };
    wrapper.vm.lockWorker = null;
    const reopening = wrapper.vm.reopen(); await flushPromises();
    const leaving = state.leave(); await flushPromises();
    response.resolve({ status: 200, data: { entityValueList: [{ userId: "unit-only", deviceId: "unit-device", fromDate: 6 }] } });
    await Promise.all([reopening, leaving]);
    expect(state.heartbeats).toHaveLength(1);
    expect(wrapper.vm.lockWorker).toBeNull();
  });
});
