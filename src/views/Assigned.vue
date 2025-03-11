<template>
  <ion-page>
    <Filters menu-id="assigned-filter" content-id="filter"/>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Assigned")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="assigned-filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="filter">
      <div class="header searchbar">
        <ion-searchbar v-model="query.queryString" @keyup.enter="updateQueryString('queryString', $event.target.value)" />
        <ion-item lines="none">
          <ion-icon slot="start" :icon="swapVerticalOutline" />
          <ion-select :label="translate('Sort by')" :value="query.sortBy" @ionChange="updateQuery('sortBy', $event.detail.value)" interface="popover">
            <ion-select-option value="createdDate desc">{{ translate("Created date") }}</ion-select-option>
            <ion-select-option value="dueDate desc">{{ translate("Due date") }}</ion-select-option>
            <ion-select-option value="countImportName asc">{{ translate("Alphabetic") }}</ion-select-option>
          </ion-select> 
        </ion-item>
      </div>
      <p v-if="!cycleCounts.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list v-else>
        <div class="list-item" v-for="count in cycleCounts" :key="count.inventoryCountImportId" button @click="router.push(`/assigned/${count.inventoryCountImportId}`)">
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
import { computed, ref } from "vue";
import { translate } from '@/i18n'
import { filterOutline, storefrontOutline, swapVerticalOutline } from "ionicons/icons";
import { IonBadge, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonList, IonMenuButton, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewWillLeave } from "@ionic/vue";
import store from "@/store"
import { getCycleCountStats, getDateWithOrdinalSuffix, getDerivedStatusForCount, getFacilityName } from "@/utils"
import Filters from "@/components/Filters.vue"
import router from "@/router"

const cycleCounts = computed(() => store.getters["count/getCounts"])
const isScrollable = computed(() => store.getters["count/isCycleCountListScrollable"])
const query = computed(() => store.getters["count/getQuery"])

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

onIonViewDidEnter(async () => {
  await fetchAssignedCycleCount();
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

async function updateQueryString(key: string, value: any) {
  await store.dispatch("count/updateQueryString", { key, value })
  fetchAssignedCycleCount();
}

async function loadMoreCycleCounts(event: any) {
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  fetchAssignedCycleCount(
    undefined,
    Math.ceil(
      cycleCounts.value?.length / (process.env.VUE_APP_VIEW_SIZE as any)
    ).toString()
  ).then(async () => {
    await event.target.complete()})
}

async function fetchAssignedCycleCount(vSize?: any, vIndex?: any) {
  const pageSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const pageIndex = vIndex ? vIndex : 0;
  const payload = {
    pageSize,
    pageIndex,
    statusId: "INV_COUNT_ASSIGNED"
  }
  await store.dispatch("count/fetchCycleCounts", payload)
}

async function updateQuery(key: string, value: any) {
  await store.dispatch("count/updateQuery", { key, value })
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

.header {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: center;
  gap: var(--spacer-xs);
}
</style>
