import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Unit doubles at the DB/transport boundaries; the worker itself is real.
// This is concurrency regression coverage, not HotWax backend validation.
const state = vi.hoisted(() => ({ api: null as any, db: null as any, request: vi.fn() }));
vi.mock("comlink", () => ({ expose: (api: any) => { state.api = api; } }));
vi.mock("@/services/commonDatabase", () => ({ createCommonDB: () => state.db }));
vi.mock("@common/core/workerRemoteApi", () => ({ default: (...args: any[]) => state.request(...args) }));

function memoryDb(records: any[]) {
  const rows: Record<string, any[]> = { inventoryCountRecords: records, scanEvents: [], products: [], productIdentification: [] };
  const table = (name: string) => {
    rows[name] ??= [];
    const collection = (test: (row: any) => boolean) => ({
      and: (next: any) => collection(row => test(row) && next(row)),
      toArray: () => Promise.resolve(structuredClone(rows[name].filter(test))),
      first: () => Promise.resolve(structuredClone(rows[name].find(test))),
      count: () => Promise.resolve(rows[name].filter(test).length),
      modify: (values: any) => {
        rows[name].filter(test).forEach(row => Object.assign(row, values));

        return Promise.resolve();
      },
    });
    const key = (row: any, field: string) => field.startsWith("[") ? field.slice(1, -1).split("+").map(part => row[part]) : row[field];

    return {
      where: (field: any) => typeof field === "object"
        ? collection(row => Object.entries(field).every(([key, value]) => row[key] === value))
        : {
          equals: (value: any) => collection(row => JSON.stringify(key(row, field)) === JSON.stringify(value)),
          equalsIgnoreCase: (value: string) => collection(row => String(row[field]).toLowerCase() === value.toLowerCase()),
          anyOf: (values: any[]) => collection(row => values.some(value => JSON.stringify(key(row, field)) === JSON.stringify(value))),
        },
      get: (id: string) => Promise.resolve(structuredClone(rows[name].find(row => row.productId === id))),
      put: (value: any) => {
        const i = rows[name].findIndex(row => row.uuid === value.uuid);
        if(i < 0) {rows[name].push(structuredClone(value));} else {rows[name][i] = structuredClone(value);}

        return Promise.resolve();
      },
      add: (value: any) => {
        rows[name].push(structuredClone(value));

        return Promise.resolve();
      },
    };
  };

  return { open: async () => {}, table, rows };
}
const context = { omsInstance: "unit-only", facilityId: "F1", barcodeIdentification: "SKU" };
const item = () => ({ inventoryCountImportId: "S1", uuid: "I1", productId: "P1", quantity: 12, facilityId: "F1", systemQuantityOnHand: 0, lastUpdatedAt: 10, lastSyncedAt: null });
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(done => { resolve = done; });

  return { promise, resolve };
}
beforeEach(async () => {
  vi.resetModules();
  state.db = memoryDb([item()]);
  state.request.mockReset().mockResolvedValue({});
  vi.stubGlobal("self", { postMessage: vi.fn(), onmessage: null });
  await import("./backgroundAggregation");
});
afterEach(() => { state.api.stopScheduling(); vi.unstubAllGlobals(); });

describe("final session flush", () => {
  it("aggregates and syncs an explicit zero without changing it to one", async () => {
    state.db.rows.inventoryCountRecords[0].quantity = 0;
    state.db.rows.products.push({ productId: "P1" });
    state.db.rows.scanEvents.push({ id: 1, inventoryCountImportId: "S1", productId: "P1", quantity: 0, aggApplied: 0, countedByUserLoginId: "counter" });
    await expect(state.api.flushSession("S1", { ...context, userLoginId: "counter" })).resolves.toMatchObject({ pendingScans: 0, pendingRecords: 0 });
    expect(state.db.rows.inventoryCountRecords[0]).toMatchObject({ quantity: 0, countedByUserLoginId: "counter" });
    expect(state.request.mock.calls[0][0].data.items[0]).toMatchObject({ quantity: 0, countedByUserLoginId: "counter" });
  });
  it("waits for acknowledgment before marking a record synced", async () => {
    const response = deferred();
    state.request.mockReturnValueOnce(response.promise);
    const done = vi.fn();
    const flush = state.api.flushSession("S1", context).then(done);
    await vi.waitFor(() => expect(state.request).toHaveBeenCalledOnce());
    expect(done).not.toHaveBeenCalled();
    expect(state.db.rows.inventoryCountRecords[0].lastSyncedAt).toBeNull();
    response.resolve({}); await flush;
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ synced: 1, pendingRecords: 0, pendingScans: 0 }));
  });
  it("waits behind background sync rather than skipping final work as busy", async () => {
    const response = deferred();
    state.request.mockReturnValueOnce(response.promise);
    const background = self.onmessage!({ data: { type: "aggregate", payload: { inventoryCountImportId: "S1", context } } } as MessageEvent);
    await vi.waitFor(() => expect(state.request).toHaveBeenCalledOnce());
    const done = vi.fn(); const flush = state.api.flushSession("S1", context).then(done);
    await Promise.resolve(); expect(done).not.toHaveBeenCalled();
    response.resolve({}); await background; await flush;
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ pendingRecords: 0 }));
  });
  it("reports a failed request as pending and permits a later retry", async () => {
    state.request.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(state.api.flushSession("S1", context)).resolves.toMatchObject({ synced: 0, pendingRecords: 1 });
    expect(state.db.rows.inventoryCountRecords[0].lastSyncedAt).toBeNull();
    await expect(state.api.flushSession("S1", context)).resolves.toMatchObject({ pendingRecords: 0, synced: 1 });
  });
  it("leaves unresolved QOH pending while syncing resolved records", async () => {
    state.db.rows.inventoryCountRecords.push({ ...item(), uuid: "I2", productId: "P2", systemQuantityOnHand: null });
    state.request.mockImplementation((request: any) => {
      if(request.url === "oms/dataDocumentView") {return Promise.reject(new Error("QOH unavailable"));}

      return Promise.resolve({});
    });
    await expect(state.api.flushSession("S1", context)).resolves.toMatchObject({ synced: 1, pendingRecords: 1 });
    const put = state.request.mock.calls.find(([request]) => request.method === "PUT")![0];
    expect(put.data.items.map((record: any) => record.uuid)).toEqual(["I1"]);
    expect(state.db.rows.inventoryCountRecords[1].lastSyncedAt).toBeNull();
  });
  it("accepts an empty successful response and QOH zero", async () => {
    state.request.mockResolvedValueOnce(null);
    await expect(state.api.flushSession("S1", context)).resolves.toMatchObject({ synced: 1, pendingRecords: 0 });
  });
  it("aggregates pending scans before syncing and retains unmatched products", async () => {
    state.db.rows.products.push({ productId: "P1" });
    state.db.rows.scanEvents.push({ id: 1, inventoryCountImportId: "S1", productId: "P1", scannedValue: "P1", quantity: 3, aggApplied: 0 });
    await expect(state.api.flushSession("S1", context)).resolves.toMatchObject({ pendingScans: 0, pendingRecords: 0 });
    expect(state.request.mock.calls[0][0].data.items[0].quantity).toBe(15);
    state.db.rows.inventoryCountRecords.push({ ...item(), uuid: "unmatched", productId: null, productIdentifier: "unknown" });
    await expect(state.api.flushSession("S1", context)).resolves.toMatchObject({ pendingRecords: 0, unmatchedRecords: 1 });
  });
  it("skips a scheduled tick while the previous one is still queued", async () => {
    vi.useFakeTimers();
    const response = deferred();
    state.request.mockReturnValueOnce(response.promise);
    self.onmessage!({ data: { type: "schedule", payload: { inventoryCountImportId: "S1", context, intervalMs: 10 } } } as MessageEvent);
    await vi.advanceTimersByTimeAsync(50);
    expect(state.request).toHaveBeenCalledOnce();
    state.api.stopScheduling();
    vi.useRealTimers();
    response.resolve({});
    // Queued behind the scheduled flush, so this settles it before teardown.
    await state.api.flushSession("S1", context);
  });
});
