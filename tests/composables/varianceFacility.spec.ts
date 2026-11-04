import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory DB boundary double: verifies query isolation, not backend acceptance.
const state = vi.hoisted(() => ({ db: null as any }));
vi.mock("@/services/appInitializer", () => ({ get db() { return state.db; } }));
vi.mock("@common", () => ({ api: vi.fn(), useSolrSearch: vi.fn() }));
vi.mock("@common/core/workerRemoteApi", () => ({ default: vi.fn() }));
vi.mock("@/stores/productStore", () => ({ useProductStore: vi.fn() }));
vi.mock("dexie", () => ({ liveQuery: (query: any) => query() }));
import { useProductMaster } from "@/composables/useProductMaster";

let rows: Record<string, any[]>;
beforeEach(() => {
  rows = { varianceLogs: [], inventoryAdjustments: [] };
  for(const facilityId of ["F1", "F2"]) {
    rows.varianceLogs.push({ facilityId, scannedValue: "same", createdAt: 1 });
    rows.inventoryAdjustments.push({ facilityId, uuid: "matched", productId: "P1", createdAt: 1 }, { facilityId, uuid: "unmatched", createdAt: 2 });
  }
  const table = (name: string) => {
    const collection = (predicate: (row: any) => boolean): any => ({
      and: (next: any) => collection(row => predicate(row) && next(row)),
      reverse: () => collection(predicate),
      sortBy: async () => rows[name].filter(predicate),
      delete: async () => { rows[name] = rows[name].filter(row => !predicate(row)); }
    });
    return {
      reverse: () => collection(() => true),
      clear: async () => { rows[name] = []; },
      where: (field: string) => ({ equals: (value: any) => collection(row => row[field] === value) }),
      delete: async ([facilityId, uuid]: string[]) => { rows[name] = rows[name].filter(row => row.facilityId !== facilityId || row.uuid !== uuid); }
    };
  };
  state.db = { varianceLogs: table("varianceLogs"), inventoryAdjustments: table("inventoryAdjustments"), products: { get: async () => ({ productId: "P1" }) }, transaction: async (...args: any[]) => args.at(-1)() };
});

describe("variance data access", () => {
  it("returns only the requested facility's scans, matched and unmatched adjustments", async () => {
    const master = useProductMaster();
    const results = await Promise.all([master.getVarianceLogs("F1"), master.getInventoryAdjustments("F1"), master.getUnmatchedInventoryAdjustments("F1")]);
    for(const result of results as any[]) {
      expect(result).toHaveLength(1);
      expect(result[0].facilityId).toBe("F1");
    }
  });
  it("clears only the requested facility", async () => {
    await useProductMaster().clearVarianceLogsAndAdjustments("F1");
    expect(rows.varianceLogs).toEqual([expect.objectContaining({ facilityId: "F2" })]);
    expect(rows.inventoryAdjustments).toHaveLength(2);
    expect(rows.inventoryAdjustments.every(row => row.facilityId === "F2")).toBe(true);
  });
  it.each(["removeInventoryAdjustment", "removeUnmatchedInventoryAdjustment"] as const)("%s preserves the same barcode in another facility", async method => {
    await useProductMaster()[method]("F1", "matched", "same");
    expect(rows.varianceLogs).toEqual([expect.objectContaining({ facilityId: "F2" })]);
    expect(rows.inventoryAdjustments.filter(row => row.facilityId === "F2")).toHaveLength(2);
  });
});
