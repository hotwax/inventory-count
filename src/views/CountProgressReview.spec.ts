import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { finishSessionTeardown } from "@/services/sessionSyncLifecycle";

// Unit doubles at the API boundary; this is load-ordering coverage, not HotWax backend validation.
const state = vi.hoisted(() => ({ enter: null as any, leave: null as any, review: vi.fn(), sessions: vi.fn(), work: vi.fn(), facility: vi.fn(), toast: vi.fn(), createSession: vi.fn(), updateItems: vi.fn(), present: vi.fn(), dismiss: vi.fn() }));
vi.mock("@common", () => ({
  translate: (value: string) => value,
  commonUtil: { showToast: (...args: any[]) => state.toast(...args), getDateTimeWithOrdinalSuffix: () => "", getProductIdentificationValue: () => "" },
}));
vi.mock("@ionic/vue", async () => ({
  ...await vi.importActual<any>("@ionic/vue"),
  onIonViewDidEnter: (fn: any) => { state.enter = fn; },
  onIonViewDidLeave: (fn: any) => { state.leave = fn; },
}));
vi.mock("@/router", () => ({ default: { push: vi.fn() } }));
vi.mock("@/services/uiUtils", () => ({ loader: { present: state.present, dismiss: state.dismiss } }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ hasPermission: () => true, getUserProfile: { username: "tester" } }) }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getStatusDescription: (id: string) => id, getProductIdentificationPref: {} }) }));
vi.mock("@/composables/useInventoryCountRun", () => ({ useInventoryCountRun: () => ({
  loadStatusDescription: () => Promise.resolve([]), createSessionOnServer: state.createSession, getWorkEffort: state.work, getCycleCountSessions: state.sessions, getProductReviewDetailCount: () => Promise.resolve({ status: 200, data: { count: 30 } }), getCycleCount: state.review,
}) }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({ updateSessionItem: state.updateItems }) }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({ prefetch: async () => {}, getById: () => Promise.resolve({}), getProductsOnFacility: state.facility }) }));
vi.mock("@/components/SmartFilterSortBar.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/Image.vue", () => ({ default: { template: "<div />" } }));
import CountProgressReview from "@/views/CountProgressReview.vue";

let wrapper: any;
const items = (counted: number) => Array.from({ length: 30 }, (_, i) => ({ productId: `P${i}`, isRequested: "Y", quantity: i < counted ? 1 : -1 }));
const response = (counted: number) => ({ status: 200, data: items(counted) });
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(done => { resolve = done; });

  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  [state.review, state.sessions, state.work, state.facility].forEach(mock => mock.mockReset());
  state.work.mockResolvedValue({ status: 200, data: { workEffortId: "W1", facilityId: "F1", workEffortPurposeTypeId: "DIRECTED_COUNT", statusId: "CYCLE_CNT_IN_PRGS" } });
  state.sessions.mockResolvedValue({ status: 200, data: [{ inventoryCountImportId: "S1", statusId: "SESSION_SUBMITTED" }] });
  state.review.mockResolvedValue(response(14));
  state.facility.mockResolvedValue({ status: 200, data: { entityValueList: [] } });
  wrapper = mount(CountProgressReview, { props: { workEffortId: "W1" }, shallow: true, global: { stubs: { "ion-page": { template: "<div><slot /></div>" }, "ion-alert": { name: "TestAlert", props: ["buttons", "isOpen"], emits: ["didDismiss"], template: "<div />" } } } });
});
afterEach(() => wrapper.unmount());

describe("Track progress loading", () => {
  it("replaces results on re-entry instead of appending duplicates", async () => {
    await state.enter();
    expect(wrapper.vm.countedItems).toHaveLength(14);
    state.review.mockResolvedValue(response(30));
    await state.enter();
    expect(wrapper.vm.countedItems).toHaveLength(30);
    expect(wrapper.vm.uncountedItems).toHaveLength(0);
  });

  it("loads only after the session page that was just left finishes syncing", async () => {
    const sync = deferred();
    void finishSessionTeardown(() => sync.promise);
    const load = state.enter();
    await flushPromises();
    expect(state.work).not.toHaveBeenCalled();
    sync.resolve(undefined); await load;
    expect(state.review).toHaveBeenCalledOnce();
  });

  it("ignores a response that arrives after the view leaves", async () => {
    const page = deferred();
    state.review.mockReturnValueOnce(page.promise);
    const load = state.enter();
    await vi.waitFor(() => expect(state.review).toHaveBeenCalledOnce());
    state.leave(); page.resolve(response(30)); await load;
    expect(wrapper.vm.countedItems).toHaveLength(0);
  });

  it("does not enable submission after a failed load clears the lists", async () => {
    state.review.mockRejectedValue(new Error("network unavailable"));
    await state.enter();
    expect(wrapper.vm.uncountedItems).toHaveLength(0);
    expect(wrapper.vm.canSubmitForReview).toBe(false);
    expect(state.toast).toHaveBeenCalled();
  });

  it("waits for the hard-count facility list before allowing submission", async () => {
    state.work.mockResolvedValue({ status: 200, data: { facilityId: "F1", workEffortPurposeTypeId: "HARD_COUNT", statusId: "CYCLE_CNT_IN_PRGS" } });
    state.review.mockResolvedValue(response(30));
    const facility = deferred();
    state.facility.mockReturnValueOnce(facility.promise);
    const load = state.enter();
    await vi.waitFor(() => expect(state.facility).toHaveBeenCalledOnce());
    expect(wrapper.vm.canSubmitForReview).toBe(false);
    facility.resolve({ status: 200, data: { entityValueList: [{ productId: "not-counted" }] } }); await load;
    expect(wrapper.vm.uncountedItems).toHaveLength(1);
    expect(wrapper.vm.canSubmitForReview).toBe(false);
  });
});


describe("Out-of-stock confirmation lifecycle", () => {
  async function selectItem() {
    await state.enter();
    wrapper.vm.handleOutOfStockCheck({ detail: { checked: true } }, { productId: "P14" });
    wrapper.vm.openBulkOutOfStockConfirm();
    await flushPromises();
    state.createSession.mockResolvedValue({ status: 200, data: { inventoryCountImportId: "OOS1" } });
    state.updateItems.mockResolvedValue({ status: 200 });
    return wrapper.findComponent({ name: "TestAlert" });
  }

  it("waits for the confirmation to dismiss before starting loading and writing counts", async () => {
    const alert = await selectItem();
    const confirm = alert.props("buttons").find((button: any) => button.role === "confirm");
    if (confirm.handler) void confirm.handler();
    await flushPromises();
    expect(state.present).not.toHaveBeenCalled();
    expect(state.createSession).not.toHaveBeenCalled();
    alert.vm.$emit("didDismiss", { detail: { role: "confirm" } });
    await flushPromises();
    expect(wrapper.vm.isBulkOutOfStockConfirmOpen).toBe(false);
    expect(state.createSession).toHaveBeenCalledOnce();
    expect(state.updateItems).toHaveBeenCalledWith(expect.objectContaining({
      inventoryCountImportId: "OOS1", items: [expect.objectContaining({ productId: "P14", quantity: 0 })]
    }));
    expect(wrapper.vm.uncountedItems.some((item: any) => item.productId === "P14")).toBe(false);
    expect(wrapper.vm.workEffort.sessions).toEqual([
      expect.objectContaining({ inventoryCountImportId: "S1" }),
      expect.objectContaining({ inventoryCountImportId: "OOS1", statusId: "SESSION_SUBMITTED", uploadedByUserLogin: "tester" })
    ]);
    expect(state.dismiss).toHaveBeenCalledOnce();
  });

  it("dismisses cancellation without starting an out-of-stock write", async () => {
    const alert = await selectItem();
    alert.vm.$emit("didDismiss", { detail: { role: "cancel" } });
    await flushPromises();
    expect(wrapper.vm.isBulkOutOfStockConfirmOpen).toBe(false);
    expect(state.present).not.toHaveBeenCalled();
    expect(state.createSession).not.toHaveBeenCalled();
  });
});
