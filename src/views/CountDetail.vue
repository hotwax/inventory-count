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
          <ion-item lines="full" class="ion-margin-top">
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
          <template v-if="filteredItems.length > 0">
            <ProductItemList v-for="item in filteredItems" :key="item.inventoryCountImportId" :item="item"/>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>{{ translate("No products found.") }}</p>
            </div>
          </template>
        </aside>
        
        <ProductDetail />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonBackButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter,
  onIonViewWillLeave
} from '@ionic/vue';
import { translate } from '@/i18n'
import { computed, defineProps, ref } from 'vue';
import { useStore } from "@/store";
import { hasError } from '@/utils'
import logger from '@/logger'
import { showToast } from '@/utils';
import emitter from '@/event-bus'
import ProductItemList from '@/views/ProductItemList.vue';
import ProductDetail from '@/views/ProductDetail.vue';
import { CountService } from '@/services/CountService';

const store = useStore();

const cycleCountItems = computed(() => store.getters["count/getCycleCountItems"]);
const getProduct = computed(() => (id) => store.getters["product/getProduct"](id))

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

onIonViewDidEnter(async() => {  
  await fetchCycleCount();
  await fetchCycleCountItems();
  updateFilteredItems();
  emitter.on("updateItemList", updateFilteredItems);
  await store.dispatch("product/currentProduct", itemsList.value[0])
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
} 

onIonViewWillLeave(() => {
  emitter.off("updateItemList", updateFilteredItems);
})

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

ion-content > main {
  display: grid;
  height: 100%;
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