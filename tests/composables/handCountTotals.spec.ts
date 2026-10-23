/* eslint-disable require-await -- Async mocks preserve the production service contracts. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ records: [] as any[], scans: [] as any[], query: null as any, db: null as any }));
vi.mock("@common", () => ({ api: vi.fn() }));
vi.mock("@/services/appInitializer", () => ({ get db() { return state.db; } }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({ primaryId: () => "" }) }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({}) }));
vi.mock("@/services/utils", () => ({ getUploadFileParamName: vi.fn() }));
vi.mock("dexie", () => ({ liveQuery: (query: any) => {
  state.query = query;

  return {};
} }));
import { useInventoryCountImport } from "@/composables/useInventoryCountImport";

const counts = useInventoryCountImport();
const save = (sessionId: string, edits: Parameters<typeof counts.saveHandCountTotals>[1]) => counts.saveHandCountTotals(sessionId, edits, "counter");
function table(rows: any[]) {
  return { where: (key: string) => ({ equals: (value: any) => {
    let selected = rows.filter(row => row[key] === value);
    const query = { and: (predicate: any) => {
      selected = selected.filter(predicate);

      return query;
    },
    filter: (predicate: any) => {
      selected = selected.filter(predicate);

      return query;
    },
    toArray: async () => structuredClone(selected) };

    return query;
  } }) };
}
beforeEach(() => {
  state.records = [
    { inventoryCountImportId: "S1", productId: "P1", quantity: 3, isRequested: "Y", importItemSeqId: "2", productIdentifier: "SKU1" },
    { inventoryCountImportId: "S1", productId: "P2", quantity: 0, isRequested: "Y", importItemSeqId: "1", productIdentifier: "SKU2" },
    { inventoryCountImportId: "S1", productId: "P3", quantity: 8, isRequested: "N" },
    { inventoryCountImportId: "S2", productId: "P1", quantity: 99, isRequested: "Y" }
  ];
  state.scans = [];
  state.db = { inventoryCountRecords: table(state.records), scanEvents: { ...table(state.scans),
    bulkAdd: vi.fn(async (events: any[]) => state.scans.push(...events)) }, products: { bulkGet: async (ids: any[]) => ids.map(productId => ({ productId })) },
  productInventory: { where: () => ({ anyOf: () => ({ toArray: async () => [] }) }) },
  transaction: async (_mode: any, _records: any, _scans: any, work: any) => work() };
});
describe("directed handcount totals", () => {
  it("records zero without adding a unit and treats a repeated confirmation as a no-op", async () => {
    const edits = [{ productId: "P2", expectedQuantity: 0, quantity: 0 }];
    await save("S1", edits); await save("S1", edits);
    expect(state.scans).toHaveLength(1);
    expect(state.scans[0]).toMatchObject({ productId: "P2", quantity: 0, countedByUserLoginId: "counter" });
    counts.getAssignedHandCountItems("S1");
    expect((await state.query()).find((item: any) => item.productId === "P2")).toMatchObject({ quantity: 0, countedByUserLoginId: "counter" });
  });
  it("includes confirmed zeros only for directed lists and keeps untouched items uncounted", async () => {
    state.records[1].countedByUserLoginId = "counter";
    state.records.push({ inventoryCountImportId: "S1", productId: "P4", quantity: 0, isRequested: "Y" });
    counts.getCountedItems("S1", "assigned", true);
    expect((await state.query()).map((item: any) => item.productId)).toEqual(["P2", "P1"]);
    counts.getUncountedItems("S1", "assigned", true);
    expect((await state.query()).map((item: any) => item.productId)).toEqual(["P4"]);
    counts.getCountedItems("S1");
    expect((await state.query()).map((item: any) => item.productId)).toEqual(["P1"]);
  });
  it("loads all assigned products in assigned order, including zero counts and pending scans", async () => {
    state.scans.push(
      { inventoryCountImportId: "S1", productId: "P1", quantity: 2, aggApplied: 0 },
      { inventoryCountImportId: "S1", productId: "P1", quantity: 100, aggApplied: 1 }
    );
    counts.getAssignedHandCountItems("S1");
    expect((await state.query()).map((item: any) => [item.productId, item.quantity])).toEqual([["P2", 0], ["P1", 5]]);
  });
  it("uses the shared alphabetical and last-updated orders, including pending saves", async () => {
    counts.getAssignedHandCountItems("S1", "alphabetic");
    expect((await state.query()).map((item: any) => item.productId)).toEqual(["P1", "P2"]);
    state.records[0].lastUpdatedAt = 20;
    state.records[1].lastUpdatedAt = 10;
    state.scans.push({ inventoryCountImportId: "S1", productId: "P2", quantity: 1, createdAt: 30, aggApplied: 0 });
    counts.getAssignedHandCountItems("S1", "lastUpdated");
    expect((await state.query()).map((item: any) => item.productId)).toEqual(["P2", "P1"]);
  });
  it("saves a total of five over an existing three as two additional units", async () => {
    await save("S1", [{ productId: "P1", expectedQuantity: 3, quantity: 5 }]);
    expect(state.scans).toEqual([expect.objectContaining({ productId: "P1", scannedValue: "SKU1", quantity: 2, aggApplied: 0 })]);
  });
  it("reduces totals and includes earlier pending saves when calculating the next delta", async () => {
    await save("S1", [{ productId: "P1", expectedQuantity: 3, quantity: 5 }]);
    await save("S1", [{ productId: "P1", expectedQuantity: 5, quantity: 0 }]);
    expect(state.scans.map(scan => scan.quantity)).toEqual([2, -5]);
    counts.getAssignedHandCountItems("S1");
    expect((await state.query()).find((item: any) => item.productId === "P1").quantity).toBe(0);
  });
  it("rejects a repeated stale save instead of applying it twice", async () => {
    const edits = [{ productId: "P1", expectedQuantity: 3, quantity: 5 }];
    await save("S1", edits);
    await expect(save("S1", edits)).rejects.toThrow("Count changed");
    expect(state.scans).toHaveLength(1);
  });
  it.each([-1, NaN, Infinity])("rejects invalid quantity %s without saving any part of a batch", async quantity => {
    await expect(save("S1", [{ productId: "P1", expectedQuantity: 3, quantity: 4 },
      { productId: "P2", expectedQuantity: 0, quantity }])).rejects.toThrow("Invalid");
    expect(state.db.scanEvents.bulkAdd).not.toHaveBeenCalled();
  });
  it("rejects products outside the directed assignment", async () => {
    await expect(save("S1", [{ productId: "P3", expectedQuantity: 8, quantity: 9 }])).rejects.toThrow("Invalid");
  });
  it("keeps negative corrections when grouping the scanner counted list", async () => {
    state.records[0].quantity = -2;
    state.records.push({ ...state.records[0], quantity: 3, importItemSeqId: "3" });
    counts.getCountedItems("S1");
    expect((await state.query()).map((item: any) => [item.productId, item.quantity])).toEqual([["P1", 1]]);
  });
});
