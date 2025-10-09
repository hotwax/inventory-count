import { ref, computed, ComputedRef } from 'vue';
import Dexie, { Table } from 'dexie';
import { useProductMaster } from './useProductMaster';
import { hasError } from '@hotwax/oms-api';
import api from '@/api';
import { wrap } from 'comlink';
import type { InventorySyncWorker } from '@/workers/inventorySyncWorker';

interface ScanEvent {
    id?: number;
    scanId: string;
    importId: string;
    locationSeqId?: string | null;
    sku: string;
    qty: number;
    createdAt: string;
    aggApplied: boolean;
}

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

interface InventoryCountImport {
    inventoryCountImportId: string;
    createdAt: string;
    status: 'active' | 'closed';
    facilityId: string;
}

interface RecordScanParams {
    importId: string;
    sku: string;
    qty: number;
    locationSeqId?: string | null;
}

// Dexie Database

class InventoryCountDB extends Dexie {
    scanEvents!: Table<ScanEvent, number>;
    inventoryCountImportItems!: Table<InventoryCountImportItem, [string, number]>;
    inventoryCountImports!: Table<InventoryCountImport, string>;

    constructor() {
        super('InventoryCountDB');
        this.version(1).stores({
            scanEvents: '++id, scanId, importId, aggApplied',
            inventoryCountImportItems: '[inventoryCountImportId+importItemSeqId], sku, productId',
            inventoryCountImports: 'inventoryCountImportId'
        });
    }
}

const db = new InventoryCountDB();


function generateULID(): string {
    // Placeholder for ULID or other unique ID logic
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

function currentTimestamp(): string {
    return new Date().toISOString();
}

// Composable Implementation

export function useInventoryCountImport() {
    const syncStatus = ref<'idle'>('idle');
    const currentImport = ref<InventoryCountImport | null>(null);
    const productMaster = useProductMaster();

    async function loadSession(importId: string): Promise<void> {
        const session = await db.inventoryCountImports.get(importId);
        currentImport.value = session || null;
    }

    async function createSession(importId: string, facilityId: string): Promise<void> {
        const now = currentTimestamp();
        const session: InventoryCountImport = {
            inventoryCountImportId: importId,
            createdAt: now,
            status: 'active',
            facilityId
        };
        await db.inventoryCountImports.put(session);
        currentImport.value = session;
    }

    async function recordScan(params: RecordScanParams): Promise<void> {
        const scanId = generateULID();
        const event: ScanEvent = {
            scanId,
            importId: params.importId,
            locationSeqId: params.locationSeqId || null,
            sku: params.sku,
            qty: params.qty,
            createdAt: currentTimestamp(),
            aggApplied: false
        };
        await db.scanEvents.add(event);
    }

    async function aggregateScanEvents(): Promise<void> {
        const unAppliedEvents = await db.scanEvents.where('aggApplied').equals("false").toArray();

        if (unAppliedEvents.length === 0) return;

        await db.transaction('rw', db.scanEvents, db.inventoryCountImportItems, async () => {
            for (const scan of unAppliedEvents) {
                const { importId, sku, qty, locationSeqId, createdAt } = scan;

                const existing = await db.inventoryCountImportItems
                    .where('[inventoryCountImportId+sku]')
                    .equals([importId, sku])
                    .first();

                if (!existing) {
                    const product = await productMaster.findByIdentification("sku", sku);

                    // Generate new sequence ID based on max existing
                    const maxSeq = await db.inventoryCountImportItems
                        .where('inventoryCountImportId')
                        .equals(importId)
                        .last()
                        .then(item => item?.importItemSeqId || 0);

                    const seqId = maxSeq + 1;

                    const newItem: InventoryCountImportItem = {
                        inventoryCountImportId: importId,
                        importItemSeqId: seqId,
                        sku,
                        productId: product?.product?.productId || null,
                        productIdentifier: sku,
                        locationSeqId: locationSeqId || null,
                        quantity: qty,
                        lastScanAt: createdAt,
                        syncedQty: 0,
                        lastSyncedAt: null,
                        lastSyncedBatchId: null
                    };
                    await db.inventoryCountImportItems.add(newItem);
                } else {
                    await db.inventoryCountImportItems.update(existing, {
                        quantity: existing.quantity + qty,
                        lastScanAt: createdAt
                    });
                }
                await db.scanEvents.update(scan.id!, { aggApplied: true });
            }
        });
    }

    async function startSyncWorker() {
    if (typeof window === 'undefined') {
        console.warn('Web Workers not available in SSR/Node environment.');
        return;
    }
    console.log('Starting inventory sync worker...');

    const worker = new Worker(
        new URL('@/workers/inventorySyncWorker.ts', import.meta.url),
        { type: 'module' }
    );
    console.log('Worker instantiated:', worker);

    const workerApi = wrap<InventorySyncWorker>(worker);

    console.log('Worker API wrapped:', workerApi);

    try {
        await workerApi.startSync();
    } catch (error) {
        console.error('Error starting inventory sync worker:', error);
    }
    }

    const pendingItems: ComputedRef<Promise<InventoryCountImportItem[]>> = computed(() =>
        db.inventoryCountImportItems
            .where('quantity')
            .notEqual(0)
            .and(item => item.quantity !== item.syncedQty)
            .toArray()
    );

    function startAggregationScheduler(): void {
        // Schedule aggregation every 15 minutes (900000 ms)
        setInterval(() => {
            aggregateScanEvents().catch(error => {
                console.error('Aggregation error:', error);
            });
        }, 15 * 60 * 1000);
    }
    
    async function loadInventoryItemsFromBackend(importId: string): Promise<void> {
        try {
            const params = { inventoryCountImportId: importId };
            const resp = await api({
                url: `/cycleCounts/${importId}/items/summary`,
                method: "GET",
                params
            });

            if (!hasError(resp) && resp?.data?.length) {
                const items = resp.data;                
                await db.transaction('rw', db.inventoryCountImportItems, async () => {
                    for (const item of items) {
                        if (item.inventoryCountImportId === "101746") {
                            console.log("Debugging item 101746", item);
                        }
                        if (item.statusId !== 'INV_COUNT_VOIDED') {
                            await db.inventoryCountImportItems.put({
                                inventoryCountImportId: item.inventoryCountImportId,
                                importItemSeqId: item.importItemSeqId,
                                sku: item.sku,
                                productId: item.productId || null,
                                aggApplied: false,
                                productIdentifier: item.sku,
                                locationSeqId: item.locationSeqId || null,
                                quantity: item.quantity,
                                lastScanAt: item.lastScanAt,
                                syncedQty: item.syncedQty,
                                lastSyncedAt: item.lastSyncedAt || null,
                                lastSyncedBatchId: item.lastSyncedBatchId || null
                            });
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Error loading inventory items", err);
        }
    }

    return {
        currentImport,
        syncStatus,
        loadSession,
        createSession,
        recordScan,
        aggregateScanEvents,
        pendingItems,
        loadInventoryItemsFromBackend,
        startAggregationScheduler,
        startSyncWorker
    };
}