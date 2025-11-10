<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/assigned"/>
        <ion-title>{{ translate("Assigned count")}}</ion-title>
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
              <ion-button id="present-edit-count-alert" slot="end" fill="outline" color="medium" @click="openEditNameAlert">
                {{ translate("Edit") }}
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
                <p class="overline">{{ translate("Due Date") }}</p>
                <div v-if="workEffort.dueDate">
                  <ion-datetime-button datetime="datetime" @click="isDueDateModalOpen = true"></ion-datetime-button>
                </div>
                <div v-else>
                  <ion-button datetime="datetime" @click="isDueDateModalOpen = true">{{ translate("Add Due Date") }}</ion-button>
                </div>
                <ion-modal :is-open="isDueDateModalOpen" :keep-contents-mounted="true" @didDismiss="saveDueDate">
                  <ion-datetime id="datetime" v-model="selectedDate" :value="getDateTime(workEffort?.dueDate)"></ion-datetime>
                  <ion-item lines="none" class="ion-text-end">
                  </ion-item>
                </ion-modal>
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
            <ion-accordion v-for="cycleCount in cycleCounts" :key="cycleCount.workEffortId" @click="getCountSessions(cycleCount.productId)">
              <div class="list-item count-item-rollup" slot="header"> 
                <div class="item-key">
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
      </template>
      <template v-else>
        <p class="empty-state">{{ translate("Cycle Count Not Found") }}</p>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { defineProps, reactive, ref, toRefs, watch } from "vue";
import { IonAccordion, IonAccordionGroup, IonAvatar, IonBackButton, IonButton, IonCard, IonContent, IonDatetime,IonDatetimeButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonItemDivider, IonLabel, IonList, IonModal, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonThumbnail, onIonViewDidEnter, IonSkeletonText, alertController } from "@ionic/vue";
import { calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { showToast, getDateWithOrdinalSuffix, getFacilityName, getDateTime } from "@/utils"
import { loader } from "@/user-utils";
import { DateTime } from "luxon";

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

const searchAndSortBy = reactive({
  sortBy: 'alphabetic'
});

const  { sortBy } = toRefs(searchAndSortBy);

const searchedProductString = ref('');


const isLoading = ref(false);
const workEffort = ref();

const cycleCounts = ref();

const isScrollable = ref(true);
const isLoadingMore = ref(false);

async function getWorkEffortDetails() {
  const workEffortResp = await useInventoryCountRun().getWorkEffort({ workEffortId: props.workEffortId });
  if (workEffortResp && workEffortResp.status === 200 && workEffortResp) {
    workEffort.value = workEffortResp.data;
  } else {
    showToast(translate("Something Went Wrong"));
    console.error("Error getting the Cycle Count Details", workEffortResp);
  }
}

const isDueDateModalOpen = ref(false)
const selectedDate = ref('')

watch(
  () => workEffort.value?.dueDate,
  (newVal) => {
    selectedDate.value = getDateTime(newVal) || "";
  },
  { immediate: true }
)

async function saveDueDate() {
  try {
    const dueDate = DateTime.fromISO(selectedDate.value).toMillis()
    const resp = await useInventoryCountRun().updateWorkEffort({
      workEffortId: workEffort.value.workEffortId,
      dueDate
    })

    if (resp?.status === 200) {
      showToast(translate('Updated Due Date Successfully'))
      workEffort.value.dueDate = dueDate
    } else {
      throw resp?.data
    }
  } catch (error) {
    showToast('Something Went Wrong')
    console.error('Error updating due date on Cycle Count', error)
  }
  isDueDateModalOpen.value = false
}

async function openEditNameAlert() {
  const editCountNameAlert = await alertController.create({
    header: 'Edit Count Name',
    inputs: [
      {
        name: 'workEffortName',
        type: 'text',
        value: workEffort.value?.workEffortName
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Save',
        handler: async (data) => {
          await loader.present("Updating Cycle Count");
          try {
            const resp = await useInventoryCountRun().updateWorkEffort({
              workEffortId: workEffort.value.workEffortId,
              workEffortName: data.workEffortName
            });

            if (resp?.status === 200) {
              workEffort.value.workEffortName = data.workEffortName;
              showToast(translate("Count Name Updated Successfully"));
            } else {
              throw resp;
            }
          } catch (error) {
            showToast(translate("Failed to Update Cycle Count Name"));
            console.error("Failed to update cycle count name:", error);
          }
          loader.dismiss();
        },
      },
    ],
  })

  await editCountNameAlert.present();
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
    const count = await useInventoryCountRun().getCycleCount({
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

function getSortByField () {
  if (!sortBy.value) return null;

  if (sortBy.value === 'alphabetic') return 'internalName';
  else if (sortBy.value === 'variance') return 'proposedVarianceQuantity'
}

async function filterProductByInternalName() {
  try {
    const productReviewDetail = await useInventoryCountRun().getProductReviewDetail({
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
  });

  if (resp && resp.status === 200 && resp.data?.length) {
    cycleCounts.value = resp.data;
    isScrollable.value = resp.data.length >= pagination.pageSize;
  } else {
    cycleCounts.value = [];
    isScrollable.value = false;
  }
}

function stopAccordianEventProp(event: Event) {
  event.stopPropagation();
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