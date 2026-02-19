<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start">{{ currentFacility?.facilityName || currentFacility?.facilityId }}</ion-title>
        <ion-segment slot="end" :value="mode" @ionChange="updateMode($event)" mode="ios">
          <ion-segment-button value="scan">
            <ion-label>{{ translate("Scan") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="count">
            <ion-label>{{ translate("Manual") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main :class="mode">
        <template v-if="mode === 'scan'">
        <!-- Left Panel -->
        <div class="count-events">
          <ion-item class="scan" lines="none">
            <ion-label position="stacked">{{ translate(barcodeIdentifierDescription) }}</ion-label>
            <ion-input ref="barcodeInput" v-model="scannedValue" :placeholder="translate('Scan a barcode')" @keyup.enter="handleScan" @click="clearSearchResults"
              @ionFocus="handleScannerFocus" @ionBlur="handleScannerBlur"></ion-input>
          </ion-item>
          <ion-button expand="block" :color="isScannerActive ? 'success' : 'danger'" class="focus ion-margin-top ion-margin-horizontal" @click="handleStartOrFocus">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            {{ isScannerActive ? translate("Scanner Ready") : translate("Focus Scanner") }}
          </ion-button>

          <ion-item v-if="!events.length" lines="none" class="empty ion-margin-top ion-text-center">
            <ion-label color="medium">
              <p>{{ translate("Scanned items will appear here. Focus your scanner to start adding items to variance.") }}</p>
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
                  <!-- <ion-button fill="clear" color="medium" slot="end" :id="item.createdAt" @click="openScanActionMenu(item)">
                    <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                  </ion-button>-->
                </ion-item>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
          </div>
        </div>
        <div class="count-dashboard">
          <div class="dashboard-content-wrapper">
            <div class="variance-config-section ion-margin-top ion-padding-horizontal">
              <ion-item lines="none" class="reason-item">
                <ion-select v-model="optedVarianceReason" :label="translate('Reason')" label-placement="fixed" placeholder="Select" interface="popover">
                  <ion-select-option v-for="reason in varianceReasons" :key="reason.value" :value="reason.value">
                    {{ translate(reason.label) }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <div class="action-segment-wrapper">
                <ion-segment :value="optedAction || 'add'" @ionChange="optedAction = ($event.detail.value as any)" mode="ios">
                  <ion-segment-button value="add">
                    <ion-label>{{ translate("Add") }}</ion-label>
                  </ion-segment-button>
                  <ion-segment-button value="remove">
                    <ion-label>{{ translate("Remove") }}</ion-label>
                  </ion-segment-button>
                </ion-segment>
              </div>
            </div>

            <div class="variance-summary-header ion-margin-top ion-padding-horizontal" v-if="inventoryAdjustments.length">
              <div>
                <ion-text color="medium">
                  <p>{{ translate("Total:") }} {{ totalVarianceUnits }} {{ totalVarianceUnits === 1 ? translate("unit") : translate("units") }} {{ translate("across") }} {{ totalVarianceProducts }} {{ totalVarianceProducts === 1 ? translate("product") : translate("products") }}</p>
                </ion-text>
              </div>
              <ion-button @click="logVariance()" :disabled="unmatchedItems.length > 0 || isLogVarianceDisabled || inventoryAdjustments.length === 0">
                {{ translate("Log Variance") }}
              </ion-button>
            </div>

            <div class="segment-actions-container ion-margin-top ion-padding-horizontal">
              <ion-segment v-model="selectedSegment" class="main-segment">
                <ion-segment-button value="matched">
                  <ion-label>{{ translate("Matched", { matchedCount: inventoryAdjustments.length }) }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="unmatched">
                  <ion-label>{{ translate("Unmatched", { unmatchedItemsLength: unmatchedCount }) }}</ion-label>
                </ion-segment-button>
              </ion-segment>
              <ion-button fill="clear" color="primary" class="new-session" @click="confirmClearAll">
                <ion-icon :icon="refreshOutline" slot="start"></ion-icon>
                {{ translate("New Session") }}
              </ion-button>
            </div>


            <div class="segment-view ion-padding-horizontal">
              <div v-if="selectedSegment === 'matched'">
                <template v-if="inventoryAdjustments.length === 0">
                  <div class="empty-state ion-padding ion-text-center">
                    <ion-label>
                      <h2 class="ion-margin-bottom">{{ translate("No items scanned") }}</h2>
                      <p>{{ translate("Scan items to adjust their inventory. You can select reasons like 'Damage' to remove them from your sellable inventory.") }}</p>
                    </ion-label>
                  </div>
                </template>
                <template v-else>
                  <ion-card v-for="inventoryAdjustment in inventoryAdjustments" :key="inventoryAdjustment.uuid" class="variance-product-card">
                    <ion-item lines="full">
                      <ion-thumbnail slot="start">
                        <Image :src="inventoryAdjustment.product?.mainImageUrl || defaultImage"/>
                      </ion-thumbnail>
                      <ion-label>
                        {{ useProductMaster().primaryId(inventoryAdjustment.product) }}
                        <p>{{ useProductMaster().secondaryId(inventoryAdjustment.product) }}</p>
                      </ion-label>
                      <ion-text slot="end">
                        {{ translate("Current Stock:") }} {{ inventoryAdjustment.qoh || 0 }}
                      </ion-text>
                      <ion-button slot="end" fill="clear" color="danger" @click="confirmRemoveAdjustment(inventoryAdjustment)">
                        <ion-icon :icon="trashOutline" slot="icon-only"></ion-icon>
                      </ion-button>
                    </ion-item>
                    <ion-item lines="none">
                      <ion-label>
                        {{ translate("Variance Qty") }}
                      </ion-label>
                      <ion-text slot="end">
                        {{ optedAction === 'add' ? '+' : '-' }}{{ inventoryAdjustment.quantity }}
                      </ion-text>
                    </ion-item>
                  </ion-card>
                </template>
              </div>
              <div v-if="selectedSegment === 'unmatched'">
                <template v-if="unmatchedItems.length === 0">
                  <div class="empty-state ion-padding ion-text-center">
                    <ion-label>
                      <h2 class="ion-margin-bottom">{{ translate("No unmatched items") }}</h2>
                      <p>{{ translate("All scanned items have been matched to products in your catalog. If you scan an item that isn't found, it will appear here for matching.") }}</p>
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
                      <ion-button slot="end" fill="clear" color="danger" @click="confirmRemoveUnmatchedItem(item)">
                        <ion-icon :icon="trashOutline" slot="icon-only"></ion-icon>
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
              </div>
            </div>
          </div>
        </div>
        </template>
        <!-- Pre Counted Items -->
        <template v-else>
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                {{ translate("Add Items") }}
              </ion-card-title>
            </ion-card-header>
            <ion-searchbar ref="manualCountSearchBar" v-model="searchedProductString" @ionInput="handleLiveSearch" @keyup.enter="handleEnterKey"></ion-searchbar>
            <ion-item lines="none">
              <ion-label>
                {{ translate("Search for products by parent name, SKU or UPC") }}
              </ion-label>
            </ion-item>
            <!-- Skeleton loader during search -->
            <ion-item v-if="isSearching" lines="none">
              <ion-thumbnail slot="start">
                <ion-skeleton-text :animated="true"></ion-skeleton-text>
              </ion-thumbnail>
              <ion-label>
                <h2><ion-skeleton-text :animated="true" style="width: 60%"></ion-skeleton-text></h2>
                <p><ion-skeleton-text :animated="true" style="width: 40%"></ion-skeleton-text></p>
              </ion-label>
            </ion-item>
            <!-- Search result -->
            <ion-item v-else-if="searchedProducts.length > 0" lines="none">
              <ion-thumbnail slot="start">
                <Image :src="searchedProducts[0].mainImageUrl"/>
              </ion-thumbnail>
              <ion-label>
                {{ useProductMaster().primaryId(searchedProducts[0]) }}
                <p>{{ useProductMaster().secondaryId(searchedProducts[0]) }}</p>
              </ion-label>
              <ion-button slot="end" fill="outline" @click="addProductInhandCountedItems(searchedProducts[0])">
                <ion-icon :icon="addCircleOutline" slot="start"></ion-icon>
                Add to count
              </ion-button>
            </ion-item>
            <ion-item v-if="searchedProducts.length > 0" lines="none">
              <ion-label>
                <p>
                  {{ translate('Press enter to add helper') }}
                </p>
              </ion-label>
            </ion-item>
            <ion-item v-if="searchedProducts.length > 1" lines="none" button detail @click="openSearchResultsModal">
              <ion-label>
                {{ translate("View more results") }} ({{ searchedProducts.length - 1 }} more)
              </ion-label>
            </ion-item>
          </ion-card>
          <div class="variance-config-section ion-margin-top ion-padding-horizontal">
            <ion-item lines="none" class="reason-item">
              <ion-select v-model="optedVarianceReasonForHandCounted" :label="translate('Reason')" label-placement="fixed" placeholder="Select" interface="popover">
                <ion-select-option v-for="reason in varianceReasons" :key="reason.value" :value="reason.value">
                  {{ translate(reason.label) }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <div class="action-segment-wrapper">
              <ion-segment :value="optedActionForHandCounted || 'add'" @ionChange="optedActionForHandCounted = ($event.detail.value as any)" mode="ios">
                <ion-segment-button value="add">
                  <ion-label>{{ translate("Add") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="remove">
                  <ion-label>{{ translate("Remove") }}</ion-label>
                </ion-segment-button>
              </ion-segment>
            </div>
          </div>

          <div class="variance-summary-header" v-if="handCountedProducts.length > 0">
            <div>
              <h2>{{ translate("Counted Items") }}</h2>
              <ion-text color="medium">
                <p class="ion-no-margin">{{ totalVarianceUnits }} {{ totalVarianceUnits === 1 ? translate("unit") : translate("units") }} {{ translate("across") }} {{ totalVarianceProducts }} {{ totalVarianceProducts === 1 ? translate("product") : translate("products") }}</p>
              </ion-text>
            </div>
            <ion-button :disabled="handCountedProducts?.length === 0 || !hasUnsavedProducts" fill="outline" color="primary" @click="logHandCountedItemVariances">
              {{ translate("Log Variance") }}
            </ion-button>
          </div>
              {{ translate("Log Variance") }}
            </ion-button>
          </div>
          
          <ion-list v-if="handCountedProducts.length > 0" class="hand-counted-items">
            <ion-card v-for="(product, index) in handCountedProducts" :key="product.productId + '-' + index">
              <div class="item ion-padding-end">
                <ion-item class="product" lines="none">
                  <ion-thumbnail slot="start">
                    <img :src="product.mainImageUrl"/>
                  </ion-thumbnail>
                  <ion-label>
                    {{ useProductMaster().primaryId(product) }}
                    <p>{{ useProductMaster().secondaryId(product) }}</p>
                  </ion-label>
                </ion-item>
                <div class="quantity">
                  <ion-button fill="clear" color="medium" aria-label="decrease" @click="decrementProductQuantity(product)">
                    <ion-icon :icon="removeCircleOutline" slot="icon-only"></ion-icon>
                  </ion-button>
                  <ion-item lines="full">
                    <ion-input
                      :ref="el => setQuantityInputRef(el, index)"
                      @ionInput="handCountedItemManualInputChange($event, product)"
                      @keyup.enter="focusSearchBar"
                      label="Qty"
                      label-placement="stacked" 
                      type="number" 
                      min="0" 
                      inputmode="numeric" 
                      placeholder="0" 
                      v-model.number="product.countedQuantity"
                    ></ion-input>
                  </ion-item>
                  <ion-button fill="clear" color="medium" aria-label="increase" @click="incrementProductQuantity(product)">
                    <ion-icon :icon="addCircleOutline" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </div>
              <div class="progress ion-padding">
                <ion-label>
                  {{ 'Current Stock: ' + (product.quantityOnHand || 0) }}
                </ion-label>
                <ion-button fill="clear" color="danger" aria-label="remove-item" @click="removeProduct(product)">
                  <ion-icon :icon="closeCircleOutline" slot="icon-only"></ion-icon>
                </ion-button>
              </div>
            </ion-card>
          </ion-list>
        </template>
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

    <ion-modal :is-open="isSearchResultsModalOpen" @didDismiss="closeSearchResultsModal">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeSearchResultsModal">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ translate("Select Product") }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-list>
          <ion-item button v-for="product in searchedProducts" :key="product.productId" @click="addProductInhandCountedItems(product)">
            <ion-thumbnail slot="start">
              <Image :src="product.mainImageUrl" />
            </ion-thumbnail>
            <ion-label>
              {{ useProductMaster().primaryId(product) || product.productName }}
              <p>{{ useProductMaster().secondaryId(product) }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">

import { translate } from '@/i18n';
import { useProductStore } from '@/stores/productStore';
import { IonContent, IonHeader, IonInput, IonItem, IonPage, IonTitle, IonToolbar, IonLabel, IonButton, IonRadioGroup, IonRadio, IonThumbnail, IonSearchbar, IonCard, IonCardHeader, IonCardTitle, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonSpinner, IonText, onIonViewDidEnter, onIonViewDidLeave, IonIcon, IonModal, IonButtons, IonFooter, IonBadge, IonProgressBar, IonSkeletonText, IonToggle, IonList, alertController } from '@ionic/vue';
import { addCircleOutline, closeOutline, removeCircleOutline, barcodeOutline, addOutline, ellipsisVerticalOutline, searchOutline, chevronUpCircleOutline, chevronDownCircleOutline, arrowBackOutline, closeCircleOutline, trashOutline, refreshOutline } from 'ionicons/icons';
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
import { saveOutline } from 'ionicons/icons';
import { nextTick } from 'vue';
import { inventorySyncWorker } from "@/workers/workerInitiator";

const mode = ref<'scan' | 'count'>('scan');

async function updateMode(event: any) {
  const selectedMode = event.detail.value;
  if (selectedMode === mode.value) return;

  const hasData = events.value.length > 0 || handCountedProducts.value.length > 0;

  if (hasData) {
    const alert = await alertController.create({
      header: translate("Log or clear variances"),
      message: translate("You must log the variances or clear them to proceed to the selected mode"),
      buttons: [translate("OK")]
    });
    await alert.present();
    // Reset segment value to current mode
    const segment = event.target;
    if (segment) {
      segment.value = mode.value;
    }
  } else {
    mode.value = selectedMode;
  }
}

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
  if (scannedValue.value.trim().length === 0) {
    showToast(translate("Please enter a barcode"));
    return;
  }
  console.log('handleScan');
  useProductMaster().addVarianceLog(scannedValue.value.trim(), 1, currentFacility.value.facilityId);
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

/* Manual/Pre-Counted Items Logic */
const handCountedProducts = ref<any[]>([]);
const manualCountSearchBar = ref();
const quantityInputRefs = ref<any>({});
const hasProductWithZeroQuantity = computed(() =>
  handCountedProducts.value.some((product: any) => !product.countedQuantity || product.countedQuantity === 0)
)
const hasUnsavedProducts = computed(() => handCountedProducts.value.length > 0)

const totalVarianceUnits = computed(() => {
  if (mode.value === 'scan') {
    return inventoryAdjustments.value.reduce((acc, item) => acc + (item.quantity || 0), 0);
  } else {
    return handCountedProducts.value.reduce((acc, item) => acc + (item.countedQuantity || 0), 0);
  }
});

const totalVarianceProducts = computed(() => {
  if (mode.value === 'scan') {
    return inventoryAdjustments.value.length;
  } else {
    return handCountedProducts.value.filter(item => item.countedQuantity > 0).length;
  }
});

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

const optedVarianceReason = ref<string | null>(null);
const optedAction = ref<string | null>(null);
const optedVarianceReasonForHandCounted = ref<string | null>(null);
const optedActionForHandCounted = ref<string | null>(null);
const negateVariances = computed(() => optedAction.value === 'remove');
const negateVariancesForHandCounted = computed(() => optedActionForHandCounted.value === 'remove');

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
  const scansAgo = unmatchedIndex

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

async function handCountedItemManualInputChange(event: any, item: any) {
  const inputValue = event.target.value;
  const numericValue = parseInt(inputValue, 10);
  if (!isNaN(numericValue) && numericValue >= 0) {
    item.countedQuantity = numericValue;
  } else {
    item.countedQuantity = 0;
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

async function logHandCountedItemVariances() {
  if (optedActionForHandCounted.value === null) {
    showToast(translate("Please select an action."));
    return;
  }
  if (optedVarianceReasonForHandCounted.value === null) {
    showToast(translate("Please select a variance reason."));
    return;
  }
  try {

    const reasonEnumId = optedVarianceReasonForHandCounted.value || 'VAR_MANUAL';

    const varianceList = handCountedProducts.value
      .map((item: any) => {
        return {
          inventoryItemId: item.inventoryItemId,
          productId: item.productId,
          facilityId: currentFacility.value.facilityId,
          reasonEnumId,
          quantity: negateVariancesForHandCounted.value ? item.countedQuantity * (-1) : item.countedQuantity,
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
      handCountedProducts.value = []
      optedActionForHandCounted.value = null
      optedVarianceReasonForHandCounted.value = null
    } else {
      throw resp;
    }
  } catch (error) {
    showToast(translate("Failed to log variance. Please try again."));
    console.error("Error logging variance:", error);
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

/* Pre Counted Items Methods */

function incrementProductQuantity(product: any) {
  product.countedQuantity++
}

function decrementProductQuantity(product: any) {
  product.countedQuantity = Math.max(0, product.countedQuantity - 1)
}

function onManualInputChange(event: any, product: any) {
  const value = Number(event.detail.value)
  product.countedQuantity = isNaN(value) ? 0 : value
}

function setQuantityInputRef(el: any, index: number) {
  if (el) {
    quantityInputRefs.value[index] = el.$el ?? el;
  }
}

async function focusQuantityInput(index: number) {
  await nextTick()
  setTimeout(async () => {
    const target = quantityInputRefs.value[index];
    const focusEl = target?.setFocus ? target : target?.querySelector?.('input')

    if (focusEl?.setFocus) await focusEl.setFocus()
    else if (focusEl?.focus) focusEl.focus()
  }, 100);
}


function focusSearchBar() {
  manualCountSearchBar.value?.$el?.setFocus()
}

function removeProduct(productToRemove: any) {
  const index = handCountedProducts.value.indexOf(productToRemove);
  if (index > -1) {
    handCountedProducts.value.splice(index, 1);
  }
}

async function handleEnterKey() {
  const term = searchedProductString.value.trim()
  if (!term) return

  if (searchedProducts.value.length === 0) {
    searchedProducts.value = await searchProducts(term);
  }
  if (searchedProducts.value.length > 0) {
    await addProductInhandCountedItems(searchedProducts.value[0])
  }
}

async function addProductInhandCountedItems(product: any) {
  searchedProductString.value = ''
  searchedProducts.value = []
  isSearchResultsModalOpen.value = false  

  try {
    await setProductQoh(product)
    handCountedProducts.value.push(product)
  } catch (err) {
    console.error('Error adding product:', err)
  }
  // Focus the quantity input for the newly added product as soon as it renders
  await focusQuantityInput(handCountedProducts.value.length - 1);
}

async function setProductQoh(product: any) {
  try {
    const facility: any = useProductStore().getCurrentFacility
    const resp = await useProductMaster().getProductStock({
      productId: product.productId,
      facilityId: facility.facilityId,
    })

    product.quantityOnHand = resp?.data?.qoh || 0
  } catch (err) {
    console.error('Failed to fetch QOH:', err)
  }
}

async function confirmRemoveAdjustment(adjustment: any) {

  const alert = await alertController.create({
    header: translate("Remove record?"),
    message: translate("This record will be removed from your scanning session and will no longer be included in the variance calculation. This action cannot be undone."),
    buttons: [

      {
        text: translate("Cancel"),
        role: "cancel",
      },
      {
        text: translate("Remove"),
        handler: async () => {
          await useProductMaster().removeInventoryAdjustment(adjustment.facilityId, adjustment.uuid);
          showToast(translate("Record removed"));
        }
      }
    ]
  });
  await alert.present();
}

async function confirmRemoveUnmatchedItem(item: any) {

  const alert = await alertController.create({
    header: translate("Remove scan"),
    message: translate("Are you sure you want to remove this record?"),
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel",
      },
      {
        text: translate("Remove"),
        handler: async () => {
          await useProductMaster().removeUnmatchedInventoryAdjustment(item.facilityId, item.uuid, item.scannedValue);
          showToast(translate("Record removed"));
        }
      }
    ]
  });
  await alert.present();
}

async function confirmClearAll() {
  const alert = await alertController.create({
    header: translate("Clear all"),
    message: translate("Are you sure you want to remove all records? This action cannot be undone."),
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel",
      },
      {
        text: translate("Clear data"),
        handler: async () => {
          await useProductMaster().clearVarianceLogsAndAdjustments();
          showToast(translate("All records cleared"));
        }
      }
    ]
  });
  await alert.present();
}

</script>

<style scoped>

main.scan {
  /* max-width: 720px;  Removed max-width to allow full split pane usage */
  margin-inline: auto;
  display: grid;
  grid-template-columns: 25% auto;
  justify-content: unset;
  align-items: stretch;
  height: 100%;
}

main.count {
  max-width: 768px;
  margin: 0 auto;
  width: 100%;
}

.count-events {
  border-right: 1px solid var(--ion-color-light);
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

.variance-config-card {
  margin: 16px;
  box-shadow: none;
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
}

.action-segment-wrapper {
  background: var(--ion-color-light);
  border-radius: 8px;
  padding: 4px;
  margin-top: 8px;
}

.variance-config-section {
  display: flex;
  flex-direction: column;
}

.reason-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.dashboard-content-wrapper {
  max-width: 768px;
  margin: 0 auto;
  width: 100%;
}

.segment-actions-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.main-segment {
  flex: 1;
}

.new-session {
  --padding-start: 12px;
  --padding-end: 12px;
}

.scan {
  grid-area: scan;
}

.focus {
  grid-area: focus;
  --border-radius: 8px;
}

.empty {
  grid-area: empty;
  p {
    margin: 0;
    font-size: 14px;
  }
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
  background: var(--ion-background-color);
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

.hand-counted-items {
  .item {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .quantity {
      display: flex;
    }
  }

  .progress {
    display: flex;
    gap: var(--spacer-sm);
    align-items: center;
    border-top: 1px solid var(--ion-color-medium);

    ion-label {
      flex: 1 0 max-content;
    }
  }
}

.variance-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacer-sm);
  border-bottom: 1px solid var(--ion-color-medium);

  p {
    margin-top: 0;
    margin-bottom: 0px;
    font-weight: 500;
  }
}

.hand-counted-empty-state {
  ion-card-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacer-sm);
  }

  p {
    margin: 0;
  }
}

.clear-all {
  --padding-start: 12px;
  --padding-end: 12px;
}
</style>

