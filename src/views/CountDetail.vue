<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/tabs/count" slot="start"></ion-back-button>
        <ion-title>{{ cycleCount.countImportName }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="find">
        <aside class="filters">
          <div class="fixed-section">
            <ion-item :disabled="isLoadingItems" lines="full">
              <ion-input :label="translate('Scan items')" :placeholder="translate('Scan or search products')" ref="barcodeInput" @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="scanProduct()"/>
            </ion-item>
            <ion-segment :disabled="isLoadingItems" v-model="selectedSegment" @ionChange="updateFilteredItems()">
              <template v-if="cycleCount?.statusId === 'INV_COUNT_ASSIGNED'">
                <ion-segment-button value="all">
                  <ion-label>{{ translate("ALL") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="pending">
                  <ion-label>{{ translate("PENDING") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="counted">
                  <ion-label>{{ translate("COUNTED") }}</ion-label>
                </ion-segment-button>
              </template>
  
              <template v-else-if="cycleCount?.statusId === 'INV_COUNT_REVIEW'">
                <ion-segment-button value="all">
                  <ion-label>{{ translate("ALL") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="notCounted" v-if="cycleCount?.countTypeEnumId !== 'HARD_COUNT'">
                  <ion-label>{{ translate("NOT COUNTED") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="counted">
                  <ion-label>{{ translate("COUNTED") }}</ion-label>
                </ion-segment-button>
              </template>
  
              <template v-else-if="cycleCount?.statusId === 'INV_COUNT_COMPLETED' && 'INV_COUNT_REJECTED'">
                <ion-segment-button value="all">
                  <ion-label>{{ translate("ALL") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="rejected">
                  <ion-label>{{ translate("REJECTED") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="accepted">
                  <ion-label>{{ translate("ACCEPTED") }}</ion-label>
                </ion-segment-button>
              </template> 
            </ion-segment>
          </div>
          <template v-if="itemsList?.length > 0">
            <DynamicScroller class="virtual-scroller" :items="itemsList" key-field="importItemSeqId" :min-item-size="80" :buffer="400">
              <template v-slot="{ item, index, active }">
                <DynamicScrollerItem :item="item" :active="active" :index="index">
                  <ProductItemList :disabled="isLoadingItems" :item="item" :statusId="cycleCount.statusId"/>
                </DynamicScrollerItem>
              </template>
            </DynamicScroller>
          </template>
          <template v-else-if="!isLoadingItems">
            <div class="empty-state">
              <p>{{ translate("No products found.") }}</p>
            </div>
          </template>
        </aside>
        <!--Product details-->
        <main :class="itemsList?.length && !isLoadingItems ? 'product-detail' : ''">
          <template v-if="isLoadingItems">
            <ProgressBar :cycleCountItemsProgress="cycleCountItems.itemList?.length"/>
          </template>
          <template v-else-if="itemsList?.length && Object.keys(product)?.length">
            <div class="product" ref="scrollingContainerRef">
              <template v-if="isScrollingAnimationEnabled">
                <div class="image ion-padding-top" v-for="item in itemsList" :key="item.importItemSeqId" :data-product-id="item.productId" :data-seq="item.importItemSeqId" :id="`${item.productId}-${item.importItemSeqId}`">
                  <Image :src="getProduct(item.productId)?.mainImageUrl" />
                </div>
              </template>
              <div v-else class="image ion-padding-top" :key="product?.importItemSeqId">
                <Image :src="getProduct(product.productId)?.mainImageUrl" />
              </div>
            </div>
            <div class="detail" v-if="Object.keys(product)?.length">
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p class="overline" v-if="cycleCount.countTypeEnumId === 'HARD_COUNT'" color="warning">{{ translate("HARD COUNT") }}</p>
                  {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(product.productId)) || getProduct(product.productId).productName }}
                  <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(product.productId)) }}</p>            
                </ion-label>

                <ion-badge v-if="product.itemStatusId === 'INV_COUNT_COMPLETED'" color="success">
                  {{ translate("accepted") }}
                </ion-badge>

                <ion-badge v-if="product.itemStatusId === 'INV_COUNT_REJECTED'" color="danger">
                  {{ translate("rejected") }}
                </ion-badge>

                <ion-item lines="none" v-if="itemsList?.length">
                  <ion-label>{{ `${currentItemIndex + 1}/${itemsList.length}` }}</ion-label>
                </ion-item>

                <ion-button @click="changeProduct('previous')" :disabled="currentItemIndex === 0" fill="outline" shape="round" color="medium" class="ion-no-padding">
                  <ion-icon slot="icon-only" :icon="chevronUpOutline"></ion-icon>
                </ion-button>

                <ion-button @click="changeProduct('next')" :disabled="currentItemIndex === itemsList.length - 1" fill="outline" shape="round" color="medium" class="ion-no-padding">
                  <ion-icon slot="icon-only" :icon="chevronDownOutline"></ion-icon>
                </ion-button>
              </ion-item>
              <ion-list v-if="cycleCount?.statusId !== 'INV_COUNT_CREATED' && cycleCount?.statusId !== 'INV_COUNT_ASSIGNED'">
                <ion-item>
                  {{ translate("Counted") }}
                <ion-label slot="end">{{ product.quantity || product.quantity === 0 ? product.quantity : '-'}}</ion-label>
                </ion-item>
                <template v-if="productStoreSettings['showQoh']">
                  <ion-item>
                    {{ translate("Current on hand") }}
                    <ion-label slot="end">{{ getProductStock(product.productId) ?? '-' }}</ion-label>
                  </ion-item>
                  <ion-item v-if="product.itemStatusId !== 'INV_COUNT_REJECTED'">
                    {{ translate("Variance") }}
                    <ion-label slot="end">{{ getVariance(product, false) }}</ion-label>
                  </ion-item>
                </template>
              </ion-list>
              <template v-else>
                <ion-list v-if="product.isRecounting">
                  <ion-item>
                    <ion-input :label="translate('Count')" :disabled="productStoreSettings['forceScan']" :placeholder="translate('submit physical count')" name="value" v-model="inputCount" id="value" type="number" min="0" required @ionInput="hasUnsavedChanges=true" @keydown="inputCountValidation"/>
                    <ion-button slot="end" fill="clear" size="default" class="ion-no-padding" @click="inputCount = 0">
                      <ion-icon :icon="closeOutline" stot="icon-only" />
                    </ion-button>
                  </ion-item>

                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ getProductStock(product.productId) ?? '-' }}</ion-label>
                    </ion-item>
                    <ion-item>
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(product, true) }}</ion-label>
                    </ion-item>
                  </template>
                  <div class="ion-margin">
                    <ion-button color="medium" fill="outline" @click="discardRecount()">
                      {{ translate("Discard re-count") }}
                    </ion-button>
                    <ion-button fill="outline" @click="openRecountSaveAlert()">
                      {{ translate("Save new count") }}
                    </ion-button>
                  </div>
                </ion-list>

                <ion-list v-else-if="product.quantity >= 0">
                  <ion-item>
                    {{ translate("Counted") }}
                    <ion-label slot="end">{{ product.quantity }}</ion-label>
                  </ion-item>
                  <ion-item>
                    {{ translate("Counted by") }}
                    <ion-label slot="end">{{ getPartyName(product)}}</ion-label>
                  </ion-item>
                  <!-- TODO: make the counted at information dynamic -->
                  <!-- <ion-item>
                    {{ translate("Counted at") }}
                    <ion-label slot="end">{{ "-" }}</ion-label>
                  </ion-item> -->
                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ getProductStock(product.productId) ?? '-' }}</ion-label>
                    </ion-item>
                    <ion-item v-if="product.itemStatusId !== 'INV_COUNT_REJECTED'">
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(product, false) }}</ion-label>
                    </ion-item>
                  </template>
                  <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(product.itemStatusId)" class="ion-margin" fill="outline" expand="block" @click="openRecountAlert()">
                    {{ translate("Re-count") }}
                  </ion-button>
                </ion-list>

                <ion-list v-else>
                  <ion-item v-if="product.itemStatusId === 'INV_COUNT_REJECTED' || product.itemStatusId === 'INV_COUNT_COMPLETED'">
                    {{ translate("Counted") }}
                    <ion-label slot="end">{{ product.quantity || "-" }}</ion-label>
                  </ion-item>
                  <ion-item v-else>
                    <ion-input :label="translate('Count')" :placeholder="translate('submit physical count')" :disabled="productStoreSettings['forceScan']" name="value" v-model="inputCount" id="value" type="number" min="0" required @ionInput="hasUnsavedChanges=true" @keydown="inputCountValidation"/>
                    <ion-button slot="end" fill="clear" size="default" class="ion-no-padding" @click="inputCount = 0">
                      <ion-icon :icon="closeOutline" stot="icon-only" />
                    </ion-button>
                  </ion-item>

                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ getProductStock(product.productId) ?? '-' }}</ion-label>
                    </ion-item>
                    <ion-item>
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(product, true) }}</ion-label>
                    </ion-item>
                  </template>
                  <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(product.itemStatusId)" class="ion-margin" expand="block" @click="saveCount(product)">
                    {{ translate("Save count") }}
                  </ion-button>
                </ion-list>
              </template>
            </div>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>{{ translate("No items added to count") }}</p>
            </div>
          </template>
        </main>
      </div>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="cycleCount?.statusId === 'INV_COUNT_ASSIGNED'">
      <ion-fab-button @click="readyForReview">
        <ion-icon :icon="paperPlaneOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup>
import {
  IonBackButton,
  IonContent,
  IonBadge, 
  IonButton, 
  IonIcon,
  IonItem,  
  IonList,
  IonHeader,
  IonFab,
  IonFabButton,
  IonInput,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter,
  onIonViewDidLeave,
  alertController
} from '@ionic/vue';
import { chevronDownOutline, chevronUpOutline, closeOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { computed, defineProps, nextTick, ref } from 'vue';
import { useStore } from "@/store";
import { hasError } from '@/utils'
import logger from '@/logger'
import emitter from '@/event-bus'
import ProductItemList from '@/views/ProductItemList.vue';
import { getPartyName, getProductStoreId, showToast } from '@/utils';
import { CountService } from '@/services/CountService';
import { paperPlaneOutline } from "ionicons/icons"
import Image from "@/components/Image.vue";
import router from "@/router"
import { onBeforeRouteLeave } from 'vue-router';
import { getProductIdentificationValue, useProductIdentificationStore } from '@hotwax/dxp-components';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import ProgressBar from '@/components/ProgressBar.vue';
import { deleteRecord } from '@/utils/indexeddb';

const store = useStore();
const productIdentificationStore = useProductIdentificationStore();

const product = computed(() => store.getters['product/getCurrentProduct']);
const getProduct = computed(() => (id) => store.getters["product/getProduct"](id))
const getCachedProducts = computed(() => store.getters["product/getCachedProducts"])
const cycleCountItems = computed(() => store.getters["count/getCycleCountItems"]);
const userProfile = computed(() => store.getters["user/getUserProfile"])
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])
const currentItemIndex = computed(() => !product.value ? 0 : itemsList?.value.findIndex((item) => item.productId === product?.value.productId && item.importItemSeqId === product?.value.importItemSeqId));
const getProductStock = computed(() => (id) => store.getters["product/getProductStock"](id));
const isScrollingAnimationEnabled = computed(() => store.getters["user/isScrollingAnimationEnabled"])

const itemsList = computed(() => {
  if (selectedSegment.value === 'all') {
    return cycleCountItems.value.itemList;
  } else if (selectedSegment.value === 'pending') {
    return cycleCountItems.value.itemList.filter(item =>(item.quantity === undefined || item.quantity === null) && item.itemStatusId === "INV_COUNT_CREATED");
  } else if (selectedSegment.value === 'counted') {
    // Based on discussion, item with rejected and completed status should be shown in the counted segment
    return cycleCountItems.value.itemList.filter(item => (item.quantity >= 0 ) && ((item.itemStatusId === 'INV_COUNT_REJECTED' || item.itemStatusId === 'INV_COUNT_COMPLETED'|| item.itemStatusId === "INV_COUNT_CREATED")));
  } else if (selectedSegment.value === 'notCounted') {
    return cycleCountItems.value.itemList.filter(item => (item.quantity === undefined || item.quantity === null) && cycleCount.value.statusId === "INV_COUNT_REVIEW");
  } else if (selectedSegment.value === 'rejected') {
    return cycleCountItems.value.itemList.filter(item => item.itemStatusId === 'INV_COUNT_REJECTED');
  } else if (selectedSegment.value === 'accepted') {
    return cycleCountItems.value.itemList.filter(item => item.itemStatusId === 'INV_COUNT_COMPLETED');
  } else {
    return [];
  }
});

const props = defineProps(["id"]);
let selectedSegment = ref('all');
let cycleCount = ref([]);
const queryString = ref('');

const inputCount = ref('');
const isScrolling = ref(false);
let previousItem = {};
let hasUnsavedChanges = ref(false);
const barcodeInput = ref();
let isScanningInProgress = ref(false);
const scrollingContainerRef = ref();
const isAnimationInProgress = ref(false);
const productInAnimation = ref({});
const isLoadingItems = ref(true);
const scannedItem = ref({});

onIonViewDidEnter(async() => {  
  await store.dispatch('count/setCountDetailPageActive', true);
  await store.dispatch('count/updateCycleCountItems', []);
  await Promise.allSettled([await fetchCycleCount(), store.dispatch("count/fetchCycleCountItemsSummary", { inventoryCountImportId : props?.id, isSortingRequired: true }), store.dispatch("user/getProductStoreSetting", getProductStoreId())])
  selectedSegment.value = 'all';
  queryString.value = '';
  previousItem = itemsList.value[0]
  await store.dispatch("product/currentProduct", itemsList.value[0])
  barcodeInput.value?.$el?.setFocus();
  isLoadingItems.value = false;
  await nextTick(); // Wait for DOM update
  if(isScrollingAnimationEnabled.value && itemsList.value?.length) initializeObserver()
  emitter.on("handleProductClick", handleProductClick)
  emitter.on("updateAnimatingProduct", updateAnimatingProduct)
})  

onIonViewDidLeave(async() => {
  await store.dispatch('count/setCountDetailPageActive', false);
  await store.dispatch('count/updateCycleCountItems', []);
  store.dispatch("product/currentProduct", {});
  emitter.off("handleProductClick", handleProductClick)
  emitter.off("updateAnimatingProduct", updateAnimatingProduct)
})

onBeforeRouteLeave(async (to) => {
  if(to.path === "/login") return;
  if(!hasUnsavedChanges.value) return true;
  let leavePage = false;

  const alert = await alertController.create({
    header: translate("Leave page"),
    message: translate("Any edits made in the counted quantity on this page will be lost."),
    buttons: [
      {
        text: translate("STAY"),
        handler: () => {
          leavePage = false
        }
      },
      {
        text: translate("LEAVE"),
        handler: () => {
          leavePage = true
        },
      },
    ],
  });

  alert.present();
  const data = await alert.onDidDismiss()
  // If clicking backdrop just close the modal and do not redirect the user to previous page
  if(data?.role === "backdrop") {
    return false;
  }

  if(leavePage) hasUnsavedChanges = false;
  return leavePage
})

function inputCountValidation(event) {
  if(/[`!@#$%^&*()_+\-=\\|,.<>?~e]/.test(event.key) && event.key !== 'Backspace') event.preventDefault();
}

function updateAnimatingProduct(item) {
  isAnimationInProgress.value = true;
  productInAnimation.value = item;
}

function handleProductClick(item) {
  if(item) {
    if(inputCount.value) saveCount(product.value, true)
    store.dispatch("product/currentProduct", item);
    previousItem = item   
  }
}

async function fetchCycleCount() {
  let payload = props?.id
  let resp
  try {
    resp = await CountService.fetchCycleCount(payload)
    if (!hasError(resp)) {
      cycleCount.value = resp?.data
    } else {
      showToast(translate("Something went wrong"))
    }
  } catch (err) {
    logger.error(err)
    showToast(translate("Something went wrong"))
  }
  return;
}

function selectSearchBarText(event) {
  event.target.getInputElement().then((element) => {
    element.select();
  })
}

async function scanProduct() {
  if(!queryString.value.trim()) {
    showToast(translate("Please provide a valid barcode identifier."))
    return;
  }

  const barcodeIdentifier = productStoreSettings.value["barcodeIdentificationPref"];
  const cachedProducts = getCachedProducts.value;

  let selectedItem = {}

  if(cycleCount.value.statusId === 'INV_COUNT_ASSIGNED') {
    selectedItem = itemsList.value.find((item) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, cachedProducts[item.productId]) : item.internalName;
      return itemVal === queryString.value.trim() && item.itemStatusId === "INV_COUNT_CREATED";
    });
  }

  if(!selectedItem || !Object.keys(selectedItem).length) {
    selectedItem = itemsList.value.find((item) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, cachedProducts[item.productId]) : item.internalName;
      return itemVal === queryString.value.trim();
    });
  }

  if(!selectedItem) {
    showToast(translate("Scanned item is not present in the count."))
    queryString.value = ""
    return;
  } else {
    scannedItem.value = selectedItem
  }

  const isAlreadySelected = (product.value.productId === selectedItem.productId && product.value.importItemSeqId === selectedItem.importItemSeqId);
  if(!isAlreadySelected) {
    if(isScrollingAnimationEnabled.value) {
      hasUnsavedChanges.value = false;
      router.replace({ hash: `#${selectedItem.productId}-${selectedItem.importItemSeqId}` }); 
      setTimeout(() => {
        const element = document.getElementById(`${selectedItem.productId}-${selectedItem.importItemSeqId}`);
        if (element) {
          isAnimationInProgress.value = true;
          productInAnimation.value = selectedItem
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 0);
    } else {
      handleProductClick(selectedItem)
    }
    if(productStoreSettings.value["isFirstScanCountEnabled"] && selectedItem.quantity >= 0) {
      openRecountAlert()
    }
    // increment inputCount when scrolling animation is disabled and first scan count is enabled
    if(!isScrollingAnimationEnabled.value) {
      if(productStoreSettings.value["isFirstScanCountEnabled"]) inputCount.value++;
    }
  } else if(cycleCount.value.statusId === "INV_COUNT_ASSIGNED" && selectedItem.itemStatusId === "INV_COUNT_CREATED") {
    if((!selectedItem.quantity && selectedItem.quantity !== 0) || product.value.isRecounting) {
      hasUnsavedChanges.value = true;
      inputCount.value++
    } else if(selectedItem.quantity >= 0) {
      openRecountAlert()
    }
  }
  queryString.value = ""
}

async function updateFilteredItems() {
  if (itemsList.value.length > 0) {
    // As we want to get the index of the product, if we directly store the product in the updatedProduct variable it does not return the index
    // as both the object becomes different because of the reference, so if we have a product, then first finding it in the filtered list to have a common reference and then getting the index
    const updatedProduct = Object.keys(product.value)?.length ? itemsList.value.find((item) => item.productId === product.value.productId && item.importItemSeqId === product.value.importItemSeqId) : itemsList.value[0]
    if (updatedProduct) {
      store.dispatch("product/currentProduct", updatedProduct);
    } else {
      store.dispatch("product/currentProduct", itemsList.value[0]);
    }
  } else {
    store.dispatch("product/currentProduct", {});
  }
  await nextTick();
  if(isScrollingAnimationEnabled.value && itemsList.value?.length) initializeObserver()
  if(isAnimationInProgress.value) {
    store.dispatch("product/currentProduct", productInAnimation.value);
    isAnimationInProgress.value = false;
    productInAnimation.value = {}
  }
}

function initializeObserver() {
  const main = scrollingContainerRef.value;
  if(!main) return;
  let timeoutId = null;
  const products = Array.from(main.querySelectorAll('.image'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if(timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
        const productId = entry.target.dataset.productId;
        const seqId = entry.target.dataset.seq;
        const currentProduct = itemsList.value?.find((item) => item.productId === productId && item.importItemSeqId === seqId);
        
        if(!isScanningInProgress.value && (previousItem.productId !== currentProduct.productId || previousItem.importItemSeqId !== currentProduct.importItemSeqId)) {
          if(inputCount.value) saveCount(previousItem, true);
        }
        previousItem = currentProduct  // Update the previousItem variable with the current item

        if (currentProduct) {
          store.dispatch("product/currentProduct", currentProduct);
          product.value.isRecounting = false;
          // Fetch product stock only for the current product if showQoh is enabled
          if(productStoreSettings.value['showQoh']) {
            store.dispatch("product/fetchProductStock", currentProduct.productId);
          }
          if(isAnimationInProgress.value && productInAnimation.value?.productId === currentProduct.productId) {
            isAnimationInProgress.value = false
            productInAnimation.value = {}
          }
        }
        // update the input count when the first scan count is enabled and the current product matches the scanned item
        if(productStoreSettings.value["isFirstScanCountEnabled"] && currentProduct.productId === scannedItem.value.productId && currentProduct.importItemSeqId === scannedItem.value.importItemSeqId && !scannedItem.value.quantity && scannedItem.value.quantity !== 0) {
          hasUnsavedChanges.value = true;
          inputCount.value++;
          scannedItem.value = {};
        }
        }, 200);
      }
    });
  }, {
    root: main,
    threshold: 0.5, 
  });

  products.forEach((product) => {
    observer.observe(product);
  });
}

async function changeProduct(direction) {
  if (isScrolling.value) return;
  isScrolling.value = true;

  const currentItemIndex = itemsList.value.findIndex((item) => item.productId === product.value.productId && item.importItemSeqId === product.value.importItemSeqId);
  const index = (direction === 'next') ? currentItemIndex + 1 : currentItemIndex - 1;

  if (index >= 0 && index < itemsList.value.length) {
    const product = itemsList.value[index];
    if(isScrollingAnimationEnabled.value) {
      const productEl = document.querySelector(`[data-seq="${product.importItemSeqId}"]`);
      if (productEl) productEl.scrollIntoView({ behavior: 'smooth' });
      await new Promise(resolve => setTimeout(resolve, 500));
      await store.dispatch("product/currentProduct", product);
    } else {
      handleProductClick(product)
    }
  }
  isScrolling.value = false;
}


function getVariance(item , isRecounting) {
  const qty = item.quantity
  if(isRecounting && inputCount.value === "") return 0;
  if(!isRecounting && !qty && qty !== 0) {
    return 0;
  }

  // As the item is rejected there is no meaning of displaying variance hence added check for REJECTED item status
  return item.itemStatusId === "INV_COUNT_REJECTED" ? 0 : parseInt(isRecounting ? inputCount.value : qty) - parseInt(getProductStock.value(item.productId) ?? 0)
}

async function saveCount(currentProduct, isScrollEvent = false) {
  isScanningInProgress.value = true;
  if (!inputCount.value && inputCount.value !== 0) {
    showToast(translate(productStoreSettings.value['forceScan'] ? "Scan a count before saving changes" : "Enter a count before saving changes"))
    isScanningInProgress.value = false;
    return;
  }
  
  // Set the input count to empty to avoid race conditions while scanning.
  let currentCount = inputCount.value;
  inputCount.value = "";

  try {
    const payload = {
      inventoryCountImportId: currentProduct.inventoryCountImportId,
      importItemSeqId: currentProduct.importItemSeqId,
      productId: currentProduct.productId,
      quantity: currentCount,
      countedByUserLoginId: userProfile.value.username
    };
    const resp = await CountService.updateCount(payload);
    if (!hasError(resp)) {
      currentProduct.quantity = currentCount
      currentProduct.countedByGroupName = userProfile.value.userFullName
      currentProduct.countedByUserLoginId = userProfile.value.username
      currentProduct.isRecounting = false;
      const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList))
      items.map((item) => {
        if(item.importItemSeqId === currentProduct.importItemSeqId) {
          item.quantity = currentProduct.quantity
          item.countedByGroupName = userProfile.value.userFullName
          item.countedByUserLoginId = userProfile.value.username
        }
      })
      await store.dispatch('count/updateCycleCountItems', items);
      if(!isScrollEvent) await store.dispatch('product/currentProduct', currentProduct);
    } else {
      throw resp.data;
    }
    hasUnsavedChanges.value = false;
    updateFilteredItems();
  } catch (err) {
    logger.error(err);
    showToast(translate("Something went wrong, please try again"));
  }
  isScanningInProgress.value = false
}

async function openRecountAlert() {
  const alert = await alertController.create({
    header: translate("Update count"),
    message: translate("Updating a count will replace the existing count. The previous count cannot be restored after being replaced."),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel',
    },
    {
      text: translate('Re-count'),
      handler: () => {
        inputCount.value = product.value.quantity; 
        product.value.isRecounting = true;
      }
    }]
  });
  await alert.present();
  alert.onDidDismiss().then(() => {
    barcodeInput.value.$el.setFocus();
  })
}

async function openRecountSaveAlert() {
  if (!inputCount.value && inputCount.value !== 0) {
    showToast(translate(productStoreSettings.value['forceScan'] ? "Scan a count before saving changes" : "Enter a count before saving changes"));
    return;
  }

  const alert = await alertController.create({
    header: translate("Save re-count"),
    message: translate("Saving recount will replace the existing count for item."),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel',
    },
    {
      text: translate('Save Re-count'),
      handler: async () => {
        await saveCount(product.value); 
      }
    }]
  });
  await alert.present();
}

async function discardRecount() {
  const alert = await alertController.create({
    header: translate("Discard re-count"),
    message: translate("Discarding the re-count will revert the count to the previous count value."),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel',
    },
    {
      text: translate('Discard'),
      handler: async () => {
        inputCount.value = ''; 
        product.value.isRecounting = false;
        hasUnsavedChanges.value = false;
      }
    }]
  });
  await alert.present();
}

async function readyForReview() {
  const alert = await alertController.create({
    header: translate("Submit for review"),
    message: translate("Make sure you've reviewed the products and their counts before uploading them for review."),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel',
    },
    {
      text: translate('Submit'),
      handler: async () => {
        try {
          await CountService.updateCycleCount({
            inventoryCountImportId: props?.id,
            statusId: "INV_COUNT_REVIEW"
          })
          router.push("/tabs/count")
          // Deleting indexeddb record once the count is moved to pending review page
          deleteRecord("counts", props?.id)
          showToast(translate("Count has been submitted for review"))
        } catch(err) {
          showToast(translate("Failed to submit cycle count for review"))
        }
      }
    }]
  });
  await alert.present();
}
</script>

<style scoped>

ion-list {
  min-width: 400px;
}

.find {
  display: grid;
  height: 100%;
  grid-template-areas: "search"
                       "main";
}

.find >.filters {
  display: none;
}

.find > main {
  grid-area: main;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
  border-right: 1px solid var(--ion-color-medium);
}

.product-info {
  width: 100%;
  margin-top: var(--spacer-lg);
}

.product-image {
  text-align: center;
  margin-top: var(--spacer-lg);
}

.fixed-section {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--ion-background-color, #fff);
}

.product-detail {
  display: grid;
  grid: "product detail" / 1fr 2fr;
  height: 100%;
  overflow: auto;
}

.product {
  overflow: scroll;
  height: 90vh;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
  will-change: scroll-position; /* Hint to browser about scrolling */
}

.product::-webkit-scrollbar { 
  display: none;  
}

.image {
  grid-area: image;
  height: 90vh;
  scroll-snap-stop: always;
  scroll-snap-align: start;
}

.detail {
  grid-area: detail;
  margin-top: var(--spacer-lg);
  margin-right: var(--spacer-lg);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: max-content;
}

.detail > ion-item {
  grid-column: span 2;
}

.virtual-scroller {
  --virtual-scroller-offset: 150px;
}

@media (max-width: 991px) {
  .product {
    grid: "image"
          "detail"
          / auto;
    padding: 0;
  }
}

@media (min-width: 991px) {
 .find {
    grid: "search main" min-content
          "filters main" 1fr
          / 375px;
    column-gap: var(--spacer-2xl);
  }
 .find >.filters {
    display: unset;
  }
}

</style>