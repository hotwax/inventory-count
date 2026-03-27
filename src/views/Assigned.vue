<template>
  <ion-page>
    <!-- <Filters menu-id="assigned-filter" content-id="filter"/> -->
    <ion-header>
      <ion-toolbar>
        <ion-title data-testid="assigned-page-title">{{ translate("Assigned")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="assigned-filter" data-testid="assigned-filter-menu-btn">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()" id="filter" data-testid="assigned-content">
      <div class="header searchbar">
        <ion-searchbar :value="searchQuery" @ionInput="searchQuery = $event.target.value" @keyup.enter="applyLocalSearch" @ionClear="clearLocalSearch"
          data-testid="assigned-search-input"
        />
        <ion-item>
          <ion-select :label="translate('Status')" :value="filters.status" @ionChange="updateQuery('status', $event.target.value)" interface="popover" placeholder="All" data-testid="assigned-status-select">
            <ion-select-option v-for="option in filterOptions.statusOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
          </ion-select> 
        </ion-item>
        <ion-item>
          <ion-select :label="translate('Type')" :value="filters.countType" @ionChange="updateQuery('countType', $event.target.value)" interface="popover" data-testid="assigned-type-select">
            <ion-select-option v-for="option in filterOptions.typeOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-label>{{ translate('Facility') }}</ion-label>
          <ion-chip slot="end" outline @click="isFacilityFilterModalOpen = true" data-testid="assigned-facility-modal-btn">
            <ion-label>{{ facilityChipLabel }}</ion-label>
          </ion-chip>
        </ion-item>
      </div>
      <p v-if="!cycleCounts?.length" class="empty-state" data-testid="assigned-empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list v-else data-testid="assigned-list">
        <div class="list-item" v-for="count in cycleCounts" :key="count.workEffortId" button @click="router.push(`/assigned/${count.workEffortId}`)" :data-testid="'assigned-item-' + count.workEffortId">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label data-testid="assigned-item-label">
              <p class="overline" v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'" data-testid="assigned-item-type-badge">{{ translate("HARD COUNT") }}</p>
              <h2 data-testid="assigned-item-name">{{ count.workEffortName }}</h2>
              <p data-testid="assigned-item-id">{{ count.workEffortId }}</p>
            </ion-label>
          </ion-item>
          
          <ion-chip v-if="count?.facilityId" outline data-testid="assigned-item-facility-chip">
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>
          <ion-button fill="outline" size="small" v-else @click="openFacilityModal(count, $event)" data-testid="assigned-item-assign-facility-btn">
            <ion-icon :icon="addOutline" slot="start"></ion-icon>
            {{ translate("Assign Facility") }}
          </ion-button>

          <ion-label data-testid="assigned-item-created-date">
            {{ getDateWithOrdinalSuffix(count.createdDate) }}
            <p>{{ translate("Created Date") }}</p>
          </ion-label>
      
          <ion-label data-testid="assigned-item-due-date">
            {{ getDateWithOrdinalSuffix(count.estimatedCompletionDate) }}
            <p>{{ translate("due date") }}</p>
          </ion-label>
          
          <ion-item lines="none">
            <ion-badge :color="getStatusColor(count.statusId)" class="status-badge" slot="end" data-testid="assigned-item-status-badge">{{ useProductStore().getStatusDescription(count.statusId) }}</ion-badge>
          </ion-item>
        </div>
      </ion-list>

      <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCounts($event)" data-testid="assigned-infinite-scroll">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
      <FacilityFilterModal
        :is-open="isFacilityFilterModalOpen"
        :selected-facility-ids="filters.facilityIds"
        :facilities="facilities"
        @update:is-open="isFacilityFilterModalOpen = $event"
        @apply="applyFacilitySelection"
      />
      <ion-modal ref="facilityModal" @didPresent="loadFacilities()"
        @didDismiss="closeModal" data-testid="assigned-facility-modal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeModal" data-testid="assigned-facility-modal-close-btn">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title data-testid="assigned-facility-modal-title">{{ translate("Select Facility") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="translate('Search facilities')"
            v-model="facilityQueryString" @ionInput="findFacility($event)"
            @keydown="preventSpecialCharacters($event)" data-testid="assigned-facility-modal-search-input" />
          <ion-radio-group v-model="selectedFacilityId">
            <ion-list data-testid="assigned-facility-modal-list">
              <!-- Loading state -->
              <div class="empty-state" v-if="isLoading" data-testid="assigned-facility-modal-loading">
                <ion-item lines="none">
                  <ion-spinner color="secondary" name="crescent" slot="start" />
                  {{ translate("Fetching facilities") }}
                </ion-item>
              </div>
              <!-- Empty state -->
              <div class="empty-state" v-else-if="!filteredFacilities.length" data-testid="assigned-facility-modal-empty-state">
                <p>{{ translate("No facilities found") }}</p>
              </div>
              <div v-else>
                <ion-item v-for="facility in filteredFacilities" :key="facility.facilityId" :data-testid="'assigned-facility-modal-item-' + facility.facilityId">
                  <ion-radio label-placement="end" justify="start" :value="facility.facilityId" :data-testid="'assigned-facility-modal-radio-' + facility.facilityId">
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
            <ion-fab-button :disabled="!selectedFacilityId" @click="updateFacilityOnCycleCount" data-testid="assigned-facility-modal-save-btn">
              <ion-icon :icon="saveOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { IonBadge, IonButton, IonButtons, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonList, IonMenuButton, IonModal, IonPage, IonRadio, IonRadioGroup, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewWillLeave } from "@ionic/vue";
import { filterOutline, storefrontOutline, closeOutline, saveOutline, addOutline } from "ionicons/icons";
import { translate } from '@common'
import router from "@/router"
import { useInventoryCountRun } from "@/composables/useInventoryCountRun"
import { getStatusColor, loader, showToast, getFacilityChipLabel } from "@/services/uiUtils";
import { useProductStore } from "@/stores/productStore";
import { getDateWithOrdinalSuffix } from "@/services/utils";
// import Filters from "@/components/Filters.vue"

// import SearchBarAndSortBy from "@/components/SearchBarAndSortBy.vue";
import FacilityFilterModal from '@/components/FacilityFilterModal.vue';
import { useUserProfile } from "@/stores/userProfileStore";

const cycleCounts = ref<any[]>([])
const isScrollable = ref(true);

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const pageIndex = ref(0);
const pageSize = ref(Number(import.meta.env.VITE_VIEW_SIZE) || 20);

const productStore = useProductStore();

const filterOptions = {
  typeOptions : [
    { label: "All Types",  value: "" },
    { label: "Hard Count", value: "HARD_COUNT" },
    { label: "Directed Count", value: "DIRECTED_COUNT" }
  ],
  statusOptions: [
    { label: "All", value: "" },
    { label: "Created", value: "CYCLE_CNT_CREATED" },
    { label: "In Progress", value: "CYCLE_CNT_IN_PRGS" }
  ]
}

async function updateQuery(key: any, value: any) {
  await loader.present("Loading...");
  userProfile.updateUiFilter('assigned', key, value)
  pageIndex.value = 0;
  await getAssignedCycleCounts();
  loader.dismiss();
}

const userProfile = useUserProfile();

const filters = computed(() => userProfile.getListPageFilters('assigned'));

const isFacilityFilterModalOpen = ref(false);

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  pageIndex.value = 0;
  await getAssignedCycleCounts();
  loader.dismiss();
});

onIonViewWillLeave(async () => {
  await useInventoryCountRun().clearCycleCountList();
})

const facilities = computed(() => productStore.getFacilities || [])

const facilityChipLabel = computed(() => getFacilityChipLabel(filters.value.facilityIds, facilities.value));

const facilityModal = ref()
const facilityQueryString = ref('')
const isLoading = ref(true);
const filteredFacilities = ref([]) as any
const selectedFacilityId = ref('')
const selectedCount = ref() as any;

const searchQuery = ref("") as any;


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

const closeModal = async () => {
  if (!facilityModal.value) return;
  await facilityModal.value?.$el?.dismiss?.();
  clearSearch();
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
  closeModal();
}
function applyLocalSearch() {
  pageIndex.value = 0;
  getAssignedCycleCounts();
}

function clearLocalSearch() {
  searchQuery.value = "";
  pageIndex.value = 0;
  getAssignedCycleCounts();
}

function clearSearch() {
  facilityQueryString.value = ''
  filteredFacilities.value = []
  selectedFacilityId.value = '';
  selectedCount.value = null;
  isLoading.value = true
}

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
  try {
    const params = {
      pageSize: pageSize.value,
      pageIndex: pageIndex.value,
      statusId: filters.value.status ||  "CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS",
      statusId_op: "in"
    } as any;
    if (filters.value.countType) params.countType = filters.value.countType;
    if (searchQuery.value?.trim()) params.keyword = searchQuery.value.trim();
    if (filters.value.facilityIds?.length) {
      params.facilityId = filters.value.facilityIds.join(',');
      params.facilityId_op = 'in';
    }
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
      if (pageIndex.value === 0) cycleCounts.value = [];
    }
  } catch (error) {
    console.error("Failed to fetch Cycle Counts: ", error);
    showToast("Failed to fetch Cycle Counts");
  }
}

async function applyFacilitySelection(selectedFacilityIds: string[]) {
  userProfile.updateUiFilter("assigned", "facilityIds", selectedFacilityIds);
  pageIndex.value = 0;
  await loader.present("Loading...");
  await getAssignedCycleCounts();
  loader.dismiss();
}

function getFacilityName(id: string) {
  const facilitiesList: any[] = productStore.getFacilities || [];
  return facilitiesList.find((facility: any) => facility.facilityId === id)?.facilityName || id
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
