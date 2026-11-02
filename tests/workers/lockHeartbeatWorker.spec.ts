import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Exercise the real worker with a controlled clock and transport boundary.
// Live backend renewal is checked separately; this is not backend validation.
const state = vi.hoisted(() => ({ api: null as any, request: vi.fn() }))
vi.mock('comlink', () => ({ expose: (api: any) => { state.api = api } }))
vi.mock('@common/core/workerRemoteApi', () => ({ default: (...args: any[]) => state.request(...args) }))

const start = Date.UTC(2026, 9, 24)
let serverLock: any
const payload = () => ({
  inventoryCountImportId: 'session', lock: { ...serverLock },
  maargUrl: 'unit-only', token: 'unit-only', userId: 'counter', deviceId: 'device',
})

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(start)
  vi.stubGlobal('self', { postMessage: vi.fn() })
  serverLock = { fromDate: start, thruDate: start + 300_000 }
  state.request.mockReset().mockImplementation(async ({ method, data }) => {
    if (method === 'POST') return { entityValueList: [{ ...serverLock }] }
    serverLock = { ...data }
    return {}
  })
  await import('@/workers/lockHeartbeatWorker')
})

afterEach(() => {
  state.api.stopHeartbeat()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('session lock expiry', () => {
  it.each([undefined, 300])('keeps lease %s bounded over an eight-hour shift', async leaseSeconds => {
    const lease = (leaseSeconds ?? 150) * 1000
    await state.api.startHeartbeat({ ...payload(), leaseSeconds })
    expect(serverLock.thruDate).toBe(Date.now() + lease)
    for (let tick = 0; tick < 960; tick++) {
      await vi.advanceTimersByTimeAsync(30_000)
      expect(serverLock.thruDate).toBe(Date.now() + lease)
      expect(serverLock.lastHeartbeatAt).toBe(Date.now())
    }
    expect(state.request.mock.calls.filter(([r]) => r.method === 'PUT')).toHaveLength(961)
  })

  it('bounds an already inflated server expiry on the next renewal', async () => {
    serverLock.thruDate = start + 7_200_000
    await state.api.startHeartbeat({ ...payload(), leaseSeconds: 300 })
    expect(serverLock.thruDate).toBe(start + 300_000)
    expect(serverLock.fromDate).toBe(start)
  })

  it('lets the last lease expire five minutes after heartbeats stop', async () => {
    await state.api.startHeartbeat({ ...payload(), leaseSeconds: 300 })
    await vi.advanceTimersByTimeAsync(90_000)
    state.api.stopHeartbeat()
    const calls = state.request.mock.calls.length
    await vi.advanceTimersByTimeAsync(300_001)
    expect(serverLock.thruDate).toBeLessThan(Date.now())
    expect(state.request).toHaveBeenCalledTimes(calls)
  })
})
