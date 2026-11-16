import { describe, expect, it, vi } from "vitest";
import { describeEdits, localStateSeverity, relayWorkerDiagnostic, reportDiagnostic, summarizeLocalSession, toAttributes } from "@/services/handCountDiagnostics";
import { needsInventoryCountSync } from "@/services/inventoryCountRecord";

const pushEvent = vi.hoisted(() => vi.fn());
vi.mock("@grafana/faro-web-sdk", () => ({ faro: { api: { pushEvent } } }));

const NOW = 1_800_000_000_000;

describe("summarizeLocalSession", () => {
  it("reports a clean session with nothing duplicated or pending", () => {
    const records = [
      { productId: "11383", quantity: 1, lastSyncedAt: 10, lastUpdatedAt: 10 },
      { productId: "10495", quantity: 7, lastSyncedAt: 10, lastUpdatedAt: 10 }
    ];
    const summary = summarizeLocalSession(records, [], needsInventoryCountSync, NOW);

    expect(summary).toMatchObject({ recordCount: 2, distinctProducts: 2, duplicateProducts: [], unsyncedRecords: 0,
      pendingScanEvents: 0, pendingScanProducts: [], oldestPendingScanAgeSeconds: 0 });
    expect(localStateSeverity(summary)).toBe("info");
  });

  it("flags a product held by two local records, the way a doubled total appears", () => {
    const records = [
      { productId: "10495", quantity: 7, lastSyncedAt: 10, lastUpdatedAt: 10 },
      { productId: " 10495 ", quantity: 7, lastSyncedAt: 10, lastUpdatedAt: 10 },
      { productId: "11383", quantity: 1, lastSyncedAt: 10, lastUpdatedAt: 10 }
    ];
    const summary = summarizeLocalSession(records, [], needsInventoryCountSync, NOW);

    expect(summary.recordCount).toBe(3);
    expect(summary.distinctProducts).toBe(2);
    expect(summary.duplicateProducts).toEqual(["10495"]);
    expect(localStateSeverity(summary)).toBe("warn");
  });

  it("reports unmerged scan events with their products and age", () => {
    const pending = [
      { productId: "10495", createdAt: NOW - 90_000 },
      { productId: "10495", createdAt: NOW - 30_000 },
      { scannedValue: "EXT-3-G", createdAt: NOW - 10_000 }
    ];
    const summary = summarizeLocalSession(
      [{ productId: "10495", quantity: 7, lastSyncedAt: 1, lastUpdatedAt: 1 }],
      pending,
      needsInventoryCountSync,
      NOW
    );

    expect(summary.pendingScanEvents).toBe(3);
    expect(summary.pendingScanProducts).toEqual(["10495", "EXT-3-G"]);
    expect(summary.oldestPendingScanAgeSeconds).toBe(90);
    expect(localStateSeverity(summary)).toBe("warn");
  });

  it("counts records that were edited after their last sync and caps the product lists", () => {
    const records = Array.from({ length: 30 }, (_, index) => ({ productId: `P${index}`, lastSyncedAt: 5, lastUpdatedAt: 9 }));
    const duplicates = records.flatMap(record => [record, record]);
    const summary = summarizeLocalSession(duplicates, [], needsInventoryCountSync, NOW);

    expect(summary.unsyncedRecords).toBe(60);
    expect(summary.duplicateProducts).toHaveLength(20);
  });
});

describe("toAttributes and describeEdits", () => {
  it("turns every value into a string, joins lists and truncates long values", () => {
    const attributes = toAttributes({ count: 3, ok: true, none: undefined, list: ["a", "b"], long: "x".repeat(2000) }, "warn");

    expect(attributes).toMatchObject({ severity: "warn", count: "3", ok: "true", none: "", list: "a,b" });
    expect(attributes.long).toHaveLength(1501);
    expect(attributes.long.endsWith("…")).toBe(true);
  });

  it("describes edits as product:expected>typed and keeps only the first twenty", () => {
    const edits = Array.from({ length: 25 }, (_, index) => ({ productId: `P${index}`, expectedQuantity: 1, quantity: 7 }));

    expect(describeEdits(edits.slice(0, 2))).toEqual(["P0:1>7", "P1:1>7"]);
    expect(describeEdits(edits)).toHaveLength(20);
  });
});

describe("reporting to Faro", () => {
  it("sends a handcount event with string attributes, whatever the app log level is", async () => {
    pushEvent.mockClear();
    await reportDiagnostic("save", { sessionId: "M208164", editCount: 1, edits: ["10495:0>7"] });

    expect(pushEvent).toHaveBeenCalledWith(
      "handcount.save",
      { severity: "info", sessionId: "M208164", editCount: "1", edits: "10495:0>7" },
      "inventory-count"
    );
  });

  it("relays only diagnostic worker messages, under a worker_ name", async () => {
    pushEvent.mockClear();
    expect(relayWorkerDiagnostic({ type: "aggregationComplete", count: 2 }, "S1")).toBe(false);
    expect(relayWorkerDiagnostic(undefined, "S1")).toBe(false);
    expect(relayWorkerDiagnostic({ type: "diagnostic" }, "S1")).toBe(false);
    expect(pushEvent).not.toHaveBeenCalled();

    expect(relayWorkerDiagnostic({ type: "diagnostic", name: "sync_failed", data: { message: "boom" }, severity: "warn" }, "S1")).toBe(true);
    await vi.waitFor(() => expect(pushEvent).toHaveBeenCalledWith(
      "handcount.worker_sync_failed",
      { severity: "warn", sessionId: "S1", message: "boom" },
      "inventory-count"
    ));
  });

  it("never throws when Faro rejects the event", async () => {
    pushEvent.mockImplementationOnce(() => { throw new Error("collector down"); });

    await expect(reportDiagnostic("save")).resolves.toBeUndefined();
  });
});
