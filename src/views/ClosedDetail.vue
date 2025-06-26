<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/closed" />
        <ion-title>{{ translate("Closed count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="main-content">
      <template v-if="currentCycleCount.inventoryCountImportId">
        <template v-if="!isLoadingItems">
        <div class="header">
          <div class="search ion-padding">
            <ion-item lines="none">
              <ion-label slot="start">
                <p class="overline" v-if="currentCycleCount.countTypeEnumId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
                <h1>{{ currentCycleCount.countName }}</h1>
                <p>{{ currentCycleCount.countId }}</p>
              </ion-label>
            </ion-item>
            <ion-chip outline>
              <ion-icon :icon="calendarClearOutline"></ion-icon>
              <ion-label>{{ getDateWithOrdinalSuffix(currentCycleCount.dueDate) }}</ion-label>
            </ion-chip>
            <ion-chip outline>
              <ion-icon :icon="businessOutline"></ion-icon>
              <ion-label>{{ getFacilityName(currentCycleCount.facilityId) }}</ion-label>
            </ion-chip>
          </div>

          <ion-list>
            <div class="filters ion-padding">
              <ion-item>
                <ion-label>{{ translate("Progress") }}</ion-label>
                <ion-label slot="end">{{ getProgress() }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Variance") }}</ion-label>
                <ion-label slot="end">{{ getVarianceInformation() }}</ion-label>
              </ion-item>
            </div>
          </ion-list>
        </div>

        <hr/>
        </template>

        <template v-if="isLoadingItems">
          <ProgressBar />
        </template>
        <template v-else-if="currentCycleCount.items?.length">
          <div class="list-item" v-for="item in currentCycleCount.items" :key="item.importItemSeqId">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="getProduct(item.productId).mainImageUrl"/>
              </ion-thumbnail>
              <ion-label class="ion-text-wrap">
                {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
              </ion-label>
            </ion-item>

            <ion-label v-if="item.quantity >= 0">
              {{ item.quantity }} / {{ item.qoh }}
              <p>{{ translate("counted / systemic") }}</p>
            </ion-label>

            <ion-label v-else>
              {{ item.qoh }}
              <p>{{ translate("systemic") }}</p>
            </ion-label>

            <ion-label v-if="item.quantity >= 0">
              {{ +(item.quantity) - +(item.qoh) }}
              <p>{{ getPartyName(item) }}</p>
            </ion-label>
            <ion-item lines="none" v-else>
              <ion-label class="ion-text-center">
                <ion-badge color="danger">{{ translate("not counted") }}</ion-badge>
                <p>{{ item.lastCountedDate ? translate("last counted") : "" }} {{ timeFromNow(item.lastCountedDate) }}</p>
              </ion-label>
            </ion-item>

            <div class="ion-margin-end">
              <ion-badge :color="item.itemStatusId === 'INV_COUNT_REJECTED' ? 'danger' : 'success'">{{ translate(item.itemStatusId === "INV_COUNT_COMPLETED" ? "accepted" : "rejected") }}</ion-badge>
            </div>
          </div>
        </template>

        <p v-else class="empty-state">{{ translate("No items added to count") }}</p>
      </template>
      <template v-else>
        <p class="empty-state">{{ translate("Cycle count not found") }}</p>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { calendarClearOutline, businessOutline } from "ionicons/icons";
import { IonBackButton, IonBadge, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonThumbnail, IonTitle, IonToolbar, onIonViewWillEnter, onIonViewWillLeave } from "@ionic/vue";
import { translate } from '@/i18n'
import { computed, defineProps, ref } from "vue";
import store from "@/store"
import { CountService } from "@/services/CountService"
import emitter from '@/event-bus';
import { getDateWithOrdinalSuffix, hasError, getFacilityName, getPartyName, timeFromNow, sortListByField } from "@/utils"
import logger from "@/logger";
import Image from "@/components/Image.vue"
import { getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import ProgressBar from '@/components/ProgressBar.vue';

const props = defineProps({
  inventoryCountImportId: String
})

const productIdentificationStore = useProductIdentificationStore();

const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))

const currentCycleCount = ref({}) as any
let countName = ref("")
let isLoadingItems = ref(true)

onIonViewWillEnter(async () => {
  currentCycleCount.value = {}
  try {
    const resp = await CountService.fetchCycleCount(props.inventoryCountImportId as string)

    if(!hasError(resp) && resp.data?.inventoryCountImportId && ["INV_COUNT_COMPLETED", "INV_COUNT_REJECTED"].includes(resp.data?.statusId)) {
      currentCycleCount.value = {
        countName: resp.data.countImportName,
        countId: resp.data.inventoryCountImportId,
        items: [],
        ...resp.data
      }

      countName.value = resp.data.countImportName
      await fetchCountItems();
    }
  } catch(err) {
    logger.error()
  }
  isLoadingItems.value = false;
})

onIonViewWillLeave(async() => {
  await store.dispatch('count/updateCycleCountItemsProgress', 0)
})

async function fetchCountItems() {
  store.dispatch("count/fetchCycleCountStats", [props.inventoryCountImportId])
  let items = [] as any, resp, pageIndex = 0;

  try {
    do {
      resp = await CountService.fetchCycleCountItems({ inventoryCountImportId : props?.inventoryCountImportId, pageSize: 100, pageIndex })
      if(!hasError(resp) && resp.data?.itemList?.length) {
        items = items.concat(resp.data.itemList)
        await store.dispatch("count/updateCycleCountItemsProgress", items.length)
        pageIndex++;
      } else {
        throw resp.data;
      }
    } while(resp.data.itemList?.length >= 100)
  } catch(err) {
    logger.error(err)
  }

  items = sortListByField(items, "parentProductName");

  currentCycleCount.value["items"] = items.map((item: any) => ({ ...item, isChecked: false }))
  store.dispatch("product/fetchProducts", { productIds: [...new Set(items.map((item: any) => item.productId))] })
}

function getVarianceInformation() {
  let totalItemsQuantityCount = 0, totalItemsExpectedCount = 0

  currentCycleCount.value.items?.map((item: any) => {
    totalItemsQuantityCount += parseInt(item.quantity || 0)
    totalItemsExpectedCount += parseInt(item.qoh || 0)
  })

  // TODO: internationalize text
  return `${totalItemsQuantityCount} counted | ${totalItemsExpectedCount} expected`
}

function getProgress() {
  const currentStats = cycleCountStats.value(currentCycleCount.value.countId) || {}
  const progress = ((currentStats.itemCounted || 0) / (currentStats.totalItems || 0)) * 100
  return `${isNaN(progress) ? 0 : progress.toFixed(2)}% progress`
}
</script>

<style scoped>
.list-item {
  --columns-desktop: 5;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
}

/* To remove overlapping of fab button with footer buttons */
ion-footer ion-buttons {
  padding-right: 80px;
}

.main-content {
  --padding-bottom: 80px;
}

@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style>
