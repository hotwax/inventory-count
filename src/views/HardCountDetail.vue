<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/tabs/count" slot="start"></ion-back-button>
        <ion-title>{{ cycleCount.countImportName }}</ion-title>
        <ion-buttons slot="end" v-if="currentProduct && currentProduct.isMatchNotFound">
          <ion-button fill="clear" @click="removeCountItem(currentProduct)">
            <ion-icon :icon="trashOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="find">
        <aside class="filters">
          <div class="fixed-section">
            <ion-item lines="full">
              <ion-input :label="translate('Scan items')" :placeholder="translate('Scan or search products')" ref="barcodeInputRef" @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="scanProduct()"/>
            </ion-item>
            <ion-segment v-model="selectedSegment" @ionChange="handleSegmentChange()">
              <ion-segment-button value="all">
                <ion-label>{{ translate("ALL") }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="unmatched">
                <ion-label>{{ translate("UNMATCHED") }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>
          <template v-if="itemsList?.length > 0">
            <ProductItemList v-for="item in itemsList" :key="item.importItemSeqId ? item.importItemSeqId : item.scannedId" :item="item"/>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>{{ translate("No products found.") }}</p>
            </div>
          </template>
        </aside>

        <!--Product details-->
        <main :class="itemsList?.length ? 'product-detail' : ''">
          <template v-if="itemsList?.length && Object.keys(currentProduct)?.length">
            <div class="product" @scroll="isScrollingAnimationEnabled ? onScroll : null" ref="scrollingContainerRef">
              <template v-if="isScrollingAnimationEnabled">
                <div class="image ion-padding-top" v-for="item in itemsList" :key="item.importItemSeqId || item.scannedId" :data-product-id="item.productId" :data-seq="item.importItemSeqId" :id="isItemAlreadyAdded(item) ? `${item.productId}-${item.importItemSeqId}` :  item.scannedId" :data-isMatching="item.isMatching" :data-scanned-id="item.scannedId">
                  <Image :src="getProduct(item.productId)?.mainImageUrl" />
                </div>
              </template>
              <div v-else class="image ion-padding-top">
                <Image :src="getProduct(currentProduct.productId)?.mainImageUrl" />
              </div>
            </div>

            <div class="detail">
              <ion-item lines="none">
                <ion-icon v-if="!isItemAlreadyAdded(currentProduct)" :icon="cloudOfflineOutline" slot="start" />
                <ion-label class="ion-text-wrap" v-if="currentProduct.productId">
                  <h1>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(currentProduct.productId)) || getProduct(currentProduct.productId).productName }}</h1>
                  <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, getProduct(currentProduct.productId)) }}</p>
                </ion-label>
                <ion-label class="ion-text-wrap" v-else>
                  <h1>{{ currentProduct.scannedId }}</h1>
                  <p>{{ translate(currentProduct.isMatching ? "matching..." : "no match found") }}</p>
                </ion-label>

                <ion-badge v-if="currentProduct.itemStatusId === 'INV_COUNT_COMPLETED'" color="success">
                  {{ translate("accepted") }}
                </ion-badge>

                <ion-badge v-if="currentProduct.itemStatusId === 'INV_COUNT_REJECTED'" color="danger">
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

              <ion-list v-if="currentProduct.quantity || currentProduct.scannedCount">
                <ion-item v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(currentProduct.itemStatusId)">
                  <ion-input :label="translate('Count')" :disabled="productStoreSettings['forceScan']" :placeholder="translate('submit physical count')" name="value" v-model="inputCount" id="value" type="number" min="0" required @keydown="inputCountValidation"/>
                </ion-item>

                <ion-item>
                  {{ translate("Counted") }}
                  <ion-label slot="end">{{ isItemAlreadyAdded(currentProduct) ? currentProduct.quantity : currentProduct.scannedCount }}</ion-label>
                </ion-item>
                <ion-item>
                  {{ translate("Counted by") }}
                  <ion-label slot="end">{{ getPartyName(currentProduct) }}</ion-label>
                </ion-item>

                <template v-if="productStoreSettings['showQoh']">
                  <ion-item>
                    {{ translate("Current on hand") }}
                    <ion-label slot="end">{{ isItemAlreadyAdded(currentProduct) ? currentProduct.qoh : "-" }}</ion-label>
                  </ion-item>
                  <ion-item v-if="currentProduct.itemStatusId !== 'INV_COUNT_REJECTED'">
                    {{ translate("Variance") }}
                    <ion-label slot="end">{{ isItemAlreadyAdded(currentProduct) ? getVariance(currentProduct, false) : "-" }}</ion-label>
                  </ion-item>
                </template>

                <template v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(currentProduct.itemStatusId)">
                  <ion-list-header>
                    {{ translate("New count") }}
                  </ion-list-header>

                  <ion-radio-group v-model="selectedCountUpdateType">
                    <ion-item>
                      <ion-radio label-placement="end" value="add">
                        <ion-label>
                          {{ translate("Add to existing count") }}
                          <ion-note v-if="inputCount">+ {{ inputCount }}</ion-note>
                        </ion-label>
                      </ion-radio>
                    </ion-item>
                    <ion-item>
                      <ion-radio label-placement="end" value="replace">
                        <ion-label>
                          {{ translate("Replace existing count") }}
                          <ion-note v-if="inputCount"><span class="line-through">{{ isItemAlreadyAdded(currentProduct) ? currentProduct.quantity : currentProduct.scannedCount }}</span> {{ inputCount }}</ion-note>
                        </ion-label>
                      </ion-radio>
                    </ion-item>
                  </ion-radio-group>
                </template>

                <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(currentProduct.itemStatusId)" class="ion-margin" expand="block" :disabled="currentProduct.isMatching" @click="currentProduct.isMatchNotFound ? matchProduct(currentProduct) : saveCount(currentProduct)">
                  {{ translate((currentProduct.isMatchNotFound || currentProduct.isMatching) ? "Match product" : "Save count") }}
                </ion-button>
              </ion-list>

              <ion-list v-else>
                <ion-item v-if="currentProduct.itemStatusId === 'INV_COUNT_REJECTED' || currentProduct.itemStatusId === 'INV_COUNT_COMPLETED'">
                  {{ translate("Counted") }}
                  <ion-label slot="end">{{ currentProduct.quantity || "-" }}</ion-label>
                </ion-item>
                <ion-item v-else>
                  <ion-input :label="translate('Count')" :placeholder="translate('submit physical count')" :disabled="productStoreSettings['forceScan']" name="value" v-model="inputCount" id="value" type="number" min="0" required @keydown="inputCountValidation"/>
                </ion-item>

                <template v-if="productStoreSettings['showQoh']">
                  <ion-item>
                    {{ translate("Current on hand") }}
                    <ion-label slot="end">{{ isItemAlreadyAdded(currentProduct) ? currentProduct.qoh : "-" }}</ion-label>
                  </ion-item>
                  <ion-item>
                    {{ translate("Variance") }}
                    <ion-label slot="end">{{ isItemAlreadyAdded(currentProduct) ? getVariance(currentProduct, true) : "-" }}</ion-label>
                  </ion-item>
                </template>
                <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(currentProduct.itemStatusId)" class="ion-margin" expand="block" :disabled="currentProduct.isMatching" @click="currentProduct.isMatchNotFound ? matchProduct(currentProduct) :  saveCount(currentProduct)">
                  {{ translate((currentProduct.isMatchNotFound || currentProduct.isMatching) ? "Match product" : "Save count") }}
                </ion-button>
              </ion-list>
            </div>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>{{ translate("No products found.") }}</p>
            </div>
          </template>
        </main>
      </div>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="readyForReview">
        <ion-icon :icon="paperPlaneOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonContent,
  IonBadge, 
  IonButton, 
  IonButtons,
  IonIcon,
  IonItem,  
  IonList,
  IonListHeader,
  IonHeader,
  IonFab,
  IonFabButton,
  IonInput,
  IonLabel,
  IonNote,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter,
  onIonViewDidLeave,
  alertController,
  modalController
} from "@ionic/vue";
import { chevronDownOutline, chevronUpOutline, cloudOfflineOutline, paperPlaneOutline, trashOutline } from "ionicons/icons";
import { translate } from "@/i18n";
import { computed, defineProps, nextTick, ref } from "vue";
import { useStore } from "@/store";
import logger from "@/logger";
import emitter from "@/event-bus";
import ProductItemList from "@/views/ProductItemList.vue";
import { getPartyName, getProductIdentificationValue, hasError, showToast } from "@/utils";
import { CountService } from "@/services/CountService";
import Image from "@/components/Image.vue";
import router from "@/router";
import MatchProductModal from "@/components/MatchProductModal.vue";

const store = useStore();

const currentProduct = computed(() => store.getters["product/getCurrentProduct"]);
const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id));
const cycleCountItems = computed(() => store.getters["count/getCycleCountItems"]);
const userProfile = computed(() => store.getters["user/getUserProfile"])
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])
const defaultRecountUpdateBehaviour = computed(() => store.getters["count/getDefaultRecountUpdateBehaviour"])
const currentItemIndex = computed(() => !currentProduct.value ? 0 : currentProduct.value.scannedId ? itemsList.value?.findIndex((item: any) => item.scannedId === currentProduct.value.scannedId) : itemsList?.value.findIndex((item: any) => item.productId === currentProduct.value?.productId && item.importItemSeqId === currentProduct.value?.importItemSeqId));
const currentFacility = computed(() => store.getters["user/getCurrentFacility"])

const itemsList = computed(() => {
  if(selectedSegment.value === "all") {
    return cycleCountItems.value.itemList;
  } else if(selectedSegment.value === "unmatched") {
    return cycleCountItems.value.itemList.filter((item: any) => item.isMatchNotFound);
  } else {
    return [];
  }
});

const props = defineProps(["id"]);
const cycleCount = ref({}) as any;
const queryString = ref("");
const selectedSegment = ref("all");

let previousItem = {} as any;
const barcodeInputRef = ref();
const inputCount = ref("") as any;
const selectedCountUpdateType = ref("add");
const isScrolling = ref(false);
let isScanningInProgress = ref(false);
const scrollingContainerRef = ref();
const isScrollingAnimationEnabled = process.env.VUE_APP_SCROLLING_ANIMATION_ENABLED ? JSON.parse(process.env.VUE_APP_SCROLLING_ANIMATION_ENABLED) : false;


onIonViewDidEnter(async() => {  
  emitter.emit("presentLoader");
  await Promise.allSettled([fetchCycleCount(),   await store.dispatch("count/fetchCycleCountItems", { inventoryCountImportId : props?.id, isSortingRequired: false }), store.dispatch("user/getProductStoreSetting", currentFacility.value?.productStore?.productStoreId)])
  previousItem = itemsList.value[0];
  await store.dispatch("product/currentProduct", itemsList.value?.length ? itemsList.value[0] : {})
  barcodeInputRef.value?.$el?.setFocus();
  selectedCountUpdateType.value = defaultRecountUpdateBehaviour.value
  window.addEventListener('beforeunload', handleBeforeUnload);
  if(isScrollingAnimationEnabled) initializeObserver()
  emitter.emit("dismissLoader")
  emitter.on("handleProductClick", handleProductClick)
})

onIonViewDidLeave(async() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  await handleBeforeUnload();
  await store.dispatch('count/updateCycleCountItems', []);
  store.dispatch("product/currentProduct", {});
  emitter.off("handleProductClick", handleProductClick)
})

async function handleBeforeUnload() {
  if(inputCount.value && isItemAlreadyAdded(currentProduct.value)) {
    await saveCount(currentProduct.value);
    inputCount.value = "";
  }

  const unmatchedProducts = [] as any;
  cycleCountItems.value.itemList.map((item: any) => {
    let unmatchedItem = {} as any;

    if(item.isMatchNotFound || item.isMatching) {
      unmatchedItem = { ...item, isMatching: false, isMatchNotFound: true }
      if(unmatchedItem.scannedId === currentProduct.value.scannedId) {
        if(unmatchedItem?.scannedCount) {
          unmatchedItem = { ...unmatchedItem, scannedCount: selectedCountUpdateType.value === "replace" ? inputCount.value : (Number(inputCount.value) + Number(unmatchedItem.scannedCount)) }
        } else {
          unmatchedItem = { ...unmatchedItem, scannedCount: inputCount.value }
        }
        inputCount.value = ""
      }
    }

    if(Object.keys(unmatchedItem)?.length) unmatchedProducts.push(unmatchedItem)
  })

  store.dispatch("count/updateCachedUnmatchProducts", { id: cycleCount.value.inventoryCountImportId, unmatchedProducts });
}

function handleProductClick(item: any) {
  if(item) {
    if(inputCount.value) saveCount(currentProduct.value, true)
    store.dispatch("product/currentProduct", item);
    previousItem = item
  }
}

async function fetchCycleCount() {
  try {
    const resp = await CountService.fetchCycleCount(props?.id)
    if(!hasError(resp)) {
      cycleCount.value = resp?.data
    } else {
      throw resp;
    }
  } catch (err) {
    logger.error(err)
    showToast(translate("Something went wrong"))
  }
}

async function handleSegmentChange() {
  if(itemsList.value.length) {
    let updatedProduct = Object.keys(currentProduct.value)?.length ? itemsList.value.find((item: any) => isItemAlreadyAdded(item) ? (item.productId === currentProduct.value.productId && item.importItemSeqId === currentProduct.value.importItemSeqId) : (item.scannedId === currentProduct.value.scannedId)) : itemsList.value[0]
    if(!updatedProduct) {
      updatedProduct = itemsList.value[0];
    }
    store.dispatch("product/currentProduct", updatedProduct);
  } else {
    store.dispatch("product/currentProduct", {});
  }
  inputCount.value = ""
  selectedCountUpdateType.value = defaultRecountUpdateBehaviour.value
  if(isScrollingAnimationEnabled) {
    await nextTick();
    initializeObserver()
  }
}

async function changeProduct(direction: string) {
  if(isScrolling.value) return;
  isScrolling.value = true;

  const index = (direction === 'next') ? currentItemIndex.value + 1 : currentItemIndex.value - 1;

  if(index >= 0 && index < itemsList.value.length) {
    const product = itemsList.value[index];
    if(isScrollingAnimationEnabled) {
      scrollToProduct(product);
      await new Promise(resolve => setTimeout(resolve, 500));
      await store.dispatch("product/currentProduct", product);
    } else {
      if(inputCount.value) saveCount(currentProduct.value, true)
      await store.dispatch("product/currentProduct", product);
    }
  }
  isScrolling.value = false;
}

function removeCountItem(current: any) {
  const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList))
  const currentItemIndex = items.findIndex((item: any) => item.scannedId === current.scannedId);

  const updatedProduct = items[(currentItemIndex < items.length - 1) ? (currentItemIndex + 1) : 0];
  const updatedItems = items.filter((item: any) => item.scannedId !== current.scannedId);

  store.dispatch("count/updateCycleCountItems", updatedItems);
  store.dispatch("product/currentProduct", updatedProduct ? updatedProduct : {})
  if(updatedProduct) scrollToProduct(updatedProduct);
}

async function scanProduct() {
  let isNewlyAdded = false;
  if(!queryString.value.trim()) {
    showToast(translate("Please provide a valid barcode identifier."))
    return;
  }

  const barcodeIdentifier = productStoreSettings.value["barcodeIdentificationPref"];
  let selectedItem = {} as any;

  selectedItem = itemsList.value.find((item: any) => {
    const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct.value(item.productId)) : item.internalName;
    return itemVal === queryString.value.trim() && item.itemStatusId === "INV_COUNT_CREATED";
  });

  if(!selectedItem || !Object.keys(selectedItem).length) {
    selectedItem = itemsList.value.find((item: any) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct.value(item.productId)) : item.internalName;
      return itemVal === queryString.value.trim();
    });
  }

  if(!selectedItem || !Object.keys(selectedItem).length) {
    selectedItem = itemsList.value.find((item: any) => item.scannedId === queryString.value.trim())
  }

  if(!selectedItem || !Object.keys(selectedItem).length) {
    if(selectedSegment.value === "all") {
      selectedItem = await addProductToItemsList();
      isNewlyAdded = true
    } else {
      showToast(translate("Scanned item is not present in the count. To add new product move to All Segment."))
      queryString.value = ""
      return;
    }
  }

  const isAlreadySelected = isItemAlreadyAdded(selectedItem) ? (currentProduct.value.productId === selectedItem.productId && currentProduct.value.importItemSeqId === selectedItem.importItemSeqId) : (currentProduct.value.scannedId === selectedItem.scannedId);
  if(!isAlreadySelected) {
    if(isScrollingAnimationEnabled) {
      scrollToProduct(selectedItem);
    } else {
      if(inputCount.value) saveCount(currentProduct.value, true)
      store.dispatch("product/currentProduct", selectedItem)
      previousItem = selectedItem
    }
  } else if(selectedItem.itemStatusId === "INV_COUNT_CREATED" && !isNewlyAdded) {
    inputCount.value++;
  }
  if(itemsList.value.length === 1) {
    store.dispatch("product/currentProduct", selectedItem)
    previousItem = selectedItem
  }
  queryString.value = ""
}

function scrollToProduct(product: any) {
  router.replace({ hash: isItemAlreadyAdded(product) ? `#${product.productId}-${product.importItemSeqId}` : `#${product.scannedId}` }); 
  setTimeout(() => {
    const element = document.getElementById(isItemAlreadyAdded(product) ? `${product.productId}-${product.importItemSeqId}` : product.scannedId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, 0);
}

async function addProductToItemsList() {
  const newItem = {
    scannedId: queryString.value.trim(),
    isMatching: true,
    itemStatusId: "INV_COUNT_CREATED",
    statusId: "INV_COUNT_ASSIGNED",
    inventoryCountImportId: cycleCount.value.inventoryCountImportId
  }

  const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList))
  items.push(newItem);
  await store.dispatch("count/updateCycleCountItems", items);
  if(isScrollingAnimationEnabled) initializeObserver()
  findProductFromIdentifier(queryString.value.trim());
  return newItem;
}

async function findProductFromIdentifier(scannedValue: string ) {
  const product = await store.dispatch("product/fetchProductByIdentification", { scannedValue })
  let newItem = {} as any;
  if(product?.productId) newItem = await addProductToCount(product.productId)

  setTimeout(() => {
    updateCurrentItemInList(newItem, scannedValue);
  }, 1000)
}

async function addProductToCount(productId: any) {
  let resp = {} as any, newProduct = {} as any;

  try {
    resp = await CountService.addProductToCount({
      inventoryCountImportId: cycleCount.value.inventoryCountImportId,
      itemList: [{
        idValue: productId,
        statusId: "INV_COUNT_CREATED"
      }]
    })

    if(!hasError(resp) && resp.data?.itemList?.length) {
      const importItemSeqId = resp.data.itemList[0].importItemSeqId

      resp = await CountService.fetchCycleCountItems({ inventoryCountImportId: cycleCount.value.inventoryCountImportId, importItemSeqId, pageSize: 1 })
      if(!hasError(resp)) {
        newProduct = resp.data.itemList[0];
      } else {
        throw resp;
      }
    } else {
      throw resp;
    }
  } catch(err) {
    logger.error("Failed to add product to count", err)
  }
  return newProduct;
}

async function updateCurrentItemInList(newItem: any, scannedValue: string) {  
  const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList));
  const updatedProduct = JSON.parse(JSON.stringify(currentProduct.value))

  let updatedItem = items.find((item: any) => item.scannedId === scannedValue);
  updatedItem = { ...updatedItem, ...newItem, isMatching: false }
  updatedItem["isMatchNotFound"] = newItem?.importItemSeqId ? false : true

  let newCount = "" as any;
  if(updatedItem && updatedItem?.scannedCount) {
    newCount = updatedItem.scannedCount
  } else if(selectedSegment.value === "unmatched" && (inputCount.value || updatedItem.scannedCount)) {
    newCount = Number(inputCount.value || 0) + Number(updatedItem.scannedCount || 0)
  }

  if(newCount) {
    try {
      const resp = await CountService.updateCount({
        inventoryCountImportId: cycleCount.value.inventoryCountImportId,
        importItemSeqId: updatedItem?.importItemSeqId,
        productId: updatedItem.productId,
        quantity: newCount,
        countedByUserLoginId: userProfile.value.username
      })
  
      if(!hasError(resp)) {
        updatedItem["quantity"] = newCount
        delete updatedItem["scannedCount"];
        if(selectedSegment.value === "unmatched") inputCount.value = ""
      }
    } catch(error) {
      logger.error(error)
    }
  }

  if(updatedProduct.scannedId === updatedItem.scannedId) {
    store.dispatch("product/currentProduct", updatedItem);
  }

  const currentItemIndex = items.findIndex((item: any) => item.scannedId === updatedItem.scannedId);
  items[currentItemIndex] = updatedItem

  store.dispatch('count/updateCycleCountItems', items);
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
          store.dispatch('count/clearCurrentCountFromCachedUnmatchProducts', props.id);
          showToast(translate("Count has been submitted for review"))
        } catch(err) {
          showToast(translate("Failed to submit cycle count for review"))
        }
      }
    }]
  });
  await alert.present();
}

const onScroll = () => {
  selectedCountUpdateType.value = defaultRecountUpdateBehaviour.value
};

function initializeObserver() {
  const main = scrollingContainerRef.value;
  const products = Array.from(main.querySelectorAll('.image'));
  const observer = new IntersectionObserver((entries) => {  
    entries.forEach((entry: any) => {
      if(entry.isIntersecting) {
        const dataset = entry.target.dataset
        let product = {} as any;
        if(dataset.ismatching || dataset.isMatchNotFound) {
          product = itemsList.value.find((item: any) => item.scannedId === dataset.scannedId);
        } else {
          product = itemsList.value?.find((item: any) => item.productId === dataset.productId && item.importItemSeqId === dataset.seq);
        }
        if(!isScanningInProgress.value && (isItemAlreadyAdded(previousItem) ? (previousItem.productId !== product.productId || previousItem.importItemSeqId !== product.importItemSeqId) : (previousItem.scannedId !== product.scannedId))) {
          if(inputCount.value) saveCount(previousItem, true);
        }

        if(product) {
          previousItem = product  // Update the previousItem variable with the current item
          store.dispatch("product/currentProduct", product);
        }
      }
    });
  }, {
    root: main,
    threshold: 0.5, 
  });
  products.forEach((product: any) => {
    observer.observe(product);
  }); 
}

async function saveCount(currentProduct: any, isScrollEvent = false) {
  if (!inputCount.value && inputCount.value !== 0) {
    showToast(translate(productStoreSettings.value['forceScan'] ? "Scan a count before saving changes" : "Enter a count before saving changes"))
    isScanningInProgress.value = false;
    return;
  }

  isScanningInProgress.value = true;
  if(!isItemAlreadyAdded(currentProduct)) {
    const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList));
    let currentItem = {};
    items.map((item: any) => {
      if(item.scannedId === currentProduct.scannedId) {
        const prevCount = currentProduct.scannedCount ? currentProduct.scannedCount : 0

        item.countedByUserLoginId = userProfile.value.username
        if(selectedCountUpdateType.value === "replace") item.scannedCount = inputCount.value
        else item.scannedCount = Number(inputCount.value) + Number(prevCount)
        currentItem = item;
      }
    })
    await store.dispatch('count/updateCycleCountItems', items);
    if(!isScrollEvent) await store.dispatch('product/currentProduct', currentItem);
    inputCount.value = ""; 
    isScanningInProgress.value = false;
    return;
  }
 
  try {
    const payload = {
      inventoryCountImportId: currentProduct.inventoryCountImportId,
      importItemSeqId: currentProduct.importItemSeqId,
      productId: currentProduct.productId,
      quantity: selectedCountUpdateType.value === "replace" ? inputCount.value : Number(inputCount.value) + Number(currentProduct.quantity || 0),
      countedByUserLoginId: userProfile.value.username
    };

    const resp = await CountService.updateCount(payload);
    if (!hasError(resp)) {
      currentProduct.quantity = selectedCountUpdateType.value === "replace" ? inputCount.value : Number(inputCount.value) + Number(currentProduct.quantity || 0)
      currentProduct.countedByGroupName = userProfile.value.userFullName
      currentProduct.countedByUserLoginId = userProfile.value.username
      currentProduct.isRecounting = false;
      const items = JSON.parse(JSON.stringify(cycleCountItems.value.itemList))
      items.map((item: any) => {
        if(item.importItemSeqId === currentProduct.importItemSeqId) {
          item.quantity = currentProduct.quantity
          item.countedByGroupName = userProfile.value.userFullName
          item.countedByUserLoginId = userProfile.value.username
        }
      })
      inputCount.value = '';
      await store.dispatch('count/updateCycleCountItems', items);
      if(!isScrollEvent) await store.dispatch('product/currentProduct', currentProduct);
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
    showToast(translate("Something went wrong, please try again"));
  }
  isScanningInProgress.value = false
}

async function matchProduct(currentProduct: any) {
  const addProductModal = await modalController.create({
    component: MatchProductModal,
    componentProps: { items: cycleCountItems.value.itemList },
    showBackdrop: false,
  });

  addProductModal.onDidDismiss().then(async (result) => {
    if(result.data?.selectedProduct) {
      const product = result.data.selectedProduct
      const newItem = await addProductToCount(product.productId)
      await updateCurrentItemInList(newItem, currentProduct.scannedId);
    }
  })

  addProductModal.present();
}

function getVariance(item: any , isRecounting: boolean) {
  const qty = item.quantity
  if(isRecounting && inputCount.value === "") return 0;
  if(!isRecounting && !qty && qty !== 0) {
    return 0;
  }

  // As the item is rejected there is no meaning of displaying variance hence added check for REJECTED item status
  return item.itemStatusId === "INV_COUNT_REJECTED" ? 0 : parseInt(isRecounting ? inputCount.value : qty) - parseInt(item.qoh)
}

function isItemAlreadyAdded(product: any) {
  return product.productId && product.importItemSeqId;
}

function selectSearchBarText(event: any) {
  event.target.getInputElement().then((element: any) => {
    element.select();
  })
}

function inputCountValidation(event: any) {
  if(/[`!@#$%^&*()_+\-=\\|,.<>?~e]/.test(event.key) && event.key !== "Backspace") event.preventDefault();
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

aside {
  overflow-y: scroll;
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
}

.product::-webkit-scrollbar { 
  display: none;  
}

.image {
  grid-area: image;
  height: 100vh;
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

/* 
  We are not able to show the count using ion-note at the right of the ion-radio when used inside of the ion-item because of it's default css 
  The following CSS is used to override the default ion-radio styles when placed inside an ion-item. 
  This customization ensures that the count displayed in the right slot is properly styled and aligned.
*/
ion-radio > ion-label {
  display: flex !important;
  flex: 1;
  justify-content: space-between;
}

ion-radio::part(label) {
  flex: 1;
}

.line-through {
  text-decoration: line-through;
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
