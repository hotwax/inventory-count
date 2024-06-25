<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/tabs/count" slot="start"></ion-back-button>
        <ion-title>{{ translate("Count name") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="find">
        <aside class="filters">
          <ion-item lines="full" class="ion-margin-top">
            <ion-input slot="start" :label="translate('SKU')" :placeholder="translate('Scan or search products')"/>  
          </ion-item>
          <template v-if="cycleCount?.statusId === 'INV_COUNT_CREATED'">
            <ion-segment v-model="selectedSegment">
              <ion-segment-button value="all">
                <ion-label>{{ translate("ALL") }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="pending">
                <ion-label>{{ translate("PENDING") }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="counted">
                <ion-label>{{ translate("COUNTED") }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </template>
          <template v-else-if="cycleCount?.statusId === 'INV_COUNT_REVIEW'">
            <ion-segment>
              <ion-segment-button value="all">
                <ion-label>{{ translate("ALL") }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="notCounted">
                <ion-label>{{ translate("NOT COUNTED") }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="counted">
                <ion-label>{{ translate("COUNTED") }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </template>
          <template v-else-if="cycleCount?.statusId === 'INV_COUNT_COMPLETED' || 'INV_COUNT_REJECTED'">
            <ion-segment>
              <ion-segment-button value="all">
                <ion-label>{{ translate("ALL") }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="rejected">
                <ion-label>{{ translate("REJECTED") }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="accepted">
                <ion-label>{{ translate("ACCEPTED") }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </template>
          <ProductItemList v-for="item in itemsList" :key="item.inventoryCountImportId" :item="item"/>
        </aside>
        
        <main>
          <ProductDetail/>
        </main>
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
  onIonViewDidEnter
} from '@ionic/vue';
import { translate } from '@/i18n'
import { computed, defineProps, ref } from 'vue';
import { useStore } from "@/store";
import { hasError } from '@/utils'
import logger from '@/logger'
import { showToast } from '@/utils';
import emitter from '@/event-bus' 
import { pickerService } from '@/services/pickerService';
import ProductItemList from '@/views/ProductItemList.vue';
import ProductDetail from '@/views/ProductDetail.vue';

const store = useStore();

const getProduct = computed(() => store.getters["product/getProduct"]);
const cycleCountItems = computed(() => store.getters["pickerCount/getCycleCountItems"]);

const itemsList = computed(() => {
  if (selectedSegment.value === 'all') {
    return cycleCountItems.value.itemList;
  } else if (selectedSegment.value === 'pending') {
    return cycleCountItems.value.itemList.filter(item =>!item.quantity);
  } else if (selectedSegment.value === 'counted') {
    return cycleCountItems.value.itemList.filter(item => item.quantity);
  } else if (selectedSegment.value === 'notCounted') {
    return cycleCountItems.value.itemList.filter(item => item.quantity === 0);
  } else if (selectedSegment.value === 'rejected') {
    return cycleCountItems.value.itemList.filter(item => item.statusId === 'INV_COUNT_REJECTED');
  } else if (selectedSegment.value === 'accepted') {
    return cycleCountItems.value.itemList.filter(item => item.statusId === 'INV_COUNT_COMPLETED');
  } else {
    return [];
  }
});


const props = defineProps(["id"]);
let selectedSegment = ref('all');
let cycleCount = ref();

onIonViewDidEnter(async() => {  
  fetchCycleCount();
  fetchCycleCountItems();
  await store.dispatch("product/currentProduct", itemsList.value[0])
})

async function fetchCycleCountItems() {
  let payload = props?.id
  await store.dispatch("pickerCount/fetchCycleCountItems", payload); 
}

async function fetchCycleCount() {
  emitter.emit("presentLoader");
  let payload = props?.id
  let resp
  try {
    resp = await pickerService.fetchCycleCount(payload)
    if (!hasError(resp)) {
      cycleCount = resp?.data
    } else {
      showToast(translate("Something went wrong"))
    }
    emitter.emit("dismissLoader")
  } catch (err) {
    logger.error(err)
    showToast(translate("Something went wrong"))
  }
  emitter.emit("dismissLoader")
  return;
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

ion-content > main {
  display: grid;
  /* grid-template-columns: repeat(2, minmax(375px, 25%)) 1fr; */
  height: 100%;
}

.re-count {
  margin: var(--spacer-base) var(--spacer-sm);
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