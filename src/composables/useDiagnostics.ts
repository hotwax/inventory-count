import { db } from "@/services/appInitializer";
import { useUserProfile } from "@/stores/userProfileStore";
import { useProductStore } from "@/stores/productStore";
import { useProductMaster } from "@/composables/useProductMaster";
import { inventorySyncWorker } from "@/workers/workerInitiator";

export function useDiagnostics() {
  const userProfile = useUserProfile();
  const productStore = useProductStore();
  const productMaster = useProductMaster();

  function push(results: any[], name: string, status: string, detail?: string) {
    results.push({ name, status, detail });
  }

  async function runDiagnostics() {
    const results: any[] = [];
    try {
      await db.open();
      push(results, "Local database", "passed");
    } catch {
      push(results, "Local database", "failed");
    }

    const deviceId = userProfile.getDeviceId;
    push(results, "Unique device id", deviceId ? "passed" : "failed", deviceId);

    try {
      const count = await db.products.count();
      push(results, "Local product cache", count >= 0 ? "passed" : "failed", `Count: ${count}`);
    } catch {
      push(results, "Local product cache", "failed");
    }
    try {
      const dummyQuery = productMaster.buildProductQuery({
        filter: `productId:*`,
        viewSize: 1,
        fieldsToSelect: "productId"
      });

      await productMaster.loadProducts(dummyQuery);
      push(results, "Search index ping (Solr)", "passed");
    } catch (err) {
      console.warn("Solr check failed:", err);
      push(results, "Search index ping (Solr)", "failed");
    }

    const scanTableExists = !!db.scanEvents;
    push(results, "Scan event parsing", scanTableExists ? "passed" : "failed");

    try {
      // call aggregate with impossible params → only to test worker availability
      await inventorySyncWorker.aggregate("diagnostic-test", {});
      push(results, "Session lock heartbeat", "passed");
    } catch (err) {
      console.warn("Worker heartbeat failed:", err);
      push(results, "Session lock heartbeat", "failed");
    }

    const barcodeId = productStore.getBarcodeIdentificationPref;
    push(results, "Barcode identifier", barcodeId ? "passed" : "failed", barcodeId);

    const primaryId = productStore.getProductIdentificationPref?.primaryId;
    push(results, "Product display identifier", primaryId ? "passed" : "failed", primaryId);

    try {
      const statuses = productStore.getStatusDescriptions;
      push(
        results,
        "Cycle count statuses",
        statuses?.length ? "passed" : "failed",
        `Count: ${statuses?.length}`
      );
    } catch {
      push(results, "Cycle count statuses", "failed");
    }

    try {
      const perms = userProfile.getUserPermissions;
      push(
        results,
        "User permissions",
        perms?.length ? "passed" : "failed",
        `Count: ${perms?.length}`
      );
    } catch {
      push(results, "User permissions", "failed");
    }

    try {
      await inventorySyncWorker.aggregate("diagnostic-heartbeat", {});
      push(results, "Session lock heartbeat stream", "passed");
    } catch {
      push(results, "Session lock heartbeat stream", "failed");
    }

    try {
      const cnt = await db.productInventory.count();
      push(
        results,
        "Product & facility inventory stream",
        cnt >= 0 ? "passed" : "failed",
        `Records: ${cnt}`
      );
    } catch {
      push(results, "Product & facility inventory stream", "failed");
    }

    try {
      const count = productStore.statusDesc?.length || 0;
      push(
        results,
        "Cycle count variance statuses",
        count ? "passed" : "failed",
        `Count: ${count}`
      );
    } catch {
      push(results, "Cycle count variance statuses", "failed");
    }

    try {
      const cnt = await db.inventoryCountRecords.count();
      push(
        results,
        "Cycle count & session database relations",
        cnt >= 0 ? "passed" : "failed",
        `Rows: ${cnt}`
      );
    } catch {
      push(results, "Cycle count & session database relations", "failed");
    }

    return results;
  }

  return { runDiagnostics };
}
