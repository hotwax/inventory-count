import { db } from "@/services/appInitializer";
import { useUserProfile } from "@/stores/userProfileStore";
import { useProductStore } from "@/stores/productStore";
import { useProductMaster } from "@/composables/useProductMaster";
import { inventorySyncWorker } from "@/workers/workerInitiator";

export function useDiagnostics() {
  const userProfile = useUserProfile();
  const productStore = useProductStore();
  const productMaster = useProductMaster();
  const baseDiagnosticsList = [
    "Local database",
    "Unique device id",
    "Local product cache",
    "Search index ping (Solr)",
    "Scan event parsing",
    "Session lock heartbeat",
    "Barcode identifier",
    "Product display identifier",
    "Cycle count statuses",
    "User permissions",
    "Session lock heartbeat stream",
    "Product & facility inventory stream",
    "Cycle count variance statuses",
    // "Cycle count & session database relations"
    ];

  async function runDiagnostics() {
    const results: any[] = [];
    try {
      await db.open();
      results.push({ name: "Local database", status: "passed" });
    } catch {
      results.push({ name: "Local database", status: "failed" });
    }

   const deviceId = userProfile.getDeviceId;
    results.push({ name: "Unique device id", status: deviceId ? "passed" : "failed", detail: deviceId });

    try {
      const count = await db.products.count();
      results.push({ name: "Local product cache", status: count >= 0 ? "passed" : "failed", detail: `Count: ${count}` });
    } catch {
      results.push({ name: "Local product cache", status: "failed" });
    }
    try {
      const dummyQuery = productMaster.buildProductQuery({
        filter: `productId:*`,
        viewSize: 1,
        fieldsToSelect: "productId"
      });

      await productMaster.loadProducts(dummyQuery);
      results.push({ name: "Search index ping (Solr)", status: "passed" });
    } catch (err) {
      console.warn("Solr check failed:", err);
      results.push({ name: "Search index ping (Solr)", status: "failed" });
    }

    const scanTableExists = !!db.scanEvents;
    results.push({ name: "Scan event parsing", status: scanTableExists ? "passed" : "failed" });
    try {
      await inventorySyncWorker.aggregate("diagnostic-test", {});
      results.push({ name: "Session lock heartbeat", status: "passed" });
    } catch (err) {
      console.warn("Worker heartbeat failed:", err);
      results.push({ name: "Session lock heartbeat", status: "failed" });
    }

    const barcodeId = productStore.getBarcodeIdentificationPref;
    results.push({ name: "Barcode identifier", status: barcodeId ? "passed" : "failed", detail: barcodeId });
    const primaryId = productStore.getProductIdentificationPref?.primaryId;
    results.push({ name: "Product display identifier", status: primaryId ? "passed" : "failed", detail: primaryId });

    try {
      const statuses = productStore.getStatusDescriptions;
      results.push(
        { name: "Cycle count statuses", status: statuses?.length ? "passed" : "failed", detail: `Count: ${statuses?.length}` }
      );
    } catch {
      results.push({ name: "Cycle count statuses", status: "failed" });
    }

    try {
      const perms = userProfile.getUserPermissions;
      results.push(
        { name: "User permissions", status: perms?.length ? "passed" : "failed", detail: `Count: ${perms?.length}` }
      );
    } catch {
      results.push({ name: "User permissions", status: "failed" });
    }

    try {
      await inventorySyncWorker.aggregate("diagnostic-heartbeat", {});
      results.push({ name: "Session lock heartbeat stream", status: "passed" });
    } catch {
      results.push({ name: "Session lock heartbeat stream", status: "failed" });
    }

    try {
      const count = await db.productInventory.count();
      results.push(
        { name: "Product & facility inventory stream", status: count >= 0 ? "passed" : "failed", detail: `Records: ${count}` }
      );
    } catch {
      results.push({ name: "Product & facility inventory stream", status: "failed" });
    }

    try {
      const count = productStore.statusDesc?.length || 0;
      results.push(
        { name: "Cycle count variance statuses", status: count ? "passed" : "failed", detail: `Count: ${count}` }
      );
    } catch {
      results.push({ name: "Cycle count variance statuses", status: "failed" });
    }

    // try {
    //   const count = await db.inventoryCountRecords.count();
    //   results.push(
    //     { name: "Cycle count & session database relations", status: count >= 0 ? "passed" : "failed", detail: `Rows: ${count}` }
    //   );
    // } catch {
    //   results.push({ name: "Cycle count & session database relations", status: "failed" });
    // }
    return results;
  }

  return { baseDiagnosticsList, runDiagnostics };
}
