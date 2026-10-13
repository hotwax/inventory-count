import { beforeEach, describe, expect, it, vi } from "vitest";

// Test the real hydration function at its IndexedDB boundary. These fixtures
// represent a failed sync, not a replacement HotWax backend.
const state = vi.hoisted(() => ({ rows: [] as any[], db: null as any }));
vi.mock("@common", () => ({ api: {} }));
vi.mock("@/services/appInitializer", () => ({ get db() { return state.db; } }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({ upsertInventoryFromSessionItems: () => Promise.resolve() }) }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => ({ getCurrentFacility: { facilityId: "F1" } }) }));
vi.mock("@/services/utils", () => ({ getUploadFileParamName: vi.fn() }));
import { useInventoryCountImport } from "./useInventoryCountImport";

beforeEach(() => {
  state.rows = [
    { inventoryCountImportId: "S1", uuid: "I1", productId: "P1", quantity: 15, lastUpdatedAt: 11, lastSyncedAt: 10, systemQuantityOnHand: 5 },
    { inventoryCountImportId: "S1", uuid: "I2", productId: "P2", quantity: 7, lastUpdatedAt: 10, lastSyncedAt: 10 },
    { inventoryCountImportId: "S1", uuid: "unmatched", productId: null, quantity: 2, lastUpdatedAt: 11, lastSyncedAt: null }
  ];
  const table = {
    bulkGet: (keys: string[][]) => Promise.resolve(keys.map(([id, uuid]) => structuredClone(state.rows.find(row => row.inventoryCountImportId === id && row.uuid === uuid)))),
    bulkPut: (rows: any[]) => {
      for(const row of rows) {
        const index = state.rows.findIndex(existing => existing.inventoryCountImportId === row.inventoryCountImportId && existing.uuid === row.uuid);
        if(index < 0) {state.rows.push(row);} else {state.rows[index] = row;}
      }

      return Promise.resolve();
    }
  };
  state.db = { table: () => table, transaction: (_mode: string, _table: any, work: () => Promise<void>) => work() };
});

describe("server item hydration after failed sync", () => {
  it("preserves pending device quantities while refreshing acknowledged and new rows", async () => {
    await useInventoryCountImport().storeInventoryCountItems([
      { inventoryCountImportId: "S1", uuid: "I1", productId: "P1", quantity: 12, lastUpdatedStamp: 20 },
      { inventoryCountImportId: "S1", uuid: "I2", productId: "P2", quantity: 8, lastUpdatedStamp: 20 },
      { inventoryCountImportId: "S1", uuid: "I4", productId: "P4", quantity: 1, lastUpdatedStamp: 20 }
    ]);
    expect(state.rows.find(row => row.uuid === "I1")).toMatchObject({ quantity: 15, lastUpdatedAt: 11, lastSyncedAt: 10, systemQuantityOnHand: 5 });
    expect(state.rows.find(row => row.uuid === "I2")).toMatchObject({ quantity: 8, lastSyncedAt: 20 });
    expect(state.rows.find(row => row.uuid === "unmatched").quantity).toBe(2);
    expect(state.rows.find(row => row.uuid === "I4").quantity).toBe(1);
  });

  it("preserves a never-acknowledged zero count", async () => {
    Object.assign(state.rows[0], { quantity: 0, lastSyncedAt: null });
    await useInventoryCountImport().storeInventoryCountItems([{ inventoryCountImportId: "S1", uuid: "I1", productId: "P1", quantity: 12, lastUpdatedStamp: 20 }]);
    expect(state.rows[0]).toMatchObject({ quantity: 0, lastSyncedAt: null });
  });
});
