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
      <div class="header searchbar">
        <ion-searchbar @keyup.enter="updateQuery('countQueryString', $event.target.value)" @ion-clear="updateQuery('countQueryString', '')"></ion-searchbar>
        <ion-item lines="none">
          <ion-select :label="translate('Status')" :value="filters.status" @ionChange="updateQuery('status', $event.target.value)" interface="popover">
            <ion-select-option v-for="option in filterOptions.statusOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
          </ion-select> 
        </ion-item>
        <ion-item lines="none">
          <ion-select :label="translate('Type')" :value="filters.countType" @ionChange="updateQuery('countType', $event.target.value)" interface="popover">
            <ion-select-option v-for="option in filterOptions.typeOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
          </ion-select>
        </ion-item>
      </div>
      <p v-if="!cycleCounts?.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list v-else>
        <div class="list-item" v-for="count in cycleCounts" :key="count.workEffortId" button @click="router.push(`/assigned/${count.workEffortId}`)">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <p class="overline" v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
              {{ count.workEffortName }}
              <p>{{ count.workEffortId }}</p>
            </ion-label>
          </ion-item>
          
          <ion-chip v-if="count?.facilityId" outline>
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>
          <ion-button fill="outline" size="small" v-else @click="openFacilityModal(count, $event)">
            <ion-icon :icon="addOutline" slot="start"></ion-icon>
            {{ translate("Assign Facility") }}
          </ion-button>

          <ion-label>
            {{ getDateWithOrdinalSuffix(count.createdDate) }}
            <p>{{ translate("Created Date") }}</p>
          </ion-label>
      
          <ion-label>
            {{ getDateWithOrdinalSuffix(count.estimatedCompletionDate) }}
            <p>{{ translate("due date") }}</p>
          </ion-label>
          
          <ion-item lines="none">
            <ion-badge :color="getStatusColor(count.currentStatusId)" class="status-badge" slot="end">{{ useProductStore().getStatusDescription(count.currentStatusId) }}</ion-badge>
          </ion-item>
        </div>
      </ion-list>

      <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCounts($event)">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
      <ion-modal ref="facilityModal" @didPresent="loadFacilities()"
        @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeModal">
                <ion-icon :icon="closeOutline" />
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
import { computed, ref } from "vue";
import { IonBadge, IonButton, IonButtons, IonChip, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonList, IonMenuButton, IonPage, IonRadio, IonRadioGroup, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewDidEnter, onIonViewWillLeave } from "@ionic/vue";
import { filterOutline, storefrontOutline, closeOutline, saveOutline, addOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import router from "@/router"
import { useInventoryCountRun } from "@/composables/useInventoryCountRun"
import { getStatusColor, loader, showToast } from "@/services/uiUtils";
import { useProductStore } from "@/stores/productStore";
import { getDateWithOrdinalSuffix } from "@/services/utils";
// import Filters from "@/components/Filters.vue"

// import SearchBarAndSortBy from "@/components/SearchBarAndSortBy.vue";

const cycleCounts = ref<any[]>([])
const isScrollable = ref(true);

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const pageIndex = ref(0);
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20);

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
  filters.value[key] = value;
  pageIndex.value = 0;
  await getAssignedCycleCounts();
  loader.dismiss();
}

const filters: any = ref({
  countQueryString: '',
  status: '',
  countType: ''
});

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  pageIndex.value = 0;
  await getAssignedCycleCounts();
  loader.dismiss();
})

onIonViewWillLeave(async () => {
  await useInventoryCountRun().clearCycleCountList();
  filters.value.countQueryString = '';
})

const facilities = computed(() => productStore.getFacilities)

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
  await facilityModal.value.present?.();
}

function loadFacilities() {
  facilityQueryString.value = '';
  selectedFacilityId.value = '';
  filteredFacilities.value = facilities.value;
  isLoading.value = false;
}

const closeModal = async () => {
  if (!facilityModal.value) return;
  await facilityModal.value.dismiss?.();
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
      currentStatusId: filters.value.status ||  "CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS",
      currentStatusId_op: "in"
    } as any;
    if (filters.value.countType) params.countType = filters.value.countType;
    if (filters.value.countQueryString) params.keyword = filters.value.countQueryString;
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

function getFacilityName(id: string) {
  const facilities: any[] = useProductStore().getFacilities || [];
  return facilities.find((facility: any) => facility.facilityId === id)?.facilityName || id
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
