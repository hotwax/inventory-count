import { expose } from 'comlink'
import workerApi from '@/api/workerApi'

export interface LockHeartbeatWorker {
  startHeartbeat: (payload: HeartbeatPayload) => void
  stopHeartbeat: () => void
}

interface HeartbeatPayload {
  inventoryCountImportId: string
  lock: any
  leaseSeconds?: number
  gracePeriod?: number
  omsUrl: string
  maargUrl: string
  token: string
  userId: string
  deviceId: string
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null

async function startHeartbeat(payload: HeartbeatPayload) {
  const {
    inventoryCountImportId,
    lock,
    leaseSeconds = 300,
    gracePeriod = 300,
    maargUrl,
    token
  } = payload

  const resp = await workerApi({
    baseURL: payload.maargUrl,
    url: `oms/dataDocumentView`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    data: {
      dataDocumentId: 'InventoryCountImportLock',
      filterByDate: true,
      pageIndex: 0,
      pageSize: 100,
      customParametersMap: {
        inventoryCountImportId: inventoryCountImportId,
        fromDate: lock.fromDate
      }
    }
  })

  const activeLock = resp?.data?.entityValueList?.[0] || null
  if (!activeLock) {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    postMessage({ type: 'lockForceReleased' })
    return
  }

  if (heartbeatTimer) clearInterval(heartbeatTimer)

  heartbeatTimer = setInterval(async () => {
    try {
      const now = Date.now()

      if (!lock.thruDate) {
        lock.thruDate = now + (leaseSeconds * 1000)
      }

      const currentThruDate = new Date(lock.thruDate).getTime()

      // --- Expiration checks ---
      if (currentThruDate < now) {
        const expiredGrace = currentThruDate + (gracePeriod * 1000) < now

        if (expiredGrace) {
          self.postMessage({ type: 'lockExpired' })
          if (heartbeatTimer) clearInterval(heartbeatTimer)
          heartbeatTimer = null
          return
        } else {
          self.postMessage({ type: 'reacquireLock' })
          return
        }
      }

      // --- Extend lease ---
      const newThruDate = now + (leaseSeconds * 1000)
      const newHeartbeatAt = now

      const body = {
        ...lock,
        thruDate: newThruDate,
        lastHeartbeatAt: newHeartbeatAt
      }

      await workerApi({
        baseURL: maargUrl,
        url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}/lock`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        data: body
      })

      lock.thruDate = newThruDate
      lock.lastHeartbeatAt = newHeartbeatAt

      self.postMessage({ type: 'heartbeatSuccess', thruDate: newThruDate })
    } catch (err: any) {
      console.error('[LockHeartbeatWorker] Heartbeat error:', err)
      self.postMessage({ type: 'heartbeatError', error: err.message })
    }
  }, 60000) // every 60 seconds
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

expose({ startHeartbeat, stopHeartbeat })
