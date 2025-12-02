<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/assigned"/>
        <ion-title>{{ translate("Assigned count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="isLoading" class="loading-overlay">
        <ProgressBar :total-items="totalItems" :loaded-items="loadedItems" />
      </div>
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
            <!-- TODO: Need to Revisit the date-time-button css -->
            <ion-item>
              <ion-icon :icon="calendarClearOutline" slot="start"></ion-icon>
              <div class="date-time">
                <p class="overline">{{ translate("Due Date") }}</p>
                <ion-datetime-button
                  datetime="estimatedCompletionDate"
                  class="date-time-button"
                />
              </div>
            </ion-item>

            <ion-modal class="date-time-modal" keep-contents-mounted>
              <ion-datetime
                id="estimatedCompletionDate"
                :value="getInitialValue('estimatedCompletionDate')"
                :min="getMinDateTime()"
                presentation="date-time"
                show-default-buttons
                @ionChange="(ev) => handleChange(ev, 'estimatedCompletionDate')"
              />
            </ion-modal>

            <ion-item lines="none">
              <ion-icon :icon="calendarClearOutline" slot="start"></ion-icon>
              <div class="date-time">
                <p class="overline">{{ translate("Start Date") }}</p>
                <ion-datetime-button
                  datetime="estimatedStartDate"
                  class="date-time-button"
                />
              </div>
            </ion-item>

            <ion-modal class="date-time-modal" keep-contents-mounted>
              <ion-datetime
                id="estimatedStartDate"
                :value="getInitialValue('estimatedStartDate')"
                :min="getMinDateTime()"
                presentation="date-time"
                show-default-buttons
                @ionChange="(ev) => handleChange(ev, 'estimatedStartDate')"
              />
            </ion-modal>
          </ion-card>
          <ion-card>
            <ion-item>
              <ion-label>{{ translate("First item counted") }}</ion-label>
              <ion-label slot="end">{{ filteredSessionItems.length !== 0 ? getDateTimeWithOrdinalSuffix(filteredSessionItems[0].minLastUpdatedAt) : '-' }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Last item counted") }}</ion-label>
              <ion-label slot="end">{{ filteredSessionItems.length !== 0 ? getDateTimeWithOrdinalSuffix(filteredSessionItems[0].maxLastUpdatedAt) : '-' }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                40% Coverage
              </ion-label>
            </ion-item>
          </ion-card>
        </div>

        <div class="controls ion-margin-top">
          <ion-list lines="full" class="filters ion-margin">
            <ion-searchbar v-model="searchedProductString" placeholder="Search product name"></ion-searchbar>
          </ion-list>
          <ion-item-divider color="light">
            <ion-select v-model="sortBy" slot="end" label="Sort by" interface="popover">
                <ion-select-option value="alphabetic">Alphabetic</ion-select-option>
                <ion-select-option value="variance">Variance</ion-select-option>
            </ion-select>
          </ion-item-divider>
        </div>

        <div class="results ion-margin-top" v-if="filteredSessionItems?.length">
          <ion-accordion-group>
          <DynamicScroller :items="filteredSessionItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120" :emit-update="true">
            <template #default="{ item, index, active }">
              <DynamicScrollerItem :item="item" :index="index" :active="active">
                  <ion-accordion :key="item.productId" @click="getCountSessions(item.productId)">
                    <div class="list-item count-item-rollup" slot="header"> 
                      <div class="item-key">
                        <ion-item lines="none">
                          <ion-thumbnail slot="start">
                            <Image :src="item.detailImageUrl"/>
                          </ion-thumbnail>
                          <ion-label>{{ item.internalName }}</ion-label>
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
                          {{ getDateTimeWithOrdinalSuffix(session.createdDate) }}
                          <p>{{ translate("started") }}</p>
                        </ion-label>
                        <ion-label>
                          {{ getDateTimeWithOrdinalSuffix(session.lastUpdatedAt) }}
                          <p>{{ translate("last updated") }}</p>
                        </ion-label>
                        <ion-button fill="clear" color="medium" @click="openSessionPopover($event, session, item)">
                          <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                        </ion-button>
                      </div>
                    </div>
                  </ion-accordion>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
          </ion-accordion-group>
          <ion-popover :is-open="isSessionPopoverOpen" :event="sessionPopoverEvent" @did-dismiss="closeSessionPopover" show-backdrop="false">
              <ion-content>
                <ion-list>
                  <ion-list-header>{{ selectedProductCountReview?.internalName }}</ion-list-header>
                  <ion-item size="small">{{ translate('Last Counted') }}: {{ selectedSession?.counted }}</ion-item>
                </ion-list>
              </ion-content>
            </ion-popover>
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
import { IonPopover, IonAccordion, IonAccordionGroup, IonAvatar, IonBackButton, IonButton, IonCard, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonListHeader, IonModal, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonThumbnail, onIonViewDidEnter, IonSkeletonText, alertController } from "@ionic/vue";
import { calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { loader, showToast } from "@/services/uiUtils";
import { DateTime } from "luxon";
import { useProductStore } from "@/stores/productStore";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import ProgressBar from '@/components/ProgressBar.vue'
import Image from "@/components/Image.vue";
import { getDateTimeWithOrdinalSuffix } from "@/services/utils";


const facilities = computed(() => useProductStore().getFacilities);

const props = defineProps({
  workEffortId: String
})
const totalItems = ref(0)
const loadedItems = ref(0)

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
    facilityTimeZone.value = getFacilityTimezone(workEffort.value.facilityId)
    await getInventoryCycleCount()
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

const aggregatedSessionItems = ref<any[]>([]);
const filteredSessionItems = ref<any[]>([]);

const isSessionPopoverOpen = ref(false)
const sessionPopoverEvent = ref<Event | null>(null)
const selectedSession = ref<any | null>(null)
const selectedProductCountReview = ref<any | null>(null)

async function getWorkEffortDetails() {
  const workEffortResp = await useInventoryCountRun().getWorkEffort({ workEffortId: props.workEffortId });
  if (workEffortResp && workEffortResp.status === 200 && workEffortResp) {
    workEffort.value = workEffortResp.data;
  } else {
    showToast(translate("Something Went Wrong"));
    console.error("Error getting the Cycle Count Details", workEffortResp);
  }
}

const facilityTimeZone: any = ref(null)

function getInitialValue(field: string) {
  const value = workEffort.value?.[field];
  const date = value
    ? DateTime.fromMillis(Number(value))
    : DateTime.now();

  return facilityTimeZone.value ? date.setZone(facilityTimeZone.value).toISO() : date.toISO();
}

function getMinDateTime() {
  return facilityTimeZone.value
    ? DateTime.now().setZone(facilityTimeZone.value).toISO()
    : DateTime.now().toISO();
}

async function handleChange(ev: any, currentField: string) {
  const iso = ev.detail.value;
  if (!iso) return;

  try {
    const millis = facilityTimeZone.value
      ? DateTime.fromISO(iso, { zone: facilityTimeZone.value }).toMillis()
      : DateTime.fromISO(iso).toMillis();

    const resp = await useInventoryCountRun().updateWorkEffort({
      workEffortId: workEffort.value.workEffortId,
      [currentField]: millis
    })

    if (resp?.status === 200) {
      workEffort.value[currentField] = millis;
      showToast(translate("Updated Successfully"))
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error Udpating Cycle Count: ", error);
    showToast(`Failed to Update: ${currentField} on Cycle Count`);
  }
}

function openSessionPopover(event: Event, session: any, cycleCount: any) {
  // Clear already open popover if found.
  if (isSessionPopoverOpen.value) isSessionPopoverOpen.value = false;
  sessionPopoverEvent.value = event
  selectedSession.value = session
  selectedProductCountReview.value = cycleCount
  isSessionPopoverOpen.value = true
}

function closeSessionPopover() {
  isSessionPopoverOpen.value = false
  selectedSession.value = null
  selectedProductCountReview.value = null
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

  if (sortBy.value === 'alphabetic') {
    results.sort((predecessor, successor) => (predecessor.internalName || '').localeCompare(successor.internalName || ''));
  } else if (sortBy.value === 'variance') {
    results.sort((predecessor, successor) => (predecessor.proposedVarianceQuantity || 0) - (successor.proposedVarianceQuantity || 0));
  }

  filteredSessionItems.value = results;
}


watch([searchedProductString, sortBy], () => {
  applySearchAndSort();
}, { deep: true });

const sessions = ref();

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
    const results = aggregatedSessionItems.value;
    results.sort((predecessor, successor) => predecessor.lastUpdatedAt - successor.lastUpdatedAt);
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

function getFacilityName(id: string) {
  return facilities.value.find((facility: any) => facility.facilityId === id)?.facilityName || id
}
function getFacilityTimezone(id: string) {
  return facilities.value.find((facility: any) => facility.facilityId === id)?.facilityTimeZone
}

</script>

<style scoped>

.header {
  display: grid;
}

ion-item.date-button {
  --padding-bottom: var(--spacer-sm)
}

.controls {
  position: sticky;
  top: 56px; /* below IonHeader toolbar */
  background-color: var(--ion-background-color);
  z-index: 10;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--ion-color-light);
}

.date-time {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-time-button {
  --background: transparent;
  --background-activated: transparent;
  --box-shadow: none;
  --padding-start: 0;
  --padding-end: 0;
  font-weight: 600;
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