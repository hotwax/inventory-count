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
            <ion-item lines="full">
              <ion-input :label="translate('Scan items')" :placeholder="translate('Scan or search products')" ref="barcodeInputRef" @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="scanProduct()"/>
            </ion-item>
            <ion-segment v-model="selectedSegment" @ionChange="handleSegmentChange()">
              <template v-if="cycleCount?.statusId === 'INV_COUNT_ASSIGNED'">
                <ion-segment-button value="all">
                  <ion-label>{{ translate("ALL") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="unmatched">
                  <ion-label>{{ translate("UNMATCHED") }}</ion-label>
                </ion-segment-button>
              </template>
  
              <template v-else-if="cycleCount?.statusId === 'INV_COUNT_REVIEW'">
                <ion-segment-button value="all">
                  <ion-label>{{ translate("ALL") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="notCounted">
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
            <ProductItemList v-for="item in itemsList" :key="item.inventoryCountImportId" :item="item"/>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>{{ translate("No products found.") }}</p>
            </div>
          </template>
        </aside>

        <!--Product details-->
        <main :class="itemsList?.length ? 'product-detail' : ''">
          <template v-if="itemsList?.length">
            <div class="product" @scroll="onScroll">
              <div class="image ion-padding-top" v-for="item in itemsList" :key="item.importItemSeqId" :data-product-id="item.productId" :data-seq="item.importItemSeqId" :id="isItemAlreadyAdded(item) ? `${item.productId}-${item.importItemSeqId}` :  item.scannedId" :data-isMatching="item.isMatching" :data-scanned-id="item.scannedId">
                <Image :src="getProduct(item.productId)?.mainImageUrl" />
              </div>
            </div>

            <div class="detail">
              <ion-item lines="none">
                <ion-label class="ion-text-wrap" v-if="currentProduct.productId">
                  <h1>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(currentProduct.productId)) || getProduct(currentProduct.productId).productName }}</h1>
                  <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, getProduct(currentProduct.productId)) }}</p>
                </ion-label>
                <ion-label class="ion-text-wrap" v-else>
                  <h1>{{ currentProduct.scannedId }}</h1>
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
              <ion-list v-if="!currentProduct.scannedId && currentProduct.statusId !== 'INV_COUNT_CREATED' && currentProduct.statusId !== 'INV_COUNT_ASSIGNED'">
                <ion-item>
                  {{ translate("Counted") }}
                <ion-label slot="end">{{ currentProduct.quantity || currentProduct.quantity === 0 ? currentProduct.quantity : '-'}}</ion-label>
                </ion-item>
                <template v-if="productStoreSettings['showQoh']">
                  <ion-item>
                    {{ translate("Current on hand") }}
                    <ion-label slot="end">{{ currentProduct.qoh }}</ion-label>
                  </ion-item>
                  <ion-item v-if="currentProduct.itemStatusId !== 'INV_COUNT_REJECTED'">
                    {{ translate("Variance") }}
                    <ion-label slot="end">{{ getVariance(currentProduct, false) }}</ion-label>
                  </ion-item>
                </template>
              </ion-list>
              <template v-else>
                <ion-list v-if="currentProduct.isRecounting">
                  <ion-item>
                    <ion-input :label="translate('Count')" :disabled="productStoreSettings['forceScan']" :placeholder="translate('submit physical count')" name="value" v-model="inputCount" id="value" type="number" min="0" required @ionInput="hasUnsavedChanges=true" @keydown="inputCountValidation"/>
                    <ion-button slot="end" fill="clear" size="default" class="ion-no-padding" @click="inputCount = 0">
                      <ion-icon :icon="closeOutline" stot="icon-only" />
                    </ion-button>
                  </ion-item>

                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ currentProduct.qoh }}</ion-label>
                    </ion-item>
                    <ion-item>
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(currentProduct, true) }}</ion-label>
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

                <ion-list v-else-if="currentProduct.quantity >= 0">
                  <ion-item>
                    {{ translate("Counted") }}
                    <ion-label slot="end">{{ currentProduct.quantity }}</ion-label>
                  </ion-item>
                  <ion-item>
                    {{ translate("Counted by") }}
                    <ion-label slot="end">{{ getPartyName(currentProduct)}}</ion-label>
                  </ion-item>
                  <!-- TODO: make the counted at information dynamic -->
                  <!-- <ion-item>
                    {{ translate("Counted at") }}
                    <ion-label slot="end">{{ "-" }}</ion-label>
                  </ion-item> -->
                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ currentProduct.qoh }}</ion-label>
                    </ion-item>
                    <ion-item v-if="currentProduct.itemStatusId !== 'INV_COUNT_REJECTED'">
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(currentProduct, false) }}</ion-label>
                    </ion-item>
                  </template>
                  <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(currentProduct.itemStatusId)" class="ion-margin" fill="outline" expand="block" @click="openRecountAlert()">
                    {{ translate("Re-count") }}
                  </ion-button>
                </ion-list>

                <ion-list v-else>
                  <ion-item v-if="currentProduct.itemStatusId === 'INV_COUNT_REJECTED' || currentProduct.itemStatusId === 'INV_COUNT_COMPLETED'">
                    {{ translate("Counted") }}
                    <ion-label slot="end">{{ currentProduct.quantity || "-" }}</ion-label>
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
                      <ion-label slot="end">{{ currentProduct.qoh }}</ion-label>
                    </ion-item>
                    <ion-item>
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(currentProduct, true) }}</ion-label>
                    </ion-item>
                  </template>
                  <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(currentProduct.itemStatusId)" class="ion-margin" expand="block" @click="saveCount(currentProduct)">
                    {{ translate("Save count") }}
                  </ion-button>
                </ion-list>
              </template>
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

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="cycleCount?.statusId === 'INV_COUNT_ASSIGNED'">
      <ion-fab-button @click="readyForReview">
        <ion-icon :icon="paperPlaneOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script lang="ts" setup>
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
} from "@ionic/vue";
import { chevronDownOutline, chevronUpOutline, closeOutline, paperPlaneOutline } from "ionicons/icons";
import { translate } from "@/i18n";
import { computed, defineProps, ref } from "vue";
import { useStore } from "@/store";
import logger from "@/logger";
import emitter from "@/event-bus";
import ProductItemList from "@/views/ProductItemList.vue";
import { getPartyName, getProductIdentificationValue, hasError, showToast } from "@/utils";
import { CountService } from "@/services/CountService";
import Image from "@/components/Image.vue";
import router from "@/router";
import { onBeforeRouteLeave } from "vue-router";
import { ProductService } from "@/services/ProductService";

const store = useStore();

const currentProduct = computed(() => store.getters["product/getCurrentProduct"]);
const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id));
const cycleCountItems = computed(() => store.getters["count/getCycleCountItems"]);
const userProfile = computed(() => store.getters["user/getUserProfile"])
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])
const currentItemIndex = computed(() => !currentProduct.value ? 0 : currentProduct.value.scannedId ? itemsList.value?.findIndex((item: any) => item.scannedId === currentProduct.value.scannedId) : itemsList?.value.findIndex((item: any) => item.productId === currentProduct.value?.productId && item.importItemSeqId === currentProduct.value?.importItemSeqId));

const itemsList = computed(() => {
  if(selectedSegment.value === "all") {
    return cycleCountItems.value.itemList;
  } else if(selectedSegment.value === "pending") {
    return cycleCountItems.value.itemList.filter((item: any) => item.isMatchNotFound);
  } else if(selectedSegment.value === "counted") {
    return cycleCountItems.value.itemList.filter((item: any) => item.quantity >= 0 || (item.itemStatusId === "INV_COUNT_REJECTED" || item.itemStatusId === "INV_COUNT_COMPLETED"));
  } else if(selectedSegment.value === "notCounted") {
    return cycleCountItems.value.itemList.filter((item: any) => !item.quantity && item.statusId === "INV_COUNT_REVIEW");
  } else if(selectedSegment.value === "rejected") {
    return cycleCountItems.value.itemList.filter((item: any) => item.itemStatusId === "INV_COUNT_REJECTED");
  } else if(selectedSegment.value === "accepted") {
    return cycleCountItems.value.itemList.filter((item: any) => item.itemStatusId === "INV_COUNT_COMPLETED");
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
const isScrolling = ref(false);
const isScanningInProgress = ref(false);
const hasUnsavedChanges = ref(false) as any;


onIonViewDidEnter(async() => {  
  await Promise.allSettled([fetchCycleCount(),   await store.dispatch("count/fetchCycleCountItems", { inventoryCountImportId : props?.id })])
  previousItem = itemsList.value[0];
  await store.dispatch("product/currentProduct", itemsList.value?.length ? itemsList.value[0] : {})
  barcodeInputRef.value?.$el?.setFocus();
})


async function fetchCycleCount() {
  emitter.emit("presentLoader");
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
  emitter.emit("dismissLoader")
}

function handleSegmentChange() {
  if(itemsList.value.length > 0) {
    let updatedProduct = Object.keys(currentProduct.value)?.length ? itemsList.value.find((item: any) => item.productId === currentProduct.value.productId && item.importItemSeqId === currentProduct.value.importItemSeqId) : itemsList.value[0]
    if(!updatedProduct) {
      updatedProduct = itemsList.value[0];
    }
    store.dispatch("product/currentProduct", updatedProduct);
  } else {
    store.dispatch("product/currentProduct", {});
  }
}

async function changeProduct(direction: string) {
  if(isScrolling.value) return;
  isScrolling.value = true;

  const index = (direction === 'next') ? currentItemIndex.value + 1 : currentItemIndex.value - 1;

  if(index >= 0 && index < itemsList.value.length) {
    const product = itemsList.value[index];
    let productEl = {} as any;
    if(isItemAlreadyAdded(product)) {
      productEl = document.querySelector(`[data-seq="${product.importItemSeqId}"]`);
    } else {
      productEl = document.getElementById(product.scannedId);
    }
    if(productEl) productEl.scrollIntoView({ behavior: 'smooth' });
    await new Promise(resolve => setTimeout(resolve, 500));
    await store.dispatch("product/currentProduct", product);
  }
  isScrolling.value = false;
}

async function scanProduct() {
  if(!queryString.value) {
    showToast(translate("Please provide a valid barcode identifier."))
    return;
  }

  const barcodeIdentifier = productStoreSettings.value["barcodeIdentificationPref"];
  let selectedItem = {} as any;

  if(cycleCount.value.statusId === 'INV_COUNT_ASSIGNED') {
    selectedItem = itemsList.value.find((item: any) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct.value(item.productId)) : item.internalName;
      return itemVal === queryString.value && item.itemStatusId === "INV_COUNT_CREATED";
    });
  }

  if(!selectedItem || !Object.keys(selectedItem).length) {
    selectedItem = itemsList.value.find((item: any) => {
      const itemVal = barcodeIdentifier ? getProductIdentificationValue(barcodeIdentifier, getProduct.value(item.productId)) : item.internalName;
      return itemVal === queryString.value;
    });
  }

  if(!selectedItem || !Object.keys(selectedItem).length) {
    selectedItem = itemsList.value.find((item: any) => item.scannedId === queryString.value)
  }

  if(!selectedItem) {
    addProductToItemsList();
    showToast(translate("Scanned item is not present in the count."))
    queryString.value = ""
    return;
  }

  const isAlreadySelected = isItemAlreadyAdded(selectedItem) ? (currentProduct.value.productId === selectedItem.productId && currentProduct.value.importItemSeqId === selectedItem.importItemSeqId) : (currentProduct.value.scannedId === selectedItem.scannedId);
  if(!isAlreadySelected) {
    hasUnsavedChanges.value = false;
    router.replace({ hash: isItemAlreadyAdded(selectedItem) ? `#${selectedItem.productId}-${selectedItem.importItemSeqId}` : `#${selectedItem.scannedId}` }); 
    setTimeout(() => {
      const element = document.getElementById(isItemAlreadyAdded(selectedItem) ? `${selectedItem.productId}-${selectedItem.importItemSeqId}` : selectedItem.scannedId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 0);
  } else if(selectedItem.itemStatusId === "INV_COUNT_CREATED" && selectedItem.itemStatusId !== "INV_COUNT_REJECTED" && selectedItem.itemStatusId !== "INV_COUNT_COMPLETED") {
    inputCount.value++;
  }
  queryString.value = ""
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