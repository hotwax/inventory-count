import { commonUtil } from "@common";
import { WorkerFactory } from "@common/core/workerFactory";
import { ref } from "vue";
import { useInventoryCountImport } from "@/composables/useInventoryCountImport";
import { finishSessionTeardown, waitForSessionTeardown } from "@/services/sessionSyncLifecycle";
import { useProductStore } from "@/stores/productStore";
import { useUserProfile } from "@/stores/userProfileStore";
import type { InventorySyncWorker } from "@/workers/backgroundAggregation";
import InventorySyncWorkerUrl from "@/workers/backgroundAggregation?worker&url";
import type { LockHeartbeatWorker } from "@/workers/lockHeartbeatWorker";
import LockHeartbeatWorkerUrl from "@/workers/lockHeartbeatWorker?worker&url";

/** Own the lock and sync writer even when handcount is opened without the scanner. */
export function useHandCountSession() {
  const counts = useInventoryCountImport();
  const user = useUserProfile();
  const products = useProductStore();
  const mutable = ref(false);
  let revision = 0;
  let sessionId = "";
  let lock: any;
  let heartbeat: ReturnType<typeof WorkerFactory.createWorker<LockHeartbeatWorker>> | undefined;
  let sync: ReturnType<typeof WorkerFactory.createWorker<InventorySyncWorker>> | undefined;
  const context = () => ({
    omsUrl: commonUtil.getOmsURL(), omsInstance: commonUtil.getOMSInstanceName(),
    maargUrl: commonUtil.getMaargURL(), token: commonUtil.getToken(),
    userLoginId: user.getUserProfile?.username, facilityId: products.getCurrentFacility.facilityId,
    barcodeIdentification: products.getBarcodeIdentificationPref, inventoryCountTypeId: "DIRECTED_COUNT"
  });
  const ok = (response: any) => response?.status === 200 && !commonUtil.hasError(response);
  const owned = (value: any) => value.userId === user.getUserProfile?.username && value.deviceId === user.getDeviceId;

  function stop(flushPending = true) {
    ++revision;
    const previousSync = sync, previousHeartbeat = heartbeat, previousSession = sessionId;
    const shouldFlush = flushPending && mutable.value;
    const previousContext = previousSync ? context() : undefined;
    mutable.value = false;
    sync = undefined;
    heartbeat = undefined;
    lock = undefined;
    // Register synchronously: a scanner/handcount entry waits before creating another writer.
    void finishSessionTeardown(async () => {
      try {
        if(previousSync) {
          await previousSync.api.stopScheduling();
          if(shouldFlush) {await previousSync.api.flushSession(previousSession, previousContext);}
        }
      } finally {
        previousSync?.worker.terminate();
        try { await previousHeartbeat?.api.stopHeartbeat(); } finally { previousHeartbeat?.worker.terminate(); }
      }
    }).catch(() => undefined); // Pending records stay in IndexedDB for the next visit.
  }

  async function start(inventoryCountImportId: string) {
    stop();
    const current = revision;
    sessionId = inventoryCountImportId;
    await waitForSessionTeardown();
    if(current !== revision) {return;}
    const session = await counts.getInventoryCountImportSession({ inventoryCountImportId });
    if(!ok(session)) {throw new Error("Session unavailable");}
    if(current !== revision || session.data?.statusId !== "SESSION_ASSIGNED") {return;}
    const response = await counts.getSessionLock({ inventoryCountImportId });
    if(!ok(response)) {throw new Error("Session lock unavailable");}
    if(current !== revision) {return;}
    const locks = response.data?.entityValueList || [];
    if(locks.some((value: any) => !owned(value))) {return;}
    let acquired = locks[0];
    if(!acquired) {
      const fromDate = Date.now();
      const result = await counts.lockSession({ inventoryCountImportId, userId: user.getUserProfile?.username,
        deviceId: user.getDeviceId, fromDate, thruDate: fromDate + 300000 });
      if(!ok(result)) {throw new Error("Could not acquire session lock");}
      if(current !== revision) {return;}
      // Creation returns only the primary key; read the persisted owner and lease.
      const persisted = await counts.getSessionLock({ inventoryCountImportId });
      if(!ok(persisted)) {throw new Error("Session lock unavailable");}
      const activeLocks = persisted.data?.entityValueList || [];
      if(activeLocks.some((value: any) => !owned(value))) {return;}
      acquired = activeLocks.find((value: any) => String(value.fromDate) === String(result.data?.fromDate));
    }
    if(current !== revision) {return;}
    if(!acquired || !owned(acquired)) {throw new Error("Session lock unavailable");}
    lock = acquired;
    const lease = WorkerFactory.createWorker<LockHeartbeatWorker>(new URL(LockHeartbeatWorkerUrl, import.meta.url));
    heartbeat = lease;
    let lost = false;
    lease.worker.onmessage = event => {
      if(current !== revision) {return;}
      if(event.data.type === "heartbeatSuccess") {
        lock.thruDate = event.data.thruDate;
      } else if(["lockForceReleased", "lockExpired", "reacquireLock", "heartbeatError"].includes(event.data.type)) {
        lost = true;
        stop(false); // Fail closed; retry/re-entry obtains a fresh lease and preserves drafts.
      }
    };
    lease.worker.onerror = () => { if(current === revision) {lost = true; stop(false);} };
    await lease.api.startHeartbeat({ inventoryCountImportId, lock: JSON.parse(JSON.stringify(acquired)),
      leaseSeconds: 300, gracePeriod: 0, maargUrl: commonUtil.getMaargURL(), token: commonUtil.getToken() || "",
      userId: user.getUserProfile?.username, deviceId: user.getDeviceId });
    if(current !== revision || lost) {return;}
    sync = WorkerFactory.createWorker<InventorySyncWorker>(new URL(InventorySyncWorkerUrl, import.meta.url));
    sync.worker.postMessage({ type: "schedule", payload: { inventoryCountImportId, intervalMs: 8000, context: context() } });
    mutable.value = true;
  }

  async function checkMutable() {
    if(!mutable.value || !lock || new Date(lock.thruDate).getTime() <= Date.now()) {
      stop(false);

      return false;
    }
    const current = revision;
    const session = await counts.getInventoryCountImportSession({ inventoryCountImportId: sessionId });
    const response = await counts.getSessionLock({ inventoryCountImportId: sessionId });
    const locks = response.data?.entityValueList || [];
    const allowed = ok(session) && ok(response) && session.data?.statusId === "SESSION_ASSIGNED" &&
      locks.length > 0 && locks.every(owned) && locks.some((value: any) => value.fromDate === lock?.fromDate);
    if(current !== revision) {return false;}
    if(!allowed) {stop(false);}

    return allowed;
  }

  async function flush() {
    if(!sync || !mutable.value) {throw new Error("Session sync unavailable");}
    const result = await sync.api.flushSession(sessionId, context());

    return !result.pendingScans && !result.pendingRecords && !result.unmatchedRecords;
  }

  return { mutable, start, stop, checkMutable, flush };
}
