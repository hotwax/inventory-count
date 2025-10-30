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

    <ion-content ref="pageRef">
      <main>
        <!-- Left Panel -->
        <div class="count-events">
          <ion-item class="scan">
            <ion-label position="stacked">sku</ion-label>
            <ion-input
              ref="barcodeInput"
              v-model="scannedValue"
              placeholder="Scan a barcode"
              @keyup.enter="handleScan"
              :disabled="sessionLocked || inventoryCountImport?.statusId === 'SESSION_VOIDED' || inventoryCountImport?.statusId === 'SESSION_SUBMITTED'"
            ></ion-input>
          </ion-item>

          <ion-button
            expand="block"
            color="success"
            class="focus ion-margin-top ion-margin-horizontal"
            @click="startSession"
            :disabled="sessionLocked || inventoryCountImport?.statusId === 'SESSION_VOIDED' || inventoryCountImport?.statusId === 'SESSION_SUBMITTED'"
          >
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            start counting
          </ion-button>

          <ion-item v-if="!events.length" lines="none" class="empty ion-margin-top">
            <ion-label>
              Items you scan or count will show on this list. Focus your scanner on the input field to begin.
            </ion-label>
          </ion-item>

          <div class="events">
            <ion-list>
              <ion-item v-for="event in events" :key="event.id" :class="{ unaggregated: event.aggApplied === 0 }">
                <ion-thumbnail slot="start">
                  <Image v-if="event.matched && event.product" :src="event.product.mainImageUrl" />
                </ion-thumbnail>
                <ion-badge class="scan-badge">{{ event.aggApplied === 0 ? translate('unaggregated') : '' }}</ion-badge>
                <ion-label>
                  {{ event.scannedValue }}
                  <p>{{ timeAgo(event.createdAt) }}</p>
                </ion-label>
                <ion-note slot="end">{{ event.quantity }}</ion-note>
              </ion-item>
            </ion-list>
          </div>

          <ion-card class="add-pre-counted" href="">
            <ion-item lines="none">
              <ion-label class="ion-text-nowrap">Add pre-counted items</ion-label>
              <ion-icon slot="end" :icon="addOutline"></ion-icon>
            </ion-item>
          </ion-card>
        </div>

        <!-- Right Panel -->
        <div class="count-dashboard">
          <div class="header ion-padding">
            <ion-item lines="none">
              <ion-label>
                <p class="overline">{{ countTypeLabel }}</p>
                <h1>{{ inventoryCountImport?.countImportName || 'Untitled session' }}</h1>
                <p>Created by {{ userLogin?.userFullName ? userLogin.userFullName : userLogin.username }}</p>
              </ion-label>
            </ion-item>
            <!-- When session is SUBMITTED: show only Re-open button -->
            <template v-if="inventoryCountImport?.statusId === 'SESSION_SUBMITTED'">
              <ion-button color="warning" fill="outline" @click="reopen">
                <ion-icon slot="start" :icon="pencilOutline"></ion-icon>
                Re-open session
              </ion-button>
            </template>

            <!-- When session is VOIDED: all buttons disabled -->
            <template v-else-if="inventoryCountImport?.statusId === 'SESSION_VOIDED'">
              <ion-button color="warning" fill="outline" disabled>
                <ion-icon slot="start" :icon="exitOutline"></ion-icon>
                Session discarded
              </ion-button>
            </template>

            <!-- Default: show Edit / Discard / Submit -->
            <template v-else>
              <ion-button color="medium" fill="outline" @click="openEditSessionModal" :disabled="sessionLocked">
                <ion-icon slot="start" :icon="pencilOutline"></ion-icon>
                Edit
              </ion-button>
              <ion-button color="warning" fill="outline" @click="discard" :disabled="sessionLocked">
                <ion-icon slot="start" :icon="exitOutline"></ion-icon>
                Discard
              </ion-button>
              <ion-button
                color="success"
                fill="outline"
                @click="submit"
                :disabled="sessionLocked"
              >
                <ion-icon slot="start" :icon="checkmarkDoneOutline"></ion-icon>
                Submit
              </ion-button>
            </template>
            <!-- <ion-button color="medium" fill="outline" @click="discard" :disabled="sessionLocked">
              <ion-icon slot="start" :icon="pencilOutline"></ion-icon>
              Edit
            </ion-button>
            <ion-button color="warning" fill="outline" @click="discard" :disabled="sessionLocked">
              <ion-icon slot="start" :icon="exitOutline"></ion-icon>
              Discard
            </ion-button>
            <ion-button color="success" fill="outline" @click="submit" :disabled="sessionLocked">
              <ion-icon slot="start" :icon="checkmarkDoneOutline"></ion-icon>
              Submit
            </ion-button> -->
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
                  <ion-label>Pending match scans</ion-label>
                  <p slot="end">{{ events.filter(e => e.aggApplied === 0).length }}</p>
                </ion-item>
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
                <ion-button color="primary" fill="clear">
                  <ion-icon slot="icon-only" :icon="timerOutline"></ion-icon>
                </ion-button>
              </ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label>Lap 2</ion-label>
                  <p slot="end">—</p>
                </ion-item>
                <ion-item>
                  <ion-label>Lap 1</ion-label>
                  <p slot="end">—</p>
                </ion-item>
              </ion-list>
            </ion-card>
          </div>

          <ion-segment v-model="selectedSegment">
            <ion-segment-button v-if="isDirected" value="uncounted">
              <ion-label>Uncounted</ion-label>
            </ion-segment-button>
            <ion-segment-button v-if="isDirected" value="undirected">
              <ion-label>Undirected</ion-label>
            </ion-segment-button>
            <ion-segment-button value="unmatched">
              <ion-label>Unmatched</ion-label>
            </ion-segment-button>
            <ion-segment-button value="counted">
              <ion-label>Counted</ion-label>
            </ion-segment-button>
          </ion-segment>

          <ion-segment-view>
            <!-- Uncounted -->
            <ion-segment-content v-if="isDirected && selectedSegment === 'uncounted'" class="cards">
              <ion-card v-for="item in uncountedItems" :key="item.uuid">
                <Image v-if="item.product?.mainImageUrl" :src="item.product.mainImageUrl" />
                <ion-item>
                  <ion-label>
                    {{ primaryId(item.product) }}
                    <p>{{ secondaryId(item.product) }}</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>

            <!-- Undirected -->
            <ion-segment-content v-if="isDirected && selectedSegment === 'undirected'" class="cards">
              <ion-card v-for="item in undirectedItems" :key="item.uuid">
                <Image v-if="item.product?.mainImageUrl" :src="item.product.mainImageUrl" />
                <ion-item>
                  <ion-label>
                    {{ primaryId(item.product) }}
                    <p>{{ secondaryId(item.product) }}</p>
                  </ion-label>
                  <ion-label slot="end">{{ item.quantity }} units</ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>

            <!-- Unmatched -->
            <ion-segment-content v-if="selectedSegment === 'unmatched'" class="cards">
              <ion-card v-for="item in unmatchedItems" :key="item.uuid">
                <ion-item>
                  <ion-label>
                    <h2>{{ item.productIdentifier }}</h2>
                    <p>{{ timeAgo(item.createdAt) }}</p>
                    <p>{{ item.quantity }} units</p>
                  </ion-label>
                  <ion-button slot="end" fill="outline" @click="openMatchModal(item)">
                    <ion-icon :icon="searchOutline" slot="start"></ion-icon>
                    Match
                  </ion-button>
                </ion-item>
                <ion-item>
                    <ion-thumbnail slot="start">
                      <Image v-if="item.product?.mainImageUrl" :src="item.product.mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">3 scans ago</p>
                      <p>{{ primaryId(item.product) }}</p>
                      <p>{{ secondaryId(item.product) }}</p>
                      <p>{{ item.productIdentifier }}</p>
                    </ion-label>
                    <ion-note slot="end">
                      last match
                    </ion-note>
                    <ion-icon :icon="chevronDownCircleOutline" slot="end"></ion-icon>
                  </ion-item>
              </ion-card>
            </ion-segment-content>

            <!-- Counted -->
            <ion-segment-content v-if="selectedSegment === 'counted'" class="cards">
              <ion-card v-for="item in countedItems" :key="item.uuid">
                <Image v-if="item.product?.mainImageUrl" :src="item.product.mainImageUrl" />
                <ion-item>
                  <ion-label>
                    {{ primaryId(item.product) }}
                    <p>{{ secondaryId(item.product) }}</p>
                    <p>{{ item.quantity }} units</p>
                  </ion-label>
                </ion-item>
              </ion-card>
            </ion-segment-content>
          </ion-segment-view>
        </div>
      </main>
      <ion-modal :is-open="isMatchModalOpen" @didDismiss="closeMatchModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeMatchModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>Match Product</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-searchbar v-model="queryString" placeholder="Search product" @keyup.enter="handleSearch" />
          <div v-if="isLoading" class="empty-state ion-padding">
            <ion-spinner name="crescent" />
            <ion-label>Searching for "{{ queryString }}"</ion-label>
          </div>
          <template v-else-if="isSearching && products.length">
            <ion-radio-group v-model="selectedProductId">
              <ion-item v-for="product in products" :key="product.productId">
                <ion-thumbnail slot="start">
                  <Image v-if="product.mainImageUrl" :src="product.mainImageUrl" />
                </ion-thumbnail>
                <ion-radio :value="product.productId">
                  <ion-label>
                    {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, product) || product.productName }}
                    <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, product) }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-radio-group>
          </template>
          <div v-else-if="queryString && isSearching && !products.length" class="empty-state ion-padding">
            <p>No results found for "{{ queryString }}"</p>
          </div>
          <div v-else class="empty-state ion-padding" >
            <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
            <p>Enter a SKU or product name to search a product</p>
          </div>
          <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button :disabled="!selectedProductId" @click="saveMatchProduct">
              <ion-icon :icon="saveOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
      <!-- Edit Session Modal -->
      <ion-modal :is-open="isEditNewSessionModalOpen" @did-dismiss="isEditNewSessionModalOpen = false" :presenting-element="pageRef?.$el" :keep-contents-mounted="true">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="isEditNewSessionModalOpen = false" fill="clear" aria-label="Close">
                  <ion-icon :icon="closeOutline" slot="icon-only" />
                </ion-button>
              </ion-buttons>
              <ion-title>New session</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-item>
              <ion-label position="stacked">Name</ion-label>
              <ion-input v-model="newCountName" placeholder="category, section, or person"></ion-input>
              <ion-note slot="helper">Add a name to help identify what inventory is counted in this session</ion-note>
            </ion-item>

            <ion-list>
              <ion-list-header>Area</ion-list-header>

              <ion-radio-group v-model="selectedArea">
                <ion-item v-for="area in areas" :key="area.value">
                  <ion-radio label-placement="start" :value="area.value">{{ area.label }}</ion-radio>
                </ion-item>
              </ion-radio-group>
            </ion-list>

            <ion-fab vertical="bottom" horizontal="end" slot="fixed">
              <ion-fab-button @click="updateSessionOnServer">
                <ion-icon :icon="checkmarkDoneOutline" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-modal>
    </ion-content>
  </ion-page>
</template>


<script setup lang="ts">
import {
  IonBackButton, IonButtons, IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonPage, IonSearchbar, IonSpinner,
  IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonThumbnail, IonTitle, IonToolbar,
  IonFab, IonFabButton, IonModal, IonRadio, IonRadioGroup, onIonViewDidEnter
} from '@ionic/vue';
import { addOutline, chevronUpCircleOutline, chevronDownCircleOutline, timerOutline, searchOutline, barcodeOutline, checkmarkDoneOutline, exitOutline, pencilOutline, saveOutline, closeOutline } from 'ionicons/icons';
import { ref, computed, defineProps, watchEffect } from 'vue';
import { useProductMaster } from '@/composables/useProductMaster';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { showToast, hasError } from '@/utils';
import { useStore } from '@/store';
import { translate } from '@/i18n';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import Image from "@/components/Image.vue";
import { getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import { from } from 'rxjs';
import { client } from "@/api";
import { inventorySyncWorker } from "@/workers/workerInitiator";

const props = defineProps<{ workEffortId: string; inventoryCountImportId: string; inventoryCountTypeId: string; countImportName: string }>();
const productIdentificationStore = useProductIdentificationStore();

const { recordScan, getScanEvents, loadInventoryItemsFromBackend, getUnmatchedItems, getCountedItems, getUncountedItems, getUndirectedItems, updateSession, getInventoryCountImportSession } = useInventoryCountImport();
const { init, prefetch, getAllProductIdsFromIndexedDB, cacheReady } = useProductMaster();
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
const isMatchModalOpen = ref(false);
const isLoading = ref(false);
const isSearching = ref(false);
const queryString = ref('');
const selectedProductId = ref('');
const matchedItem = ref<any>(null);
const products = ref<any[]>([]);
const inventoryCountImport = ref();
const newCountName = ref();


const pageRef = ref(null);

const isEditNewSessionModalOpen = ref(false);

const areas = [
  { value: 'back_stock', label: 'Back stock' },
  { value: 'display', label: 'Display' },
  { value: 'floor_wall', label: 'Floor - wall' },
  { value: 'floor_shelf', label: 'Floor - shelf' },
  { value: 'overflow', label: 'Overflow' },
  { value: 'register', label: 'Register' },
];
const selectedArea = ref(areas[0].value);

let aggregationWorker: Worker | null = null

const countTypeLabel = computed(() =>
  props.inventoryCountTypeId === 'HARD_COUNT' ? 'Hard Count' : 'Directed Count'
);
const isDirected = computed(() => props.inventoryCountTypeId === 'DIRECTED_COUNT');
const userLogin = computed(() => store.getters['user/getUserProfile']);

onIonViewDidEnter(async () => {
  init();
  await startSession();
  from(getUnmatchedItems(props.inventoryCountImportId)).subscribe(items => (unmatchedItems.value = items))
  from(getCountedItems(props.inventoryCountImportId)).subscribe(items => (countedItems.value = items))
  from(getUncountedItems(props.inventoryCountImportId)).subscribe(items => (uncountedItems.value = items))
  from(getUndirectedItems(props.inventoryCountImportId)).subscribe(items => (undirectedItems.value = items))
  from(getScanEvents(props.inventoryCountImportId)).subscribe(scans => {events.value = scans;});

  watchEffect(() => {
    const totalUnits = countedItems.value.reduce((sum, i) => sum + (i.quantity || 0), 0)
    const distinctProducts = new Set(countedItems.value.map(i => i.uuid)).size
    stats.value = {
      productsCounted: distinctProducts,
      totalUnits,
      unmatched: unmatchedItems.value.length
    }
  })

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
        barcodeIdentification: barcodeIdentification,
        inventoryCountTypeId: props.inventoryCountTypeId
      }
    }
  })
});

function openEditSessionModal() {
  isEditNewSessionModalOpen.value = true;
  newCountName.value = inventoryCountImport.value.countImportName;
}

async function updateSessionOnServer() {
  try {
    console.log("This is count import name: ", newCountName.value, " and ", selectedArea.value);
    const resp = await updateSession({
      inventoryCountImportId: props.inventoryCountImportId,
      countImportName: newCountName.value,
      facilityAreaId: selectedArea.value
    });

    if (resp?.status === 200 && resp.data) {
      inventoryCountImport.value.countImportName = newCountName.value;
      inventoryCountImport.value.facilityAreaId = selectedArea.value
      showToast(translate("Session Updated Successfully"))
    } else {
      showToast(translate("Failed to Update Session Details"));
    }
  } catch (error) {
    console.error(error);
  }
  isEditNewSessionModalOpen.value = false;
}

async function startSession() {
  try {
    const resp = await getInventoryCountImportSession({ inventoryCountImportId: props.inventoryCountImportId});
    if (resp?.status === 200 && resp.data) {
      inventoryCountImport.value = resp.data;
    } else {
      console.error("Session not Found");
      throw resp;
    }

    if (resp?.data?.activeUserLoginId) {
      sessionLocked.value = true;
      showToast('This session is already being worked on by another user.');
      return;
    }

    // Load InventoryCountImportItem records into IndexedDB
    await loadInventoryItemsFromBackend(props.inventoryCountImportId);

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

function openMatchModal(item: any) {
  matchedItem.value = item;
  isMatchModalOpen.value = true;
}

function closeMatchModal() {
  isMatchModalOpen.value = false;
}

async function handleSearch() {
  if (!queryString.value.trim()) {
    isSearching.value = false;
    return;
  }
  await getProducts();
  isSearching.value = true;
}

async function getProducts() {
  isLoading.value = true;
  try {
    const resp = await fetchProducts({
      keyword: queryString.value.trim(),
      viewSize: 100,
      filters: ["isVirtual: false", "isVariant: true"],
    });

    if (!hasError(resp)) {
      products.value = resp.data.response.docs;
    }
  } catch (err) {
    console.error("Failed to fetch products", err);
  }
  isLoading.value = false;
}

const fetchProducts = async (query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters["user/getOmsRedirectionInfo"];
  const baseURL = omsRedirectionInfo.url.startsWith("http") ? omsRedirectionInfo.url.includes("/api") ? omsRedirectionInfo.url : `${omsRedirectionInfo.url}/api/` : `https://${omsRedirectionInfo.url}.hotwax.io/api/`;
  return await client({
    url: "searchProducts",
    method: "POST",
    baseURL,
    data: query,
    headers: {
      Authorization: "Bearer " + omsRedirectionInfo.token,
      "Content-Type": "application/json",
    },
  });
};

async function saveMatchProduct() {
  if (!selectedProductId.value) {
    showToast("Please select a product to match");
    return;
  }
  const omsInfo = store.getters["user/getOmsRedirectionInfo"];
  const context = {
    maargUrl: store.getters["user/getBaseUrl"],
    token: omsInfo?.token,
    omsUrl: omsInfo?.url,
    userLoginId: store.getters["user/getUserProfile"]?.username,
    isRequested: 'Y',
  };
  try {
    const result = await inventorySyncWorker.matchProductLocallyAndSync(
      props.workEffortId,
      props.inventoryCountImportId,
      matchedItem.value,
      selectedProductId.value,
      context
    );
    if (result.success) {
      showToast("Product matched successfully");
      closeMatchModal();
    } else {
      showToast("Failed to match product");
    }
  } catch (err) {
    showToast("An error occurred while matching product");
  }
}

async function submit() {
  try {
    await updateSession({ inventoryCountImportId: props.inventoryCountImportId, statusId: 'SESSION_SUBMITTED' });
    inventoryCountImport.value.statusId = 'SESSION_SUBMITTED';
    showToast('Session submitted successfully');
  } catch (err) {
    console.error(err);
    showToast('Failed to submit session');
  }
}

async function discard() {
  try {
    await updateSession({ inventoryCountImportId: props.inventoryCountImportId, statusId: 'SESSION_VOIDED' });
    inventoryCountImport.value.statusId = 'SESSION_VOIDED';
    showToast('Session discarded');
  } catch (err) {
    console.error(err);
    showToast('Failed to discard session');
  }
}

async function reopen() {
  try {
    await updateSession({ inventoryCountImportId: props.inventoryCountImportId, statusId: 'SESSION_ASSIGNED' });
    inventoryCountImport.value.statusId = 'SESSION_ASSIGNED';
    showToast('Session reopened');
  } catch (err) {
    console.error(err);
    showToast('Failed to reopen session');
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

.scan-badge {
  position: absolute;
  top: 6px;
  right: 10px;
  z-index: 1;
}
</style>
