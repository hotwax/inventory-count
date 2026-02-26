import Dexie, { Table } from 'dexie'

export interface Product {
  productId: string
  productName?: string
  parentProductName?: string
  internalName?: string
  mainImageUrl?: string
  goodIdentifications?: { type: string; value: string }[]
  updatedAt: number
}

export interface ProductInventory {
  productId: string
  facilityId: string
  availableToPromiseTotal: number
  quantityOnHandTotal: number
  updatedAt: number
}

export interface InventoryCountImportItem {
  inventoryCountImportId: string
  productId: string | null
  uuid: string
  productIdentifier: string
  locationSeqId?: string | null
  quantity: number
  status: 'active' | 'closed'
  facilityId: string
  createdAt: number
  lastScanAt: number
  lastUpdatedAt?: number
  lastSyncedAt?: number | null
  lastSyncedBatchId?: string | null
  aggApplied?: number
  isRequested?: string,
  systemQuantityOnHand: number
}

export interface ScanEvent {
  id?: number
  scannedValue?: string,
  negatedScanEventId?: number | null,
  productId?: string | null
  inventoryCountImportId: string
  locationSeqId?: string | null
  quantity: number
  createdAt: number
  aggApplied: number
}

export interface VarianceLogs {
  id?: number
  negatedVarianceLogId?: number | null
  scannedValue?: string
  productId: string | null
  facilityId: string | null
  quantity: number
  createdAt: number
  aggApplied: number
}

export interface InventoryAdjustments {
  productId: string | null
  facilityId: string | null
  uuid: string
  scannedValue: string | null
  atp: number | null
  qoh: number | null
  quantity: number
  createdAt: number
}

export interface AppPreferences {
  key: string
  value: string
}

export class CommonDB extends Dexie {
  products!: Table<Product, string>
  productIdentification!: Table<{ productId: string; identKey: string; value: string }, [string, string]>
  productInventory!: Table<ProductInventory, [string, string]>
  inventoryCountRecords!: Table<InventoryCountImportItem, [string, string]>
  scanEvents!: Table<ScanEvent, number>
  varianceLogs!: Table<VarianceLogs, [string, string]>
  inventoryAdjustments!: Table<InventoryAdjustments, [string, string]>
  appPreferences!: Table<AppPreferences, string>

  constructor(omsInstance: string) {
    super(`${omsInstance}-CommonDB`)

    this.version(1).stores({
      products: 'productId, updatedAt',
      productIdentification: '[productId+identKey], identKey, value',
      productInventory: '[productId+facilityId], productId, facilityId',
      inventoryCountRecords: '[inventoryCountImportId+uuid], inventoryCountImportId, uuid, productIdentifier, productId, quantity, isRequested',
      scanEvents: '++id, inventoryCountImportId, scannedValue, productId, aggApplied',
      varianceLogs: '++id, scannedValue, productId, facilityId, aggApplied',
      inventoryAdjustments: '[facilityId+uuid], productId, facilityId, quantity, atp, qoh',
      appPreferences: 'key'
    })
  }
}

export function createCommonDB(omsInstance: string) {
  return new CommonDB(omsInstance);
}
