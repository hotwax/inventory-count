// composables/useInventoryCountImport.ts
import { ref, onMounted } from 'vue'
import Dexie, { Table } from 'dexie'

// Define the schema type
export interface InventoryCountImportItem {
  countedByUserLoginId: string
  createdByUserLoginId: string
  createdDate: number
  importItemSeqId: string
  inventoryCountImportId: string
  itemStatusId: string
  lastUpdatedStamp: number
  parentProductName: string
  productId: string
  quantity: number
}

// Setup Dexie DB
class InventoryDB extends Dexie {
  items!: Table<InventoryCountImportItem, string> // primary key = importItemSeqId

  constructor() {
    super('InventoryDB')
    this.version(1).stores({
      items: 'importItemSeqId, inventoryCountImportId, productId, itemStatusId'
    })
  }
}

const db = new InventoryDB()

export function useInventoryCountImport() {
  const allItems = ref<InventoryCountImportItem[]>([])

  const bulkInsert = async (items: InventoryCountImportItem[]) => {
    // Clear existing records first
    await db.items.clear()
    console.log('items:', items);

    // Insert new batch
    await db.items.bulkAdd(items)
    // Refresh cache
    await fetchAll()
  }

  // Load all items from DB
  const fetchAll = async () => {
    allItems.value = await db.items.toArray()
  }

  // Get item by ID
  const getById = async (importItemSeqId: string) => {
    return await db.items.get(importItemSeqId)
  }

  // Add new item
  const addItem = async (item: InventoryCountImportItem) => {
    await db.items.add(item)
    await fetchAll()
  }

  // Update existing item
  const updateItem = async (importItemSeqId: string, changes: Partial<InventoryCountImportItem>) => {
    console.log('changes', changes);
    console.log('importItemSeqId', importItemSeqId);
    await db.items.update(importItemSeqId, changes)
    await fetchAll()
  }

  // Delete item
  const deleteItem = async (importItemSeqId: string) => {
    await db.items.delete(importItemSeqId)
    await fetchAll()
  }

  onMounted(fetchAll)

  return {
    allItems,
    bulkInsert,
    fetchAll,
    getById,
    addItem,
    updateItem,
    deleteItem
  }
}
