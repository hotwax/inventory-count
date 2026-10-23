/* eslint-disable require-await -- Async mocks preserve the production service contracts. */
import { IonButton, IonInput, IonSearchbar, IonSegment } from "@ionic/vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: [] as any[], save: vi.fn(), toast: vi.fn(), unsubscribe: vi.fn(),
  productAvailable: true, status: "SESSION_ASSIGNED", lock: [] as any[], failLoad: false }));
vi.mock("@common", () => ({ translate: (key: string) => key, commonUtil: { hasError: () => false, showToast: state.toast } }));
vi.mock("@/components/Image.vue", () => ({ default: { template: "<img />" } }));
vi.mock("@/services/sessionSyncLifecycle", () => ({ waitForSessionTeardown: async () => undefined }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getCurrentFacility: { facilityId: "F1" } }) }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ getUserProfile: { username: "user" }, getDeviceId: "D1" }) }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({ primaryId: (p: any) => p?.sku || "", secondaryId: () => "", prefetch: vi.fn(), getById: async (id: string) => ({ product: state.productAvailable ? { productId: id } : undefined }) }) }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({
  getInventoryCountImportSession: async () => ({ status: 200, data: { statusId: state.status } }),
  getSessionLock: async () => ({ status: 200, data: { entityValueList: state.lock } }),
  getSessionItemsByImportId: async () => {
    if(state.failLoad) {throw Error("offline");}

    return { status: 200, data: [] };
  },
  storeInventoryCountItems: async () => undefined, getSessionProductIds: async () => [],
  getAssignedHandCountItems: () => ({ subscribe: (listener: any) => {
    listener.next(structuredClone(state.rows));

    return { unsubscribe: state.unsubscribe };
  } }),
  saveHandCountTotals: state.save
}) }));
// Layout is exercised on the physical iPad; this windowed stub tests draft ownership
// when virtual rows unmount, while retaining real Ionic controls.
vi.mock("vue-virtual-scroller", () => ({
  DynamicScroller: { name: "DynamicScroller", props: ["items"], data: () => ({ start: 0 }),
    template: "<div><slot v-for=\"(item, index) in items.slice(start, start + 50)\" :item=\"item\" :index=\"index\" :active=\"true\" /></div>" },
  DynamicScrollerItem: { template: "<div><slot /></div>" }
}));
import DirectedHandCount from "@/components/DirectedHandCount.vue";

enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks(); state.save.mockReset().mockResolvedValue(undefined);
  state.productAvailable = true; state.status = "SESSION_ASSIGNED"; state.lock = []; state.failLoad = false;
  state.rows = [{ productId: "P1", quantity: 0, product: { sku: "BLUE-SHIRT" } }, { productId: "P2", quantity: 3, product: { sku: "BLACK-SHOES" } }];
});
async function screen() {
  const wrapper = mount(DirectedHandCount, { props: { inventoryCountImportId: "S1", active: true } }); await flushPromises();

  return wrapper;
}
async function select(wrapper: any, value: string) { wrapper.findComponent(IonSegment).vm.$emit("update:modelValue", value); await flushPromises(); }
const input = (wrapper: any, id: string) => wrapper.findAllComponents(IonInput).find((x: any) => x.attributes("data-testid") === `handcount-quantity-${ id}`)!;
describe("directed handcount screen", () => {
  it("starts with remaining items, preserves edits across segments, and moves rows only after saving", async () => {
    const wrapper = await screen();
    expect(wrapper.find("[data-testid=\"handcount-row-P1\"]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=\"handcount-row-P2\"]").exists()).toBe(false);
    await wrapper.get("[data-testid=\"handcount-increase-P1\"]").trigger("click");
    expect(input(wrapper, "P1").props("value")).toBe("1");
    expect(wrapper.find("[data-testid=\"handcount-row-P1\"]").exists()).toBe(true);
    await select(wrapper, "counted"); await select(wrapper, "assigned");
    expect(input(wrapper, "P1").props("value")).toBe("1");
    await wrapper.get("[data-testid=\"handcount-save-btn\"]").trigger("click"); await flushPromises();
    expect(state.save).toHaveBeenCalledWith("S1", [{ productId: "P1", quantity: 1, expectedQuantity: 0 }]);
    await select(wrapper, "uncounted");
    expect(wrapper.find("[data-testid=\"handcount-empty\"]").exists()).toBe(true);
  });
  it("edits an existing total and prevents negative stepper quantities", async () => {
    const wrapper = await screen(); await select(wrapper, "counted");
    expect(input(wrapper, "P2").props("value")).toBe("3");
    await wrapper.get("[data-testid=\"handcount-increase-P2\"]").trigger("click");
    await wrapper.get("[data-testid=\"handcount-save-btn\"]").trigger("click"); await flushPromises();
    expect(state.save).toHaveBeenCalledWith("S1", [{ productId: "P2", quantity: 4, expectedQuantity: 3 }]);
    await select(wrapper, "assigned");
    const minus = wrapper.findAllComponents(IonButton).find(x => x.attributes("data-testid") === "handcount-decrease-P1")!;
    expect(minus.props("disabled")).toBe(true);
  });
  it("rejects empty/negative input and keeps drafts when saving fails", async () => {
    const wrapper = await screen();
    for(const value of ["", "-1"]) {
      input(wrapper, "P1").vm.$emit("ionInput", { detail: { value } }); await flushPromises();
      await wrapper.get("[data-testid=\"handcount-save-btn\"]").trigger("click"); await flushPromises();
      expect(state.save).not.toHaveBeenCalled();
    }
    input(wrapper, "P1").vm.$emit("ionInput", { detail: { value: "2" } }); await flushPromises();
    state.save.mockRejectedValueOnce(Error("disk full"));
    await wrapper.get("[data-testid=\"handcount-save-btn\"]").trigger("click"); await flushPromises();
    expect(input(wrapper, "P1").props("value")).toBe("2");
    expect(wrapper.text()).toContain("Unsaved changes");
  });
  it("filters assigned products and unsubscribes when the cached page is hidden", async () => {
    const wrapper = await screen(); await select(wrapper, "assigned");
    wrapper.findComponent(IonSearchbar).vm.$emit("update:modelValue", "shoes"); await flushPromises();
    expect(wrapper.find("[data-testid=\"handcount-row-P1\"]").exists()).toBe(false);
    expect(wrapper.find("[data-testid=\"handcount-row-P2\"]").exists()).toBe(true);
    await wrapper.setProps({ active: false }); expect(state.unsubscribe).toHaveBeenCalled();
  });
  it("shows a load failure instead of a misleading empty list", async () => {
    state.failLoad = true; const wrapper = await screen();
    expect(wrapper.find("[data-testid=\"handcount-error\"]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=\"handcount-empty\"]").exists()).toBe(false);
  });
  it("keeps drafts if the product cannot be cached for aggregation", async () => {
    const wrapper = await screen(); state.productAvailable = false;
    await wrapper.get("[data-testid=\"handcount-increase-P1\"]").trigger("click");
    await wrapper.get("[data-testid=\"handcount-save-btn\"]").trigger("click"); await flushPromises();
    expect(state.save).not.toHaveBeenCalled();
    expect(input(wrapper, "P1").props("value")).toBe("1");
  });
  it("preserves a draft when its virtual row leaves the window and searches all assigned items", async () => {
    state.rows = Array.from({ length: 120 }, (_, index) => ({ productId: `P${index}`, quantity: 0 }));
    const wrapper = await screen();
    await wrapper.get("[data-testid=\"handcount-increase-P0\"]").trigger("click");
    const scroller = wrapper.findComponent({ name: "DynamicScroller" });
    await scroller.setData({ start: 100 });
    expect(wrapper.find("[data-testid=\"handcount-row-P0\"]").exists()).toBe(false);
    await scroller.setData({ start: 0 });
    expect(input(wrapper, "P0").props("value")).toBe("1");
    wrapper.findComponent(IonSearchbar).vm.$emit("update:modelValue", "P119"); await flushPromises();
    expect(input(wrapper, "P119").exists()).toBe(true);
  });
  it("blocks edits when another device owns the session", async () => {
    state.lock = [{ userId: "other", deviceId: "D2" }]; const wrapper = await screen();
    expect(input(wrapper, "P1").props("disabled")).toBe(true);
  });
});
