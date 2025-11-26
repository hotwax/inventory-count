import { expose } from 'comlink'
import workerApi from '@/services/workerApi'

export interface LockHeartbeatWorker {
  startHeartbeat: (payload: HeartbeatPayload) => void | Promise<void>
  stopHeartbeat: () => void
}

interface HeartbeatPayload {
  inventoryCountImportId: string
  lock: any
  leaseSeconds?: number
  gracePeriod?: number
  maargUrl: string
  token: string
  userId: string
  deviceId: string
}

interface InternalHeartbeatState extends HeartbeatPayload {
  leaseSeconds: number
  gracePeriod: number
  lock: any
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let currentState: InternalHeartbeatState | null = null

async function startHeartbeat(payload: HeartbeatPayload) {
  // Clear any existing heartbeat
  stopHeartbeat()

  // Deep clone so worker owns its own mutable copy
  const cloned = JSON.parse(JSON.stringify(payload)) as HeartbeatPayload

  currentState = {
    ...cloned,
    leaseSeconds: cloned.leaseSeconds ?? 150,
    gracePeriod: cloned.gracePeriod ?? 300,
    lock: cloned.lock
  }

  // Run first heartbeat immediately
  await performHeartbeat(true)

  // Then schedule periodic heartbeats
  heartbeatTimer = setInterval(() => {
    // fire-and-forget, errors handled inside performHeartbeat
    performHeartbeat(false)
  }, 30000) // every 60 seconds
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  currentState = null
}

/**
 * One heartbeat cycle:
 * 1. Check expiry/grace
 * 2. Call oms/dataDocumentView to ensure lock still exists & is active
 * 3. If active → extend lease via PUT /lock
 */
async function performHeartbeat(isInitial: boolean) {
  if (!currentState) return

  const {
    inventoryCountImportId,
    lock,
    leaseSeconds,
    gracePeriod,
    maargUrl,
    token
  } = currentState

  try {
    const now = Date.now()

    // Initialize thruDate if missing
    if (!lock.thruDate) {
      lock.thruDate = now + leaseSeconds * 1000
    }

    const currentThruDate = new Date(lock.thruDate).getTime()

    // --- Expiration checks ---
    if (currentThruDate < now) {
      const expiredGrace = currentThruDate + gracePeriod * 1000 < now

      if (expiredGrace) {
        // Fully expired, even grace period elapsed
        self.postMessage({ type: 'lockExpired' })
        stopHeartbeat()
        return
      } else {
        // Within grace – tell UI to reacquire
        self.postMessage({ type: 'reacquireLock' })
        return
      }
    }

    // --- Check active lock from server before extending lease ---
    let activeLock: any = null
    try {
      const resp = await workerApi({
        baseURL: maargUrl,
        url: 'oms/dataDocumentView',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          dataDocumentId: 'InventoryCountImportLock',
          filterByDate: true,
          pageIndex: 0,
          pageSize: 1,
          customParametersMap: {
            inventoryCountImportId,
            fromDate: lock.fromDate
          }
        }
      })

      activeLock = resp?.entityValueList?.[0] || null
    } catch (err: any) {
      console.error('[LockHeartbeatWorker] Active lock check failed:', err)
      self.postMessage({
        type: 'heartbeatError',
        error: err?.message ?? String(err)
      })
      // Don’t stop the heartbeat on transient errors
    }

    if (!activeLock) {
      // No active lock found – someone force-released it or session ended
      self.postMessage({ type: 'lockForceReleased' })
      stopHeartbeat()
      return
    }

    // (Optional) You can further validate owner here:
    // if (activeLock.userId !== currentState.userId || activeLock.deviceId !== currentState.deviceId) {
    //   self.postMessage({ type: 'lockForceReleased' })
    //   stopHeartbeat()
    //   return
    // }

    if (activeLock) {
      currentState.lock = JSON.parse(JSON.stringify(activeLock))
    }

    // --- Extend lease on server ---
    const newThruDate = activeLock.thruDate + leaseSeconds * 1000
    const newHeartbeatAt = now

    // Deep clone lock before sending
    const body = JSON.parse(JSON.stringify(lock))
    body.thruDate = newThruDate
    body.lastHeartbeatAt = newHeartbeatAt


    await workerApi({
      baseURL: maargUrl,
      url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}/lock`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      data: body
    })

    // Update local state
    lock.thruDate = newThruDate
    lock.lastHeartbeatAt = newHeartbeatAt

    self.postMessage({ type: 'heartbeatSuccess', thruDate: newThruDate })
  } catch (err: any) {
    console.error('[LockHeartbeatWorker] Heartbeat error:', err)
    self.postMessage({
      type: 'heartbeatError',
      error: err?.message ?? String(err)
    })
    // Keep the interval; might be a transient network issue
  }
}

expose({ startHeartbeat, stopHeartbeat })