<template>
  <ion-page>  
    <Filters menu-id="closed-filter" content-id="filter"/>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" menu="start"/>
        <ion-title>{{ translate("Closed")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="closed-filter">
            <ion-icon :icon="filterOutline"/>
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="filter">
      <section>
        <ion-searchbar v-model="query.queryString" @keyup.enter="updateQuery('queryString', $event.target.value)" />
      </section>
      <p v-if="!cycleCounts.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <template v-else>
        <div class="header">
          <ion-item lines="full">
            <ion-icon slot="start" :icon="listOutline"/>
            <ion-label>{{ translate("Counts closed") }}</ion-label>
            <ion-label slot="end">{{ cycleCounts.length }}</ion-label>
          </ion-item>
          <ion-item lines="full">
            <ion-icon slot="start" :icon="thermometerOutline"/>
            <ion-label>{{ translate("Average variance") }}</ion-label>
            <ion-label slot="end">{{ getAverageVariance() }}</ion-label>
          </ion-item>
        </div>

        <div class="list-item" v-for="count in cycleCounts" :key="count.inventoryCountImportId">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              {{ count.countImportName }}
              <p>{{ count.inventoryCountImportId }}</p>
            </ion-label>
          </ion-item>

          <ion-chip outline>
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>

          <ion-label>
            {{ getCycleCountStats(count.inventoryCountImportId) }}
            <p>{{ translate("products counted") }}</p>
          </ion-label>

          <ion-label>
            {{ cycleCountStats(count.inventoryCountImportId)?.rejectedCount || 0 }}
            <p>{{ translate("rejected counts") }}</p>
          </ion-label>

          <ion-label>
            {{ cycleCountStats(count.inventoryCountImportId)?.totalVariance || 0 }}
            <p>{{ translate("total variance") }}</p>
          </ion-label>

          <ion-label class="ion-padding">
            {{ getClosedDate(count) }}
            <p>{{ translate("closed") }}</p>
          </ion-label>
        </div>
      </template>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :disabled="!cycleCounts?.length" @click="openDownloadClosedCountModal">
          <ion-icon :icon="cloudDownloadOutline" />
        </ion-fab-button>
      </ion-fab>
      
      <ion-infinite-scroll
        ref="infiniteScrollRef"
        @ionInfinite="loadMoreCycleCounts($event)"
        threshold="100px"
        v-show="isScrollable"
        >
        <ion-infinite-scroll-content
        loading-spinner="crescent"
        :loading-text="translate('Loading')"
        />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButtons,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController,
  onIonViewWillEnter,
  onIonViewWillLeave
} from "@ionic/vue";
import { cloudDownloadOutline, filterOutline, listOutline, storefrontOutline, thermometerOutline } from "ionicons/icons";
import { computed, ref } from "vue"
import { translate } from "@/i18n";
import Filters from "@/components/Filters.vue"
import store from "@/store";
import { getCycleCountStats, getDateWithOrdinalSuffix, getFacilityName } from "@/utils";
import DownloadClosedCountModal from "@/components/DownloadClosedCountModal.vue";

const cycleCounts = computed(() => store.getters["count/getCounts"])
const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const isScrollable = computed(() => store.getters["count/isCountListScrollable"])
const query = computed(() => store.getters["count/getQuery"])

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

onIonViewWillEnter(async () => {
  await fetchClosedCycleCounts()
})

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList")
})

function enableScrolling() {
  const parentElement = contentRef.value.$el
  const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
}

async function updateQuery(key: string, value: any) {
  await store.dispatch("count/updateQuery", { key, value })
  fetchClosedCycleCounts();
}

async function loadMoreCycleCounts(event: any) {
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
    return
  }
  fetchClosedCycleCounts(
    undefined,
    Math.ceil(
      cycleCounts.value?.length / (process.env.VUE_APP_VIEW_SIZE as any)
    ).toString()
  ).then(async () => {
    await event.target.complete()})
}

async function fetchClosedCycleCounts(vSize?: any, vIndex?: any) {
  const pageSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const pageIndex = vIndex ? vIndex : 0;
  const payload = {
    pageSize,
    pageIndex,
    statusId: "INV_COUNT_CLOSED,INV_COUNT_COMPLETED,INV_COUNT_REJECTED",
    statusId_op: "in"
  }
  await store.dispatch("count/fetchCycleCounts", payload)
}

function getClosedDate(count: any) {
  const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory
  if(!history) {
    return "-";
  }

  const submissionStatus = history.toReversed().find((status: any) => status.statusId === "INV_COUNT_COMPLETED")
  return getDateWithOrdinalSuffix(submissionStatus?.statusDate)
}

function getAverageVariance() {
  // TODO: add support to display average variance
  return "-"
}

async function openDownloadClosedCountModal() {
  const downloadClosedCountModal = await modalController.create({
    component: DownloadClosedCountModal,
    showBackdrop: false,
  });

  await downloadClosedCountModal.present();
}

</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}

.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
</style>
