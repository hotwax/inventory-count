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
                <p class="overline" data-testid="closed-detail-work-effort-id">{{ workEffort?.workEffortId }}</p>
                <h1 data-testid="closed-detail-name">{{ workEffort?.workEffortName }}</h1>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="businessOutline" slot="start" data-testid="closed-detail-facility-icon"></ion-icon>
              <ion-label data-testid="closed-detail-facility-name">
                {{ getFacilityName(workEffort?.facilityId) }}
              </ion-label>
            </ion-item>
            <ion-item class="due-date" data-testid="closed-detail-due-date-item">
              <ion-icon :icon="calendarClearOutline" slot="start" data-testid="closed-detail-due-date-icon"></ion-icon>
              <div>
                <p class="overline" data-testid="closed-detail-due-date-label">{{ translate("Due Date") }}</p>
                <div v-if="workEffort.estimatedCompletionDate" data-testid="closed-detail-due-date-val-wrapper">
                  <ion-datetime-button datetime="datetime" :disabled="true" data-testid="closed-detail-due-date-btn"></ion-datetime-button>
                  <ion-modal keep-contents-mounted="true" data-testid="closed-detail-due-date-modal">
                    <ion-datetime id="datetime" :value="getDateTime(workEffort.estimatedCompletionDate)" :disabled="true" data-testid="closed-detail-due-date-picker">
                    </ion-datetime>
                  </ion-modal>
                </div>
              </div>
            </ion-item>
          </ion-card>
          <ion-card>
            <ion-item data-testid="closed-detail-first-counted-item">
              <ion-label data-testid="closed-detail-first-counted-label">{{ translate("First item counted") }}</ion-label>
              <ion-note slot="end" data-testid="closed-detail-first-counted-val">{{ aggregatedSessionItems.length !== 0 ? getDateTimeWithOrdinalSuffix(firstCountedAt) : '-' }}</ion-note>
            </ion-item>
            <ion-item data-testid="closed-detail-last-counted-item">
              <ion-label data-testid="closed-detail-last-counted-label">{{ translate("Last item counted") }}</ion-label>
              <ion-note slot="end" data-testid="closed-detail-last-counted-val">{{ aggregatedSessionItems.length !== 0 ? getDateTimeWithOrdinalSuffix(lastCountedAt) : '-' }}</ion-note>
            </ion-item>
          </ion-card>

          <div class="statistics">
            <ion-card data-testid="closed-detail-review-progress-card">
              <ion-item lines="none" data-testid="closed-detail-review-progress-item">
                <ion-label data-testid="closed-detail-review-progress-label">
                  {{ translate("Review progress", { progressRate: Math.floor((submittedItemsCount / totalItems) * 100)}) }}
                  <p data-testid="closed-detail-review-progress-stats">{{ translate("submitted counts", { submittedItemsCount: submittedItemsCount, totalItems: totalItems }) }}</p>
                </ion-label>
              </ion-item>
              <ion-card-content data-testid="closed-detail-review-progress-content">
                <ion-progress-bar :value="submittedItemsCount / totalItems" data-testid="closed-detail-review-progress-bar"></ion-progress-bar>
              </ion-card-content>
            </ion-card>
            <ion-card data-testid="closed-detail-overall-variance-card">
              <ion-item lines="full" data-testid="closed-detail-overall-variance-item">
                <ion-label data-testid="closed-detail-overall-variance-label">
                  <p class="overline" data-testid="closed-detail-overall-variance-title">{{ translate("Overall variance (Filtered)") }}</p>
                  <h3 data-testid="closed-detail-overall-variance-qty">{{ translate("filtered variance", { overallFilteredVarianceQtyProposed: overallFilteredVarianceQtyProposed }) }}</h3>
                  <p data-testid="closed-detail-overall-variance-msg">{{ translate("filtered variance based", { filteredSessionItemsCount: filteredSessionItems.length }) }}</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </div>
        </div>

        <SmartFilterSortBar
          :items="aggregatedSessionItems"
          :show-search="true"
          :show-status="true"
          :show-compliance="true"
          :show-sort="true"
          :show-select="false"
          :status-options="[
            { label: translate('Accepted'), value: 'accepted' },
            { label: translate('Rejected'), value: 'rejected' }
          ]"
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
                          <ion-thumbnail slot="start" data-testid="closed-detail-product-thumbnail">
                            <Image :src="item.detailImageUrl" data-testid="closed-detail-product-img"/>
                          </ion-thumbnail>
                          <ion-label data-testid="closed-detail-product-label">
                            <h2 data-testid="closed-detail-product-primary-id">{{ productMaster.primaryId(item.product) || item.internalName }}</h2>
                            <p data-testid="closed-detail-product-secondary-id">{{ productMaster.secondaryId(item.product) }}</p>
                          </ion-label>
                        </ion-item>
                      </div>
                      <ion-label class="stat" data-testid="closed-detail-product-count-stat">
                        <span data-testid="closed-detail-product-counted-qty">{{ item.quantity || '-' }}</span>/<span data-testid="closed-detail-product-system-qty">{{ item.systemQuantity || '-' }}</span>
                        <p>{{ translate("counted/systemic") }}</p>
                      </ion-label>
                      <ion-label class="stat" data-testid="closed-detail-product-variance-stat">
                        <span data-testid="closed-detail-product-variance-qty">{{ item.varianceQuantity }}</span>
                        <p>{{ translate("variance") }}</p>
                      </ion-label>
                      <div v-if="item.decisionOutcomeEnumId" data-testid="closed-detail-product-badge-container">
                        <ion-badge
                        :color="item.decisionOutcomeEnumId === 'APPLIED' ? 'primary' : 'danger'"
                        style="--color: white;"
                        data-testid="closed-detail-product-badge"
                      >
                        {{ item.decisionOutcomeEnumId == "APPLIED" ? translate("Accepted") : translate("Rejected") }}
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
                      <div v-else v-for="session in sessions" :key="session.inventoryCountImportId" class="list-item count-item" @click.stop="stopAccordianEventProp" :data-testid="'closed-detail-session-item-' + session.inventoryCountImportId">
                        <ion-item lines="none" data-testid="closed-detail-session-header">
                          <ion-icon :icon="personCircleOutline" slot="start" data-testid="closed-detail-session-user-icon"></ion-icon>
                          <ion-label data-testid="closed-detail-session-label">
                            <span data-testid="closed-detail-session-name">{{ session.countImportName || "-" }}</span>
                            <p data-testid="closed-detail-session-user-login">
                              {{ session.uploadedByUserLogin }}
                            </p>
                          </ion-label>
                        </ion-item>
                        <ion-label data-testid="closed-detail-session-counted-stat">
                          <span data-testid="closed-detail-session-counted-qty">{{ session.counted }}</span>
                          <p>{{ translate("counted") }}</p>
                        </ion-label>
                        <ion-label data-testid="closed-detail-session-started-stat">
                          <span data-testid="closed-detail-session-started-date">{{ getDateTimeWithOrdinalSuffix(session.createdDate) }}</span>
                          <p>{{ translate("started") }}</p>
                        </ion-label>
                        <ion-label data-testid="closed-detail-session-updated-stat">
                          <span data-testid="closed-detail-session-updated-date">{{ getDateTimeWithOrdinalSuffix(session.lastUpdatedAt) }}</span>
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
import { computed, ref, defineProps } from "vue";
import { IonAccordion, IonAccordionGroup, IonAvatar, IonBackButton, IonBadge, IonCard, IonCardContent, IonContent, IonDatetime, IonDatetimeButton, IonHeader, IonIcon, IonItem, IonLabel, IonModal, IonNote, IonPage, IonProgressBar, IonList, IonTitle, IonToolbar, IonThumbnail, onIonViewDidEnter, IonSkeletonText } from "@ionic/vue";
import { calendarClearOutline, businessOutline, personCircleOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { useProductMaster } from "@/composables/useProductMaster";
import { showToast } from "@/services/uiUtils"
import { DateTime } from "luxon";
import { useProductStore } from "@/stores/productStore";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import ProgressBar from '@/components/ProgressBar.vue'
import Image from "@/components/Image.vue";
import { getDateTimeWithOrdinalSuffix } from "@/services/utils";
import SmartFilterSortBar from "@/components/SmartFilterSortBar.vue";
import { useUserProfile } from "@/stores/userProfileStore";

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

const isLoading = ref(false);
const workEffort = ref();

const firstCountedAt = ref();
const lastCountedAt = ref();

const userProfile = useUserProfile();
const productMaster = useProductMaster();

const hydratedProductIds = new Set<string>();

async function getWorkEffortDetails() {
  const workEffortResp = await useInventoryCountRun().getWorkEffort({ workEffortId: props.workEffortId });
  if (workEffortResp && workEffortResp.status === 200 && workEffortResp) {
    workEffort.value = workEffortResp.data;
  } else {
    showToast(translate("Something Went Wrong"));
    console.error("Error getting the Cycle Count Details", workEffortResp);
  }
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
    submittedItemsCount.value = aggregatedSessionItems.value.filter(item => item.decisionOutcomeEnumId).length;
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
  hydrateProductsForItems(items);
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
      console.warn("Prefetch failed in ClosedDetail", error);
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
    console.warn("Failed to hydrate products in ClosedDetail", error);
    productIds.forEach((id) => hydratedProductIds.delete(id));
  }
}

function stopAccordianEventProp(event: Event) {
  event.stopPropagation();
}

const getDateTime = (time: any) => {
  return time ? DateTime.fromMillis(time).toISO() : ''
}

function getFacilityName(id: string) {
  const facilities: any[] = useProductStore().getFacilities || [];
  return facilities.find((facility: any) => facility.facilityId === id)?.facilityName || id
}
</script>

<style scoped>

.header {
  display: grid;
}


.statistics ion-item h3 {
  font-size: 1.2rem;
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
