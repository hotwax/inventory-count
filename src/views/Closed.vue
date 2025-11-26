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
          <ion-searchbar :placeholder="translate('Search')" @keyup.enter="updateFilters('keyword', $event.target.value?.trim() || '')"/>
          <ion-item>
            <ion-select :label="translate('Facility')" :placeholder="translate('Select Facility')" multiple :value="filters.facilityIds" @ionChange="updateFilters('facilityIds', $event.detail.value as string[])">
              <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">
                {{ facility.facilityName }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-select :label="translate('Type')" :value="filters.countType" @ionChange="updateFilters('countType', $event.detail.value)" interface="popover">
            <ion-select-option v-for="option in filterOptions.typeOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
          </ion-select>
          </ion-item>
          
          <ion-button color="medium" fill="outline" @click="isFilterModalOpen = true">
            {{ translate("More filters") }}
            <ion-icon slot="end" :icon="filterOutline" />
          </ion-button>
          
        </div>
        <p v-if="!cycleCounts?.length" class="empty-state">
          {{ translate("No cycle counts found") }}
        </p>
        <div v-else class="list-item" v-for="count in cycleCounts" :key="count.workEffortId" @click="router.push(`/closed/${count.workEffortId}`)">
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
            <ion-input type="date" v-model="filters.createdDateTo" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">{{ translate("Created after") }}</ion-label>
            <ion-input type="date" v-model="filters.createdDateFrom" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">{{ translate("Closed before") }}</ion-label>
            <ion-input type="date" v-model="filters.closedDateTo" />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">{{ translate("Closed after") }}</ion-label>
            <ion-input type="date" v-model="filters.closedDate" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="applyFilters">
            {{ translate("Apply") }}
          </ion-button>
        </ion-content>
      </ion-modal>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="exportCycleCounts">
            <ion-icon :icon="downloadOutline" />
          </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { IonChip, IonIcon, IonFab, IonFabButton, IonPage, IonHeader, IonLabel, IonTitle, IonToolbar, IonButtons, IonButton, IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonList, IonItem, IonSearchbar, IonSelect, IonSelectOption, IonModal, IonInput, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue';
import { filterOutline, storefrontOutline, downloadOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import router from '@/router';
import { useInventoryCountRun } from "@/composables/useInventoryCountRun"
import { loader, showToast } from '@/services/uiUtils';
import { useProductStore } from '@/stores/productStore';
import { getDateWithOrdinalSuffix, toIsoDate } from '@/services/utils';
import { DateTime } from 'luxon';
import { hasError } from '@/stores/authStore';
import logger from '@/logger';

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const cycleCounts = ref<any[]>([]);
const isScrollable = ref(true)

const pageIndex = ref(0);
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20);

const isFilterModalOpen = ref(false);

// Filters state
const filters = reactive({
  facilityIds: [] as string[],
  countType: '',
  createdDateFrom: '',
  createdDateTo: '',
  closedDate: '',
  closedDateTo: '',
  keyword: ''
});

const filterOptions = {
  typeOptions : [
    { label: "All Types",  value: "" },
    { label: "Hard Count", value: "HARD_COUNT" },
    { label: "Directed Count", value: "DIRECTED_COUNT" }
  ]
}

const productStore = useProductStore();
const facilities = computed(() => productStore.getFacilities || []);

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

async function refreshList() {
  pageIndex.value = 0;
  await loader.present("Loading...");
  await getClosedCycleCounts();
  loader.dismiss();
}

function buildFilterParams() {
  const params: any = {};

  if (filters.facilityIds.length) {
    params.facilityId = filters.facilityIds.join(',');
    params.facilityId_op = 'in';
  }

  if (filters.countType) {
    params.countType = filters.countType;
  }

  if (filters.createdDateFrom) {
    params.createdDateFrom = toIsoDate(filters.createdDateFrom, false);
  }
  if (filters.createdDateTo) {
    params.createdDateTo = toIsoDate(filters.createdDateTo, true);
  }
  if (filters.closedDate) {
    params.closedDate = toIsoDate(filters.closedDate, false);
  }
  if (filters.closedDateTo) {
    params.closedDateTo = toIsoDate(filters.closedDateTo, true);
  }
  if (filters.keyword) {
    params.keyword = filters.keyword;
  }

  return params;
}

async function getClosedCycleCounts() {
  const baseParams = {
    pageSize: pageSize.value,
    pageIndex: pageIndex.value,
    currentStatusId: "CYCLE_CNT_CLOSED,CYCLE_CNT_CNCL",
    currentStatusId_op: "in"
  };

  const params = {
    ...baseParams,
    ...buildFilterParams()
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
    if (pageIndex.value === 0) {
      cycleCounts.value = [];
    }
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
  const facilitiesList: any[] = productStore.getFacilities || [];
  return facilitiesList.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

function validateDateFilters() {
  const today = DateTime.now().startOf('day');

  if (filters.createdDateFrom) {
    const createdFrom = DateTime.fromISO(filters.createdDateFrom);
    if (createdFrom > today) {
      showToast(translate("Created after date cannot be in the future."));
      return false;
    }
    if (filters.createdDateTo) {
      const createdTo = DateTime.fromISO(filters.createdDateTo);
      if (createdFrom > createdTo) {
        showToast(translate("Created after date cannot be later than created before date."));
        return false;
      }
    }
  }

  if (filters.closedDate && filters.closedDateTo) {
    const closedFrom = DateTime.fromISO(filters.closedDate);
    const closedTo = DateTime.fromISO(filters.closedDateTo);
    if (closedFrom > closedTo) {
      showToast(translate("Closed after date cannot be later than closed before date."));
      return false;
    }
  }

  return true;
}

async function applyFilters() {
  if (!validateDateFilters()) return;

  isFilterModalOpen.value = false;
  pageIndex.value = 0;
  await loader.present("Loading...");
  await getClosedCycleCounts();
  loader.dismiss();
}

function buildExportPayload() {
  // Same keys as list filters, but without paging/status fields
  return buildFilterParams();
}

async function updateFilters(key: keyof typeof filters, value: any) {
  filters[key] = value;
  await refreshList();
}

async function exportCycleCounts() {
  try {
    await loader.present(translate("Requesting export..."));
    const payload = buildExportPayload();
    const resp = await useInventoryCountRun().queueCycleCountsFileExport(payload);

    if (!hasError(resp)) {
      showToast(translate("Your export has been queued. You can find it in Export history."));
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to queue cycle counts export', err);
    showToast(translate("Failed to request export. Please try again."));
  } finally {
    loader.dismiss();
  }
}
</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}

.list-item {
  --columns-desktop: 5;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.filters {
  display: flex;
}

.filters > * {
  flex: 1;
}

.filters ion-button {
  flex: unset;
  margin-inline-start: var(--spacer-sm);
}
</style>
