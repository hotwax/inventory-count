<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Closed")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="assigned-filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <ion-list>
        <div class="list-item" v-for="count in cycleCounts" :key="count.workEffortId" @click="router.push(`/closed/${count.workEffortId}`)">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <p class="overline" v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
              {{ count.workEffortName }}
              <p>{{ count.workEffortId }}</p>
            </ion-label>
          </ion-item>

          <ion-chip outline>
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>

          <ion-item lines="none">
            <ion-badge slot="end">{{ useInventoryCountRun().getStatusDescription(count.currentStatusId) }}</ion-badge>
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
import { ref } from 'vue';
import { IonBadge, IonChip, IonIcon, IonPage, IonHeader, IonLabel, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonList, IonItem, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue';
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import router from '@/router';
import { useInventoryCountRun } from "@/composables/useInventoryCountRun"
import { loader } from '@/user-utils';
import { useFacilityStore } from '@/stores/useFacilityStore';

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const cycleCounts = ref<any[]>([]);
const isScrollable = ref(true)

const pageIndex = ref(0);
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20);

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  pageIndex.value = 0;
  await getClosedCycleCounts();
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

async function getClosedCycleCounts() {
  const params = {
    pageSize: pageSize.value,
    pageIndex: pageIndex.value,
    currentStatusId: "CYCLE_CNT_CLOSED,CYCLE_CNT_CNCL",
    currentStatusId_op: "in"
  };

  const { cycleCounts: data, isScrollable: scrollable } = await useInventoryCountRun().getCycleCounts(params);

  if (data.length) {
    if (pageIndex.value > 0) {
      cycleCounts.value = cycleCounts.value.concat(data);
    } else {
      cycleCounts.value = data;
    }
    isScrollable.value = scrollable;
  } else {
    isScrollable.value = false;
  }
}

async function loadMoreCycleCounts(event: any) {
  if (!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
    return;
  }

  pageIndex.value++;
  await getClosedCycleCounts();
  await event.target.complete();
}

function getFacilityName(id: string) {
  const facilities: any[] = useFacilityStore().getFacilities || [];
  return facilities.find((facility: any) => facility.facilityId === id)?.facilityName || id
}
</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}

.list-item {
  --columns-desktop: 7;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}
</style>
