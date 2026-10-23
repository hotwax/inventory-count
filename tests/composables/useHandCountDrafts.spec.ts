import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { useHandCountDrafts } from "@/composables/useHandCountDrafts";

enableAutoUnmount(afterEach);
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
function screen(scope = ref(["demo", "user", "S1"])) {
  let state!: ReturnType<typeof useHandCountDrafts>;
  const wrapper = mount(defineComponent({ setup() {
    state = useHandCountDrafts(() => scope.value);

    return () => h("div");
  } }));

  return { state, wrapper, scope };
}
describe("handcount draft recovery", () => {
  it("isolates users, instances and sessions while retaining each draft", () => {
    const { state, scope } = screen();
    state.drafts.value.P1 = { value: "", expectedQuantity: 3 };
    for(const next of [["other", "user", "S1"], ["demo", "other", "S1"], ["demo", "user", "S2"]]) {
      scope.value = next;
      expect(state.drafts.value).toEqual({});
    }
    scope.value = ["demo", "user", "S1"];
    expect(state.drafts.value.P1).toEqual({ value: "", expectedQuantity: 3 });
  });
  it("does not restore an explicitly discarded draft", () => {
    const { state, wrapper } = screen();
    state.drafts.value.P1 = { value: "0", expectedQuantity: 3 };
    state.drafts.value = {};
    wrapper.unmount();
    expect(screen().state.drafts.value).toEqual({});
  });
  it("retains in-memory edits and exposes a warning when storage is unavailable", () => {
    const { state } = screen();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("quota exceeded"); });
    state.drafts.value.P1 = { value: "7", expectedQuantity: 3 };
    expect(state.drafts.value.P1.value).toBe("7");
    expect(state.storageFailed.value).toBe(true);
  });
  it("rejects corrupt or invalid saved drafts without breaking the page", () => {
    const { state, wrapper } = screen();
    state.drafts.value.P1 = { value: "7", expectedQuantity: 3 };
    const key = localStorage.key(0)!;
    wrapper.unmount();
    for(const invalid of ["{", "null", "[]", "{\"P1\":{\"value\":\"7\",\"expectedQuantity\":-1}}"]) {
      localStorage.setItem(key, invalid);
      const reopened = screen();
      expect(reopened.state.drafts.value).toEqual({});
      expect(reopened.state.storageFailed.value).toBe(true);
      reopened.wrapper.unmount();
    }
  });
  it("removes a stale in-memory draft when another tab saves or discards it", () => {
    const { state } = screen();
    state.drafts.value.P1 = { value: "7", expectedQuantity: 3 };
    const key = localStorage.key(0)!;
    localStorage.removeItem(key);
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: localStorage }));
    expect(state.drafts.value).toEqual({});
  });
});
