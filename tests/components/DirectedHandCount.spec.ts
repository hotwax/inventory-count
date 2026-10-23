/* eslint-disable require-await -- Async mocks preserve the production service contracts. */
import { IonButton, IonCheckbox, IonInput, IonSearchbar, IonSelect } from "@ionic/vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: [] as any[], save: vi.fn(), toast: vi.fn(), unsubscribe: vi.fn(),
  sort: "assigned", primaryId: "SKU", subscribe: vi.fn(), productAvailable: true, status: "SESSION_ASSIGNED", lock: [] as any[], failLoad: false, flush: vi.fn() }));
vi.mock("@common", () => ({ translate: (key: string) => key, commonUtil: { getOMSInstanceName: () => "demo", hasError: () => false, showToast: state.toast } }));
vi.mock("@/components/Image.vue", () => ({ default: { template: "<img />" } }));
vi.mock("@/composables/useHandCountSession", () => ({ useHandCountSession: () => {
  const mutable = ref(false);

  return { mutable, start: async () => { mutable.value = state.status === "SESSION_ASSIGNED" && !state.lock.length; },
    stop: () => { mutable.value = false; }, checkMutable: async () => mutable.value && state.status === "SESSION_ASSIGNED" && !state.lock.length,
    flush: state.flush };
} }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getCurrentFacility: { facilityId: "F1" }, getPrimaryId: state.primaryId, getProductIdentificationOptions: [], getGoodIdentificationOptions: [] }) }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ getUserProfile: { username: "user" }, getDeviceId: "D1", getSessionDetailFilters: filters, updateUiFilter: (_page: string, _key: string, value: string) => { filters.sort = value; } }) }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({ primaryId: (p: any) => p?.sku || "", secondaryId: () => "", prefetch: vi.fn(), getById: async (id: string) => ({ product: state.productAvailable ? { productId: id } : undefined }) }) }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({
  getInventoryCountImportSession: async () => ({ status: 200, data: { statusId: state.status } }),
  getSessionLock: async () => ({ status: 200, data: { entityValueList: state.lock } }),
  getSessionItemsByImportId: async () => {
    if(state.failLoad) {throw Error("offline");}

    return { status: 200, data: [] };
  },
  storeInventoryCountItems: async () => undefined, getSessionProductIds: async () => [],
  getAssignedHandCountItems: (id: string, sort: string) => ({ subscribe: (listener: any) => {
    state.subscribe(id, sort);
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
import { reactive, ref } from "vue";

const filters = reactive({ sort: "assigned" });
import DirectedHandCount from "@/components/DirectedHandCount.vue";

enableAutoUnmount(afterEach);
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks(); state.flush.mockReset().mockResolvedValue(true); state.save.mockReset().mockResolvedValue(undefined);
  filters.sort = "assigned"; state.primaryId = "SKU";
  state.productAvailable = true; state.status = "SESSION_ASSIGNED"; state.lock = []; state.failLoad = false;
  state.rows = [{ productId: "P1", quantity: 0, product: { productId: "P1", internalName: "Blue shirt", goodIdentifications: [{ type: "SKU", value: "BLUE-SHIRT" }] } }, { productId: "P2", quantity: 3, product: { productId: "P2", goodIdentifications: [{ type: "SKU", value: "BLACK-SHOES" }] } }];
});
async function screen() {
  const wrapper = mount(DirectedHandCount, { props: { inventoryCountImportId: "S1", active: true } }); await flushPromises();

  return wrapper;
}
async function select(wrapper: any, value: string) { wrapper.vm.segment = value; await flushPromises(); }
const input = (wrapper: any, id: string) => wrapper.findAllComponents(IonInput).find((x: any) => x.attributes("data-testid") === `handcount-quantity-${ id}`)!;
async function toggleZero(wrapper: any, id: string) {
  const checkbox = wrapper.findAllComponents(IonCheckbox).find((x: any) => x.attributes("data-testid") === `handcount-zero-${id}`)!;
  checkbox.vm.$emit("ionChange", { detail: { checked: !checkbox.props("checked") } });
  await flushPromises();
}
describe("directed handcount screen", () => {
  it("stages and saves an explicit zero, keeping it counted after re-entry", async () => {
    const wrapper = await screen();
    await toggleZero(wrapper, "P1");
    expect(input(wrapper, "P1").props("value")).toBe("0");
    expect(wrapper.get("[data-testid=\"handcount-row-P1\"]").text()).toContain("Unsaved changes");
    await wrapper.vm.save(); await flushPromises();
    expect(state.save).toHaveBeenCalledWith("S1", [{ productId: "P1", quantity: 0, expectedQuantity: 0 }], "user");
    expect(wrapper.find("[data-testid=\"handcount-row-P1\"]").exists()).toBe(false);
    await select(wrapper, "counted");
    expect(input(wrapper, "P1").props("value")).toBe("0");
    expect(wrapper.get("[data-testid=\"handcount-row-P1\"]").text()).toContain("Counted · 0");
    expect(wrapper.findComponent(IonCheckbox).props("checked")).toBe(true);
    expect(wrapper.findComponent(IonCheckbox).props("disabled")).toBe(true);
    state.rows[0].countedByUserLoginId = "user";
    await wrapper.setProps({ active: false }); await wrapper.setProps({ active: true }); await flushPromises();
    expect(input(wrapper, "P1").props("value")).toBe("0");
  });
  it("can undo a staged zero, edit it above zero, and retain it after a save failure", async () => {
    const wrapper = await screen();
    const zero = () => wrapper.findAllComponents(IonCheckbox).find(x => x.attributes("data-testid") === "handcount-zero-P1")!;
    await toggleZero(wrapper, "P1"); await toggleZero(wrapper, "P1");
    expect(wrapper.text()).not.toContain("Unsaved changes");
    input(wrapper, "P1").vm.$emit("ionInput", { detail: { value: "0" } }); await flushPromises();
    expect(zero().props("checked")).toBe(true);
    await wrapper.get("[data-testid=\"handcount-increase-P1\"]").trigger("click");
    expect(zero().props("checked")).toBe(false);
    await toggleZero(wrapper, "P1"); state.save.mockRejectedValueOnce(Error("offline"));
    await wrapper.vm.save(); await flushPromises();
    expect(zero().props("checked")).toBe(true);
    expect(wrapper.text()).toContain("Unsaved changes");
  });
  it("reports a pending sync without replaying an already persisted edit", async () => {
    const wrapper = await screen();
    await toggleZero(wrapper, "P1");
    state.flush.mockRejectedValueOnce(Error("offline"));
    expect(await wrapper.vm.save()).toBe(true);
    expect(state.toast).toHaveBeenLastCalledWith("Saved on this device. Waiting to sync.");
    expect(wrapper.vm.draftCount).toBe(0);
    await wrapper.vm.save();
    expect(state.save).toHaveBeenCalledTimes(1);
  });
  it("restores unfinished quantities after remount and retains the original conflict baseline", async () => {
    const first = await screen();
    await select(first, "counted");
    input(first, "P2").vm.$emit("ionInput", { detail: { value: "7" } });
    await flushPromises(); first.unmount();
    state.rows[1].quantity = 5;
    const restored = await screen(); await select(restored, "counted");
    expect(input(restored, "P2").props("value")).toBe("7");
    await restored.vm.save();
    expect(state.save).toHaveBeenCalledWith("S1", [{ productId: "P2", quantity: 7, expectedQuantity: 3 }], "user");
    restored.unmount();
    const saved = await screen();
    expect(saved.vm.draftCount).toBe(0);
  });
  it("keeps a failed save through reload, including an explicit zero", async () => {
    const first = await screen(); await toggleZero(first, "P1");
    state.save.mockRejectedValueOnce(Error("offline"));
    await first.vm.save(); first.unmount();
    const restored = await screen();
    expect(restored.vm.draftCount).toBe(1);
    expect(restored.findComponent(IonCheckbox).props("checked")).toBe(true);
  });
  it("shares the list sort preference and retains drafts while changing it", async () => {
    filters.sort = "lastUpdated";
    const wrapper = await screen();
    expect(state.subscribe).toHaveBeenLastCalledWith("S1", "lastUpdated");
    await wrapper.get("[data-testid=\"handcount-increase-P1\"]").trigger("click");
    wrapper.findComponent(IonSelect).vm.$emit("update:modelValue", "alphabetic"); await flushPromises();
    expect(filters.sort).toBe("alphabetic");
    expect(state.subscribe).toHaveBeenLastCalledWith("S1", "alphabetic");
    expect(input(wrapper, "P1").props("value")).toBe("1");
  });
  it("uses the configured primary identifier with the same fallback explanation as the scanner", async () => {
    state.primaryId = "internalName";
    const wrapper = await screen(); await select(wrapper, "assigned");
    expect(wrapper.get("[data-testid=\"handcount-row-P1\"] h2").text()).toBe("Blue shirt");
    expect(wrapper.get("[data-testid=\"handcount-row-P2\"] h2").text()).toBe("BLACK-SHOES");
    expect(wrapper.get("[data-testid=\"handcount-row-P2\"]").text()).toContain("Preferred identifier");
  });
  it("starts with remaining items, preserves edits across segments, and moves rows only after saving", async () => {
    const wrapper = await screen();
    expect(wrapper.find("[data-testid=\"handcount-row-P1\"]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=\"handcount-row-P2\"]").exists()).toBe(false);
    await wrapper.get("[data-testid=\"handcount-increase-P1\"]").trigger("click");
    expect(input(wrapper, "P1").props("value")).toBe("1");
    expect(wrapper.find("[data-testid=\"handcount-row-P1\"]").exists()).toBe(true);
    await select(wrapper, "counted"); await select(wrapper, "assigned");
    expect(input(wrapper, "P1").props("value")).toBe("1");
    await wrapper.vm.save(); await flushPromises();
    expect(state.save).toHaveBeenCalledWith("S1", [{ productId: "P1", quantity: 1, expectedQuantity: 0 }], "user");
    await select(wrapper, "uncounted");
    expect(wrapper.find("[data-testid=\"handcount-empty\"]").exists()).toBe(true);
  });
  it("edits an existing total and prevents negative stepper quantities", async () => {
    const wrapper = await screen(); await select(wrapper, "counted");
    expect(input(wrapper, "P2").props("value")).toBe("3");
    await wrapper.get("[data-testid=\"handcount-increase-P2\"]").trigger("click");
    await wrapper.vm.save(); await flushPromises();
    expect(state.save).toHaveBeenCalledWith("S1", [{ productId: "P2", quantity: 4, expectedQuantity: 3 }], "user");
    await select(wrapper, "assigned");
    const minus = wrapper.findAllComponents(IonButton).find(x => x.attributes("data-testid") === "handcount-decrease-P1")!;
    expect(minus.props("disabled")).toBe(true);
  });
  it("rejects empty/negative input and keeps drafts when saving fails", async () => {
    const wrapper = await screen();
    for(const value of ["", "-1"]) {
      input(wrapper, "P1").vm.$emit("ionInput", { detail: { value } }); await flushPromises();
      await wrapper.vm.save(); await flushPromises();
      expect(state.save).not.toHaveBeenCalled();
    }
    input(wrapper, "P1").vm.$emit("ionInput", { detail: { value: "2" } }); await flushPromises();
    state.save.mockRejectedValueOnce(Error("disk full"));
    await wrapper.vm.save(); await flushPromises();
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
    await wrapper.vm.save(); await flushPromises();
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
