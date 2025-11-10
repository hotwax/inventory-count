<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pending-review" />
        <ion-title>{{ translate("Review count")}}</ion-title>
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
              <ion-note slot="end">8:05 PM 3rd March 2024</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Last item counted") }}</ion-label>
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
                  <p class="overline">{{ translate("Overall variance (Filtered)") }}</p>
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
            <ion-checkbox slot="start" :checked="isAllSelected" @ionChange="toggleSelectAll"/>
            5 results out of 1,200
            <ion-select v-model="sortBy" slot="end" label="Sort by" interface="popover">
                <ion-select-option value="alphabetic">{{ translate("Alphabetic") }}</ion-select-option>
                <ion-select-option value="variance">{{ translate("Variance") }}</ion-select-option>
            </ion-select>
          </ion-item-divider>
        </div>

        <div class="results ion-margin-top" v-if="cycleCounts?.length">
          <ion-accordion-group>
            <ion-accordion v-for="cycleCount in cycleCounts" :key="cycleCount.workEffortId" @click="getCountSessions(cycleCount.productId)">
              <div class="list-item count-item-rollup" slot="header"> 
                <div class="item-key">
                  <ion-checkbox :color="cycleCount.decisionOutcomeEnumId ? 'medium' : 'primary'" :disabled="cycleCount.decisionOutcomeEnumId" @click.stop="stopAccordianEventProp" :checked="isSelected(cycleCount) || cycleCount.decisionOutcomeEnumId" @ionChange="() => toggleSelectedForReview(cycleCount)"></ion-checkbox>
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <dxp-image></dxp-image>
                    </ion-thumbnail>
                    <ion-label>{{ cycleCount.internalName }}</ion-label>
                  </ion-item>
                </div>
                <ion-label class="stat">
                  {{ cycleCount.quantity }}/{{ cycleCount.quantityOnHand }}
                  <p>{{ translate("counted/systemic") }}</p>
                </ion-label>
                <ion-label class="stat">
                  {{ cycleCount.proposedVarianceQuantity }}
                  <p>{{ translate("variance") }}</p>
                </ion-label>
                <div v-if="!cycleCount.decisionOutcomeEnumId" class="actions">
                  <ion-button fill="outline" color="success" size="small" @click.stop="stopAccordianEventProp" @click="submitSingleProductReview(cycleCount.productId, cycleCount.proposedVarianceQuantity, 'APPLIED', cycleCount.quantityOnHand, cycleCount.quantity, cycleCount)">
                    {{ translate("Accept") }}
                  </ion-button>
                  <ion-button fill="outline" color="danger" size="small" @click.stop="stopAccordianEventProp" @click="submitSingleProductReview(cycleCount.productId, cycleCount.proposedVarianceQuantity, 'SKIPPED', cycleCount.quantityOnHand, cycleCount.quantity, cycleCount)">
                    {{ translate("Reject") }}
                  </ion-button>
                </div>
                <ion-badge
                  v-else
                  :color="cycleCount.decisionOutcomeEnumId === 'APPLIED' ? 'primary' : 'danger'"
                  style="--color: white;"
                >
                  {{ cycleCount.decisionOutcomeEnumId }}
                </ion-badge>
              </div>
              <div slot="content" @click.stop="stopAccordianEventProp">
                <ion-list v-if="sessions === null">
                  <ion-item v-for="number in cycleCount.numberOfSessions" :key="number">
                    <ion-avatar slot="start">
                      <ion-skeleton-text animated style="width: 100%; height: 40px;"></ion-skeleton-text>
                    </ion-avatar>
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
                    <ion-label>{{ session.uploadedByUserLogin }}</ion-label>
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
                  <ion-button fill="clear" color="medium">
                    <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline"></ion-icon>
                  </ion-button>
                </div>
              </div>
            </ion-accordion>
          </ion-accordion-group>
          <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCountProductReviews($event)">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
          </ion-infinite-scroll>
        </div>
        <div v-else class="empty-state">
          <p>{{ translate("No Results") }}</p>
        </div>
        <ion-fab vertical="bottom" horizontal="end" slot="fixed" :edge="true">
          <!-- TODO: :disabled="isLoadingItems || !isAllItemsMarkedAsCompletedOrRejected" @click="completeCount" -->
          <ion-fab-button @click="closeCycleCount">
            <ion-icon :icon="receiptOutline" />
          </ion-fab-button>
        </ion-fab>
      </template>
      <template v-else>
        <p class="empty-state">{{ translate("Cycle Count Not Found") }}</p>
      </template>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button :disabled="selectedProductsReview?.length === 0" fill="outline" color="success" size="small" @click="submitSelectedProductReviews('APPLIED')">
            {{ translate("Accept") }}
          </ion-button>
          <!-- TODO: Add the action later :disabled="" @click="recountItem() -->
          <ion-button :disabled="selectedProductsReview?.length === 0" fill="clear" color="danger" size="small" class="ion-margin-horizontal" @click="submitSelectedProductReviews('SKIPPED')">
            {{ translate("Reject") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, defineProps, reactive, ref, toRefs, watch } from "vue";
import { IonAccordion, IonAccordionGroup, IonBackButton, IonBadge, IonButtons, IonButton, IonCard, IonCheckbox, IonContent, IonDatetime,IonDatetimeButton, IonInfiniteScroll, IonInfiniteScrollContent, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonModal, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonThumbnail, onIonViewDidEnter, IonSkeletonText } from "@ionic/vue";
import { calendarClearOutline, businessOutline, personCircleOutline, receiptOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import router from "@/router";
import { DateTime } from "luxon";
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { showToast, getDateWithOrdinalSuffix, getFacilityName, getDateTime } from "@/utils"
import { loader } from "@/user-utils";

const props = defineProps({
  workEffortId: String
})

onIonViewDidEnter(async () => {
  isLoading.value = true;
  await getWorkEffortDetails();
  if (workEffort.value) {
    await getInventoryCycleCount();
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
const cycleCounts = ref();

const isScrollable = ref(true);
const isLoadingMore = ref(false);

const sessions = ref();
const selectedProductsReview = ref<any[]>([]);


async function getWorkEffortDetails() {
  const workEffortResp = await useInventoryCountRun().getWorkEffort({ workEffortId: props.workEffortId });
  if (workEffortResp && workEffortResp.status === 200 && workEffortResp) {
    workEffort.value = workEffortResp.data;
  } else {
    showToast(translate("Something Went Wrong"));
    console.error("Error getting the Cycle Count Details", workEffortResp);
  }
}

async function loadMoreCycleCountProductReviews(event: any) {
  if (isLoadingMore.value || !isScrollable.value) {
    await event.target.complete();
    return;
  }

  isLoadingMore.value = true;
  pagination.pageIndex += 1;

  const resp = await useInventoryCountRun().getCycleCount({
    workEffortId: props.workEffortId,
    pageSize: pagination.pageSize,
    pageIndex: pagination.pageIndex,
    internalName: searchedProductString.value || null,
    decisionOutcomeEnumId: getDcsnFilter(),
    decisionOutcomeEnumId_op: getDcsnFilter() === 'empty' ? 'empty' : null
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

watch(() => filterAndSortBy, async () => {
  await loader.present("Loading...");
  try {
    pagination.pageIndex = 0;
    const count = await useInventoryCountRun().getCycleCount({
      workEffortId: props.workEffortId,
      pageSize: pagination.pageSize,
      pageIndex: pagination.pageIndex,
      internalName: searchedProductString.value || null,
      internalName_op: searchedProductString.value ? "contains" : null,
      decisionOutcomeEnumId: getDcsnFilter() === 'empty' ? null : getDcsnFilter(),
      decisionOutcomeEnumId_op: getDcsnFilter() === 'empty' ? 'empty' : null,
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
    console.error("Error Filters Products: ", error);
  }
  loader.dismiss();
},{ deep: true });

function getSortByField () {
  if (!sortBy.value) return null;

  if (sortBy.value === 'alphabetic') return 'internalName';
  else if (sortBy.value === 'variance') return 'proposedVarianceQuantity'
}

function isSelected(product: any) {
  return selectedProductsReview.value.some(
    (selectedProduct: any) => selectedProduct.productId === product.productId
  );
}

function toggleSelectedForReview(product: any) {
  const index = selectedProductsReview.value.findIndex(
    (selectedProduct: any) => selectedProduct.productId === product.productId
  );

  if (index === -1) {
    selectedProductsReview.value.push(product);
  } else {
    selectedProductsReview.value.splice(index, 1);
  }
}

const isAllSelected = computed(() => {
  return (
    cycleCounts.value?.length > 0 && selectedProductsReview.value?.length === cycleCounts.value.length
  );
});

function toggleSelectAll(event: CustomEvent) {
  const isChecked = event.detail.checked;

  if (isChecked) {
    selectedProductsReview.value = cycleCounts.value.filter(
      (cycle: any) => !cycle.decisionOutcomeEnumId
    );
  } else {
    selectedProductsReview.value = [];
  }
}

async function closeCycleCount() {
  await loader.present("Closing Cycle Count...");
  try {
    const resp = await useInventoryCountRun().updateWorkEffort({ workEffortId: props.workEffortId, currentStatusId: "CYCLE_CNT_CLOSED", actualCompletionDate: DateTime.now().toMillis() });
    if (resp?.status === 200 && resp.data) {
      showToast(translate("Updated Cycle Count"));
      router.replace(`/closed/${props.workEffortId}`);
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error Updating Cycle Count: ", error);
    showToast(translate("Failed to Update Cycle Count"));
  }
  loader.dismiss();
}

async function submitSelectedProductReviews(decisionOutcomeEnumId: string) {
  await loader.present("Submitting Review...");
  try {
    const inventoryCountProductsList = selectedProductsReview.value.map(product => ({
      workEffortId: props.workEffortId,
      productId: product.productId,
      facilityId: workEffort.value.facilityId,
      varianceQuantity: product.proposedVarianceQuantity,
      systemQuantity: product.quantityOnHand,
      countedQuantity: product.quantity,
      decisionOutcomeEnumId: decisionOutcomeEnumId,
      decisionReasonEnumId: 'PARTIAL_SCOPE_POST'
    }));

    const resp = await useInventoryCountRun().submitProductReview({ inventoryCountProductsList });

    if (resp && resp.status === 200) {
      const selectedProductIds = selectedProductsReview.value.map(product => product.productId);

      cycleCounts.value.forEach((cycle: any) => {
        if (selectedProductIds.includes(cycle.productId)) {
          cycle.decisionOutcomeEnumId = decisionOutcomeEnumId;
        }
      });

      selectedProductsReview.value = [];
    } else {
      throw resp.data;
    }
  } catch (error) {
      showToast("Something Went Wrong");
    console.error("Error while submitting: ", error);
  }
  loader.dismiss();
}

async function filterProductByInternalName() {
  try {
    const productReviewDetail = await useInventoryCountRun().getProductReviewDetail({
      workEffortId: props.workEffortId,
      internalName: searchedProductString.value || null,
      internalName_op: searchedProductString.value ? "contains" : null,
      decisionOutcomeEnumId: getDcsnFilter() === 'empty' ? null : getDcsnFilter(),
      decisionOutcomeEnumId_op: getDcsnFilter() === 'empty' ? 'empty' : null,
      orderByField: getSortByField() ? `${getSortByField()} asc` : null
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

function stopAccordianEventProp(event: Event) {
  event.stopPropagation();
}

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
    const resp = await useInventoryCountRun().getSessions({
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

async function submitSingleProductReview(productId: any, proposedVarianceQuantity: any, decisionOutcomeEnumId: string, systemQuantity: any, countedQuantity: any, cycleCount: any) {
  await loader.present("Submitting Review...");
  try {
    const inventoryCountProductsList = [];
    const inventoryCountProductMap = {
      workEffortId: props.workEffortId,
      productId,
      facilityId: workEffort.value.facilityId,
      varianceQuantity: proposedVarianceQuantity,
      systemQuantity,
      countedQuantity,
      decisionOutcomeEnumId,
      decisionReasonEnumId: 'PARTIAL_SCOPE_POST'
    }
    inventoryCountProductsList.push(inventoryCountProductMap);

    const resp = await useInventoryCountRun().submitProductReview({ "inventoryCountProductsList": inventoryCountProductsList});

    if (resp?.status === 200) {
      cycleCount.decisionOutcomeEnumId = decisionOutcomeEnumId;
    } else {
      throw resp.data;
    }
  } catch (error) {
    showToast(translate("Something Went Wrong"));
    console.error("Error Submitting Review: ", error);
  }
  loader.dismiss();
}

async function getInventoryCycleCount(reset = false) {
  if (reset) {
    pagination.pageIndex = 0;
    isScrollable.value = true;
  }

  const resp = await useInventoryCountRun().getCycleCount({
    workEffortId: props.workEffortId,
    pageSize: pagination.pageSize,
    pageIndex: pagination.pageIndex,
    internalName: searchedProductString.value || null,
    decisionOutcomeEnumId: getDcsnFilter(),
    decisionOutcomeEnumId_op: getDcsnFilter() === 'empty' ? 'empty' : null
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