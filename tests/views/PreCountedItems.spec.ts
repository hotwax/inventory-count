import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ back: vi.fn(), confirm: vi.fn(), guard: undefined as any }));
vi.mock("@/router", () => ({ default: { back: state.back } }));
vi.mock("vue-router", () => ({ onBeforeRouteLeave: (guard: any) => { state.guard = guard; } }));
vi.mock("@common", () => ({ translate: (key: string) => key, commonUtil: {}, client: vi.fn(), useSolrSearch: vi.fn() }));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({}) }));
vi.mock("@/composables/useInventoryCountRun", () => ({ useInventoryCountRun: () => ({}) }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({}) }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({}) }));
vi.mock("@/services/uiUtils", () => ({ loader: {} }));
vi.mock("@/components/Image.vue", () => ({ default: { template: "<img />" } }));
vi.mock("@/components/DirectedHandCount.vue", () => ({ default: {
  setup(_: any, { expose }: any) { expose({ confirmLeave: state.confirm, draftCount: 9, segment: "assigned", assignedCount: 1510, uncountedCount: 1506 }); },
  template: "<div />"
} }));
import PreCountedItems from "@/views/PreCountedItems.vue";

enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => vi.unstubAllGlobals());
function screen() {
  return mount(PreCountedItems, { props: { workEffortId: "C1", inventoryCountImportId: "S1", inventoryCountTypeId: "DIRECTED_COUNT" } });
}
describe("handcount Back navigation", () => {
  it("keeps browser history unchanged until confirmation and stays when cancelled", async () => {
    let decide!: (allowed: boolean) => void;
    state.confirm.mockImplementation(() => new Promise<boolean>(resolve => { decide = resolve; }));
    const wrapper = screen();
    await wrapper.get("[data-testid=\"pre-counted-items-back-btn\"]").trigger("click");
    expect(state.confirm).toHaveBeenCalledTimes(1);
    expect(state.back).not.toHaveBeenCalled();
    decide(false); await flushPromises();
    expect(state.back).not.toHaveBeenCalled();
  });
  it("goes back once after approval and ignores repeated taps while confirming", async () => {
    let decide!: (allowed: boolean) => void;
    state.confirm.mockImplementation(() => new Promise<boolean>(resolve => { decide = resolve; }));
    const wrapper = screen();
    const back = wrapper.get("[data-testid=\"pre-counted-items-back-btn\"]");
    await back.trigger("click"); await back.trigger("click");
    expect(state.confirm).toHaveBeenCalledTimes(1);
    expect(state.back).not.toHaveBeenCalled();
    decide(true); await flushPromises();
    expect(state.back).toHaveBeenCalledTimes(1);
  });
  it("retains the route guard for navigation outside the app Back button", async () => {
    state.confirm.mockResolvedValue(false);
    screen();
    expect(await state.guard()).toBe(false);
    expect(state.back).not.toHaveBeenCalled();
  });
});
