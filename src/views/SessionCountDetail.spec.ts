import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ leave: null as any, flush: vi.fn(), stop: vi.fn(), update: vi.fn(), replace: vi.fn(), toast: vi.fn(), emit: vi.fn(), worker: { postMessage: vi.fn(), terminate: vi.fn() } }));
vi.mock("@common", () => ({
  translate: (value: string) => value, emitter: { emit: state.emit },
  commonUtil: { showToast: state.toast, getOmsURL: () => "", getOMSInstanceName: () => "unit-only", getMaargURL: () => "", getToken: () => "", getProductIdentificationValue: () => "" },
}));
vi.mock("@ionic/vue", async () => ({ ...await vi.importActual<any>("@ionic/vue"), onIonViewDidEnter: () => {}, onIonViewDidLeave: (fn: any) => { state.leave = fn; } }));
vi.mock("@common/core/workerFactory", () => ({ WorkerFactory: { createWorker: () => ({ worker: state.worker, api: { flushSession: state.flush, stopScheduling: state.stop } }) } }));
vi.mock("@/router", () => ({ default: { replace: state.replace, push: vi.fn() } }));
vi.mock("@/services/uiUtils", () => ({ loader: { present: vi.fn(), dismiss: vi.fn() } }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getCurrentFacility: { facilityId: "F1" }, getProductIdentificationPref: {}, getGoodIdentificationOptions: [], getBarcodeIdentificationPref: "SKU" }) }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ hasPermission: () => true, getUserProfile: { username: "unit-only" } }) }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({ updateSession: state.update }) }));
vi.mock("@/composables/useInventoryCountRun", () => ({ useInventoryCountRun: () => ({}) }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({}) }));
vi.mock("@/services/appInitializer", () => ({ db: {} }));
vi.mock("@/services/scanFeedback", () => ({ playScanSuccessFeedback: vi.fn(), prepareScanSuccessFeedback: vi.fn() }));
vi.mock("@/services/cameraScanProduct", () => ({ createCameraScanProductLookupContext: vi.fn() }));
vi.mock("@/components/Image.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/CameraScanner.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/PendingItemCountSheet.vue", () => ({ default: { template: "<div />" } }));
import SessionCountDetail from "./SessionCountDetail.vue";

let wrapper: any;
const complete = { aggregated: 1, synced: 1, pendingScans: 0, pendingRecords: 0, unmatchedRecords: 0 };
beforeEach(() => {
  vi.clearAllMocks(); [state.flush, state.stop, state.update].forEach(mock => mock.mockReset()); state.flush.mockResolvedValue(complete); state.stop.mockResolvedValue(undefined); state.update.mockResolvedValue({ status: 200 });
  wrapper = mount(SessionCountDetail, { props: { workEffortId: "W1", inventoryCountImportId: "S1", inventoryCountTypeId: "DIRECTED_COUNT" }, shallow: true });
  wrapper.vm.aggregationWorker = state.worker;
  wrapper.vm.aggregationWorkerApi = { flushSession: state.flush, stopScheduling: state.stop };
  wrapper.vm.inventoryCountImport = { statusId: "SESSION_ASSIGNED" };
});
afterEach(() => wrapper.unmount());

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
