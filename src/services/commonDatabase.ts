import Dexie, { Table } from 'dexie'

export interface Product {
  productId: string
  omsInstanceId: string
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
  omsInstanceId: string
  availableToPromiseTotal: number
  quantityOnHandTotal: number
  updatedAt: number
}

export interface InventoryCountImportItem {
  inventoryCountImportId: string
  productId: string | null
  omsInstanceId: string
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
  isRequested?: string
}

export interface ScanEvent {
  id?: number
  omsInstanceId: string
  scannedValue?: string
  productId?: string | null
  inventoryCountImportId: string
  locationSeqId?: string | null
  quantity: number
  createdAt: number
  aggApplied: number
}

export interface AppPreferences {
  key: string
  value: string
}

class CommonDB extends Dexie {
  products!: Table<Product, string>
  productIdentification!: Table<{ productId: string; identKey: string; value: string, omsInstanceId: string }, [string, string]>
  productInventory!: Table<ProductInventory, [string, string, string]>
  inventoryCountRecords!: Table<InventoryCountImportItem, [string, string, string]>
  scanEvents!: Table<ScanEvent, number>
  appPreferences!: Table<AppPreferences, string>

  constructor() {
    super('CommonDB')
    this.version(1).stores({
      products: '[productId+omsInstanceId], updatedAt, omsInstanceId',
      productIdentification: '[productId+identKey+omsInstanceId], identKey, value, omsInstanceId, [identKey+value+omsInstanceId], [omsInstanceId+value]',
      productInventory: '[productId+facilityId+omsInstanceId], productId, [productId+omsInstanceId], facilityId, omsInstanceId',
      inventoryCountRecords: '[inventoryCountImportId+uuid+omsInstanceId], [inventoryCountImportId+omsInstanceId], inventoryCountImportId, uuid, productIdentifier, productId, quantity, isRequested, omsInstanceId',
      scanEvents: '++id, inventoryCountImportId, scannedValue, productId, aggApplied, omsInstanceId, [inventoryCountImportId+omsInstanceId]',
      appPreferences: 'key'
    })
  }
}

export const db = new CommonDB()
