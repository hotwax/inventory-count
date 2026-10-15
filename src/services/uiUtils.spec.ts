import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@common", () => ({ translate: (message: string) => message }));
vi.mock("@ionic/vue", () => ({ loadingController: { create: state.create } }));
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => { vi.resetModules(); state.create.mockReset(); });
describe("Loading overlay lifecycle", () => {
  it("does not finish presenting until the loading overlay is ready", async () => {
    const ready = deferred();
    state.create.mockResolvedValue({ present: () => ready.promise, dismiss: async () => true });
    const { loader } = await import("@/services/uiUtils");
    let completed = false;
    const task = loader.present("Saving").then(() => { completed = true; });
    await flushPromises();
    expect(state.create).toHaveBeenCalledOnce();
    expect(completed).toBe(false);
    ready.resolve(); await task;
    expect(completed).toBe(true);
  });
  it("does not finish dismissal until the overlay leaves", async () => {
    const left = deferred();
    state.create.mockResolvedValue({ present: async () => {}, dismiss: () => left.promise });
    const { loader } = await import("@/services/uiUtils");
    await loader.present("Saving");
    let completed = false;
    const task = Promise.resolve(loader.dismiss()).then(() => { completed = true; });
    await Promise.resolve();
    expect(completed).toBe(false);
    left.resolve(); await task;
    expect(completed).toBe(true);
  });
});
