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
  isRequested?: string
}

export interface ScanEvent {
  id?: number
  scannedValue?: string
  productId?: string
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
  productIdentification!: Table<{ productId: string; identKey: string; value: string }, [string, string]>
  inventoryCountRecords!: Table<InventoryCountImportItem, [string, string]>
  scanEvents!: Table<ScanEvent, number>
  appPreferences!: Table<AppPreferences, string>

  constructor() {
    super('CommonDB')
    this.version(1).stores({
      products: 'productId, updatedAt',
      productIdentification: '[productId+identKey], identKey, value',
      inventoryCountRecords: '[inventoryCountImportId+uuid], inventoryCountImportId, uuid, productIdentifier, productId, quantity, isRequested',
      scanEvents: '++id, inventoryCountImportId, scannedValue, productId, aggApplied',
      appPreferences: 'key'
    })
  }
}

export const db = new CommonDB()
