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
              <ion-input :label="translate('SKU')" :placeholder="translate('Scan or search products')" @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="searchProducts()"/>
            </ion-item>
            <ion-segment v-model="selectedSegment" @ionChange="updateFilteredItems()">
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
          <template v-if="filteredItems.length > 0">
            <ProductItemList v-for="item in filteredItems" :key="item.inventoryCountImportId" :item="item"/>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>{{ translate("No products found.") }}</p>
            </div>
          </template>
        </aside>
        <!--Product details-->
        <main @scroll="onScroll" class="main" >
          <div class="product" v-for="item in filteredItems" :key="item.importItemSeqId" :data-product-id="item.productId" :data-seq="item.importItemSeqId" :id="`${item.productId}-${item.importItemSeqId}`">
            <div class="image">
              <Image :src="getProduct(item.productId)?.mainImageUrl" />
            </div>
            <div class="detail">
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <h1>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(product.productId)) }}</h1>
                  <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, getProduct(product.productId)) }}</p>
                </ion-label>
                
                <ion-badge slot="end" v-if="product.itemStatusId === 'INV_COUNT_REJECTED'" color="danger">
                  {{ translate("rejected") }}
                </ion-badge>

                <ion-item lines="none" v-if="filteredItems.length">
                  <ion-label>{{ `${product.importItemSeqId}/${filteredItems.length}` }}</ion-label>
                </ion-item>

                <ion-button @click="showPreviousProduct" :disabled="isFirstItem">
                  <ion-icon slot="icon-only" :icon="chevronUpCircleOutline"></ion-icon>
                </ion-button>
        
                <ion-button @click="showNextProduct" :disabled="isLastItem">
                  <ion-icon slot="icon-only" :icon="chevronDownCircleOutline"></ion-icon>
                </ion-button>
              </ion-item>
              <ion-list v-if="product.statusId !== 'INV_COUNT_CREATED' && product.statusId !== 'INV_COUNT_ASSIGNED'">
                <ion-item>
                  {{ translate("Counted") }}
                <ion-label slot="end">{{ product.quantity ? product.quantity : '-'}}</ion-label>
                </ion-item>
                <template v-if="productStoreSettings['showQoh']">
                  <ion-item>
                    {{ translate("Current on hand") }}
                    <ion-label slot="end">{{ product.qoh }}</ion-label>
                  </ion-item>
                  <ion-item v-if="product.itemStatusId !== 'INV_COUNT_REJECTED'">
                    {{ translate("Variance") }}
                    <ion-label slot="end">{{ getVariance(product) }}</ion-label>
                  </ion-item>
                </template>
              </ion-list>
              <template v-else>
                <ion-list v-if="product.isRecounting">
                  <ion-item>
                    <ion-input :label="translate('Count')" :placeholder="translate('submit physical count')" name="value" v-model="inputCount" id="value" type="number" required @ionInput="calculateVariance"/>
                  </ion-item>
                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ product.qoh }}</ion-label>
                    </ion-item>
                    <ion-item>
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ variance }}</ion-label>
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
        
                <ion-list v-else-if="product.quantity">
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
                      <ion-label slot="end">{{ product.qoh }}</ion-label>
                    </ion-item>
                    <ion-item v-if="product.itemStatusId !== 'INV_COUNT_REJECTED'">
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ getVariance(product) }}</ion-label>
                    </ion-item>
                  </template>
                  <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(product.itemStatusId)" class="ion-margin" fill="outline" expand="block" @click="openRecountAlert()">
                    {{ translate("Re-count") }}
                  </ion-button>
                </ion-list>
                
                <ion-list v-else>
                  <ion-item>
                    <ion-input :label="translate('Count')" :placeholder="translate('submit physical count')" name="value" v-model="inputCount" id="value" type="number" required @ionInput="calculateVariance"/>
                  </ion-item>
                  <template v-if="productStoreSettings['showQoh']">
                    <ion-item>
                      {{ translate("Current on hand") }}
                      <ion-label slot="end">{{ product.qoh }}</ion-label>
                    </ion-item>
                    <ion-item>
                      {{ translate("Variance") }}
                      <ion-label slot="end">{{ variance }}</ion-label>
                    </ion-item>
                  </template>
                  <ion-button v-if="!['INV_COUNT_REJECTED', 'INV_COUNT_COMPLETED'].includes(product.itemStatusId)" class="ion-margin" expand="block" @click="saveCount()">
                    {{ translate("Save count") }}
                  </ion-button>
                </ion-list>
              </template>
            </div>
          </div>
          <template v-if="!filteredItems.length">
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
  alertController
} from '@ionic/vue';
import { chevronDownCircleOutline, chevronUpCircleOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { computed, defineProps, ref, onUpdated } from 'vue';
import { useStore } from "@/store";
import { hasError } from '@/utils'
import logger from '@/logger'
import emitter from '@/event-bus'
import ProductItemList from '@/views/ProductItemList.vue';
import { getPartyName, getProductIdentificationValue, showToast } from '@/utils';
import { CountService } from '@/services/CountService';
import { paperPlaneOutline } from "ionicons/icons"
import Image from "@/components/Image.vue";
import router from "@/router"


const store = useStore();

const product = computed(() => store.getters['product/getCurrentProduct']);
const getProduct = computed(() => (id) => store.getters["product/getProduct"](id))
const cycleCountItems = computed(() => store.getters["count/getCycleCountItems"]);
const userProfile = computed(() => store.getters["user/getUserProfile"])
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])

const itemsList = computed(() => {
  if (selectedSegment.value === 'all') {
    return cycleCountItems.value.itemList;
  } else if (selectedSegment.value === 'pending') {
    return cycleCountItems.value.itemList.filter(item =>!item.quantity);
  } else if (selectedSegment.value === 'counted') {
    return cycleCountItems.value.itemList.filter(item => item.quantity);
  } else if (selectedSegment.value === 'notCounted') {
    return cycleCountItems.value.itemList.filter(item => !item.quantity && item.statusId === "INV_COUNT_REVIEW");
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
let filteredItems = ref([]);

const inputCount = ref('');
const variance = ref(0);
const isFirstItem = ref(true);
const isLastItem = ref(false);

// Update variance value when component is updated, ensuring it's prefilled with correct value when page loads.
onUpdated(() => {
  calculateVariance();
  isFirstItem.value = true
  isLastItem.value = false
})

onIonViewDidEnter(async() => {  
  await fetchCycleCount();
  await fetchCycleCountItems();
  selectedSegment.value = 'all';
  queryString.value = '';
  updateFilteredItems();
  await store.dispatch("product/currentProduct", itemsList.value[0])
  updateNavigationState(0);
})  

async function fetchCycleCountItems() {
  let payload = props?.id
  await store.dispatch("count/fetchCycleCountItems", payload); 
}

async function fetchCycleCount() {
  emitter.emit("presentLoader");
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
  emitter.emit("dismissLoader")
  return;
}

function selectSearchBarText(event) {
  event.target.getInputElement().then((element) => {
    element.select();
  })
}

async function searchProducts() {
  updateFilteredItems(); 
}

function updateFilteredItems() {
  if (!queryString.value.trim()) {
    filteredItems.value = itemsList.value;
  } else {
    filteredItems.value = itemsList.value.filter(item => {
      const product = getProduct.value(item.productId);
      return product.sku.toLowerCase().includes(queryString.value.trim().toLowerCase());
    });
  }
  if (filteredItems.value.length > 0) {
    store.dispatch("product/currentProduct", filteredItems.value[0]);
    updateNavigationState(0);
  } else {
    store.dispatch("product/currentProduct", null);
    isFirstItem.value = true
    isLastItem.value = false
  }  
} 

// This function observes the scroll event on the main element, creates an IntersectionObserver to track when products come into view, 
// and updates the current product state and navigation when a product intersects with the main element.
const onScroll = (event) => {
  const main = event.target;
  const products = Array.from(main.querySelectorAll('.product'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const productId = entry.target.dataset.productId;
        const seqId = entry.target.dataset.seq;
        const currentProduct = filteredItems.value.find((item) => item.productId === productId && item.importItemSeqId === seqId);
        if (currentProduct) {
          const currentIndex = filteredItems.value.indexOf(currentProduct);
          store.dispatch("product/currentProduct", currentProduct);
          updateNavigationState(currentIndex);
          router.replace({ hash: `#${productId}-${seqId}` });
        }
      }
    });
  }, {
    root: main,
    threshold: 0.5, 
  });

  products.forEach((product) => {
    observer.observe(product);
  });
};

// Add this function to update the navigation state
const updateNavigationState = (currentIndex) => {
  isFirstItem.value = currentIndex === 0;
  isLastItem.value = currentIndex === filteredItems.value.length - 1;
};

async function showPreviousProduct() {
  const currentItemIndex = filteredItems.value.findIndex((item) => item.productId === product.value.productId && item.importItemSeqId === product.value.importItemSeqId);
  let previousProduct;
  if (currentItemIndex > 0) {
    previousProduct = filteredItems.value[currentItemIndex - 1];
    await store.dispatch("product/currentProduct", previousProduct);
    updateNavigationState(currentItemIndex - 1);
  }
  const productEl = document.querySelector(`[data-seq="${previousProduct?.importItemSeqId}"]`);
  if (productEl) {
    productEl.scrollIntoView({ behavior: 'smooth' });
  }
}

async function showNextProduct() {
  const currentItemIndex = filteredItems.value.findIndex((item) => item.productId === product.value.productId && item.importItemSeqId === product.value.importItemSeqId);
  let nextProduct;
  if (currentItemIndex < filteredItems.value.length - 1) {
    nextProduct = filteredItems.value[currentItemIndex + 1];
    await store.dispatch("product/currentProduct", nextProduct);
    updateNavigationState(currentItemIndex + 1);
  }
  const productEl = document.querySelector(`[data-seq="${nextProduct?.importItemSeqId}"]`);
  if (productEl) {
    productEl.scrollIntoView({ behavior: 'smooth' });
  }
}

async function calculateVariance() {
  if (!product.value || !inputCount.value) {
    variance.value = 0;
  } else {
    variance.value = parseInt(inputCount.value) - parseInt(product.value.qoh) || 0;
  }
}

function getVariance(item , count) {
  const qty = item.quantity
  if(!qty) {
    return 0;
  }

  // As the item is rejected there is no meaning of displaying variance hence added check for REJECTED item status
  return item.itemStatusId === "INV_COUNT_REJECTED" ? 0 : parseInt(count ? count : qty) - parseInt(item.qoh)
}

async function saveCount() {
  if (!inputCount.value) {
    showToast(translate("Enter a count before saving changes"))
    return;
  }
  try {
    const payload = {
      inventoryCountImportId: product.value.inventoryCountImportId,
      importItemSeqId: product.value.importItemSeqId,
      productId: product.value.productId,
      quantity: inputCount.value,
      countedByUserLoginId: userProfile.value.username
    };
    const resp = await CountService.updateCount(payload);
    if (!hasError(resp)) {
      product.value.quantity = inputCount.value
      product.value.countedByGroupName = userProfile.value.userFullName
      product.value.countedByUserLoginId = userProfile.value.username
      await store.dispatch('product/currentProduct', product.value);
      inputCount.value = ''; 
      product.value.isRecounting = false;
    } else {
      throw resp.data;
    }
    await store.dispatch("count/fetchCycleCountItems", payload.inventoryCountImportId); 
    updateFilteredItems();
  } catch (err) {
    logger.error(err);
    showToast(translate("Something went wrong, please try again"));
  }
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
}

async function openRecountSaveAlert() {
  if (!inputCount.value) {
    showToast(translate("Enter a count before saving changes"));
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
        await saveCount(); 
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
      }
    }]
  });
  await alert.present();
}

async function readyForReview() {
  const alert = await alertController.create({
    header: translate("Submit for review"),
    message: translate("Make sure you've reviewed the products and their counts before upload them for review."),
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
  background: var(--ion-background-color, #fff);
  z-index: 1000;
}

aside {
  overflow-y: scroll;
}

main {
  display: block;
  height: 100%;
  overflow: auto;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
}

.product {
  display: grid;
  height: 90vh;
  grid: "image detail"
         /1fr 2fr;
  scroll-snap-stop: always;
  scroll-snap-align: start;
}

.image {
  grid-area: image;
  margin-top: var(--spacer-lg);
  margin-right: var(--spacer-lg);
}

.detail {
  grid-area: detail;
  margin-top: var(--spacer-lg);
  margin-right: var(--spacer-lg);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: max-content;
  position: fixed;
  justify-self: end;
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