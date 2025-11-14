<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/closed" />
        <ion-title>{{ translate("Closed count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <template v-if="isLoading">
        <div v-if="isLoading" class="loading-overlay">
          <ProgressBar :total-items="totalItems" :loaded-items="loadedItems" />
        </div>
      </template>
      <template v-else-if="workEffort">
        <div class="header">
          <ion-card>
            <ion-item lines="none">
              <ion-label>
                <p class="overline">{{ workEffort?.workEffortId }}</p>
                <h1>{{ workEffort?.workEffortName }}</h1>
              </ion-label>
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
                <p class="overline">{{ translate("Due Date") }}</p>
                <div v-if="workEffort.dueDate">
                  <ion-datetime-button datetime="datetime" :disabled="true"></ion-datetime-button>
                  <ion-modal keep-contents-mounted="true">
                    <ion-datetime id="datetime" :value="getDateTime(workEffort.dueDate)" :disabled="true">
                    </ion-datetime>
                  </ion-modal>
                </div>
              </div>
            </ion-item>
          </ion-card>
          <ion-card>
            <ion-item>
              <ion-label>{{ translate("First item counted") }}</ion-label>
              <ion-note slot="end">{{ filteredSessionItems.length !== 0 ? getDateWithOrdinalSuffix(filteredSessionItems[0].minLastUpdatedAt) : '-' }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Last item counted") }}</ion-label>
              <ion-note slot="end">{{ filteredSessionItems.length !== 0 ? getDateWithOrdinalSuffix(filteredSessionItems[0].maxLastUpdatedAt) : '-' }}</ion-note>
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
                  {{ translate("Review progress", { progressRate: Math.floor((submittedItemsCount / totalItems) * 100)}) }}
                  <p>{{ translate("submitted counts", { submittedItemsCount: submittedItemsCount, totalItems: totalItems }) }}</p>
                  <ion-progress-bar :value="submittedItemsCount / totalItems"></ion-progress-bar>
                </ion-label>
              </ion-item>
            </ion-card>
            <ion-card>
              <ion-item lines="full">
                <ion-label>
                  <p class="overline">{{ translate("Overall variance (Filtered)") }}</p>
                  <h3>{{ translate("filtered variance", { overallFilteredVarianceQtyProposed: overallFilteredVarianceQtyProposed }) }}</h3>
                  <p>{{ translate("filtered variance based", { filteredSessionItemsCount: filteredSessionItems.length }) }}</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </div>
        </div>

        <div class="controls ion-margin-top">
          <ion-list lines="full" class="filters ion-margin">
            <ion-searchbar v-model="searchedProductString" placeholder="Search product name"></ion-searchbar>
            <ion-item>
            <ion-select v-model="dcsnRsn" label="Status" placeholder="All" interface="popover">
              <ion-select-option value="all">{{ translate("All") }}</ion-select-option>
              <ion-select-option value="open">{{ translate("Open") }}</ion-select-option>
              <ion-select-option value="accepted">{{ translate("Accepted") }}</ion-select-option>
              <ion-select-option value="rejected">{{ translate("Rejected") }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-select label="Compliance" placeholder="All" interface="popover">
              <ion-select-option value="all">{{ translate("All") }}</ion-select-option>
              <ion-select-option value="acceptable">{{ translate("Acceptable") }}</ion-select-option>
              <ion-select-option value="rejectable">{{ translate("Rejectable") }}</ion-select-option>
              <ion-select-option value="configure">{{ translate("Configure threshold") }}</ion-select-option>
            </ion-select>
          </ion-item>
          </ion-list>
          <ion-item-divider color="light">
            <ion-select v-model="sortBy" slot="end" label="Sort by" interface="popover">
                <ion-select-option value="alphabetic">{{ translate("Alphabetic") }}</ion-select-option>
                <ion-select-option value="variance">{{ translate("Variance") }}</ion-select-option>
            </ion-select>
          </ion-item-divider>
        </div>
        <div class="results ion-margin-top" v-if="filteredSessionItems?.length">
          <ion-accordion-group>
          <DynamicScroller :items="filteredSessionItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120">
            <template #default="{ item, index, active }">
              <DynamicScrollerItem :item="item" :index="index" :active="active">
                  <ion-accordion :key="item.productId" @click="getCountSessions(item.productId)">
                    <div class="list-item count-item-rollup" slot="header"> 
                      <div class="item-key">
                        <ion-item lines="none">
                          <ion-thumbnail slot="start">
                            <Image :src="item.detailImageUrl"/>
                          </ion-thumbnail>
                          <ion-label>
                              {{ item.internalName }}
                              <!-- <p>Secondary Id</p> -->
                          </ion-label>
                        </ion-item>
                      </div>
                      <ion-label class="stat">
                        {{ item.quantity }}/{{ item.quantityOnHand }}
                        <p>{{ translate("counted/systemic") }}</p>
                      </ion-label>
                      <ion-label class="stat">
                        {{ item.proposedVarianceQuantity }}
                        <p>{{ translate("variance") }}</p>
                      </ion-label>
                      <div v-if="item.decisionOutcomeEnumId">
                        <ion-badge
                        :color="item.decisionOutcomeEnumId === 'APPLIED' ? 'primary' : 'danger'"
                        style="--color: white;"
                      >
                        {{ item.decisionOutcomeEnumId }}
                      </ion-badge>
                      </div>
                    </div>
                    <div slot="content" @click.stop="stopAccordianEventProp">
                      <ion-list v-if="sessions === null">
                        <ion-item v-for="number in item.numberOfSessions" :key="number">
                          <ion-avatar slot="start">
                            <ion-skeleton-text animated style="width: 100%; height: 40px;"></ion-skeleton-text>
                          </ion-avatar>
                          <ion-label>
                            <p><ion-skeleton-text animated style="width: 60%"></ion-skeleton-text></p>
                          </ion-label>
                          <ion-label>
                            <p><ion-skeleton-text animated style="width: 60%"></ion-skeleton-text></p>
                          </ion-label>
                          <ion-label>
                            <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>
                            <p><ion-skeleton-text  animated style="width: 60%"></ion-skeleton-text></p>
                          </ion-label>
                          <ion-label>
                            <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>
                            <p><ion-skeleton-text animated style="width: 60%"></ion-skeleton-text></p>
                          </ion-label>
                          <ion-label>
                            <ion-skeleton-text animated style="width: 60%"></ion-skeleton-text>
                            <p><ion-skeleton-text animated style="width: 60%"></ion-skeleton-text></p>
                          </ion-label>
                        </ion-item>
                      </ion-list>
                      <div v-else v-for="session in sessions" :key="session.inventoryCountImportId" class="list-item count-item" @click.stop="stopAccordianEventProp">
                        <ion-item lines="none">
                          <ion-icon :icon="personCircleOutline" slot="start"></ion-icon>
                          <ion-label>
                            {{ session.countImportName || "-" }}
                            <p>
                              {{ session.uploadedByUserLogin }}
                            </p>
                          </ion-label>
                        </ion-item>
                        <ion-label>
                          {{ session.counted }}
                          <p>{{ translate("counted") }}</p>
                        </ion-label>
                        <ion-label>
                          {{ getDateWithOrdinalSuffix(session.createdDate) }}
                          <p>{{ translate("started") }}</p>
                        </ion-label>
                        <ion-label>
                          {{ getDateWithOrdinalSuffix(session.lastUpdatedAt) }}
                          <p>{{ translate("last updated") }}</p>
                        </ion-label>
                      </div>
                    </div>
                  </ion-accordion>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
          </ion-accordion-group>
        </div>
        <div v-else class="empty-state">
          <p>{{ translate("No Results") }}</p>
        </div>
      </template>
      <template v-else>
        <p class="empty-state">{{ translate("Cycle Count Not Found") }}</p>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, defineProps, reactive, ref, toRefs, watch } from "vue";
import { IonAccordion, IonAccordionGroup, IonAvatar, IonBackButton, IonBadge, IonCard, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonModal, IonNote, IonPage, IonList, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonThumbnail, onIonViewDidEnter, IonSkeletonText } from "@ionic/vue";
import { calendarClearOutline, businessOutline, personCircleOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { showToast } from "@/services/uiUtils"
import { DateTime } from "luxon";
import { useFacilityStore } from "@/stores/useFacilityStore";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import ProgressBar from '@/components/ProgressBar.vue'
import Image from "@/components/Image.vue";

const props = defineProps({
  workEffortId: String
})

const totalItems = ref(0)
const loadedItems = ref(0)
const aggregatedSessionItems = ref<any[]>([]);
const filteredSessionItems = ref<any[]>([]);
const submittedItemsCount = ref(0);
const overallFilteredVarianceQtyProposed = computed(() => filteredSessionItems.value.reduce((sum, item) => sum + item.proposedVarianceQuantity, 0));

onIonViewDidEnter(async () => {
  isLoading.value = true;
  loadedItems.value = 0
  try {
    const resp = await useInventoryCountRun().getProductReviewDetailCount({workEffortId: props.workEffortId})
    if (resp?.status === 200) {
      totalItems.value = resp.data.count || 0
    } else {
      console.error("Error fetching total items:", resp)
    }
  } catch (error) {
    console.error("Error fetching total items:", error) 
  }

  await getWorkEffortDetails();
  if (workEffort.value) {
    await getInventoryCycleCount()
  }
  isLoading.value = false;
})

const filterAndSortBy = reactive({
  dcsnRsn: 'all',
  sortBy: 'alphabetic'
});

const  { dcsnRsn, sortBy } = toRefs(filterAndSortBy);

const searchedProductString = ref(''); 

const isLoading = ref(false);
const workEffort = ref();

async function getWorkEffortDetails() {
  const workEffortResp = await useInventoryCountRun().getWorkEffort({ workEffortId: props.workEffortId });
  if (workEffortResp && workEffortResp.status === 200 && workEffortResp) {
    workEffort.value = workEffortResp.data;
  } else {
    showToast(translate("Something Went Wrong"));
    console.error("Error getting the Cycle Count Details", workEffortResp);
  }
}

function applySearchAndSort() {
  if (!Array.isArray(aggregatedSessionItems.value)) {
    filteredSessionItems.value = [];
    return;
  }

  const keyword = (searchedProductString.value || '').trim().toLowerCase();

  let results = aggregatedSessionItems.value.filter(item => {
    if (!keyword) return true;
    return (
      (item.internalName?.toLowerCase().includes(keyword)) ||
      (item.productIdentifier?.toLowerCase().includes(keyword))
    );
  });

  const decisionOutcome = getDcsnFilter();
  if (decisionOutcome && decisionOutcome !== 'empty') {
    results = results.filter(item => item.decisionOutcomeEnumId === decisionOutcome);
  } else if (decisionOutcome === 'empty') {
    results = results.filter(item => !item.decisionOutcomeEnumId);
  }

  if (sortBy.value === 'alphabetic') {
    results.sort((a, b) => (a.internalName || '').localeCompare(b.internalName || ''));
  } else if (sortBy.value === 'variance') {
    results.sort((a, b) => (a.proposedVarianceQuantity || 0) - (b.proposedVarianceQuantity || 0));
  }

  filteredSessionItems.value = results;
}

watch([searchedProductString, dcsnRsn, sortBy], () => {
  applySearchAndSort();
}, { deep: true });

const sessions = ref();

function getDcsnFilter() {
  if (dcsnRsn.value === 'all') {
    return null;
  } else if (dcsnRsn.value === 'open') {
    return 'empty';
  } else if (dcsnRsn.value === 'accepted') {
    return 'APPLIED';
  } else if (dcsnRsn.value === 'rejected') {
    return 'SKIPPED';
  }
}

async function getCountSessions(productId: any) {
  sessions.value = null;
  try {
    const resp = await useInventoryCountRun().getSessionsCount({
      workEffortId: props.workEffortId,
      productId: productId
    });

    if (resp && resp.status && resp.data && resp.data.length) {
      sessions.value = resp.data;
    } else {
      throw resp.data;
    }
  } catch (error) {
    sessions.value = [];
    console.error("Error getting sessions for this product: ", error);
    showToast(translate("Something Went Wrong"));
  }
}

async function getInventoryCycleCount() {
  let pageIndex = 0;
  let pageSize = 250;
  if (totalItems.value > 5000) {
    pageSize = 500;
  }
  let hasMore = true;
  try {
    while (hasMore) {
      const resp = await useInventoryCountRun().getCycleCount({
        workEffortId: props.workEffortId,
        pageSize,
        pageIndex,
      });
      if (resp && resp.status === 200 && resp.data?.length) {
        aggregatedSessionItems.value.push(...resp.data);
        if (resp.data.length < pageSize) {
          hasMore = false;
        } else {
          pageIndex++;
        }
      } else {
        hasMore = false;
      }
      loadedItems.value = aggregatedSessionItems.value.length;

    }
    submittedItemsCount.value = aggregatedSessionItems.value.filter(item => item.decisionOutcomeEnumId).length;
    applySearchAndSort();
  } catch (error) {
    console.error("Error fetching all cycle count records:", error);
    showToast(translate("Something Went Wrong"));
    aggregatedSessionItems.value = [];
  }
}

function stopAccordianEventProp(event: Event) {
  event.stopPropagation();
}

const getDateTime = (time: any) => {
  return time ? DateTime.fromMillis(time).toISO() : ''
}

function getFacilityName(id: string) {
  const facilities: any[] = useFacilityStore().getFacilities || [];
  return facilities.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

function getDateWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const day = dateTime.day;

  const suffix =
    day >= 11 && day <= 13
      ? "th"
      : ["st", "nd", "rd"][((day + 90) % 100 - 10) % 10 - 1] || "th";

  return `${dateTime.toFormat("h:mm a d")}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
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

.virtual-scroller {
  --virtual-scroller-offset: 220px;
}

.virtual-list {
  display: block;
  width: 100%;
  /* adjust 240–320px until it fits your header + filters height */
  max-height: calc(100vh - 260px);
  overflow-y: auto;
}

.virtual-list ion-item {
  --min-height: 64px;
  border-bottom: 1px solid var(--ion-color-light);
}

.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: all;
}
</style>