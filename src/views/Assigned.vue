<template>
  <ion-page>
    <!-- <Filters menu-id="assigned-filter" content-id="filter"/> -->
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
      <!-- <SearchBarAndSortBy /> -->
      <p v-if="!cycleCounts?.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list v-else>
        <div class="list-item" v-for="count in cycleCounts" :key="count.workEffortId" button @click="router.push(`/assigned/${count.workEffortId}`)">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <p class="overline" v-if="count.countTypeEnumId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
              {{ count.workEffortName }}
              <p>{{ count.workEffortId }}</p>
            </ion-label>
          </ion-item>
          
          <ion-chip outline>
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>

          <ion-label>
            {{ getDateWithOrdinalSuffix(count.createdDate) }}
            <p>{{ translate("Created Date") }}</p>
          </ion-label>
      
          <ion-label>
            {{ getDateWithOrdinalSuffix(count.dueDate) }}
            <p>{{ translate("due date") }}</p>
          </ion-label>
          
          <ion-item lines="none">
            <ion-badge class="status-badge" slot="end">{{ useProductStore().getStatusDescription(count.currentStatusId) }}</ion-badge>
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
import { ref } from "vue";
import { IonBadge, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonList, IonMenuButton, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewWillLeave } from "@ionic/vue";
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import router from "@/router"
import { useInventoryCountRun } from "@/composables/useInventoryCountRun"
import { loader } from "@/services/uiUtils";
import { DateTime } from "luxon";
import { useProductStore } from "@/stores/ProductStore";
// import Filters from "@/components/Filters.vue"

// import SearchBarAndSortBy from "@/components/SearchBarAndSortBy.vue";

const cycleCounts = ref<any[]>([])
const isScrollable = ref(true);

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const pageIndex = ref(0);
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20);

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  pageIndex.value = 0;
  await getAssignedCycleCounts();
  loader.dismiss();
})

onIonViewWillLeave(async () => {
  await useInventoryCountRun().clearCycleCountList();
})

function enableScrolling() {
  const parentElement = contentRef.value.$el
  const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']")
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef?.value?.$el?.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
}

async function loadMoreCycleCounts(event: any) {
  if (!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
    return;
  }

  pageIndex.value++;
  await getAssignedCycleCounts();
  await event.target.complete();
}

async function getAssignedCycleCounts() {
  const params = {
    pageSize: pageSize.value,
    pageIndex: pageIndex.value,
    currentStatusId: "CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS",
    currentStatusId_op: "in"
  };

  const { data, total } = await useInventoryCountRun().getAssignedCycleCounts(params);
  if (data.length) {
    if (pageIndex.value > 0) {
      cycleCounts.value = cycleCounts.value.concat(data);
    } else {
      cycleCounts.value = data;
    }
    isScrollable.value = cycleCounts.value.length < total;
  } else {
    isScrollable.value = false;
  }
}

function getFacilityName(id: string) {
  const facilities: any[] = useProductStore().getFacilities || [];
  return facilities.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

const dateOrdinalSuffix = {
  1: 'st',
  21: 'st',
  31: 'st',
  2: 'nd',
  22: 'nd',
  3: 'rd',
  23: 'rd'
} as any;

function getDateWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const suffix = dateOrdinalSuffix[dateTime.day] || "th"
  return `${dateTime.day}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
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
