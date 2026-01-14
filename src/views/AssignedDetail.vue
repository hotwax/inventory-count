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
              <ion-label>{{ translate("Start Date") }}</ion-label>
              <ion-datetime-button v-if="workEffort?.estimatedStartDate" slot="end" datetime="estimatedStartDate"/>
              <ion-button v-else id="open-start-date-modal" slot="end" fill="outline" color="medium">{{ translate("Add Date") }}</ion-button>
            </ion-item>

            <ion-modal class="ion-datetime-button-overlay date-time-modal" trigger="open-start-date-modal" keep-contents-mounted>
              <ion-datetime
                id="estimatedStartDate"
                :value="getInitialValue('estimatedStartDate')"
                :min="getMinDateTime()"
                presentation="date-time"
                show-default-buttons
                @ionChange="(ev) => handleChange(ev, 'estimatedStartDate')"
              >
                <span slot="title">Cycle count start date</span>
              </ion-datetime>
            </ion-modal>

            <ion-item lines="none">
              <ion-icon :icon="calendarClearOutline" slot="start"></ion-icon>
              <ion-label>{{ translate("Due Date") }}</ion-label>
              <ion-datetime-button v-if="workEffort?.estimatedCompletionDate" slot="end" datetime="estimatedCompletionDate"/>
              <ion-button v-else id="open-due-date-modal" slot="end" fill="outline" color="medium">{{ translate("Add Date") }}</ion-button>
            </ion-item>

            <ion-modal class="ion-datetime-button-overlay date-time-modal" trigger="open-due-date-modal" keep-contents-mounted>
              <ion-datetime
                id="estimatedCompletionDate"
                :value="getInitialValue('estimatedCompletionDate')"
                :min="getMinDateTime()"
                presentation="date-time"
                show-default-buttons
                @ionChange="(ev) => handleChange(ev, 'estimatedCompletionDate')"
              >
                <span slot="title">Cycle count due date</span>
              </ion-datetime>
            </ion-modal>
          </ion-card>
          <ion-card>
            <ion-item>
              <ion-label>{{ translate("First item counted") }}</ion-label>
              <ion-label slot="end">{{ aggregatedSessionItems.length !== 0 ? getDateTimeWithOrdinalSuffix(firstCountedAt) : '-' }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Last item counted") }}</ion-label>
              <ion-label slot="end">{{ aggregatedSessionItems.length !== 0 ? getDateTimeWithOrdinalSuffix(lastCountedAt) : '-' }}</ion-label>
            </ion-item>
          </ion-card>
        </div>

        <SmartFilterSortBar
          :items="aggregatedSessionItems"
          :selected-items="[]"
          :show-status="false"
          :show-compliance="false"
          :show-select="false"
          :show-search="true"
          :show-sort="true"
          :sort-options="[
            { label: translate('Alphabetic'), value: 'alphabetic' },
            { label: translate('Variance (Low → High)'), value: 'variance-asc' },
            { label: translate('Variance (High → Low)'), value: 'variance-desc' }
          ]"
          :threshold-config="userProfile.getDetailPageFilters.threshold"
          @update:filtered="filteredSessionItems = $event"
        />

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
                            <h2>{{ productMaster.primaryId(item.product) || item.internalName }}</h2>
                            <p>{{ productMaster.secondaryId(item.product) }}</p>
                          </ion-label>
                        </ion-item>
                      </div>
                      <ion-label class="stat">
                        {{ item.quantity || '-' }}/{{ item.systemQuantityOnHand || '-' }}
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
                  <ion-item size="small">{{ translate('Last Counted') }}: {{ getDateTimeWithOrdinalSuffix(selectedSession?.lastUpdatedAt) }}</ion-item>
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
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button color="danger" fill="outline" @click="isCloseCountAlertOpen = true">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
    <ion-alert
    :is-open="isCloseCountAlertOpen"
    @did-dismiss="isCloseCountAlertOpen = false"
    :header="translate('Confirm Close')"
    :message="translate('Are you sure you want to close this cycle count? This action cannot be undone.')"
    :buttons="[
      { text: translate('Cancel'), role: 'cancel' },
      { text: translate('Close'), handler: () => closeCycleCount() }
    ]">
    </ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, defineProps, ref } from "vue";
import { IonAlert, IonPopover, IonAccordion, IonAccordionGroup, IonAvatar, IonBackButton, IonButton, IonButtons, IonCard, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonModal, IonPage, IonTitle, IonToolbar, IonThumbnail, onIonViewDidEnter, IonSkeletonText, alertController } from "@ionic/vue";
import { calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { useProductMaster } from "@/composables/useProductMaster";
import { loader, showToast } from "@/services/uiUtils";
import { DateTime } from "luxon";
import { useProductStore } from "@/stores/productStore";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import ProgressBar from '@/components/ProgressBar.vue'
import Image from "@/components/Image.vue";
import { getDateTimeWithOrdinalSuffix } from "@/services/utils";
import SmartFilterSortBar from "@/components/SmartFilterSortBar.vue";
import router from "@/router";
import { useUserProfile } from "@/stores/userProfileStore";


const facilities = computed(() => useProductStore().getFacilities);

const props = defineProps({
  workEffortId: String
})
const totalItems = ref(0)
const loadedItems = ref(0)

const firstCountedAt = ref();
const lastCountedAt = ref();

const isCloseCountAlertOpen = ref(false);

const userProfile = useUserProfile();
const productMaster = useProductMaster();
const hydratedProductIds = new Set<string>();

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

function getMinDateTime(): any {
  return facilityTimeZone.value ? DateTime.now().setZone(facilityTimeZone.value).toISO() : DateTime.now().toISO();
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
    if (aggregatedSessionItems.value.length > 0) {
      const minTimes = aggregatedSessionItems.value.map(i => i.minLastUpdatedAt);
      const maxTimes = aggregatedSessionItems.value.map(i => i.maxLastUpdatedAt);

      firstCountedAt.value = Math.min(...minTimes);
      lastCountedAt.value = Math.max(...maxTimes);
    }
    filteredSessionItems.value = [...aggregatedSessionItems.value].sort((a, b) =>
      (a.internalName || '').localeCompare(b.internalName || '')
    );
    scheduleProductHydration(aggregatedSessionItems.value);
  } catch (error) {
    console.error("Error fetching all cycle count records:", error);
    showToast(translate("Something Went Wrong"));
    aggregatedSessionItems.value = [];
  }
}

function scheduleProductHydration(items: any[]) {
  if (!items?.length) return;
  setTimeout(() => {
    hydrateProductsForItems(items);
  }, 0);
}

async function hydrateProductsForItems(items: any[]) {
  const productIds = [...new Set(
    items
      .filter((item: any) => item.productId && !item.product)
      .map((item: any) => item.productId)
  )].filter((id) => !hydratedProductIds.has(id));

  if (!productIds.length) return;

  productIds.forEach((id) => hydratedProductIds.add(id));
  try {
    try {
      await productMaster.prefetch(productIds as any);
    } catch (error) {
      console.warn("Prefetch failed in AssignedDetail", error);
    }
    const results = await Promise.all(productIds.map((id) => productMaster.getById(id)));
    const productsById = new Map<string, any>();
    results.forEach((result, index) => {
      if (result.product) productsById.set(productIds[index], result.product);
    });

    if (!productsById.size) return;
    items.forEach((item: any) => {
      const product = productsById.get(item.productId);
      if (product) {
        item.product = product;
        item.primaryId = productMaster.primaryId(product);
        item.secondaryId = productMaster.secondaryId(product);
      }
    });
    productIds.forEach((id) => {
      if (!productsById.has(id)) hydratedProductIds.delete(id);
    });
  } catch (error) {
    console.warn("Failed to hydrate products in AssignedDetail", error);
    productIds.forEach((id) => hydratedProductIds.delete(id));
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

async function closeCycleCount() {
  try {
    const sessionsResp = await useInventoryCountRun().getCycleCountSessions({ workEffortId: props.workEffortId });
    let inventoryCountImport = [] as any;
    if (sessionsResp?.status === 200) {
      for (const session of sessionsResp.data) {
        session.statusId = "SESSION_VOIDED"
        inventoryCountImport.push(session);
      }
    } else {
      throw sessionsResp;
    }

    const resp = await useInventoryCountRun().updateWorkEffort({
      workEffortId: workEffort.value.workEffortId,
      InventoryCountImport: inventoryCountImport
    });
    // Making another call to update the WorkEffort's status because entity-auto does not seem to update the fields on different levels of nested json together.
    if (resp?.status === 200) {
      const updateCountResp = await useInventoryCountRun().updateWorkEffort({
        workEffortId: workEffort.value.workEffortId,
        statusId: "CYCLE_CNT_CNCL"
      });
      if (updateCountResp?.status === 200) {
        showToast(translate("Cycle Count Closed Successfully"));
        router.replace("/assigned");
      } else {
        throw updateCountResp;
      }
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error closing cycle count:", error);
    showToast(translate("Failed to close cycle count"));
  }
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
