import { expose } from 'comlink';
import Dexie, { Table } from 'dexie';
// import { hasError } from '@hotwax/oms-api';
import workerApi from "@/api/workerApi";

interface InventoryCountImportItem {
    inventoryCountImportId: string;
    importItemSeqId: number;
    sku: string;
    productId: string | null;
    aggApplied?: boolean;
    productIdentifier: string;
    locationSeqId?: string | null;
    quantity: number;
    lastScanAt: string;
    syncedQty: number;
    lastSyncedAt?: string | null;
    lastSyncedBatchId?: string | null;
}

class InventoryCountDB extends Dexie {
    inventoryCountImportItems!: Table<InventoryCountImportItem, [string, number]>;

    constructor() {
        super('InventoryCountDB');
        this.version(1).stores({
            inventoryCountImportItems: '[inventoryCountImportId+importItemSeqId], sku, productId'
        });
    }
}

const db = new InventoryCountDB();

export class InventorySyncWorker {
    private isRunning = false;

    async startSync() {
        console.log('Inventory Sync Worker initializing...');
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('Inventory Sync Worker started');
        while (this.isRunning) {
            try {
                await this.syncPendingItems();
            } catch (error) {
                console.error('Error during sync:', error);
            }
            // Wait for 30 seconds before next attempt
            await this.sleep(30000);
        }
    }

    async stopSync() {
        this.isRunning = false;
    }

    private async syncPendingItems() {
        const pendingItems = await db.inventoryCountImportItems
            .where('quantity')
            .notEqual(0)
            .and(item => item.quantity !== item.syncedQty)
            .toArray();

        if (!pendingItems.length) {
            console.log('No pending items to sync');
            return;
        }

        // Group items by inventoryCountImportId
        const grouped = pendingItems.reduce((acc: Record<string, InventoryCountImportItem[]>, item) => {
            if (!acc[item.inventoryCountImportId]) {
                acc[item.inventoryCountImportId] = [];
            }
            acc[item.inventoryCountImportId].push(item);
            return acc;
        }, {});

        for (const [importId, items] of Object.entries(grouped)) {
            const payload = items.map(item => ({
                inventoryCountImportId: item.inventoryCountImportId,
                importItemSeqId: item.importItemSeqId,
                sku: item.sku,
                quantity: item.quantity,
                lastScanAt: item.lastScanAt,
                syncedQty: item.syncedQty
            }));

            console.log(`Syncing ${payload.length} items for importId ${importId}`);

            try {
                // const resp = await CountService.addProductToCount(payload);
                const resp = await workerApi({
                    url: `cycleCounts/${importId}/items/add`,
                    method: "POST",
                    data: payload
                });

                if (resp) {
                    await db.transaction('rw', db.inventoryCountImportItems, async () => {
                        for (const item of payload) {
                            const dbItem = await db.inventoryCountImportItems
                                .where('[inventoryCountImportId+importItemSeqId]')
                                .equals([item.inventoryCountImportId, item.importItemSeqId])
                                .first();

                            if (dbItem) {
                                await db.inventoryCountImportItems.update(dbItem, {
                                    syncedQty: item.quantity,
                                    lastSyncedAt: new Date().toISOString()
                                });
                            }
                        }
                    });
                    console.log(`Batch for importId ${importId} synced successfully`);
                } else {
                    console.error(`API error for importId ${importId}`, "a");
                }
            } catch (error) {
                console.error(`Network or other error during sync for importId ${importId}`, error);
            }
        }
    }


    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

expose(new InventorySyncWorker());