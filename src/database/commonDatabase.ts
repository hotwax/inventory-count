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
  inventoryCountImportId: string
  locationSeqId?: string | null
  quantity: number
  createdAt: number
  aggApplied: number
}

class CommonDB extends Dexie {
  products!: Table<Product, string>
  productIdents!: Table<{ productId: string; identKey: string; value: string }, [string, string]>
  inventoryCountRecords!: Table<InventoryCountImportItem, [string, string]>
  scanEvents!: Table<ScanEvent, number>

  constructor() {
    super('CommonDB')
    this.version(1).stores({
      products: 'productId, updatedAt',
      productIdents: '[productId+identKey], identKey, value',
      inventoryCountRecords: '[inventoryCountImportId+uuid], inventoryCountImportId, uuid, productIdentifier, productId, quantity, isRequested',
      scanEvents: '++id, inventoryCountImportId, aggApplied'
    })
  }
}

export const db = new CommonDB()
