<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start">{{ currentFacility?.facilityName || currentFacility?.facilityId }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <!-- Left Panel -->
        <div class="count-events">
          <ion-item class="scan">
            <ion-label position="stacked">{{ translate(barcodeIdentifierDescription) }}</ion-label>
            <ion-input ref="barcodeInput" v-model="scannedValue" :placeholder="translate('Scan a barcode')" @keyup.enter="handleScan" @click="clearSearchResults"
              @ionFocus="handleScannerFocus" @ionBlur="handleScannerBlur"></ion-input>
          </ion-item>
          <ion-button expand="block" color="success" class="focus ion-margin-top ion-margin-horizontal" @click="handleStartOrFocus">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            {{ translate("Scanner Ready") }}
          </ion-button>

          <ion-item v-if="!events.length" lines="none" class="empty ion-margin-top">
            <ion-label>
              {{ translate("Items you scan or count will show on this list. Focus your scanner on the input field to begin.") }}
            </ion-label>
          </ion-item>

          <div class="events">
          <DynamicScroller :items="events" key-field="createdAt" :buffer="60" class="virtual-list" :min-item-size="64" :emit-update="true">
            <template v-slot="{ item, index, active }">
              <DynamicScrollerItem :item="item" :index="index" :active="active">
                <ion-item>
                  <div slot="start" class="img-preview">
                    <ion-thumbnail>
                      <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                    </ion-thumbnail>
                      <ion-badge class="qty-badge" color="medium">
                        {{ item.quantity }}
                      </ion-badge>
                  </div>
                  <ion-label>
                    {{ item.scannedValue }}
                    <p class="clickable-time">{{ timeAgo(item.createdAt) }}</p>
                  </ion-label>
                  <ion-button fill="clear" color="medium" slot="end" :id="item.createdAt" @click="openScanActionMenu(item)">
                    <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                  </ion-button>  
                </ion-item>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
          </div>
        </div>
        <div class="count-dashboard">
          <ion-item lines="full" class="ion-margin-top">
            <ion-select slot="start" v-model="optedVarianceReason" label="Reason" label-placement="fixed" placeholder="Select" interface="popover">
              <ion-select-option v-for="reason in varianceReasons" :key="reason.value" :value="reason.value">
                {{ translate(reason.label) }}
              </ion-select-option>
            </ion-select>
            <ion-select slot="end" v-model="optedAction" label="Action" label-placement="fixed" placeholder="Select" interface="popover">
              <ion-select-option value="add">
                {{ translate("Add") }}
              </ion-select-option>
              <ion-select-option value="remove">
                {{ translate("Remove") }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-card v-for="inventoryAdjustment in inventoryAdjustments" :key="inventoryAdjustment.uuid" class="variance-product-card">
            <ion-item lines="full">
              <ion-thumbnail slot="start">
                <Image :src="inventoryAdjustment.mainImageUrl"/>
              </ion-thumbnail>
              <ion-label v-if="inventoryAdjustment.productId">
                {{ useProductMaster().primaryId(inventoryAdjustment) }}
                <p>{{ useProductMaster().secondaryId(inventoryAdjustment) }}</p>
              </ion-label>
              <ion-label v-else>
                {{ inventoryAdjustment.scannedValue }}
              </ion-label>
              <ion-text slot="end" v-if="inventoryAdjustment.productId">
                {{ translate("Current Stock:") }} {{ inventoryAdjustment.qoh || 0 }}
              </ion-text>
              <ion-button v-else fill="outline">
                {{ translate("Match") }}
              </ion-button>
            </ion-item>
            <div class="quantity">
              <!-- <ion-button fill="clear" color="medium" aria-label="decrease" @click="inventoryAdjustment.quantity = Math.max(0, (inventoryAdjustment.quantity || 0) - 1)">
                <ion-icon :icon="removeCircleOutline" slot="icon-only"></ion-icon>
              </ion-button> -->
                <ion-input
                  @ionInput="onManualInputChange($event, inventoryAdjustment)"
                  label="Qty"
                  fill="outline"
                  label-placement="stacked" 
                  type="number" 
                  min="0" 
                  inputmode="numeric" 
                  placeholder="0" 
                  v-model.number="inventoryAdjustment.quantity"
                  :disabled="true"
                ></ion-input>
              <!-- <ion-button fill="clear" color="medium" aria-label="increase" @click="inventoryAdjustment.quantity = (inventoryAdjustment.quantity || 0) + 1">
                <ion-icon :icon="addCircleOutline" slot="icon-only"></ion-icon>
              </ion-button> -->
            </div>
          </ion-card>
          <div class="ion-text-center">
            <ion-button v-if="inventoryAdjustments.length" @click="logVariance()" :disabled="hasUnmatchedItem || isLogVarianceDisabled">
              {{ translate("Log Variance") }}
            </ion-button>
          </div>
        </div>
      </main>
    </ion-content>
    <!-- <ion-modal :is-open="isSearchResultsModalOpen" @didDismiss="closeSearchResultsModal">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeSearchResultsModal">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ translate("Search Results") }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-radio-group v-model="selectedProductFromModal">
          <ion-item v-for="product in searchedProducts" :key="product.productId">
            <ion-thumbnail slot="start">
              <Image :src="product.mainImageUrl" />
            </ion-thumbnail>
            <ion-radio :value="product.productId" :disabled="product.isUndirected">
              <ion-label>
                {{ useProductMaster().primaryId(product) }}
                <p>{{ useProductMaster().secondaryId(product) }}</p>
                <ion-text color="danger" v-if="product.isUndirected">{{ translate("Undirected") }}</ion-text>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-radio-group>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-button slot="end" :disabled="!selectedProductFromModal" fill="outline" color="success" @click="addSelectedProductFromModal">
            <ion-icon :icon="addCircleOutline" slot="start"></ion-icon>
            {{ translate("Select") }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal> -->
  </ion-page>
</template>

<script setup lang="ts">

import { translate } from '@/i18n';
import { useProductStore } from '@/stores/productStore';
import { IonContent, IonHeader, IonInput, IonItem, IonPage, IonTitle, IonToolbar, IonLabel, IonButton, IonRadioGroup, IonRadio, IonThumbnail, IonSearchbar, IonCard, IonCardHeader, IonCardTitle, IonSelect, IonSelectOption, IonSkeletonText, IonText, onIonViewDidEnter, onIonViewDidLeave, IonIcon, IonModal, IonButtons, IonFooter, IonBadge } from '@ionic/vue';
import { addCircleOutline, closeOutline, removeCircleOutline, barcodeOutline, addOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { useProductMaster } from '@/composables/useProductMaster';
import { computed, ref } from 'vue';
import Image from '@/components/Image.vue';
import { useUserProfile } from '@/stores/userProfileStore';
import { showToast } from '@/services/uiUtils';
import api from '@/services/RemoteAPI';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { DateTime } from 'luxon';
import defaultImage from "@/assets/images/defaultImage.png";
import { useAuthStore } from '@/stores/authStore';
import { Subscription, from } from 'rxjs';

const currentFacility = computed(() => useProductStore().getCurrentFacility);
const isSearching = ref(false);
const searchedProductString = ref('');
const searchedProducts = ref<Array<any>>([]);

/* Count Events - Left Pane Refs */
const scannedValue = ref('');
const events = ref<any[]>([]);
const inventoryAdjustments = ref<any[]>([]);

/* Stub Methods for Count Events */
const handleScan = () => { 
  console.log('handleScan');
  useProductMaster().addVarianceLog(scannedValue.value, 1, currentFacility.value.facilityId);
  scannedValue.value = '';
  isLogVarianceDisabled.value = true;
  setTimeout(() => {
    isLogVarianceDisabled.value = false;
  }, 5000);
 };
const handleStartOrFocus = () => { console.log('handleStartOrFocus'); };
const handleScannerFocus = () => { console.log('handleScannerFocus'); };
const handleScannerBlur = () => { console.log('handleScannerBlur'); };
const clearSearchResults = () => { console.log('clearSearchResults'); };
const openScanActionMenu = (item: any) => { console.log('openScanActionMenu', item); };
const timeAgo = (date: number) => DateTime.fromMillis(Number(date)).toRelative();
let aggregationWorker: Worker | null = null
const subscriptions: Subscription[] = [];
const isSearchResultsModalOpen = ref(false);
const selectedProductFromModal = ref<string>('');
const isLogVarianceDisabled = ref(false);
const getGoodIdentificationOptions = computed(() => useProductStore().getGoodIdentificationOptions);
const barcodeIdentifierPref = computed(() => useProductStore().getBarcodeIdentificationPref);
const barcodeIdentifierDescription = computed(() => getGoodIdentificationOptions.value?.find((opt: any) => opt.goodIdentificationTypeId === barcodeIdentifierPref.value)?.description);

onIonViewDidEnter(async () => {
  await getVarianceReasonEnums();

  subscriptions.push(
    from(useProductMaster().getVarianceLogs()).subscribe((items: any) => (events.value = items))
  )

  subscriptions.push(
    from(useProductMaster().getInventoryAdjustments()).subscribe((items: any) => (inventoryAdjustments.value = items))
  )

  aggregationWorker = new Worker(new URL('@/workers/backgroundAggregation.ts', import.meta.url), { type: 'module' })

  aggregationWorker.onmessage = (event) => {
    const { type, count } = event.data
    if (type === 'varianceAggregationComplete') {
      console.info(`Aggregated ${count} variance logs from scans`)
    }
  }
  aggregationWorker.onerror = (err) => {
    console.error('[Worker Error]', err.message || err);
  };
  aggregationWorker.onmessageerror = (err) => {
    console.error('[Worker Message Error]', err);
  };
  const barcodeIdentification = useProductStore().getBarcodeIdentificationPref;

  aggregationWorker.postMessage({
    type: 'scheduleVarianceAggregation',
    payload: {
      intervalMs: 5000,
      context: {
        omsUrl: useAuthStore().getOmsRedirectionUrl,
        omsInstance: useAuthStore().getOMS,
        userLoginId: useUserProfile().getUserProfile?.username,
        maargUrl: useAuthStore().getBaseUrl,
        token: useAuthStore().token.value,
        barcodeIdentification: barcodeIdentification,
        facilityId: useProductStore().getCurrentFacility.facilityId
      }
    }
  })
});

onIonViewDidLeave(async () => {
  subscriptions.forEach(subscription => subscription.unsubscribe());

  await unscheduleWorker();

  useProductMaster().clearVarianceLogsAndAdjustments();

})

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

const varianceReasons = ref<Array<any>>([]);

const optedVarianceReason = ref<string>('');
const optedAction = ref<string | null>(null);
const negateVariances = computed(() => optedAction.value === 'remove');
const hasUnmatchedItem = computed(() => inventoryAdjustments.value.some((item: any) => !item.productId));
const getVarianceReasonEnums = async () => {
  const resp = await api({
    url: 'admin/enums',
    method: 'GET',
    params: {
      enumTypeId: 'IID_REASON',
      pageNoLimit: true
    }
  });
  varianceReasons.value = resp?.data?.map((enumItem: any) => ({
    label: enumItem.description,
    value: enumItem.enumId
  })) || [];

};

let searchTimeoutId: any;

const handleLiveSearch = async () => {
  if (searchedProductString.value.trim().length === 0) {
    searchedProducts.value = [];
    return;
  }
  isSearching.value = true;
  clearTimeout(searchTimeoutId);
  searchTimeoutId = setTimeout(async() => {
    searchedProducts.value = await searchProducts(searchedProductString.value);
    isSearching.value = false;
  }, 300);
};

async function searchProducts(queryString: string): Promise<any> {
  try {
    const query = useProductMaster().buildProductQuery({
      keyword: queryString,
      viewSize: 20,
      filter: 'isVirtual:false,productTypeId:FINISHED_GOOD,-prodCatalogCategoryTypeIds:PCCT_DISCONTINUED'
    })

    const resp = await api({
      url: 'inventory-cycle-count/runSolrQuery',
      method: 'POST',
      data: query
    })
    const products = resp?.data?.response?.docs || []
    return products;
  } catch (error) {
    console.error("Error searching products:", error);
    showToast(translate("Failed to search products. Please try again."));
  }
  isSearching.value = false;
  return [];
}

async function onManualInputChange(event: any, item: any) {
  const inputValue = event.target.value;
  const numericValue = parseInt(inputValue, 10);
  if (!isNaN(numericValue) && numericValue >= 0) {
    item.quantity = numericValue;
  } else {
    item.quantity = 0;
  }
}

function openSearchResultsModal() {
  isSearchResultsModalOpen.value = true
  selectedProductFromModal.value = ''
}

function closeSearchResultsModal() {
  isSearchResultsModalOpen.value = false
  selectedProductFromModal.value = ''
}

async function logVariance() {
  if (optedAction.value === null) {
    showToast(translate("Please select an action."));
    return;
  }
  if (optedVarianceReason.value === null) {
    showToast(translate("Please select a variance reason."));
    return;
  }
  try {

    const reasonEnumId = optedVarianceReason.value || 'VAR_MANUAL';

    const varianceList = inventoryAdjustments.value
      .map((item: any) => {
        return {
          inventoryItemId: item.inventoryItemId,
          productId: item.productId,
          facilityId: currentFacility.value.facilityId,
          reasonEnumId,
          quantity: negateVariances.value ? item.quantity * (-1) : item.quantity,
          comments: "Variance Logged from Cycle Count App"
        };
      });    

    const resp = await api({
      url: 'inventory-cycle-count/recordVariance',
      method: 'POST',
      data: {
        partyId: useUserProfile().getUserProfile?.partyId || '',
        varianceList
      }
    })
    
    if (resp?.status === 200) {
      showToast(translate("Variance logged successfully."));
      // Clear the VarianceLogs table and the InventoryAdjustmentTables here
      useProductMaster().clearVarianceLogsAndAdjustments();
    } else {
      throw resp;
    }
  } catch (error) {
    showToast(translate("Failed to log variance. Please try again."));
    console.error("Error logging variance:", error);
  }
}
</script>
<style scoped>

main {
  /* max-width: 720px;  Removed max-width to allow full split pane usage */
  margin-inline: auto;
  display: grid;
  grid-template-columns: 25% auto;
  justify-content: unset;
  align-items: stretch;
  height: 100%;
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

.count-dashboard {
  height: 100%;
  overflow-y: scroll;
}

.virtual-list {
  display: block;
  width: 100%;
  height: auto;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.virtual-list ion-item {
  --min-height: 64px;
  border-bottom: 1px solid var(--ion-color-light);
}

.img-preview {
  cursor: pointer;
  position: relative;
}

.qty-badge {
  border-radius: 100%;
  top: -5px;
  right: -1px;
  position: absolute;
  font-size: 10px;
}

.clickable-time {
  text-decoration: underline;
  cursor: pointer;
}


.quantity {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--spacer-base);
}
.quantity ion-input {
  width: 30ch;
  text-align: center;
}

.impact ion-radio-group {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.impact ion-radio {
  padding: var(--spacer-base);
  flex: 1;
  border: 1px solid var(--ion-color-medium);
}

.impact ion-radio-group ion-radio:hover {
}

</style>
