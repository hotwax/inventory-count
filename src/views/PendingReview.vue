<template>
  <ion-page>
    <!-- <Filters menu-id="pending-review-filter" content-id="filter"/> -->
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
        <ion-searchbar @keyup.enter="updateQuery('countQueryString', $event.target.value)" @ion-clear="updateQuery('countQueryString', '')"></ion-searchbar>
        <ion-item>
          <ion-select :label="translate('Type')" :value="filters.countType" @ionChange="updateQuery('countType', $event.target.value)" interface="popover">
            <ion-select-option v-for="option in filterOptions.typeOptions" :key="option.label" :value="option.value">{{ translate(option.label) }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-label>{{ translate('Facility') }}</ion-label>
          <ion-chip slot="end" outline @click="isFacilityModalOpen = true">
            <ion-label>{{ facilityChipLabel }}</ion-label>
          </ion-chip>
        </ion-item>
      </div>
      <p v-if="!cycleCounts.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list>
        <div class="list-item" v-for="count in cycleCounts" :key="count.workEffortId" @click="router.push(`/pending-review/${count.workEffortId}`)">
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
            {{ getDateWithOrdinalSuffix(count.estimatedCompletionDate) }}
            <p>{{ translate("due date") }}</p>
          </ion-label>
        </div>
      </ion-list>

      <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCounts($event)">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
      <FacilityFilterModal
        :is-open="isFacilityModalOpen"
        :selected-facility-ids="filters.facilityIds"
        :facilities="facilities"
        @update:is-open="isFacilityModalOpen = $event"
        @apply="applyFacilitySelection"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonList, IonMenuButton, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewWillLeave, onIonViewDidEnter } from "@ionic/vue";
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import router from "@/router"
import { loader, showToast, getFacilityChipLabel } from '@/services/uiUtils';
import { useProductStore } from "@/stores/productStore";
import { getDateWithOrdinalSuffix } from "@/services/utils";
import FacilityFilterModal from '@/components/FacilityFilterModal.vue';
import { useUserProfile } from "@/stores/userProfileStore";

const cycleCounts = ref<any[]>([]);
const isScrollable = ref(true)

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const pageIndex = ref(0)
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20)

const userProfile = useUserProfile();
const filters = computed(() => userProfile.uiFilters.pendingReview)

const isFacilityModalOpen = ref(false);

const productStore = useProductStore();
const facilities = computed(() => productStore.getFacilities || []);

const facilityChipLabel = computed(() => getFacilityChipLabel(filters.value.facilityIds, facilities.value));

const filterOptions = {
  typeOptions : [
    { label: "All Types",  value: "" },
    { label: "Hard Count", value: "HARD_COUNT" },
    { label: "Directed Count", value: "DIRECTED_COUNT" }
  ]
}

async function updateQuery(key: any, value: any) {
  await loader.present("Loading...");
  userProfile.updateUiFilter('pendingReview', key, value)
  pageIndex.value = 0;
  await getPendingCycleCounts();
  loader.dismiss();
}

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  pageIndex.value = 0;
  await getPendingCycleCounts();
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
  await getPendingCycleCounts();
  await event.target.complete();
}

async function getPendingCycleCounts() {
  try {
    const params = {
      pageSize: pageSize.value,
      pageIndex: pageIndex.value,
      statusId: "CYCLE_CNT_CMPLTD"
    } as any;
    if (filters.value?.countQueryString) {
      params.keyword = filters.value.countQueryString
    }
    if (filters.value.countType) params.countType = filters.value.countType;
    if (filters.value.facilityIds?.length) {
      params.facilityId = filters.value.facilityIds.join(',');
      params.facilityId_op = 'in';
    }

    const { cycleCounts: data, isScrollable: scrollable } = await useInventoryCountRun().getCycleCounts(params)

    if (data.length) {
      if (pageIndex.value > 0) {
        cycleCounts.value = cycleCounts.value.concat(data)
      } else {
        cycleCounts.value = data
      }
      isScrollable.value = scrollable
    } else {
      isScrollable.value = false
      if (pageIndex.value === 0) cycleCounts.value = [];
    }
  } catch (error) {
    console.error("Failed to fetch Cycle Counts: ", error);
    showToast("Failed to fetch Cycle Counts");
  }
}

async function applyFacilitySelection(selectedFacilityIds: string[]) {
  userProfile.updateUiFilter('pendingReview', 'facilityIds', selectedFacilityIds);
  pageIndex.value = 0;
  await loader.present("Loading...");
  await getPendingCycleCounts();
  loader.dismiss();
}

function getFacilityName(id: string) {
  const facilitiesList: any[] = productStore.getFacilities || [];
  return facilitiesList.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

</script>

<style scoped>
.list-item {
  --columns-desktop: 4;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}
</style>
