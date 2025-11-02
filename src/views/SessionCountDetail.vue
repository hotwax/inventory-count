<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/count"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ translate("Session Count Detail") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="pageRef">
      <main>
        <!-- Left Panel -->
        <div class="count-events">
          <ion-item class="scan">
            <ion-label position="stacked">sku</ion-label>
            <ion-input ref="barcodeInput" v-model="scannedValue" placeholder="Scan a barcode" @keyup.enter="handleScan" @click="clearSearchResults"
              :disabled="sessionLocked || inventoryCountImport?.statusId === 'SESSION_VOIDED' || inventoryCountImport?.statusId === 'SESSION_SUBMITTED'"></ion-input>
          </ion-item>

          <ion-button expand="block" color="success" class="focus ion-margin-top ion-margin-horizontal" @click="startSession" :disabled="sessionLocked || inventoryCountImport?.statusId === 'SESSION_VOIDED' || inventoryCountImport?.statusId === 'SESSION_SUBMITTED'">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            {{ translate("start counting") }}
          </ion-button>

          <ion-item v-if="!events.length" lines="none" class="empty ion-margin-top">
            <ion-label>
              {{ translate("Items you scan or count will show on this list. Focus your scanner on the input field to begin.") }}
            </ion-label>
          </ion-item>

          <div class="events">
            <ion-list>
              <ion-item v-for="event in events" :key="event.id" :class="{ unaggregated: event.aggApplied === 0 }">
                <ion-thumbnail slot="start">
                  <Image :src="event.product?.mainImageUrl" />
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

          <ion-card class="add-pre-counted" button
            @click="router.push(`/add-pre-counted/${props.workEffortId}/${props.inventoryCountImportId}`)">
            <ion-item lines="none">
              <ion-label class="ion-text-nowrap">{{ translate("Add pre-counted items") }}</ion-label>
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
                {{ translate("Re-open session") }}
              </ion-button>
            </template>

            <!-- When session is VOIDED: all buttons disabled -->
            <template v-else-if="inventoryCountImport?.statusId === 'SESSION_VOIDED'">
              <ion-button color="warning" fill="outline" disabled>
                <ion-icon slot="start" :icon="exitOutline"></ion-icon>
                {{ translate("Session discarded") }}
              </ion-button>
            </template>

            <!-- Default: show Edit / Discard / Submit -->
            <template v-else>
              <ion-button color="medium" fill="outline" @click="openEditSessionModal" :disabled="sessionLocked">
                <ion-icon slot="start" :icon="pencilOutline"></ion-icon>
                {{ translate("Edit") }}
              </ion-button>
              <ion-button color="warning" fill="outline" @click="discard" :disabled="sessionLocked">
                <ion-icon slot="start" :icon="exitOutline"></ion-icon>
                {{ translate("Discard") }}
              </ion-button>
              <ion-button color="success" fill="outline" @click="submit" :disabled="sessionLocked">
                <ion-icon slot="start" :icon="checkmarkDoneOutline"></ion-icon>
                {{ translate("Submit") }}
              </ion-button>
            </template>
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
                  <ion-label>{{ translate("Pending match scans") }}</ion-label>
                  <p slot="end">{{events.filter((e: any) => e.aggApplied === 0).length}}</p>
                </ion-item>
                <ion-item>
                  <ion-label>{{ translate("Unmatched scans") }}</ion-label>
                  <p slot="end">{{ stats.unmatched }}</p>
                </ion-item>
              </ion-list>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title class="overline">{{ translate("Units counted") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="big-number">{{ stats.totalUnits }}</p>
                <ion-button color="primary" fill="clear">
                  <ion-icon slot="icon-only" :icon="timerOutline"></ion-icon>
                </ion-button>
              </ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label>{{ translate("Lap 2") }}</ion-label>
                  <p slot="end">—</p>
                </ion-item>
                <ion-item>
                  <ion-label>{{ translate("Lap 1") }}</ion-label>
                  <p slot="end">—</p>
                </ion-item>
              </ion-list>
            </ion-card>
          </div>

          <ion-segment v-model="selectedSegment">
            <ion-segment-button v-if="isDirected" value="uncounted">
              <ion-label>{{ translate("Uncounted") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button v-if="isDirected" value="undirected">
              <ion-label>{{ translate("Undirected") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="unmatched">
              <ion-label>{{ translate("Unmatched") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="counted">
              <ion-label>{{ translate("Counted") }}</ion-label>
            </ion-segment-button>
          </ion-segment>

          <ion-segment-view>
            <!-- Uncounted -->
            <ion-segment-content v-if="isDirected && selectedSegment === 'uncounted'" class="cards">
              <ion-searchbar v-model="searchKeyword" placeholder="Search product..." @ionInput="handleIndexedDBSearch" class="ion-margin-bottom"/>
              <template v-if="filteredItems.length">
                <ion-card v-for="item in filteredItems" :key="item.uuid">
                  <Image :src="item.product?.mainImageUrl" />
                  <ion-item>
                    <ion-label>
                      {{ primaryId(item.product) }}
                      <p>{{ secondaryId(item.product) }}</p>
                      <p>{{ item.quantity }} units</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </template>

              <template v-else-if="searchKeyword && !filteredItems.length">
                <div class="empty-state ion-padding">
                  <ion-label>{{ translate("No products found") }}</ion-label>
                </div>
              </template>

              <template v-else>
                <ion-card v-for="item in uncountedItems" :key="item.uuid">
                  <Image :src="item.product?.mainImageUrl" />
                  <ion-item>
                    <ion-label>
                      {{ primaryId(item.product) }}
                      <p>{{ secondaryId(item.product) }}</p>
                      <p>{{ item.quantity }} units</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </template>
            </ion-segment-content>

            <!-- Undirected -->
            <ion-segment-content v-if="isDirected && selectedSegment === 'undirected'" class="cards">
              <ion-searchbar v-model="searchKeyword" placeholder="Search product..." @ionInput="handleIndexedDBSearch" class="ion-margin-bottom"/>
              <template v-if="filteredItems.length">
                <ion-card v-for="item in filteredItems" :key="item.uuid">
                  <Image :src="item.product?.mainImageUrl" />
                  <ion-item>
                    <ion-label>
                      {{ primaryId(item.product) }}
                      <p>{{ secondaryId(item.product) }}</p>
                      <p>{{ item.quantity }} units</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </template>

              <template v-else-if="searchKeyword && !filteredItems.length">
                <div class="empty-state ion-padding">
                  <ion-label>{{ translate("No products found") }}</ion-label>
                </div>
              </template>

              <template v-else>
                <ion-card v-for="item in undirectedItems" :key="item.uuid">
                  <Image :src="item.product?.mainImageUrl" />
                  <ion-item>
                    <ion-label>
                      {{ primaryId(item.product) }}
                      <p>{{ secondaryId(item.product) }}</p>
                      <p>{{ item.quantity }} units</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </template>
            </ion-segment-content>

            <!-- Unmatched -->
            <ion-segment-content v-if="selectedSegment === 'unmatched'" class="cards">
              <ion-searchbar v-model="searchKeyword" placeholder="Search product..." @ionInput="handleIndexedDBSearch" class="ion-margin-bottom"/>
              <template v-if="filteredItems.length">
                <ion-card v-for="item in filteredItems" :key="item.uuid">
                  <ion-item>
                    <ion-label>
                      <h2>{{ item.productIdentifier }}</h2>
                      <p>{{ getScanContext(item).scansAgo }} {{ translate("scans ago") }}</p>
                      <p>{{ timeAgo(item.createdAt) }}</p>
                    </ion-label>
                    <ion-button slot="end" fill="outline" @click="openMatchModal(item)">
                      <ion-icon :icon="searchOutline" slot="start"></ion-icon>
                      {{ translate("Match") }}
                    </ion-button>
                  </ion-item>
                  <!-- Previous good scan -->
                  <ion-item v-if="getScanContext(item).previousGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).previousGood.product?.mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).previousGoodIndex }} {{ translate("scans ago") }}</p>
                      <p>{{ primaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ secondaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ getScanContext(item).previousGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronUpCircleOutline"></ion-icon>
                  </ion-item>
                  <!-- Next good scan -->
                  <ion-item lines="none" v-if="getScanContext(item).nextGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).nextGood.product?.mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).nextGoodIndex }} {{ translate("scans ago") }}</p>
                      <p>{{ primaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ secondaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ getScanContext(item).nextGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronDownCircleOutline"></ion-icon>
                  </ion-item>
                </ion-card>
              </template>

              <template v-else-if="searchKeyword && !filteredItems.length">
                <div class="empty-state ion-padding ion-text-center">
                  <ion-label>{{ translate("No products found for") }} {{ searchKeyword }}</ion-label>
                </div>
              </template>

              <template v-else>
                <ion-card v-for="item in unmatchedItems" :key="item.uuid">
                  <ion-item>
                    <ion-label>
                      <h2>{{ item.productIdentifier }}</h2>
                      <p>{{ getScanContext(item).scansAgo }} {{ translate("scans ago") }}</p>
                      <p>{{ timeAgo(item.createdAt) }}</p>
                    </ion-label>
                    <ion-button slot="end" fill="outline" @click="openMatchModal(item)">
                      <ion-icon :icon="searchOutline" slot="start"></ion-icon>
                      {{ translate("Match") }}
                    </ion-button>
                  </ion-item>
                  <!-- Previous good scan -->
                  <ion-item v-if="getScanContext(item).previousGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).previousGood.product?.mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).previousGoodIndex }} {{ translate("scans ago") }}</p>
                      <p>{{ primaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ secondaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ getScanContext(item).previousGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronUpCircleOutline"></ion-icon>
                  </ion-item>
                  <!-- Next good scan -->
                  <ion-item lines="none" v-if="getScanContext(item).nextGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).nextGood.product?.mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).nextGoodIndex }} {{ translate("scans ago") }}</p>
                      <p>{{ primaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ secondaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ getScanContext(item).nextGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronDownCircleOutline"></ion-icon>
                  </ion-item>
                </ion-card>
              </template>
            </ion-segment-content>

            <!-- Counted -->
            <ion-segment-content v-if="selectedSegment === 'counted'" class="cards">
              <ion-searchbar v-model="searchKeyword" placeholder="Search product..." @ionInput="handleIndexedDBSearch" class="ion-margin-bottom"/>
              <template v-if="filteredItems.length">
                <ion-card v-for="item in filteredItems" :key="item.uuid">
                  <Image :src="item.product?.mainImageUrl" />
                  <ion-item>
                    <ion-label>
                      {{ primaryId(item.product) }}
                      <p>{{ secondaryId(item.product) }}</p>
                      <p>{{ item.quantity }} {{ translate("units") }}</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </template>

              <template v-else-if="searchKeyword && !filteredItems.length">
                <div class="empty-state ion-padding">
                  <ion-label>{{ translate("No products found") }}</ion-label>
                </div>
              </template>

              <template v-else>
                <ion-card v-for="item in countedItems" :key="item.uuid">
                  <Image :src="item.product?.mainImageUrl" />
                  <ion-item>
                    <ion-label>
                      {{ primaryId(item.product) }}
                      <p>{{ secondaryId(item.product) }}</p>
                      <p>{{ item.quantity }} {{ translate("units") }}</p>
                    </ion-label>
                  </ion-item>
                </ion-card>
              </template>
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
            <ion-title>{{ translate("Match Product") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-searchbar v-model="queryString" placeholder="Search product" @keyup.enter="handleSearch" />
          <div v-if="isLoading" class="empty-state ion-padding">
            <ion-spinner name="crescent" />
            <ion-label>{{ translate("Searching for") }} "{{ queryString }}"</ion-label>
          </div>
          <template v-else-if="isSearching && products.length">
            <ion-radio-group v-model="selectedProductId">
              <ion-item v-for="product in products" :key="product.productId">
                <ion-thumbnail slot="start">
                  <Image :src="product?.mainImageUrl" />
                </ion-thumbnail>
                <ion-radio :value="product.productId">
                  <ion-label>
                    {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId,
                      product) || product.productName }}
                    <p>{{
                      getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId,
                      product) }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-radio-group>
          </template>
          <div v-else-if="queryString && isSearching && !products.length" class="empty-state ion-padding">
            <p>{{ translate("No results found for") }} "{{ queryString }}"</p>
          </div>
          <div v-else class="empty-state ion-padding">
            <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
            <p>{{ translate("Enter a SKU or product name to search a product") }}</p>
          </div>
          <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button :disabled="!selectedProductId" @click="saveMatchProduct">
              <ion-icon :icon="saveOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
      <!-- Edit Session Modal -->
      <ion-modal :is-open="isEditNewSessionModalOpen" @did-dismiss="isEditNewSessionModalOpen = false"
        :presenting-element="pageRef?.$el" :keep-contents-mounted="true">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="isEditNewSessionModalOpen = false" fill="clear" aria-label="Close">
                <ion-icon :icon="closeOutline" slot="icon-only" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("New session") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-item>
            <ion-label position="stacked">{{ translate("Name") }}</ion-label>
            <ion-input v-model="newCountName" placeholder="category, section, or person"></ion-input>
            <ion-note slot="helper">{{ translate("Add a name to help identify what inventory is counted in this session")}}</ion-note>
          </ion-item>

          <ion-list>
            <ion-list-header>{{ translate("Area")}}</ion-list-header>

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
  IonBackButton,
  IonButtons,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonSegmentContent,
  IonSegmentView,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  IonModal,
  IonRadio,
  IonRadioGroup,
  onIonViewDidEnter
} from '@ionic/vue';
import { addOutline, chevronUpCircleOutline, chevronDownCircleOutline, timerOutline, searchOutline, barcodeOutline, checkmarkDoneOutline, exitOutline, pencilOutline, saveOutline, closeOutline } from 'ionicons/icons';
import { ref, computed, defineProps, watch, watchEffect, toRaw, onBeforeUnmount } from 'vue';
import { useProductMaster } from '@/composables/useProductMaster';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { showToast, hasError } from '@/utils';
import { useStore } from '@/store';
import { translate } from '@/i18n';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from "@/components/Image.vue";
import { getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import { from } from 'rxjs';
import { client } from "@/api";
import { inventorySyncWorker } from "@/workers/workerInitiator";
import router from '@/router';
import { loader } from '@/user-utils';

const props = defineProps<{ workEffortId: string; inventoryCountImportId: string; inventoryCountTypeId: string; }>();
const productIdentificationStore = useProductIdentificationStore();

const {
  recordScan,
  getScanEvents,
  loadInventoryItemsFromBackend,
  getUnmatchedItems,
  getCountedItems,
  getUncountedItems,
  getUndirectedItems,
  updateSession,
  getInventoryCountImportSession,
  searchInventoryItemsByIdentifier,
  getSessionLock,
  lockSession,
  releaseSession
} = useInventoryCountImport();
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
const searchKeyword = ref('')
const filteredItems = ref<any[]>([])
const currentDeviceId = store.getters["user/getDeviceId"];
const currentLock = ref<any>(null);


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
  await loader.present("Loading session details...");
  try {
    init();
    await handleSessionLock();
    await startSession();
    // Fetch the items from IndexedDB via liveQuery to update the lists reactively
    from(getUnmatchedItems(props.inventoryCountImportId)).subscribe(items => (unmatchedItems.value = items))
    from(getCountedItems(props.inventoryCountImportId)).subscribe(items => (countedItems.value = items))
    from(getUncountedItems(props.inventoryCountImportId)).subscribe(items => (uncountedItems.value = items))
    from(getUndirectedItems(props.inventoryCountImportId)).subscribe(items => (undirectedItems.value = items))
    from(getScanEvents(props.inventoryCountImportId)).subscribe(scans => { events.value = scans; });
    
    dayjs.extend(relativeTime);
    // Display the unmatched and unaggregated products count stats
    watchEffect(() => {
      const totalUnits = countedItems.value.reduce((sum, i) => sum + (i.quantity || 0), 0)
      const distinctProducts = new Set(countedItems.value.map(i => i.uuid)).size
      stats.value = {
        productsCounted: distinctProducts,
        totalUnits,
        unmatched: unmatchedItems.value.length
      }
    })

    watch(selectedSegment, () => {
      searchKeyword.value = ""
      filteredItems.value = []
    })
    // Start the background aggregation worker and schedule periodic aggregation
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
  } catch (error) {
    console.error(error);
    showToast("Failed to load session details");
  }
  loader.dismiss();

});

onBeforeUnmount(async () => {
  await finalizeAggregationAndSync();
  await unscheduleWorker();
});

function openEditSessionModal() {
  isEditNewSessionModalOpen.value = true;
  newCountName.value = inventoryCountImport.value.countImportName;
}

async function updateSessionOnServer() {
  try {
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
    const resp = await getInventoryCountImportSession({ inventoryCountImportId: props.inventoryCountImportId });
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
    showToast('Session ready to start counting');
  } catch (err) {
    console.error(err);
    showToast('Failed to initialize session');
  }

  focusScanner();
}

function focusScanner() {
  barcodeInput.value?.$el?.setFocus();
  filteredItems.value = [];
  searchKeyword.value = '';
}

function handleScan() {
  const value = scannedValue.value.trim();
  if (!value) return;

  try {
    recordScan({ inventoryCountImportId: props.inventoryCountImportId, productIdentifier: value, quantity: 1 });
    events.value.unshift({ scannedValue: value, quantity: 1, createdAt: Date.now() });
    filteredItems.value = [];
    searchKeyword.value = '';
  } catch (err) {
    console.error(err);
    showToast('Failed to record scan');
  } finally {
    scannedValue.value = '';
  }
}

async function handleSessionLock() {
  try {
    const userId = store.getters['user/getUserProfile']?.username;
    const inventoryCountImportId = props.inventoryCountImportId;
    const currentDeviceId = store.getters['user/getDeviceId'];

    // Fetch existing lock
    const existingLockResp = await getSessionLock({
      inventoryCountImportId,
      deviceId: currentDeviceId,
      userId: store.getters['user/getUserProfile']?.username,
      // thruDate_op: 'empty'
    });
    const existingLock = existingLockResp?.data ? existingLockResp.data[0] : null;
    currentLock.value = existingLock;

    if (existingLock) {
      if (existingLock.userId !== userId || existingLock.deviceId !== currentDeviceId) {
        // Different user → lock session
        sessionLocked.value = true;
        showToast('This session is locked by another user.');
        return;
      }
      // Same user + same device → continue
      sessionLocked.value = false;
      return;
    }

    // No lock found → create new one
    const newLockResp = await lockSession({
      inventoryCountImportId,
      userId,
      deviceId: currentDeviceId,
      fromDate: Date.now()
    });

    if (newLockResp?.status === 200) {
      currentLock.value = newLockResp.data;
      showToast('Session lock acquired.');
    } else {
      sessionLocked.value = true;
      showToast('Failed to acquire lock.');
    }
  } catch (err) {
    console.error('Error handling session lock:', err);
    sessionLocked.value = true;
    showToast('Error while acquiring session lock.');
  }
}

/** Releases the active lock */
async function releaseSessionLock() {
  if (!currentLock.value) return;

  try {
    const payload = {
      inventoryCountImportId: props.inventoryCountImportId,
      userId: store.getters['user/getUserProfile']?.username,
      thruDate: Date.now()
    };

    const resp = await releaseSession(payload);
    if (resp?.status === 200) {
      showToast('Session lock released.');
      currentLock.value = null;
    } else {
      showToast('Failed to release session lock.');
    }
  } catch (err) {
    console.error('Error releasing session lock:', err);
    showToast('Error while releasing session lock.');
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
  products.value = [];
  queryString.value = "";
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

  const plainItem = JSON.parse(JSON.stringify(toRaw(matchedItem.value)));
  const plainContext = JSON.parse(JSON.stringify(context));

  try {
    const result = await inventorySyncWorker.matchProductLocallyAndSync(
      props.inventoryCountImportId,
      plainItem,
      selectedProductId.value,
      plainContext
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

async function finalizeAggregationAndSync() {
  try {
    if (!aggregationWorker) return;

    const omsInfo = store.getters['user/getOmsRedirectionInfo'];
    const productStoreSettings = store.getters["user/getProductStoreSettings"];
    const barcodeIdentification = productStoreSettings["barcodeIdentificationPref"];

    const context = {
      omsUrl: omsInfo.url,
      userLoginId: store.getters['user/getUserProfile']?.username,
      maargUrl: store.getters['user/getBaseUrl'],
      token: omsInfo.token,
      barcodeIdentification,
      inventoryCountTypeId: props.inventoryCountTypeId
    };

    aggregationWorker.postMessage({
      type: 'aggregate',
      payload: {
        workEffortId: props.workEffortId,
        inventoryCountImportId: props.inventoryCountImportId,
        context
      }
    });

    // Wait until the worker confirms completion
    const result = await new Promise<number>((resolve) => {
      const timeout = setTimeout(() => resolve(0), 15000); // safety timeout
      aggregationWorker!.onmessage = (e) => {
        const { type, count } = e.data;
        if (type === 'aggregationComplete') {
          console.log(`Aggregated ${count} products from scans`)
          clearTimeout(timeout);
          resolve(count);
        }
      };
    });

    return result;
  } catch (err) {
    console.error('[Session] Error during final aggregation:', err);
    return 0;
  }
}

/** Stop background worker schedule and terminate */
async function unscheduleWorker() {
  try {
    if (aggregationWorker) {
      console.log('[Session] Terminating background aggregation worker...');
      aggregationWorker.terminate();
      aggregationWorker = null;
    }
  } catch (err) {
    console.error('[Session] Failed to terminate worker:', err);
  }
}

async function submit() {
  try {
    await finalizeAggregationAndSync();
    await updateSession({ inventoryCountImportId: props.inventoryCountImportId, statusId: 'SESSION_SUBMITTED' });
    inventoryCountImport.value.statusId = 'SESSION_SUBMITTED';
    await releaseSessionLock();
    showToast('Session submitted successfully');
  } catch (err) {
    console.error(err);
    showToast('Failed to submit session');
  }
}

async function discard() {
  try {
    await finalizeAggregationAndSync();
    await updateSession({ inventoryCountImportId: props.inventoryCountImportId, statusId: 'SESSION_VOIDED' });
    inventoryCountImport.value.statusId = 'SESSION_VOIDED';
    await releaseSessionLock();
    showToast('Session discarded');
  } catch (err) {
    console.error(err);
    showToast('Failed to discard session');
  }
}

async function reopen() {
  try {
    await updateSession({ inventoryCountImportId: props.inventoryCountImportId, statusId: 'SESSION_CREATED' });
    inventoryCountImport.value.statusId = 'SESSION_CREATED';
    showToast('Session reopened');
  } catch (err) {
    console.error(err);
    showToast('Failed to reopen session');
  }
}

async function handleIndexedDBSearch() {
  if (!searchKeyword.value.trim()) {
    filteredItems.value = [] // show all
    return
  }
  const results = await searchInventoryItemsByIdentifier(
    props.inventoryCountImportId,
    searchKeyword.value,
    selectedSegment.value
  )
  filteredItems.value = results
}

function clearSearchResults() {
  searchKeyword.value = ''
  filteredItems.value = []
}

function getScanContext(item: any) {
  if (!item || !item.productIdentifier || !events.value?.length) return {}

  // newest → oldest
  const sortedScans = [...events.value].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
  )

  // find the actual unmatched scan (by scannedValue, not id)
  const index = sortedScans.findIndex(
    (e) => e.scannedValue === item.productIdentifier
  )
  if (index === -1) return {}

  //since list is newest → oldest, index itself is "X scans ago"
  const scansAgo = index

  //previous good scan = closest NEWER good scan (i.e. walk backwards: index-1 → 0)
  let previousGood: any = null
  let previousGoodIndex = -1
  for (let i = index - 1; i >= 0; i--) {
    if (sortedScans[i]?.productId) {
      previousGood = sortedScans[i]
      previousGoodIndex = i
      break
    }
  }

  //next good scan = closest OLDER good scan (i.e. walk forwards: index+1 → end)
  let nextGood: any = null
  let nextGoodIndex = -1
  for (let i = index + 1; i < sortedScans.length; i++) {
    if (sortedScans[i]?.productId) {
      nextGood = sortedScans[i]
      nextGoodIndex = i
      break
    }
  }

  return {
    scansAgo,
    previousGood,
    previousGoodIndex,
    nextGood,
    nextGoodIndex,
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
