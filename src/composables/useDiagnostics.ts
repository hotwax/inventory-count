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
    "User permissions"
    ];
   const omsDiagnosticsList = [
    "Cycle count statuses",
    "Cycle count status transitions",
    "User permissions",
    "Product and facility inventory stream",
    "Cycle count variance statuses",
    "Cycle count and session database relations",
    ];

  async function runDiagnostics() {
    const localResults: any[] = [];
    try {
      await db.open();
      localResults.push({ name: "Local database", status: "passed", detail: "Database connection successful" });
    } catch {
      localResults.push({ name: "Local database", status: "failed", detail: "Database connection failed" });
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
      localResults.push({ name: "Search index ping (Solr)", status: "passed", detail: "Ping successful" });
    } catch (err: any) {
      console.warn("Solr check failed:", err);
      localResults.push({ name: "Search index ping (Solr)", status: "failed", detail: err.message || "Ping failed" });
    }

    const scanTableExists = !!db.scanEvents;
    localResults.push({ name: "Scan event parsing", status: scanTableExists ? "passed" : "failed", detail: scanTableExists ? "Scan events exists" : "Scan events missing" });
    try {
      await inventorySyncWorker.aggregate("diagnostic-test", {});
      localResults.push({ name: "Session lock heartbeat", status: "passed", detail: "Heartbeat worker initialized" });
    } catch (err) {
      console.warn("Worker heartbeat failed:", err);
      localResults.push({ name: "Session lock heartbeat", status: "failed", detail: "Heartbeat worker failed to initialize" });
    }

    const barcodeId = productStore.getBarcodeIdentificationPref;
    localResults.push({ name: "Barcode identifier", status: barcodeId ? "passed" : "failed", detail: barcodeId });
    const primaryId = productStore.getProductIdentificationPref?.primaryId;
    localResults.push({ name: "Product display identifier", status: primaryId ? "passed" : "failed", detail: primaryId });

    try {
      const perms = userProfile.getUserPermissions;
      localResults.push(
        { name: "User permissions", status: perms?.length ? "passed" : "failed", detail: `Count: ${perms?.length}` }
      );
    } catch {
      localResults.push({ name: "User permissions", status: "failed" });
    }

    try {
      const count = await db.productInventory.count();
      localResults.push(
        { name: "Product & facility inventory stream", status: count >= 0 ? "passed" : "failed", detail: `Records: ${count}` }
      );
    } catch {
      localResults.push({ name: "Product & facility inventory stream", status: "failed" });
    }

    // OMS DIAGNOSTICS

    const omsDiagnosticsResults: any[] = [];
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

    omsDiagnosticsResults.push({ name: "Cycle count statuses", status: omsDiagnostics.isStatusConfigured ? "passed" : "failed", detail: omsDiagnostics.isStatusConfigured ? "All configured" : "Missing" });
    omsDiagnosticsResults.push({ name: "Cycle count status transitions", status: omsDiagnostics.isWorkEffortStatusFlowConfigured ? "passed" : "failed", detail: omsDiagnostics.isWorkEffortStatusFlowConfigured ? "All configured" : "Missing" });
    omsDiagnosticsResults.push({ name: "User permissions", status: omsDiagnostics.areAllPermissionConfigured ? "passed" : "failed", detail: omsDiagnostics.missingPermissions?.join(", ") || "No permissions missing" });
    omsDiagnosticsResults.push({ name: "Product and facility inventory stream", status: omsDiagnostics.isAllProductFacDataDocPresent ? "passed" : "failed", detail: `Data document exists` });
    omsDiagnosticsResults.push({ name: "Cycle count variance statuses", status: omsDiagnostics.areDecisionReasonsConfigured ? "passed" : "failed", detail: omsDiagnostics.areDecisionReasonsConfigured ? "All configured" : "Missing" });
    omsDiagnosticsResults.push({ name: "Cycle count and session database relations", status: omsDiagnostics.isWorkEffortRelatedToInventoryCountImport ? "passed" : "failed", detail: omsDiagnostics.isWorkEffortRelatedToInventoryCountImport ? "Related" : "Not related" });

    return {localResults, omsDiagnosticsResults};
  }

  return { baseDiagnosticsList, omsDiagnosticsList, runDiagnostics };
}
