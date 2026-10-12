import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ enter: null as any, leave: null as any, handlers: new Map(), review: vi.fn(), sessions: vi.fn(), work: vi.fn(), facility: vi.fn(), toast: vi.fn() }));
const emitter = vi.hoisted(() => ({
  on: (event: string, handler: any) => state.handlers.set(event, handler),
  off: (event: string) => state.handlers.delete(event),
  emit: (event: string, payload: any) => state.handlers.get(event)?.(payload),
}));
vi.mock("@common", () => ({
  translate: (value: string) => value, emitter,
  commonUtil: { showToast: (...args: any[]) => state.toast(...args), getDateTimeWithOrdinalSuffix: () => "", getProductIdentificationValue: () => "" },
}));
vi.mock("@ionic/vue", async () => ({
  ...await vi.importActual<any>("@ionic/vue"),
  onIonViewDidEnter: (fn: any) => { state.enter = fn; },
  onIonViewWillLeave: (fn: any) => { state.leave = fn; },
}));
vi.mock("@/router", () => ({ default: { push: vi.fn() } }));
vi.mock("@/services/uiUtils", () => ({ loader: { present: vi.fn(), dismiss: vi.fn() } }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ hasPermission: () => true }) }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getStatusDescription: (id: string) => id, getProductIdentificationPref: {} }) }));
vi.mock("@/composables/useInventoryCountRun", () => ({ useInventoryCountRun: () => ({
  getWorkEffort: state.work, getCycleCountSessions: state.sessions, getProductReviewDetailCount: () => Promise.resolve({ status: 200, data: { count: 30 } }), getCycleCount: state.review,
}) }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({}) }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({ prefetch: async () => {}, getById: () => Promise.resolve({}), getProductsOnFacility: state.facility }) }));
vi.mock("@/components/SmartFilterSortBar.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/Image.vue", () => ({ default: { template: "<div />" } }));
import CountProgressReview from "./CountProgressReview.vue";

let wrapper: any;
const items = (counted: number) => Array.from({ length: 30 }, (_, i) => ({ productId: `P${i}`, isRequested: "Y", ...(i < counted ? { quantity: 1 } : {}) }));
const response = (counted: number) => ({ status: 200, data: items(counted) });
beforeEach(() => {
  vi.clearAllMocks(); state.handlers.clear();
  [state.review, state.sessions, state.work, state.facility].forEach(mock => mock.mockReset());
  state.work.mockResolvedValue({ status: 200, data: { workEffortId: "W1", facilityId: "F1", workEffortPurposeTypeId: "DIRECTED_COUNT", statusId: "CYCLE_CNT_IN_PRGS" } });
  state.sessions.mockResolvedValue({ status: 200, data: [{ inventoryCountImportId: "S1", statusId: "SESSION_SUBMITTED" }] });
  state.review.mockResolvedValue(response(14));
  state.facility.mockResolvedValue({ status: 200, data: { entityValueList: [] } });
  wrapper = mount(CountProgressReview, { props: { workEffortId: "W1" }, shallow: true });
});
afterEach(() => wrapper.unmount());

describe("Track progress server refresh", () => {
  it("replaces 14/16 with 30/0 after this count syncs", async () => {
    await state.enter(); expect(wrapper.vm.countedItems).toHaveLength(14);
    state.review.mockResolvedValue(response(30));
    await emitter.emit("inventory-count:session-synced", { workEffortId: "W1" }); await flushPromises();
    expect(wrapper.vm.countedItems).toHaveLength(30);
    expect(wrapper.vm.uncountedItems).toHaveLength(0);
  });
  it("does not append duplicates on re-entry", async () => {
    await state.enter(); await state.enter();
    expect(wrapper.vm.countedItems).toHaveLength(14);
    expect(wrapper.vm.uncountedItems).toHaveLength(16);
  });
  it("ignores another count sync", async () => {
    await state.enter();
    await emitter.emit("inventory-count:session-synced", { workEffortId: "other" });
    expect(state.review).toHaveBeenCalledOnce();
  });
  it("ignores an older response that finishes after a newer refresh", async () => {
    let finish!: (value: any) => void;
    state.review.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const first = state.enter();
    await vi.waitFor(() => expect(state.review).toHaveBeenCalledOnce());
    state.review.mockResolvedValue(response(30));
    await emitter.emit("inventory-count:session-synced", { workEffortId: "W1" }); await flushPromises();
    finish(response(14)); await first;
    expect(wrapper.vm.countedItems).toHaveLength(30);
    expect(wrapper.vm.uncountedItems).toHaveLength(0);
  });
  it("discards responses and unsubscribes when the view leaves", async () => {
    let finish!: (value: any) => void;
    state.review.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const first = state.enter();
    await vi.waitFor(() => expect(state.review).toHaveBeenCalledOnce());
    state.leave(); finish(response(30)); await first;
    expect(wrapper.vm.countedItems).toHaveLength(0);
    expect(state.handlers.has("inventory-count:session-synced")).toBe(false);
  });
  it("does not enable submission after a failed refresh clears the lists", async () => {
    state.review.mockRejectedValue(new Error("network unavailable"));
    await state.enter();
    expect(wrapper.vm.canSubmitForReview).toBe(false);
    expect(state.toast).toHaveBeenCalled();
  });
  it("awaits the hard-count facility list before allowing submission", async () => {
    state.work.mockResolvedValue({ status: 200, data: { facilityId: "F1", workEffortPurposeTypeId: "HARD_COUNT", statusId: "CYCLE_CNT_IN_PRGS" } });
    state.review.mockResolvedValue(response(30));
    let finish!: (value: any) => void;
    state.facility.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const load = state.enter();
    await vi.waitFor(() => expect(state.facility).toHaveBeenCalledOnce());
    expect(wrapper.vm.canSubmitForReview).toBe(false);
    finish({ status: 200, data: { entityValueList: [{ productId: "not-counted" }] } }); await load; await flushPromises();
    expect(wrapper.vm.uncountedItems).toHaveLength(1);
  });
});
