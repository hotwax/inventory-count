<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Closed")}}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/export-history')">
            <ion-icon slot="icon-only" :icon="downloadOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <ion-list>
        <div class="filters">
          <ion-searchbar :placeholder="translate('Search')" />

          <ion-item>
            <ion-select :label="translate('Facility')" :placeholder="translate('Select Facility')">
              <ion-select-option value="facility1">Facility 1</ion-select-option>
              <ion-select-option value="facility2">Facility 2</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-select :label="translate('Type')" :placeholder="translate('Select Type')">
              <ion-select-option value="type1">Type 1</ion-select-option>
              <ion-select-option value="type2">Type 2</ion-select-option>
            </ion-select>
          </ion-item>
          
          <ion-button color="medium" fill="outline" @click="isFilterModalOpen = true">
            {{ translate("More filters") }}
            <ion-icon slot="end" :icon="filterOutline" />
          </ion-button>
          
        </div>
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


          <ion-label>
            {{ getDateWithOrdinalSuffix(count.createdDate) }}
            <p>{{ translate("Created Date") }}</p>
          </ion-label>
     
          <ion-label>
            {{ getDateWithOrdinalSuffix(count.actualCompletionDate) }}
            <p>{{ translate("Closed Date") }}</p>
          </ion-label>
        </div>
      </ion-list>
      <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCounts($event)">
          <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>

      <ion-modal :is-open="isFilterModalOpen" @didDismiss="isFilterModalOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ translate("Filters") }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="isFilterModalOpen = false">{{ translate("Close") }}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-item>
            <ion-label position="stacked">{{ translate("Created before") }}</ion-label>
            <ion-input type="date" v-model="createdBefore" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">{{ translate("Created after") }}</ion-label>
            <ion-input type="date" v-model="createdAfter" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">{{ translate("Closed before") }}</ion-label>
            <ion-input type="date" v-model="closedBefore" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">{{ translate("Closed after") }}</ion-label>
            <ion-input type="date" v-model="closedAfter" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="applyFilters">{{ translate("Apply") }}</ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IonChip, IonIcon, IonPage, IonHeader, IonLabel, IonTitle, IonToolbar, IonButtons, IonButton, IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonList, IonItem, IonSearchbar, IonSelect, IonSelectOption, IonModal, IonInput, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue';
import { filterOutline, storefrontOutline, downloadOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import router from '@/router';
import { useInventoryCountRun } from "@/composables/useInventoryCountRun"
import { loader } from '@/services/uiUtils';
import { useProductStore } from '@/stores/productStore';
import { getDateWithOrdinalSuffix } from '@/services/utils';

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const cycleCounts = ref<any[]>([]);
const isScrollable = ref(true)

const pageIndex = ref(0);
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20);

const isFilterModalOpen = ref(false);
const createdBefore = ref('');
const createdAfter = ref('');
const closedBefore = ref('');
const closedAfter = ref('');

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
  const facilities: any[] = useProductStore().getFacilities || [];
  return facilities.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

function applyFilters() {
  isFilterModalOpen.value = false;
  // Logic to apply filters can be added here
  console.log('Filters applied:', {
    createdBefore: createdBefore.value,
    createdAfter: createdAfter.value,
    closedBefore: closedBefore.value,
    closedAfter: closedAfter.value
  });
}
</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}

.list-item {
  --columns-desktop: 4;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.filters {
  display: flex;
}

.filters * {
  flex: 1;
}

.filters ion-button {
  flex: unset;
  margin-inline-start: var(--spacer-sm);
}
</style>
