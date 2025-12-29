<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate(countsPageMeta?.countsPageName)}}</ion-title>
        <ion-buttons v-if="countsPageMeta.countPageEnum === 'CLOSED'" slot="end">
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
          <ion-item v-if="countsPageMeta.filterOptions?.statusOptions">
            <ion-select :label="translate('Status')" :value="filters.status" @ionChange="updateFilters('status', $event.target.value)" interface="popover" placeholder="All">
            <ion-select-option v-for="option in countsPageMeta.filterOptions.statusOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-select :label="translate('Type')" :value="filters.countType" @ionChange="updateFilters('countType', $event.target.value)" interface="popover">
            <ion-select-option v-for="option in countsPageMeta.filterOptions?.typeOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label>{{ translate('Facility') }}</ion-label>
            <ion-chip slot="end" outline @click="isFacilityModalOpen = true">
              <ion-label>{{ facilityChipLabel }}</ion-label>
            </ion-chip>
          </ion-item>

          
          <ion-button v-if="countsPageMeta.countsPageName === 'Closed'" color="medium" fill="outline" @click="isFilterModalOpen = true">
            {{ translate("More filters") }}
            <ion-icon slot="end" :icon="filterOutline" />
          </ion-button>
          
        </div>
        <p v-if="!cycleCounts?.length" class="empty-state">
          {{ translate("No cycle counts found") }}
        </p>
        <div v-else class="list-item" v-for="count in cycleCounts" :key="count.workEffortId" @click="router.push(`${countsPageMeta.countDetailPageRoute}/${count.workEffortId}`)">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <p class="overline" v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
              {{ count.workEffortName }}
              <p>{{ count.workEffortId }}</p>
            </ion-label>
          </ion-item>

          <ion-chip v-if="count.facilityId" outline>
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>
          <ion-button v-else-if="countsPageMeta.countPageEnum === 'ASSIGNED'" fill="outline" size="small" @click="openFacilityModal(count, $event)">
            <ion-icon :icon="addOutline" slot="start"></ion-icon>
            {{ translate("Assign Facility") }}
          </ion-button>


          <ion-label>
            {{ getDateWithOrdinalSuffix(count.createdDate) }}
            <p>{{ translate("Created Date") }}</p>
          </ion-label>

          <ion-label v-if="countsPageMeta.countPageEnum === 'ASSIGNED' || countsPageMeta.countPageEnum === 'PENDING_REVIEW'">
            {{ getDateWithOrdinalSuffix(count.estimatedCompletionDate) }}
            <p>{{ translate("Due Date") }}</p>
          </ion-label>
     
          <ion-label v-if="countsPageMeta.countPageEnum === 'CLOSED'">
            {{ getDateWithOrdinalSuffix(count.actualCompletionDate) }}
            <p>{{ translate("Closed Date") }}</p>
          </ion-label>

          <ion-item v-if="countsPageMeta.countPageEnum !== 'PENDING_REVIEW'" lines="none">
            <ion-badge :color="getStatusColor(count.statusId)" class="status-badge" slot="end">{{ useProductStore().getStatusDescription(count.statusId) }}</ion-badge>
          </ion-item>
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
      <ion-fab v-if="countsPageMeta.countPageEnum === 'CLOSED'" vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="exportCycleCounts">
            <ion-icon :icon="downloadOutline" />
          </ion-fab-button>
      </ion-fab>
      <ion-modal ref="facilityModal" @didPresent="loadFacilities()"
        @didDismiss="closeAssignFacilityModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeAssignFacilityModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Select Facility") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="translate('Search facilities')"
            v-model="facilityQueryString" @ionInput="findFacility($event)"
            @keydown="preventSpecialCharacters($event)" />
          <ion-radio-group v-model="selectedFacilityId">
            <ion-list>
              <!-- Loading state -->
              <div class="empty-state" v-if="isLoading">
                <ion-item lines="none">
                  <ion-spinner color="secondary" name="crescent" slot="start" />
                  {{ translate("Fetching facilities") }}
                </ion-item>
              </div>
              <!-- Empty state -->
              <div class="empty-state" v-else-if="!filteredFacilities.length">
                <p>{{ translate("No facilities found") }}</p>
              </div>
              <div v-else>
                <ion-item v-for="facility in filteredFacilities" :key="facility.facilityId">
                  <ion-radio label-placement="end" justify="start" :value="facility.facilityId">
                    <ion-label>
                      {{ facility.facilityName }}
                      <p>{{ facility.facilityId }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </div>
            </ion-list>
          </ion-radio-group>

          <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button :disabled="!selectedFacilityId" @click="updateFacilityOnCycleCount">
              <ion-icon :icon="saveOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonChip, IonIcon, IonFab, IonFabButton, IonPage, IonHeader, IonLabel, IonTitle, IonToolbar, IonBadge, IonButtons, IonButton, IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonList, IonItem, IonRadio, IonRadioGroup, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonModal, IonInput, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue';
import { filterOutline, storefrontOutline, downloadOutline, closeOutline, saveOutline, addOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import router from '@/router';
import { useInventoryCountRun } from "@/composables/useInventoryCountRun"
import { loader, showToast, getFacilityChipLabel, getStatusColor } from '@/services/uiUtils';
import { useProductStore } from '@/stores/productStore';
import { getDateWithOrdinalSuffix, formatDateTime } from '@/services/utils';
import { DateTime } from 'luxon';
import { hasError } from '@/stores/authStore';
import logger from '@/logger';
import FacilityFilterModal from '@/components/FacilityFilterModal.vue';
import { useUserProfile } from '@/stores/userProfileStore';

const countsPageMeta = computed(() => {
  const name = router.currentRoute.value.name;

  const typeOptions = [
    { label: "All Types",  value: "" },
    { label: "Hard Count", value: "HARD_COUNT" },
    { label: "Directed Count", value: "DIRECTED_COUNT" }
  ]

  if (name === "Assigned") {
    return {
      currentStatus: "CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS",
      countsPageName: "Assigned",
      countPageEnum: 'ASSIGNED',
      uiFilterKey: 'assigned',
      countDetailPageRoute: "/assigned",
      filterOptions: {
        typeOptions,
        statusOptions: [
          { label: "All", value: "" },
          { label: "Created", value: "CYCLE_CNT_CREATED" },
          { label: "Assigned", value: "CYCLE_CNT_IN_PRGS" }
        ]
      }
    };
  } else if (name === "PendingReview") {
    return {
      currentStatus: "CYCLE_CNT_CMPLTD",
      countsPageName: "Pending Review",
      countPageEnum: "PENDING_REVIEW",
      uiFilterKey: 'pendingReview',
      countDetailPageRoute: "/pending-review",
      filterOptions: {
        typeOptions
      }
    };
  } else if (name === "Closed") {
    return {
      currentStatus: "CYCLE_CNT_CLOSED,CYCLE_CNT_CNCL",
      countsPageName: "Closed",
      countPageEnum: "CLOSED",
      uiFilterKey: 'closed',
      countDetailPageRoute: "/closed",
      filterOptions: {
        typeOptions,
        statusOptions: [
          { label: "All", value: "" },
          { label: "Cancelled", value: "CYCLE_CNT_CNCL" },
          { label: "Closed", value: "CYCLE_CNT_CLOSED" }
        ]
      }
    };
  }

  return { currentStatus: "", countsPageName: "", countPageEnum: "", uiFilterKey: "", countDetailPageRoute: "", filterOptions: {} };
});

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
const filters = computed(() => userProfile.getListPageFilters(countsPageMeta.value.uiFilterKey));

const productStore = useProductStore();
const facilities = computed(() => productStore.getFacilities || []);

const facilityChipLabel = computed(() => getFacilityChipLabel(filters.value.facilityIds ?? [], facilities?.value ?? []));

const facilityModal = ref()
const facilityQueryString = ref('')
const isLoading = ref(true);
const filteredFacilities = ref([]) as any
const selectedFacilityId = ref('')
const selectedCount = ref() as any;

async function openFacilityModal(count: any, event: Event) {
  event.stopPropagation();
  if (!facilityModal.value) return;
  selectedCount.value = count;
  await facilityModal.value.$el?.present?.();
}

function loadFacilities() {
  facilityQueryString.value = '';
  selectedFacilityId.value = '';
  filteredFacilities.value = facilities.value;
  isLoading.value = false;
}

async function updateFacilityOnCycleCount() {
  await loader.present("Updating Cycle Count...");
  try {
    const resp = await useInventoryCountRun().updateWorkEffort({
      workEffortId: selectedCount.value?.workEffortId,
      facilityId: selectedFacilityId.value
    });

    if (resp?.status === 200) {
      selectedCount.value.facilityId = selectedFacilityId.value;
      showToast("Updated Cycle Count Successfully");
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error Updating Cycle Count: ", error);
    showToast("Failed to Update Cycle Count");
  }
  loader.dismiss();
  closeAssignFacilityModal();
}

const closeAssignFacilityModal = async () => {
  if (!facilityModal.value) return;
  await facilityModal.value?.$el?.dismiss?.();
  clearFacilitySearch();
}

function clearFacilitySearch() {
  facilityQueryString.value = ''
  filteredFacilities.value = []
  selectedFacilityId.value = '';
  selectedCount.value = null;
  isLoading.value = true
}

const findFacility = (event?: any) => {
  const query = event ? event.target.value : facilityQueryString.value;
  const searchedString = (query || '').trim().toLowerCase();
  if (searchedString) {
    filteredFacilities.value = facilities.value.filter((facility: any) =>
      facility.facilityName?.toLowerCase().includes(searchedString) ||
      facility.facilityId?.toLowerCase().includes(searchedString)
    );
  } else {
    filteredFacilities.value = facilities.value;
  }
}

async function selectSearchBarText(event: any) {
  const element = await event.target.getInputElement()
  element.select();
}

function preventSpecialCharacters($event: any) {
  // Searching special characters fails the API, hence, they must be omitted
  if (/[`!@#$%^&*()_+\-=\\|,.<>?~]/.test($event.key)) $event.preventDefault();
}

const searchQuery = ref("") as any;

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  pageIndex.value = 0;
  await getCycleCounts();
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
  getCycleCounts();
}

function clearLocalSearch() {
  searchQuery.value = "";
  pageIndex.value = 0;
  getCycleCounts();
}

async function refreshList() {
  pageIndex.value = 0;
  await loader.present("Loading...");
  await getCycleCounts();
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

async function getCycleCounts() {
  const baseParams = {
    pageSize: pageSize.value,
    pageIndex: pageIndex.value,
    statusId: filters.value.status || countsPageMeta.value.currentStatus,
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
  await getCycleCounts();
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
  await getCycleCounts();
  loader.dismiss();
}

function buildExportPayload() {
  // Same keys as list filters, but without paging/status fields
  return buildFilterParams();
}

async function updateFilters(key: any, value: any) {
  userProfile.updateUiFilter(countsPageMeta.value.uiFilterKey, key, value)
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
  userProfile.updateUiFilter(countsPageMeta.value.uiFilterKey, "facilityIds", selectedFacilityIds);
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