<template>
  <ion-page>
    <Filters menu-id="pending-review-filter" content-id="filter"/>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Pending review")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="pending-review-filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="filter">
      <div class="header searchbar">
        <SearchBarAndSortBy @queryStringUpdated="queryStringUpdated" />
      </div>
      <p v-if="!cycleCounts.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list v-else>
        <div class="list-item" v-for="count in cycleCounts" :key="count.inventoryCountImportId" @click="router.push(`/pending-review/${count.inventoryCountImportId}`)">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <p class="overline" v-if="count.countTypeEnumId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
              {{ count.countImportName }}
              <p>{{ count.inventoryCountImportId }}</p>
            </ion-label>
          </ion-item>
          
          <ion-chip outline>
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>
          
          <ion-label>
            <!-- TODO: make it dynamic currently not getting stats correctly -->
            {{ getCycleCountStats(count.inventoryCountImportId, count.countTypeEnumId === "HARD_COUNT") }}
            <p>{{ translate("counted") }}</p>
          </ion-label>

          <ion-label>
            {{ getDateWithOrdinalSuffix(count.dueDate) }}
            <p>{{ translate("due date") }}</p>
          </ion-label>
          
          <ion-item lines="none">
            <ion-badge :color="getDerivedStatusForCount(count)?.color" slot="end">{{ translate(getDerivedStatusForCount(count)?.label) }}</ion-badge>
          </ion-item>
        </div>
      </ion-list>

      <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCounts($event)">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from '@/i18n'
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { IonButtons, IonBadge, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonList, IonMenuButton, IonPage, IonTitle, IonToolbar, onIonViewWillLeave, onIonViewDidEnter } from "@ionic/vue";
import { computed, ref } from "vue"
import store from "@/store"
import router from "@/router"
import Filters from "@/components/Filters.vue"
import { getCycleCountStats, getDateWithOrdinalSuffix, getDerivedStatusForCount, getFacilityName } from "@/utils"
import SearchBarAndSortBy from "@/components/SearchBarAndSortBy.vue";

const cycleCounts = computed(() => store.getters["count/getCounts"])
const isScrollable = computed(() => store.getters["count/isCycleCountListScrollable"])

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

onIonViewDidEnter(async () => {
  await fetchPendingCycleCounts()
})

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList")
})

function enableScrolling() {
  const parentElement = contentRef.value.$el
  const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef?.value?.$el?.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
}

async function queryStringUpdated() {
  fetchPendingCycleCounts();
}

async function loadMoreCycleCounts(event: any) {
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  fetchPendingCycleCounts(
    undefined,
    Math.ceil(
      cycleCounts.value?.length / (process.env.VUE_APP_VIEW_SIZE as any)
    ).toString()
  ).then(async () => {
    await event.target.complete()})
}

async function fetchPendingCycleCounts(vSize?: any, vIndex?: any) {
  const pageSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const pageIndex = vIndex ? vIndex : 0;
  const payload = {
    pageSize,
    pageIndex,
    statusId: "INV_COUNT_REVIEW"
  }
  await store.dispatch("count/fetchCycleCounts", payload)
}
</script>

<style scoped>
.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}
</style>
