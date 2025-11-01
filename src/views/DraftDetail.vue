<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/draft" />
        <ion-title>{{ translate("Draft count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <template v-if="isLoading">
        <p class="empty-state">{{ translate("Fetching cycle counts...") }}</p>
      </template>
      <template v-else-if="workEffort">
        <div class="header">
          <ion-card>
            <ion-item lines="none">
              <ion-label>
                <p class="overline">{{ workEffort?.workEffortId }}</p>
                <h1>{{ workEffort?.workEffortName }}</h1>
              </ion-label>
              <ion-button slot="end" fill="outline" color="medium">
                Edit
              </ion-button>
              <ion-button slot="end" fill="outline" color="primary" @click="moveWorkEffortInProgress">
                Start Counting
              </ion-button>
            </ion-item>
            <ion-item>
              <ion-icon :icon="businessOutline" slot="start"></ion-icon>
              <ion-label>
                {{ getFacilityName(workEffort?.facilityId) }}
              </ion-label>
            </ion-item>
            <ion-item class="due-date">
              <ion-icon :icon="calendarClearOutline" slot="start"></ion-icon>
              <div>
                <p class="overline">{{ getDateWithOrdinalSuffix(workEffort?.dueDate) }}</p>
                <ion-datetime-button datetime="datetime"></ion-datetime-button>
                <ion-modal :keep-contents-mounted="true">
                  <ion-datetime id="datetime"></ion-datetime>
                </ion-modal>
              </div>
            </ion-item>
          </ion-card>
          <ion-card>
            <ion-item>
              <ion-label>First item counted</ion-label>
              <ion-note slot="end">8:05 PM 3rd March 2024</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Last item counted</ion-label>
              <ion-note slot="">9:15 PM 3rd March 2024</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>
                40% Coverage
              </ion-label>
            </ion-item>
          </ion-card>

          <div class="statistics">
            <ion-card>
              <ion-item lines="none">
                <ion-label>
                  Review progress 60% complete
                  <p>6 out of 10 items complete</p>
                </ion-label>
              </ion-item>
            </ion-card>
            <ion-card>
              <ion-item lines="full">
                <ion-label>
                  <p class="overline">Overall variance (Filtered)</p>
                  <h3>16 units</h3>
                  <p>based on 4 results</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </div>
        </div>

        <div class="controls ion-margin-top">
          <ion-list lines="full" class="filters ion-margin">
            <ion-searchbar v-model="searchedProductString" placeholder="Search product name" @keyup.enter="filterProductByInternalName"></ion-searchbar>
          </ion-list>
          <ion-item-divider color="light">
            5 results out of 1,200
            <ion-select v-model="sortBy" slot="end" label="Sort by" interface="popover">
                <ion-select-option value="alphabetic">Alphabetic</ion-select-option>
                <ion-select-option value="variance">Variance</ion-select-option>
            </ion-select>
          </ion-item-divider>
        </div>

        <div class="results ion-margin-top" v-if="cycleCounts?.length">
          <ion-accordion-group>
            <ion-accordion v-for="cycleCount in cycleCounts" :key="cycleCount.workEffortId" @click="fetchCountSessions(cycleCount.productId)">
              <div class="list-item count-item-rollup" slot="header"> 
                <div class="item-key">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <dxp-image></dxp-image>
                    </ion-thumbnail>
                    <ion-label>
                        {{ cycleCount.internalName }}
                        <!-- <p>Secondary Id</p> -->
                    </ion-label>
                  </ion-item>
                </div>
                <ion-label class="stat">
                  {{ cycleCount.quantity }}/{{ cycleCount.quantityOnHand }}
                  <p>counted/systemic</p>
                </ion-label>
                <ion-label class="stat">
                  {{ cycleCount.proposedVarianceQuantity }}
                  <p>variance</p>
                </ion-label>
              </div>
              <div v-if="loadingSessions">
              <ion-spinner name="crescent"></ion-spinner>
                <p>Loading items...</p>
              </div>
              <div v-else v-for="session in sessions" :key="session.inventoryCountImportId" class="list-item count-item" slot="content">
                <ion-item lines="none">
                  <ion-icon :icon="personCircleOutline" slot="start"></ion-icon>
                  <ion-label>
                    {{ session.uploadedByUserLogin }}
                  </ion-label>
                </ion-item>

                <ion-label>
                  {{ session.counted }}
                  <p>counted</p>
                </ion-label>
                <ion-label>
                  {{ getDateWithOrdinalSuffix(session.createdDate) }}
                  <p>started</p>
                </ion-label>
                <ion-label>
                  {{ getDateWithOrdinalSuffix(session.lastUpdatedAt) }}
                  <p>last updated</p>
                </ion-label>
                <ion-button fill="clear" color="medium">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline"></ion-icon>
                </ion-button>
              </div>
            </ion-accordion>
          </ion-accordion-group>
          <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCountProductReviews($event)">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </div>
        <div v-else class="empty-state">
          <p>No Results</p>
        </div>
      </template>
      <template v-else>
        <p class="empty-state">{{ translate("Cycle Count Not Found") }}</p>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { calendarClearOutline, businessOutline, personCircleOutline, receiptOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { IonAccordion, IonAccordionGroup, IonBackButton, IonButtons, IonButton, IonCard, IonCheckbox, IonContent, IonDatetime,IonDatetimeButton, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonModal, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonThumbnail, modalController, onIonViewWillEnter, onIonViewWillLeave, onIonViewDidEnter, IonSpinner } from "@ionic/vue";
import { translate } from '@/i18n'
import { computed, defineProps, nextTick, reactive, ref, toRefs, watch } from "vue";
import store from "@/store"
import { useInventoryCountImport } from "@/composables/useInventoryCountImport";
import { showToast, getDateWithOrdinalSuffix, hasError, getFacilityName, getPartyName, getValidItems, timeFromNow, getDateTime, sortListByField } from "@/utils"
import { loader } from "@/user-utils";
import router from "@/router";

const props = defineProps({
  workEffortId: String
})

onIonViewDidEnter(async () => {
  isLoading.value = true;
  await getWorkEffortDetails();
  if (workEffort.value) {
    await fetchInventoryCycleCount();
  }
  isLoading.value = false;
})

const searchAndSortBy = reactive({
  sortBy: 'alphabetic'
});

const  { sortBy } = toRefs(searchAndSortBy);

const searchedProductString = ref('');


const isLoading = ref(false);

const loadingSessions = ref(false);

const workEffort = ref();

const cycleCounts = ref();

const isScrollable = ref(true);
const isLoadingMore = ref(false);

async function getWorkEffortDetails() {
  const workEffortResp = await fetchWorkEffort({ workEffortId: props.workEffortId });
  if (workEffortResp && workEffortResp.status === 200 && workEffortResp) {
    workEffort.value = workEffortResp.data;
  } else {
    showToast(translate("Something Went Wrong"));
    console.error("Error getting the Cycle Count Details", workEffortResp);
  }
}

async function moveWorkEffortInProgress() {
  try {
    const resp = await updateWorkEffort({ workEffortId: props.workEffortId, currentStatusId: 'CYCLE_CNT_IN_PRGS'});
    if (resp?.status === 200) {
      showToast(translate("Cycle Count Moved to In Progress"));
      router.push(`/assigned/${props.workEffortId}`);
    } else {
      throw resp.data;
    }
  } catch (error) {
    showToast(translate("Something Went Wrong"));
  }
}

async function loadMoreCycleCountProductReviews(event: any) {
  if (isLoadingMore.value || !isScrollable.value) {
    await event.target.complete();
    return;
  }

  isLoadingMore.value = true;
  pagination.pageIndex += 1;

  const resp = await fetchCycleCount({
    workEffortId: props.workEffortId,
    pageSize: pagination.pageSize,
    pageIndex: pagination.pageIndex,
    internalName: searchedProductString.value || null,
  });

  if (resp && resp.status === 200 && resp.data?.length) {
    cycleCounts.value = [...(cycleCounts.value || []), ...resp.data];

    if (resp.data.length < pagination.pageSize) {
      isScrollable.value = false;
    }
  } else {
    isScrollable.value = false;
  }

  isLoadingMore.value = false;
  await event.target.complete();
}


const pagination = reactive({
  pageSize: process.env.VUE_APP_VIEW_SIZE as any || 25,
  pageIndex: 0
});

watch(() => searchAndSortBy, async () => {
  await loader.present("Loading...");
  try {
    pagination.pageIndex = 0;
    const count = await fetchCycleCount({
      workEffortId: props.workEffortId,
      pageSize: pagination.pageSize,
      pageIndex: pagination.pageIndex,
      internalName: searchedProductString.value || null,
      internalName_op: searchedProductString.value ? "contains" : null,
      orderByField: getSortByField() ? `${getSortByField()} asc` : null
    });

    if (count && count.status === 200 && count.data) {
      cycleCounts.value = count.data;
      isScrollable.value = count.data.length >= pagination.pageSize;
    } else {
      throw count.data;
    }
  } catch (error) {
    showToast(translate("Something Went Wrong!"));
    console.error("Error Searching Products: ", error);
  }
  loader.dismiss();
},{ deep: true });

const sessions = ref();


const { updateWorkEffort, getProductReviewDetail, fetchSessions, fetchWorkEffort, fetchCycleCount } = useInventoryCountImport();

function getSortByField () {
  if (!sortBy.value) return null;

  if (sortBy.value === 'alphabetic') return 'internalName';
  else if (sortBy.value === 'variance') return 'proposedVarianceQuantity'
}

async function filterProductByInternalName() {
  try {
    const productReviewDetail = await getProductReviewDetail({
      workEffortId: props.workEffortId,
      internalName: searchedProductString.value || null,
      internalName_op: searchedProductString.value ? "contains" : null,
    });

    if (productReviewDetail && productReviewDetail.status === 200 && productReviewDetail.data) {
      pagination.pageIndex = 0;
      cycleCounts.value = productReviewDetail.data;
      isScrollable.value = productReviewDetail.data >= pagination.pageSize;
    } else {
      throw productReviewDetail.data;
    }
  } catch (error) {
    showToast("Something Went Wrong");
    console.error("Error Searching Product: ", error);
  }
}

async function fetchCountSessions(productId: any) {
  loadingSessions.value = true;
  sessions.value = [];
  const resp = await fetchSessions({
    workEffortId: props.workEffortId,
    productId: productId
  });

  if (resp && resp.status && resp.data && resp.data.length) {
    sessions.value = resp.data;
  }
  loadingSessions.value = false;
}

async function fetchInventoryCycleCount(reset = false) {
  if (reset) {
    pagination.pageIndex = 0;
    isScrollable.value = true;
  }

  const resp = await fetchCycleCount({
    workEffortId: props.workEffortId,
    pageSize: pagination.pageSize,
    pageIndex: pagination.pageIndex,
    internalName: searchedProductString.value || null,
  });

  if (resp && resp.status === 200 && resp.data?.length) {
    cycleCounts.value = resp.data;
    isScrollable.value = resp.data.length >= pagination.pageSize;
  } else {
    cycleCounts.value = [];
    isScrollable.value = false;
  }
}

</script>

<style scoped>

.header {
  display: grid;
}

ion-item.due-date {
  --padding-bottom: var(--spacer-sm)
}

.controls {
  position: sticky;
  top: 0;
  background-color: var(--ion-background-color);
  z-index: 999;
}

.filters {
  display: flex;
  gap: var(--spacer-sm);
  align-items: end;
}

.filters>* {
  flex: 1;
}

.list-item.count-item-rollup {
  --columns-desktop: 5;
  border-top : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.list-item.count-item {
  --columns-desktop: 5
}

.list-item .item-key {
  padding-inline-start: var(--spacer-sm);
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-self: stretch;
}

.item-key ion-item {
  flex: 1
}

.list-item .actions {
  display: flex;
  gap: var(--spacer-xs);
}
</style>