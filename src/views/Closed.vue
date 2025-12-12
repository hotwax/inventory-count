<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Closed")}}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/export-history')">
            <ion-icon slot="start" :icon="downloadOutline" />
            {{ translate("Export history") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">      
      <ion-list>
        <div class="filters">
          <ion-searchbar :placeholder="translate('Search')" :value="searchQuery" @ionInput="searchQuery = $event.target.value" @keyup.enter="applyLocalSearch" @ionClear="clearLocalSearch"/>
          <ion-item>
            <ion-select :label="translate('Status')" :value="filters.status" @ionChange="updateFilters('status', $event.target.value)" interface="popover" placeholder="All">
            <ion-select-option v-for="option in filterOptions.statusOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-select :label="translate('Type')" :value="filters.countType" @ionChange="updateFilters('countType', $event.target.value)" interface="popover">
            <ion-select-option v-for="option in filterOptions.typeOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label>{{ translate('Facility') }}</ion-label>
            <ion-chip slot="end" outline @click="isFacilityModalOpen = true">
              <ion-label>{{ facilityChipLabel }}</ion-label>
            </ion-chip>
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

      <FacilityFilterModal
        :is-open="isFacilityModalOpen"
        :selected-facility-ids="filters.facilityIds"
        :facilities="facilities"
        @update:is-open="isFacilityModalOpen = $event"
        @apply="applyFacilitySelection"
      />
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="exportCycleCounts">
            <ion-icon :icon="downloadOutline" />
          </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonChip, IonIcon, IonFab, IonFabButton, IonPage, IonHeader, IonLabel, IonTitle, IonToolbar, IonButtons, IonButton, IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonList, IonItem, IonSearchbar, IonSelect, IonSelectOption, IonModal, IonInput, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue';
import { filterOutline, storefrontOutline, downloadOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import router from '@/router';
import { useInventoryCountRun } from "@/composables/useInventoryCountRun"
import { loader, showToast, getFacilityChipLabel } from '@/services/uiUtils';
import { useProductStore } from '@/stores/productStore';
import { getDateWithOrdinalSuffix, formatDateTime } from '@/services/utils';
import { DateTime } from 'luxon';
import { hasError } from '@/stores/authStore';
import logger from '@/logger';
import FacilityFilterModal from '@/components/FacilityFilterModal.vue';
import { useUserProfile } from '@/stores/userProfileStore';

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const cycleCounts = ref<any[]>([]);
const isScrollable = ref(true)

const pageIndex = ref(0);
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20);

const isFilterModalOpen = ref(false);
const isFacilityModalOpen = ref(false);

const userProfile = useUserProfile();
const filters = computed(() => userProfile.getListPageFilters('closed'));

const filterOptions = {
  typeOptions : [
    { label: "All Types",  value: "" },
    { label: "Hard Count", value: "HARD_COUNT" },
    { label: "Directed Count", value: "DIRECTED_COUNT" }
  ],
  statusOptions: [
    { label: "All", value: "" },
    { label: "Cancelled", value: "CYCLE_CNT_CNCL" },
    { label: "Closed", value: "CYCLE_CNT_CLOSED" }
  ]
}

const productStore = useProductStore();
const facilities = computed(() => productStore.getFacilities || []);

const facilityChipLabel = computed(() => getFacilityChipLabel(filters.value.facilityIds, facilities.value));

const searchQuery = ref("") as any;

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
function applyLocalSearch() {
  pageIndex.value = 0;
  getClosedCycleCounts();
}

function clearLocalSearch() {
  searchQuery.value = "";
  pageIndex.value = 0;
  getClosedCycleCounts();
}

async function refreshList() {
  pageIndex.value = 0;
  await loader.present("Loading...");
  await getClosedCycleCounts();
  loader.dismiss();
}

function buildFilterParams() {
  const params: any = {};

  if (filters.value.facilityIds.length) {
    params.facilityId = filters.value.facilityIds.join(',');
    params.facilityId_op = 'in';
  }

  if (filters.value.status) {
    params.statusId = filters.value.status;
    params.statusId_op = 'in';
  }

  if (filters.value.countType) {
    params.countType = filters.value.countType;
  }

  if (filters.value.createdDateFrom) {
    params.createdDateFrom = formatDateTime(filters.value.createdDateFrom, false);
  }
  if (filters.value.createdDateTo) {
    params.createdDateTo = formatDateTime(filters.value.createdDateTo, true);
  }
  if (filters.value.closedDate) {
    params.closedDate = formatDateTime(filters.value.closedDate, false);
  }
  if (filters.value.closedDateTo) {
    params.closedDateTo = formatDateTime(filters.value.closedDateTo, true);
  }
  if (searchQuery.value?.trim()) {
    params.keyword = searchQuery.value.trim();
  }

  return params;
}

async function getClosedCycleCounts() {
  const baseParams = {
    pageSize: pageSize.value,
    pageIndex: pageIndex.value,
    statusId: filters.value.status || "CYCLE_CNT_CLOSED,CYCLE_CNT_CNCL",
    statusId_op: "in"
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

  if (filters.value.createdDateFrom) {
    const createdFrom = DateTime.fromISO(filters.value.createdDateFrom);
    if (createdFrom > today) {
      showToast(translate("Created after date cannot be in the future."));
      return false;
    }
    if (filters.value.createdDateTo) {
      const createdTo = DateTime.fromISO(filters.value.createdDateTo);
      if (createdFrom > createdTo) {
        showToast(translate("Created after date cannot be later than created before date."));
        return false;
      }
    }
  }

  if (filters.value.closedDate && filters.value.closedDateTo) {
    const closedFrom = DateTime.fromISO(filters.value.closedDate);
    const closedTo = DateTime.fromISO(filters.value.closedDateTo);
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

async function updateFilters(key: any, value: any) {
  userProfile.updateUiFilter("closed", key, value)
  await refreshList();
}

async function exportCycleCounts() {
  try {
    await loader.present(translate("Requesting export..."));
    const payload = buildExportPayload();
    const resp = await useInventoryCountRun().queueCycleCountsFileExport(payload);

    if (!hasError(resp)) {
      showToast(translate("Your export has been queued. You can find it in Export history."), [{
        text: translate("View"),
        handler: () => {
          router.push('/export-history');
        }
      }]);
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

async function applyFacilitySelection(selectedFacilityIds: string[]) {
  userProfile.updateUiFilter("closed", "facilityIds", selectedFacilityIds);
  await refreshList();
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
