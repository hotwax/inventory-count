import { wrap } from 'comlink'
import type { Remote } from 'comlink'
import type { InventorySyncWorker } from './backgroundAggregation'

const worker = new Worker(
  new URL('./backgroundAggregation.ts', import.meta.url),
  { type: 'module' }
)

export const inventorySyncWorker = wrap<Remote<InventorySyncWorker>>(worker)