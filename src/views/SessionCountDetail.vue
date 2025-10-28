<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/count"></ion-back-button>
        </ion-buttons>
        <ion-title>Session Count Detail</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <!-- Left Panel -->
        <div class="count-events">
          <ion-item class="scan">
            <ion-label position="stacked">SKU / Barcode</ion-label>
            <ion-input
              ref="barcodeInput"
              v-model="scannedValue"
              placeholder="Scan or type SKU"
              @keyup.enter="handleScan"
              :disabled="sessionLocked"
            ></ion-input>
          </ion-item>

          <ion-button
            expand="block"
            color="success"
            class="focus ion-margin-top ion-margin-horizontal"
            @click="startSession"
            :disabled="sessionLocked"
          >
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            Start counting
          </ion-button>

          <ion-item v-if="!events.length" lines="none" class="empty ion-margin-top">
            <ion-label>
              Items you scan or count will show on this list. Focus your scanner on the input field to begin.
            </ion-label>
          </ion-item>

          <div class="events">
            <ion-list>
              <ion-item v-for="event in events" :key="event.id">
                <ion-thumbnail slot="start">
                  <Image v-if="event.matched && event.product" :src="event.product.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  {{ event.scannedValue }}
                  <p>{{ timeAgo(event.createdAt) }}</p>
                </ion-label>
                <ion-note slot="end">{{ event.quantity }}</ion-note>
              </ion-item>
            </ion-list>
          </div>
        </div>

        <!-- Right Panel -->
        <div class="count-dashboard">
          <div class="header ion-padding">
            <ion-item lines="none">
              <ion-label>
                <p class="overline">{{ countTypeLabel }}</p>
                <h1>{{ countImportName || 'Unknown Session' }}</h1>
                <p>Created by {{ userLogin?.userFullName ? userLogin.userFullName : userLogin.username }}</p>
              </ion-label>
            </ion-item>
            <ion-button color="warning" fill="outline" @click="discardSession" :disabled="sessionLocked">
              <ion-icon slot="start" :icon="exitOutline"></ion-icon>
              Discard session
            </ion-button>
            <ion-button color="success" fill="outline" @click="submitSession" :disabled="sessionLocked">
              <ion-icon slot="start" :icon="checkmarkDoneOutline"></ion-icon>
              Submit session
            </ion-button>
          </div>

          <div class="statistics ion-padding">
            <ion-card>
              <ion-card-header>
                <ion-card-title class="overline">Products counted</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="big-number">{{ stats.productsCounted }}</p>
              </ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label>Unmatched scans</ion-label>
                  <p slot="end">{{ stats.unmatched }}</p>
                </ion-item>
              </ion-list>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title class="overline">Units counted</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="big-number">{{ stats.totalUnits }}</p>
              </ion-card-content>
            </ion-card>
          </div>
          <ion-segment v-model="selectedSegment">
            <ion-segment-button value="counted">
              <ion-label>Counted</ion-label>
            </ion-segment-button>
            <ion-segment-button v-if="isDirected" value="uncounted">
              <ion-label>Uncounted</ion-label>
            </ion-segment-button>
            <ion-segment-button v-if="isDirected" value="undirected">
              <ion-label>Undirected</ion-label>
            </ion-segment-button>
            <ion-segment-button value="unmatched">
              <ion-label>Unmatched</ion-label>
            </ion-segment-button>
          </ion-segment>

          <ion-segment-view>
            <!-- Counted -->
            <ion-segment-content v-if="selectedSegment === 'counted'" class="cards">
              <ion-card v-for="item in countedItems" :key="item.uuid">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <Image v-if="item.product?.mainImageUrl" :src="item.product.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>{{ primaryId(item.product) }}</h2>
                    <ion-badge v-if="item.unmatched" color="primary" class="unmatched-badge">
                      Unmatched
                    </ion-badge>
                    <p>{{ secondaryId(item.product) }}</p>
                    <p v-if="item.unmatched" class="ion-text-wrap unmatched-id">
                      {{ item.productIdentifier }}
                    </p>
                    <p>{{ item.quantity }} units</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>

            <!-- Uncounted (Directed only) -->
            <ion-segment-content v-if="isDirected && selectedSegment === 'uncounted'" class="cards">
              <ion-card v-for="item in uncountedItems" :key="item.uuid">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <Image v-if="item.product?.mainImageUrl" :src="item.product.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>{{ primaryId(item.product) }}</h2>
                    <p>{{ secondaryId(item.product) }}</p>
                    <p>{{ item.quantity }} units</p>
                    <p class="ion-text-wrap">Not yet counted</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>

            <!-- Undirected (Directed only) -->
            <ion-segment-content v-if="isDirected && selectedSegment === 'undirected'" class="cards">
              <ion-card v-for="item in undirectedItems" :key="item.uuid">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <Image v-if="item.product?.mainImageUrl" :src="item.product.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>{{ primaryId(item.product) }}</h2>
                    <p>{{ secondaryId(item.product) }}</p>
                    <p>{{ item.quantity }} units</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>

            <!-- Unmatched -->
            <ion-segment-content v-if="selectedSegment === 'unmatched'" class="cards">
              <ion-card v-for="item in unmatchedItems" :key="item.uuid">
                <ion-item>
                  <ion-thumbnail slot="start">
                    <Image v-if="item.product?.mainImageUrl" :src="item.product.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    <h2>{{ item.productIdentifier }}</h2>
                    <p>{{ secondaryId(item.product) }}</p>
                    <p>{{ item.quantity }} units</p>
                  </ion-label>
                  <ion-button slot="end" fill="outline" color="medium" @click="openMatchModal(item)">
                    Match
                  </ion-button>
                </ion-item>
              </ion-card>
            </ion-segment-content>
          </ion-segment-view>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButtons, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonPage,
  IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonThumbnail, IonTitle, IonToolbar
} from '@ionic/vue';
import { barcodeOutline, checkmarkDoneOutline, exitOutline } from 'ionicons/icons';
import { ref, onMounted, computed, defineProps, watchEffect } from 'vue';
import { useProductMaster } from '@/composables/useProductMaster';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { showToast } from '@/utils';
import { useStore } from '@/store';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { v4 as uuidv4 } from 'uuid';
import Image from "@/components/Image.vue";
import api from '@/api';
import { CountService } from '@/services/CountService';
import { useProductIdentificationStore } from "@hotwax/dxp-components";
import { from } from 'rxjs';
import { modalController } from "@ionic/vue";
import MatchProductModal from "@/components/MatchProductModal.vue";

const props = defineProps<{ workEffortId: string; inventoryCountImportId: string; inventoryCountTypeId: string; countImportName: string }>();
const productIdentificationStore = useProductIdentificationStore();

const { recordScan, loadInventoryItemsFromBackend, getInventoryRecordsFromIndexedDB, getUnmatchedItems, getCountedItems, getUncountedItems, getUndirectedItems, submitSession: submitSessionComposable, discardSession: discardSessionComposable } = useInventoryCountImport();
const { init, getById, prefetch, getByIdentificationFromSolr, getAllProductIdsFromIndexedDB, cacheReady } = useProductMaster();
const store = useStore();

const scannedValue = ref('');
const events = ref<any[]>([]);
const selectedSegment = ref('counted');
const stats = ref({ productsCounted: 0, totalUnits: 0, unmatched: 0 });
const barcodeInput = ref();
const sessionLocked = ref(false);
const unmatchedItems = ref<any[]>([]);
const countedItems = ref<any[]>([]);
const uncountedItems = ref<any[]>([]);
const undirectedItems = ref<any[]>([]);

const { getInventoryCountImportSession } = useInventoryCountImport();

let aggregationWorker: Worker | null = null

const countTypeLabel = computed(() =>
  props.inventoryCountTypeId === 'HARD_COUNT' ? 'Hard Count' : 'Directed Count'
);
const isDirected = computed(() => props.inventoryCountTypeId === 'DIRECTED_COUNT');
const userLogin = computed(() => store.getters['user/getUserProfile']);

onMounted(async () => {
  init();
  await startSession();
  from(getUnmatchedItems(props.inventoryCountImportId)).subscribe(items => (unmatchedItems.value = items))
  from(getCountedItems(props.inventoryCountImportId)).subscribe(items => (countedItems.value = items))
  from(getUncountedItems(props.inventoryCountImportId)).subscribe(items => (uncountedItems.value = items))
  from(getUndirectedItems(props.inventoryCountImportId)).subscribe(items => (undirectedItems.value = items))

  watchEffect(() => {
    const totalUnits = countedItems.value.reduce((sum, i) => sum + (i.quantity || 0), 0)
    const distinctProducts = new Set(countedItems.value.map(i => i.uuid)).size
    stats.value = {
      productsCounted: distinctProducts,
      totalUnits,
      unmatched: unmatchedItems.value.length
    }
  })
  console.log('Starting aggregation worker...', import.meta.url)

  aggregationWorker = new Worker(
    new URL('@/workers/backgroundAggregation.ts', import.meta.url), { type: 'module' }
  )

  aggregationWorker.onmessage = (e) => {
    const { type, count } = e.data
    if (type === 'aggregationComplete') {
      console.log(`Aggregated ${count} products from scans`)
    }
  }
  aggregationWorker.onerror = (err) => {
  console.error('[Worker Error]', err.message || err);
};
aggregationWorker.onmessageerror = (err) => {
  console.error('[Worker Message Error]', err);
};
  // Run every 10 seconds
  const omsInfo = store.getters['user/getOmsRedirectionInfo']
  // const productIdentifications = process.env.VUE_APP_PRDT_IDENT ? JSON.parse(JSON.stringify(process.env.VUE_APP_PRDT_IDENT)) : []
  const productStoreSettings = store.getters["user/getProductStoreSettings"];
  const barcodeIdentification = productStoreSettings["barcodeIdentificationPref"]

  aggregationWorker.postMessage({
    type: 'schedule',
    payload: {
      workEffortId: props.workEffortId,
      inventoryCountImportId: props.inventoryCountImportId,
      intervalMs: 8000,
      context: {
        omsUrl: omsInfo.url,
        userLoginId: store.getters['user/getUserProfile']?.username,
        maargUrl: store.getters['user/getBaseUrl'],
        token: omsInfo.token,
        barcodeIdentification: barcodeIdentification
      }
    }
  })
});

async function startSession() {
  try {
    const resp = await getInventoryCountImportSession({ inventoryCountImportId: props.inventoryCountImportId});

    if (resp?.data?.activeUserLoginId) {
      sessionLocked.value = true;
      showToast('This session is already being worked on by another user.');
      return;
    }

    // Load InventoryCountImportItem records into IndexedDB
    await loadInventoryItemsFromBackend(props.workEffortId, props.inventoryCountImportId);

    // Prefetch product details for all related productIds
    const productIds = await getAllProductIdsFromIndexedDB(props.inventoryCountImportId);
    if (productIds.length) await prefetch(productIds);

    // Load the inventory records from IndexedDB
    // const records = await getInventoryRecordsFromIndexedDB(props.inventoryCountImportId);

    // Enrich each record with product details from ProductMaster Dexie
    // const enrichedRecords = await Promise.all(records.map(async (r: any) => {
    //   let product = null;
    //   if (r.productId) {
    //     const res = await getById(r.productId);
    //     product = res?.product || null;
    //   }
    //   return { ...r, product };
    // }));

    // Split enriched records into Counted and Uncounted lists
    // countedItems.value = enrichedRecords.filter((r: any) => (r.quantity || 0) > 0);
    // uncountedItems.value = enrichedRecords.filter((r: any) => !r.quantity || r.quantity === 0);

    showToast('Session ready to start counting');
  } catch (err) {
    console.error(err);
    showToast('Failed to initialize session');
  }

  focusScanner();
}

function focusScanner() {
  barcodeInput.value?.$el?.setFocus();
}

function handleScan() {
  const value = scannedValue.value.trim();
  if (!value) return;

  try {
    recordScan({inventoryCountImportId: props.inventoryCountImportId, productIdentifier: value, quantity: 1});
    events.value.unshift({scannedValue: value, quantity: 1, createdAt: Date.now()});
  } catch (err) {
    console.error(err);
    showToast('Failed to record scan');
  } finally {
    scannedValue.value = '';
  }
}

async function openMatchModal(item: any) {
  const modal = await modalController.create({
    component: MatchProductModal,
    componentProps: {
      workEffortId: props.workEffortId,
      inventoryCountImportId: props.inventoryCountImportId,
      item: item
    },
    showBackdrop: false,
  });

  modal.onDidDismiss().then(({ data }) => {
    if (data?.success) {
      showToast("Product matched successfully");
    }
  });

  modal.present();
}

function timeAgo(ts: number) {
  return dayjs(ts).fromNow();
}

// helper: pick primary/secondary id from enriched product.goodIdentifications
const primaryId = (p?: any) => {
  if (!p) return ''

  const pref = productIdentificationStore.getProductIdentificationPref.primaryId

  const resolve = (type: string) => {
    if (!type) return ''
    if (['SKU', 'SHOPIFY_PROD_SKU'].includes(type))
      return p.goodIdentifications?.find((i: any) => i.type === 'SKU')?.value || ''
    if (type === 'internalName') return p.internalName || ''
    if (type === 'productId') return p.productId || ''
    return p.goodIdentifications?.find((i: any) => i.type === type)?.value || ''
  }

  // Try preference, then fallback to SKU or productId
  return resolve(pref) || resolve('SKU') || p.productId || ''
}

const secondaryId = (p?: any) => {
  if (!p) return ''

  const pref = productIdentificationStore.getProductIdentificationPref.secondaryId

  const resolve = (type: string) => {
    if (!type) return ''
    if (['SKU', 'SHOPIFY_PROD_SKU'].includes(type))
      return p.goodIdentifications?.find((i: any) => i.type === 'SKU')?.value || ''
    if (type === 'internalName') return p.internalName || ''
    if (type === 'productId') return p.productId || ''
    return p.goodIdentifications?.find((i: any) => i.type === type)?.value || ''
  }

  // Try preference, then fallback to productId
  return resolve(pref) || p.productId || ''
}

async function submitSession() {
  try {
    await submitSessionComposable(props.workEffortId);
    showToast('Session submitted successfully');
  } catch (err) {
    console.error(err);
    showToast('Failed to submit session');
  }
}

async function discardSession() {
  try {
    await discardSessionComposable(props.inventoryCountImportId);
    showToast('Session discarded');
  } catch (err) {
    console.error(err);
    showToast('Failed to discard session');
  }
}
</script>

<style scoped>

main {
  display: grid;
  grid-template-columns: 25% auto;
  justify-content: unset;
  align-items: stretch;
}

.count-events {
  border-right: 1px solid var(--ion-color-medium);
  contain: paint;
  height: 100%;
  display: grid;
  grid-template-areas: 
  "scan"
  "focus"
  "empty"
  "events";

  grid-template-rows: min-content min-content min-content 1fr;
}

.scan {
  grid-area: scan;
}

.focus {
  grid-area: focus;
}

.empty {
  grid-area: empty;
}

.events {
  grid-area: events;
  overflow-y: scroll;
  max-height: 100%;
  position: relative;
}

.events ion-list {
  position: absolute;
  inset-inline: 0;
}

.add-pre-counted {
  position: absolute;
  bottom: var(--spacer-base);
  inset-inline: var(--spacer-sm);
  width: stretch;
  grid-area: events;
  align-self: end;
}

ion-card ion-item {
  --background: transparent
}

.count-dashboard {
  height: 100%;
  overflow-y: scroll;
}

.header {
  display: flex;
  flex-wrap: wrap;
}

.header ion-item {
  flex: 1 0 max-content;
}

.header ion-button {
  flex: 0 1 max-content;
}

.statistics {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
}

.statistics ion-card {
  flex: 0 1 305px;
}

ion-segment {
  justify-content: start;
  border-bottom: 1px solid var(--ion-color-medium);
}

ion-segment-view {
  height: unset;
}

.big-number {
  font-size: 78px;
  line-height: 1.2;
  margin: 0;
  color: rgba(var(--ion-text-color));
}

.counted-card {
  position: relative;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unmatched-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.75rem;
  border-radius: 6px;
}

.unmatched-id {
  color: var(--ion-color-primary);
  font-weight: 500;
}

</style>