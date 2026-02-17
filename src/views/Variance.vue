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
          <ion-button expand="block" :color="isScannerActive ? 'success' : 'danger'" class="focus ion-margin-top ion-margin-horizontal" @click="handleStartOrFocus">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            {{ isScannerActive ? translate("Scanner Ready") : translate("Focus Scanner") }}
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
                  <ion-badge slot="end" v-if="item.aggApplied === 0" class="unagg-badge" color="primary">
                    {{ translate('unaggregated') }}
                  </ion-badge>
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

          <ion-segment v-model="selectedSegment">
            <ion-segment-button value="matched">
              <ion-label>{{ translate("Matched") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="unmatched">
              <ion-label>{{ translate("Unmatched", { unmatchedItemsLength: unmatchedCount }) }}</ion-label>
            </ion-segment-button>
          </ion-segment>

          <ion-segment-view>
            <ion-segment-content v-if="selectedSegment === 'matched'">
              <ion-card v-for="inventoryAdjustment in inventoryAdjustments" :key="inventoryAdjustment.uuid" class="variance-product-card">
                <ion-item lines="full">
                  <ion-thumbnail slot="start">
                    <Image :src="inventoryAdjustment.product?.mainImageUrl || defaultImage"/>
                  </ion-thumbnail>
                  <ion-label>
                    {{ useProductMaster().primaryId(inventoryAdjustment) }}
                    <p>{{ useProductMaster().secondaryId(inventoryAdjustment) }}</p>
                  </ion-label>
                  <ion-text slot="end">
                    {{ translate("Current Stock:") }} {{ inventoryAdjustment.qoh || 0 }}
                  </ion-text>
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
                <ion-button v-if="inventoryAdjustments.length" @click="logVariance()" :disabled="unmatchedItems.length > 0 || isLogVarianceDisabled">
                  {{ translate("Log Variance") }}
                </ion-button>
              </div>
            </ion-segment-content>
            <ion-segment-content v-if="selectedSegment === 'unmatched'">
              <template v-if="unmatchedItems.length === 0">
                <div class="empty-state ion-padding ion-text-center">
                  <ion-label>
                    <h2 class="ion-margin-bottom">{{ translate("No unmatched items") }}</h2>
                    <p>{{ translate("Unmatched items are products you counted but were not found in your product catalog. Please match them before submitting for review and completing this count.") }}</p>
                  </ion-label>
                </div>
              </template>
              <template v-else>
                <ion-card v-for="item in unmatchedItems" :key="item.uuid">
                  <ion-item>
                    <ion-label>
                      <h2>{{ item.scannedValue }}</h2>
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
                      <Image :src="getScanContext(item).previousGood.product?.mainImageUrl" :key="getScanContext(item).previousGood.product?.mainImageUrl"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).previousDistance }} {{ translate("scans later") }}</p>
                      <p>{{ useProductMaster().primaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ useProductMaster().secondaryId(getScanContext(item).previousGood.product) }}</p>
                      <p>{{ getScanContext(item).previousGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronUpCircleOutline"></ion-icon>
                  </ion-item>
                  <!-- Next good scan -->
                  <ion-item lines="none" v-if="getScanContext(item).nextGood">
                    <ion-thumbnail slot="start">
                      <Image :src="getScanContext(item).nextGood.product?.mainImageUrl" :key="getScanContext(item).nextGood.product?.mainImageUrl"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getScanContext(item).nextDistance }} {{ translate("scans ago") }}</p>
                      <p>{{ useProductMaster().primaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ useProductMaster().secondaryId(getScanContext(item).nextGood.product) }}</p>
                      <p>{{ getScanContext(item).nextGood.scannedValue }}</p>
                    </ion-label>
                    <ion-icon :icon="chevronDownCircleOutline"></ion-icon>
                  </ion-item>
                </ion-card>
              </template>
            </ion-segment-content>
          </ion-segment-view>
        </div>
      </main>
    </ion-content>
    <ion-modal :is-open="isMatchModalOpen" @didDismiss="closeMatchModal" @ionModalDidPresent="focusMatchSearch">
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
        <div class="search-bar">
          <ion-searchbar ref="matchSearchbar" :placeholder="translate('Search products')" v-model="searchedProductString" @ionInput="handleLiveSearch" @keyup.enter="handleLiveSearch" />
        </div>
        
        <div class="ion-text-center ion-margin-top" v-if="isSearching">
          <ion-spinner name="crescent" />
        </div>

        <div class="ion-text-center ion-margin-top" v-else-if="!searchedProducts.length && searchedProductString.trim().length > 0">
          <p>{{ translate("No products found") }}</p>
        </div>

        <template v-else>
          <ion-radio-group v-model="selectedProductId">
            <ion-item lines="none" v-for="product in searchedProducts" :key="product.productId">
              <ion-thumbnail slot="start">
                <Image :src="product.mainImageUrl" />
              </ion-thumbnail>
              <ion-radio :value="product.productId">
                <ion-label>
                  {{ useProductMaster().primaryId(product) || product.productName }}
                  <p>{{ useProductMaster().secondaryId(product) }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </template>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-button slot="end" fill="outline" color="success" @click="saveMatchProduct" :disabled="!selectedProductId">
            <ion-icon :icon="saveOutline" slot="start" />
            {{ translate("Save") }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">

import { translate } from '@/i18n';
import { useProductStore } from '@/stores/productStore';
import { IonContent, IonHeader, IonInput, IonItem, IonPage, IonTitle, IonToolbar, IonLabel, IonButton, IonRadioGroup, IonRadio, IonThumbnail, IonSearchbar, IonCard, IonCardHeader, IonCardTitle, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonSegmentView, IonSegmentContent, IonSpinner, IonText, onIonViewDidEnter, onIonViewDidLeave, IonIcon, IonModal, IonButtons, IonFooter, IonBadge } from '@ionic/vue';
import { addCircleOutline, closeOutline, removeCircleOutline, barcodeOutline, addOutline, ellipsisVerticalOutline, searchOutline, chevronUpCircleOutline, chevronDownCircleOutline } from 'ionicons/icons';
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
import { db } from '@/services/appInitializer';
import { saveOutline } from 'ionicons/icons';
import { inventorySyncWorker } from "@/workers/workerInitiator";

const currentFacility = computed(() => useProductStore().getCurrentFacility);
const isSearching = ref(false);
const searchedProductString = ref('');
const searchedProducts = ref<Array<any>>([]);

/* Count Events - Left Pane Refs */
const barcodeInput = ref();
const isScannerActive = ref(false);
const scannedValue = ref('');
const events = ref<any[]>([]);
const inventoryAdjustments = ref<any[]>([]);
const unmatchedItems = ref<any[]>([]);
const unmatchedCount = computed(() => unmatchedItems.value.length);

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
const handleStartOrFocus = () => { 
  barcodeInput.value.$el.setFocus();
};
const handleScannerFocus = () => { 
  isScannerActive.value = true;
};
const handleScannerBlur = () => { 
  isScannerActive.value = false;
};
const clearSearchResults = () => { console.log('clearSearchResults'); };
const openScanActionMenu = (item: any) => { console.log('openScanActionMenu', item); };
const timeAgo = (date: number) => DateTime.fromMillis(Number(date)).toRelative();
let aggregationWorker: Worker | null = null
const subscriptions: Subscription[] = [];
const isSearchResultsModalOpen = ref(false);
const isMatchModalOpen = ref(false);
const matchedItem = ref<any>(null);
const selectedProductFromModal = ref<string>('');
const selectedProductId = ref('');
const matchSearchbar = ref();
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

  subscriptions.push(
    from(useProductMaster().getUnmatchedInventoryAdjustments()).subscribe((items: any) => (unmatchedItems.value = items))
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

const selectedSegment = ref<'matched' | 'unmatched'>('matched');

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

function getScanContext(item: any) {
  if (!item || !item.scannedValue || !events.value?.length) return {}

  //newest to oldest
  const sortedScans = [...events.value].sort(
    (predecessor, successor) => (successor.createdAt ?? 0) - (predecessor.createdAt ?? 0)
  )

  const unmatchedIndex = sortedScans.findIndex(
    (scan) => scan.scannedValue === item.scannedValue
  )
  if (unmatchedIndex === -1) return {}

  //How many scans ago = index itself since list is newest→oldest
  const scansAgo = unmatchedIndex + 1

  // Find previous good scan (relative newer scan)
  let previousGood = null
  let previousGoodIndex = -1

  for (let i = unmatchedIndex - 1; i >= 0; i--) {
    if (sortedScans[i]?.productId) {
      previousGood = sortedScans[i]
      previousGoodIndex = i
      break
    }
  }

  // Find next good scan (relative older scan)
  let nextGood = null
  let nextGoodIndex = -1

  for (let i = unmatchedIndex + 1; i < sortedScans.length; i++) {
    if (sortedScans[i]?.productId) {
      nextGood = sortedScans[i]
      nextGoodIndex = i
      break
    }
  }

  //Compute scan-distance relative to the unmatched item
  const previousDistance =
    previousGoodIndex !== -1 ? previousGoodIndex - unmatchedIndex : -1

  const nextDistance =
    nextGoodIndex !== -1 ? unmatchedIndex - nextGoodIndex : -1

  return {
    // how many scans ago this mismatched item occurred
    scansAgo,
    previousGood,
    previousGoodIndex,
    previousDistance: Math.abs(previousDistance),
    nextGood,
    nextGoodIndex,
    nextDistance: Math.abs(nextDistance)
  }
}



let searchTimeoutId: any;

const handleLiveSearch = async () => {
  if (searchedProductString.value.trim().length === 0) {
    searchedProducts.value = [];
    isSearching.value = false;
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
      keyword: queryString.trim(),
      viewSize: 100,
      filter: 'isVirtual:false,productTypeId:FINISHED_GOOD,-prodCatalogCategoryTypeIds:PCCT_DISCONTINUED'
    })

    const resp = await useProductMaster().loadProducts(query)
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

function openMatchModal(item: any) {
  matchedItem.value = item;
  searchedProductString.value = item.scannedValue;
  isMatchModalOpen.value = true;
  handleLiveSearch();
}

function closeMatchModal() {
  isMatchModalOpen.value = false;
  selectedProductId.value = '';
  searchedProducts.value = [];
  searchedProductString.value = '';
  matchedItem.value = null;
}

function focusMatchSearch() {
  matchSearchbar.value?.$el?.setFocus();
}

async function saveMatchProduct() {
  if (!selectedProductId.value || !matchedItem.value) {
    showToast(translate("Please select a product to match"));
    return;
  }

  try {
    const context = {
        omsUrl: useAuthStore().getOmsRedirectionUrl,
        omsInstance: useAuthStore().getOMS,
        userLoginId: useUserProfile().getUserProfile?.username,
        maargUrl: useAuthStore().getBaseUrl,
        token: useAuthStore().token.value,
        barcodeIdentification: useProductStore().getBarcodeIdentificationPref,
        facilityId: useProductStore().getCurrentFacility.facilityId
    }

    if (inventorySyncWorker) {
      await inventorySyncWorker.matchUnmatchedInventoryAdjustment(matchedItem.value.uuid, selectedProductId.value, context);
      showToast(translate("Product matched successfully"));
      closeMatchModal();
    } else {
      showToast(translate("Background worker not available"));
    }
  } catch (err) {
    console.error(err);
    showToast(translate("Failed to match product"));
  }
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
