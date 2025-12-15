import { db } from "@/services/appInitializer";
import { useUserProfile } from "@/stores/userProfileStore";
import { useProductStore } from "@/stores/productStore";
import { useProductMaster } from "@/composables/useProductMaster";
import { inventorySyncWorker } from "@/workers/workerInitiator";
import { useInventoryCountRun } from "./useInventoryCountRun";

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
    ];
   const omsDiagnosticsList = [
    "Cycle count statuses",
    "Cycle count status transitions",
    "User permissions",
    "Session lock heartbeat stream",
    "Product and facility inventory stream",
    "Cycle count variance statuses",
    "Cycle count and session database relations",
    ];

  async function runDiagnostics() {
    const localResults: any[] = [];
    try {
      await db.open();
      localResults.push({ name: "Local database", status: "passed" });
    } catch {
      localResults.push({ name: "Local database", status: "failed" });
    }

   const deviceId = userProfile.getDeviceId;
    localResults.push({ name: "Unique device id", status: deviceId ? "passed" : "failed", detail: deviceId });
    try {
      const count = await db.products.count();
      localResults.push({ name: "Local product cache", status: count >= 0 ? "passed" : "failed", detail: `Count: ${count}` });
    } catch {
      localResults.push({ name: "Local product cache", status: "failed" });
    }
    try {
      const dummyQuery = productMaster.buildProductQuery({
        filter: `productId:*`,
        viewSize: 1,
        fieldsToSelect: "productId"
      });

      await productMaster.loadProducts(dummyQuery);
      localResults.push({ name: "Search index ping (Solr)", status: "passed" });
    } catch (err) {
      console.warn("Solr check failed:", err);
      localResults.push({ name: "Search index ping (Solr)", status: "failed" });
    }

    const scanTableExists = !!db.scanEvents;
    localResults.push({ name: "Scan event parsing", status: scanTableExists ? "passed" : "failed" });
    try {
      await inventorySyncWorker.aggregate("diagnostic-test", {});
      localResults.push({ name: "Session lock heartbeat", status: "passed" });
    } catch (err) {
      console.warn("Worker heartbeat failed:", err);
      localResults.push({ name: "Session lock heartbeat", status: "failed" });
    }

    const barcodeId = productStore.getBarcodeIdentificationPref;
    localResults.push({ name: "Barcode identifier", status: barcodeId ? "passed" : "failed", detail: barcodeId });
    const primaryId = productStore.getProductIdentificationPref?.primaryId;
    localResults.push({ name: "Product display identifier", status: primaryId ? "passed" : "failed", detail: primaryId });

    try {
      const statuses = productStore.getStatusDescriptions;
      localResults.push(
        { name: "Cycle count statuses", status: statuses?.length ? "passed" : "failed", detail: `Count: ${statuses?.length}` }
      );
    } catch {
      localResults.push({ name: "Cycle count statuses", status: "failed" });
    }

    try {
      const perms = userProfile.getUserPermissions;
      localResults.push(
        { name: "User permissions", status: perms?.length ? "passed" : "failed", detail: `Count: ${perms?.length}` }
      );
    } catch {
      localResults.push({ name: "User permissions", status: "failed" });
    }

    try {
      await inventorySyncWorker.aggregate("diagnostic-heartbeat", {});
      localResults.push({ name: "Session lock heartbeat stream", status: "passed" });
    } catch {
      localResults.push({ name: "Session lock heartbeat stream", status: "failed" });
    }

    try {
      const count = await db.productInventory.count();
      localResults.push(
        { name: "Product & facility inventory stream", status: count >= 0 ? "passed" : "failed", detail: `Records: ${count}` }
      );
    } catch {
      localResults.push({ name: "Product & facility inventory stream", status: "failed" });
    }

    try {
      const count = productStore.statusDesc?.length || 0;
      localResults.push(
        { name: "Cycle count variance statuses", status: count ? "passed" : "failed", detail: `Count: ${count}` }
      );
    } catch {
      localResults.push({ name: "Cycle count variance statuses", status: "failed" });
    }

    // OMS DIAGNOSTICS

    let omsDiagnosticsResults: any[] = [];
    let omsDiagnostics = null;

    try {
      const resp = await useInventoryCountRun().getDiagnostics();
      omsDiagnostics = resp.data;
    } catch {
      omsDiagnostics = null;
    }

    if (!omsDiagnostics) {
      omsDiagnosticsResults.push({ name: "Unable to fetch OMS diagnostics", status: "failed" });
      return {localResults, omsDiagnosticsResults};
    }

    omsDiagnosticsResults.push({ name: "Cycle count statuses", status: omsDiagnostics.isStatusConfigured ? "passed" : "failed" });
    omsDiagnosticsResults.push({ name: "Cycle count status transitions", status: omsDiagnostics.isWorkEffortStatusFlowConfigured ? "passed" : "failed" });
    omsDiagnosticsResults.push({ name: "User permissions", status: omsDiagnostics.areAllPermissionConfigured ? "passed" : "failed", detail: omsDiagnostics.missingPermissions?.join(", ") });
    omsDiagnosticsResults.push({ name: "Session lock heartbeat stream", status: omsDiagnostics.isSessionStatusFlowConfigured ? "passed" : "failed" });
    omsDiagnosticsResults.push({ name: "Product and facility inventory stream", status: omsDiagnostics.isAllProductFacDataDocPresent ? "passed" : "failed" });
    omsDiagnosticsResults.push({ name: "Cycle count variance statuses", status: omsDiagnostics.areDecisionReasonsConfigured ? "passed" : "failed" });
    omsDiagnosticsResults.push({ name: "Cycle count and session database relations", status: omsDiagnostics.isWorkEffortRelatedToInventoryCountImport ? "passed" : "failed" });

    return {localResults, omsDiagnosticsResults};
  }

  return { baseDiagnosticsList, omsDiagnosticsList, runDiagnostics };
}
