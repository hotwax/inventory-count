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
  it("keeps one overlay until both overlapping loads finish", async () => {
    const created = deferred();
    const overlay = { present: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(true) };
    state.create.mockImplementation(() => created.promise.then(() => overlay));
    const { loader } = await import("@/services/uiUtils");
    const first = loader.present("Loading...");
    const second = loader.present("Loading...");
    created.resolve();
    await Promise.all([first, second]);
    expect(state.create).toHaveBeenCalledOnce();
    expect(overlay.present).toHaveBeenCalledOnce();
    await loader.dismiss();
    expect(overlay.dismiss).not.toHaveBeenCalled();
    await loader.dismiss();
    expect(overlay.dismiss).toHaveBeenCalledOnce();
    await loader.dismiss();
    expect(overlay.dismiss).toHaveBeenCalledOnce();
  });

  it("keeps a new load visible while the previous overlay finishes dismissing", async () => {
    const left = deferred();
    const first = { present: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn(() => left.promise) };
    const second = { present: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(true) };
    state.create.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { loader } = await import("@/services/uiUtils");
    await loader.present("First");
    const dismissal = loader.dismiss();
    await flushPromises();
    await loader.present("Second");
    left.resolve();
    await dismissal;
    expect(second.dismiss).not.toHaveBeenCalled();
    await loader.dismiss();
    expect(second.dismiss).toHaveBeenCalledOnce();
  });

  it("does not dismiss a load that starts as the last caller finishes", async () => {
    const overlay = { present: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(true) };
    state.create.mockResolvedValue(overlay);
    const { loader } = await import("@/services/uiUtils");
    await loader.present("First");
    const dismissal = loader.dismiss();
    await loader.present("Next");
    await dismissal;
    expect(overlay.dismiss).not.toHaveBeenCalled();
    await loader.dismiss();
    expect(overlay.dismiss).toHaveBeenCalledOnce();
  });

  it("can retry after overlay creation fails", async () => {
    const overlay = { present: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(true) };
    state.create.mockRejectedValueOnce(new Error("Cannot create overlay")).mockResolvedValueOnce(overlay);
    const { loader } = await import("@/services/uiUtils");
    await expect(loader.present("First")).rejects.toThrow("Cannot create overlay");
    await loader.present("Retry");
    await loader.dismiss();
    expect(overlay.dismiss).toHaveBeenCalledOnce();
  });

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
