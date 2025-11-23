<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/tabs/count" />
        <ion-title>{{ translate("Track progress") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="isLoading" class="loading-overlay">
        <ProgressBar :total-items="totalItems" :loaded-items="loadedItems" />
      </div>
      <!-- Top Summary Section -->
      <div v-else>
      <div class="summary-section ion-padding">
        <div class="header-actions">
          <ion-button fill="outline" color="success">
            <ion-icon slot="start" :icon="checkmarkDoneOutline" />
            {{ translate("SUBMIT FOR REVIEW") }}
          </ion-button>
        </div>

        <div class="progress-summary">
          <!-- Card 1: Count Info -->
          <ion-card>
            <ion-card-header>
              <div>
                <ion-label v-if="workEffort?.workEffortPurposeTypeId === 'HARD_COUNT'" color="warning" class="overline">
                  {{ translate("HARD COUNT") }}
                </ion-label>
                <ion-item lines="none" class="ion-no-padding">
                  <h1>{{ workEffort?.workEffortName }}</h1>
                  <ion-badge color="primary" slot="end">{{ useProductStore().getStatusDescription(workEffort?.currentStatusId) }}</ion-badge>
                </ion-item>
                <ion-card-subtitle>{{ getDateTimeWithOrdinalSuffix(workEffort?.createdDate) || '-' }}</ion-card-subtitle>
              </div>
            </ion-card-header>

            <ion-item lines="none">
              <ion-label>{{ translate("Due date") }}</ion-label>
              <ion-note slot="end">{{ getDateTimeWithOrdinalSuffix(workEffort?.dueDate) || '-' }}</ion-note>
            </ion-item>
            <ion-item lines="none">
              <ion-label>{{ translate("Start date") }}</ion-label>
              <ion-note slot="end">{{ getDateTimeWithOrdinalSuffix(workEffort?.estimatedStartDate) || '-' }}</ion-note>
            </ion-item>

            <ion-list>
              <ion-list-header>
                <ion-label>{{ translate("Sessions") }}</ion-label>
              </ion-list-header>
              <div v-for="session in workEffort?.sessions" :key="session.inventoryCountImportId">
                <ion-item>
                  <ion-label>
                    {{ `${session.countImportName || ""} ${session.facilityAreaId || ""}` }}
                    <p>{{ session.uploadedByUserLogin }}</p>
                  </ion-label>
                  <ion-note>{{ getSessionStatusDescription(session.statusId) }}</ion-note>
                </ion-item>
              </div>
              
              <!-- <ion-item-divider color="light">
                <ion-label>{{ translate("On this device") }}</ion-label>
              </ion-item-divider>
              
              <ion-item>
                <ion-label>
                  Count name + Area name
                  <p>Created by user login</p>
                </ion-label>
                <ion-note slot="end">{{ translate("In progress") }}</ion-note>
              </ion-item>

              <ion-item-divider color="light">
                <ion-label>{{ translate("Other sessions") }}</ion-label>
              </ion-item-divider>
              
              <ion-item>
                <ion-label>
                  Count name + Area name
                  <p>Created by user login</p>
                </ion-label>
                <ion-note slot="end">{{ translate("In progress") }}</ion-note>
              </ion-item>

              <ion-item lines="none">
                <ion-label>
                  Count name + Area name
                  <p>Created by user login</p>
                </ion-label>
                <ion-note slot="end">{{ translate("Submitted") }}</ion-note>
              </ion-item> -->
            </ion-list>
          </ion-card>

          <!-- Card 2: Products Counted -->
          <ion-card>
            <ion-card-header>
              <p class="overline">
                {{ translate("Products counted") }}
              </p>
              <ion-label class="big-number">{{ countedItemsCount }}</ion-label>
              <p v-if="uncountedItemsCount">{{ uncountedItemsCount }} products remaining</p>
            </ion-card-header>
          </ion-card>
        </div>
      </div>
      <!-- Segments -->
      <div class="segments-container">
        <ion-segment value="counted">
          <ion-segment-button value="uncounted" content-id="uncounted">
            <ion-label>{{ uncountedItemsCount }} UNCOUNTED</ion-label>
          </ion-segment-button>
          <ion-segment-button value="counted" content-id="counted">
            <ion-label>{{ countedItemsCount }} COUNTED</ion-label>
          </ion-segment-button>
          <!-- <ion-segment-button value="undirected" content-id="undirected">
            <ion-label>45 UNDIRECTED</ion-label>
          </ion-segment-button>
          <ion-segment-button value="unmatched" content-id="unmatched">
            <ion-label>4 UNMATCHED</ion-label>
          </ion-segment-button> -->
        </ion-segment>
      </div>

      <!-- List -->
      <ion-segment-view>
        <ion-segment-content id="uncounted">
          <div v-if="uncountedItems.length === 0 && isLoadingUncounted" class="empty-state">
            <p>{{ translate("Loading...") }}</p>
          </div>
          <div v-else-if="uncountedItems.length === 0 && !isLoadingUncounted" class="empty-state">
            <p>{{ translate("No results found") }}</p>
          </div>
          <ion-item-group v-else>
            <DynamicScroller :items="uncountedItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120" :emit-update="true">
              <template #default="{ item, index, active }">
                <DynamicScrollerItem :item="item" :index="index" :active="active">
                  <ion-item lines="full">
                    <div class="list-item count-item-rollup">
                      <div class="item-key">
                        <ion-item lines="none">
                          <ion-thumbnail slot="start">
                            <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                          </ion-thumbnail>
                          <ion-label>
                            <h2>{{ useProductMaster().primaryId(item.product) }}</h2>
                            <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                          </ion-label>
                        </ion-item>
                      </div>
                    </div>
                    <ion-label slot="end">
                      {{ item.quantityOnHand }}
                      <p>{{ translate("QoH") }}</p>
                    </ion-label>
                  </ion-item>
                </DynamicScrollerItem>
              </template>
            </DynamicScroller>
          </ion-item-group>
        </ion-segment-content>

        <ion-segment-content id="counted">
          <ion-accordion-group>
            <DynamicScroller :items="countedItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120" :emit-update="true">
              <template #default="{ item, index, active }">
                <DynamicScrollerItem :item="item" :index="index" :active="active">
                  <ion-accordion v-if="item.quantity && item.quantity > 0" :key="item.productId" @click="getCountSessions(item.productId)">
                    <div class="list-item count-item-rollup" slot="header"> 
                      <div class="item-key">
                        <ion-item lines="none">
                          <ion-thumbnail slot="start">
                            <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                          </ion-thumbnail>
                          <ion-label>
                            <h2>{{ useProductMaster().primaryId(item.product) }}</h2>
                            <p>{{ useProductMaster().secondaryId(item.product) }}</p>
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
                      </div>
                    </div>
                  </ion-accordion>
                </DynamicScrollerItem>
              </template>
            </DynamicScroller>
          </ion-accordion-group>
            <!-- <ion-item v-for="item in countedItems" :key="item.id" lines="full">
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" class="placeholder-icon" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.primaryId }}</h2>
                <p>{{ item.secondaryId }}</p>
              </ion-label>
              <ion-note slot="end">{{ item.units }}</ion-note>
            </ion-item> -->
        </ion-segment-content>

        <!-- <ion-segment-content id="undirected">
          <ion-list>
            <ion-item v-for="item in undirectedItems" :key="item.id" lines="full">
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" class="placeholder-icon" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.primaryId }}</h2>
                <p>{{ item.secondaryId }}</p>
              </ion-label>
              <ion-note slot="end">{{ item.units }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-segment-content>

        <ion-segment-content id="unmatched">
          <ion-list>
            <ion-item v-for="item in unmatchedItems" :key="item.id" lines="full">
              <ion-thumbnail slot="start">
                <ion-icon :icon="imageOutline" class="placeholder-icon" />
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.primaryId }}</h2>
                <p>{{ item.secondaryId }}</p>
              </ion-label>
              <ion-note slot="end">{{ item.units }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-segment-content> -->
      </ion-segment-view>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, defineProps } from 'vue';
import {
  IonAccordion,
  IonAccordionGroup,
  IonPage,
  IonHeader,
  IonToolbar,
  IonBackButton,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonBadge,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonListHeader,
  IonItem,
  IonItemGroup,
  IonThumbnail,
  IonSegmentContent,
  IonSegmentView,
  IonAvatar,
  IonSkeletonText,
  onIonViewDidEnter
} from '@ionic/vue';
import Image from '@/components/Image.vue'; 
import { checkmarkDoneOutline, imageOutline, personCircleOutline } from 'ionicons/icons';
import { translate } from '@/i18n';
import { showToast } from '@/services/uiUtils';
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import defaultImage from "@/assets/images/defaultImage.png";
import { getDateTimeWithOrdinalSuffix } from '@/services/utils';
import { useProductMaster } from '@/composables/useProductMaster';
import ProgressBar from '@/components/ProgressBar.vue';
import { useProductStore } from '@/stores/productStore';

const uncountedItemsCount = ref(0);
const isLoadingUncounted = ref(false);
const countedItemsCount = computed(() => countedItems.value.reduce((acc, item) => acc + (item.quantity && item.quantity > 0 ? 1 : 0), 0));
const totalItems = ref(0);
const loadedItems = ref(0);
const workEffort = ref() as any;
const isLoading = ref(false);

const uncountedItems = ref<any[]>([]);
const countedItems = ref<any[]>([]);

const props = defineProps<{
  workEffortId: string;
}>();

onIonViewDidEnter (async () => {
  isLoading.value = true;
  await getWorkEffortDetails();
  await getInventoryCycleCount();
  getUncountedItems();
  isLoading.value = false;
});

async function getWorkEffortDetails() {
  const workEffortResp = await useInventoryCountRun().getWorkEffort({ workEffortId: props.workEffortId });
  if (workEffortResp && workEffortResp.status === 200 && workEffortResp) {
    workEffort.value = workEffortResp.data;
    const sessionsResp = await useInventoryCountRun().getCycleCountSessions({ workEffortId: props.workEffortId });
    if (sessionsResp?.status === 200 && sessionsResp.data?.length) {
      workEffort.value.sessions = sessionsResp.data;
    }
    const resp = await useInventoryCountRun().getProductReviewDetailCount({workEffortId: props.workEffortId})
    if (resp?.status === 200) {
      totalItems.value = resp.data.count || 0
    } else {
      console.error("Error fetching total items:", resp)
    }
  } else {
    showToast(translate("Something Went Wrong"));
    console.error("Error getting the Cycle Count Details", workEffortResp);
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
        countedItems.value.push(...resp.data);
        if (resp.data.length < pageSize) {
          hasMore = false;
        } else {
          pageIndex++;
        }
      } else {
        hasMore = false;
      }
      loadedItems.value = countedItems.value.length;
    }
    const results = countedItems.value;

    const productIds = [...new Set(results
      .filter(item => item?.productId)
      .map(item => item.productId))];

    if (productIds.length) {
      useProductMaster().prefetch(productIds)
        .then(() => { 
          console.info(`Prefetch ${productIds.length} products hydrated`);
          productIds.forEach(async productId => {
            const { product } = await useProductMaster().getById(productId);
            if (!product) return;
            countedItems.value.filter(item => item.productId === productId).forEach(item => {
              item.product = product;
            });
          })
        })
        .catch(err => console.warn('Prefetch Failed:', err))
    }
    results.sort((predecessor, successor) => predecessor.lastUpdatedAt - successor.lastUpdatedAt);
  } catch (error) {
    console.error("Error fetching all cycle count records:", error);
    showToast(translate("Something Went Wrong"));
    countedItems.value = [];
  }
}

async function getUncountedItems() {
  isLoadingUncounted.value = true;
  try {
    if (workEffort.value.workEffortPurposeTypeId === 'DIRECTED_COUNT') {
      uncountedItems.value = countedItems.value.filter(
        (item: any) => !item.quantity || item.quantity === 0
      );
      uncountedItemsCount.value = uncountedItems.value.length;
      return;
    }
    let pageIndex = 0;
    let pageSize = 250;
    let hasMore = true;
    const countResp = await useInventoryCountRun().getUncountedHardCountItemCount({ workEffortId: props.workEffortId });

    if (countResp?.status === 200 && countResp.data?.count >= 0) {
      uncountedItemsCount.value = countResp.data.count;

      if (uncountedItemsCount.value > 5000) {
        pageSize = 500;
      }
    } else {
      uncountedItemsCount.value = 0;
      hasMore = false;
    }

    while (hasMore) {
      const resp = await useInventoryCountRun().getUncountedHardCountItems({ workEffortId: props.workEffortId, pageSize, pageIndex });

      if (resp?.status === 200 && resp.data?.length) {
        uncountedItems.value.push(...resp.data);
        const productIds = [...new Set(resp.data
          .filter((item: any) => item?.productId)
          .map((item: any) => item.productId))];
        if (productIds.length) {
          useProductMaster().prefetch(productIds as any)
            .then(() => { 
              console.info(`Prefetch ${productIds.length} products hydrated`);
              productIds.forEach(async productId => {
                const { product } = await useProductMaster().getById(productId as any);
                if (!product) return;
                uncountedItems.value.filter(item => item.productId === productId).forEach(item => {
                  item.product = product;
                });
              })
            })
            .catch(err => console.warn('Prefetch Failed:', err))
        }
        if (resp.data.length < pageSize) {
          hasMore = false;
        } else {
          pageIndex++;
        }
      } else {
        hasMore = false;
      }
    }

    const results = uncountedItems.value;
    results.sort((predecessor, successor) => predecessor.lastUpdatedAt - successor.lastUpdatedAt);
  } catch (error) {
    console.error("Error fetching uncounted items:", error);
    showToast(translate("Something Went Wrong"));
  }
  isLoadingUncounted.value = false;
}

function stopAccordianEventProp(event: Event) {
  event.stopPropagation();
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

function getSessionStatusDescription(statusId: string) {
  if (!statusId) return "";
  if (statusId === "SESSION_CREATED") return "Created";
  if (statusId === "SESSION_ASSIGNED") return "In Progress";
  if (statusId === "SESSION_SUBMITTED") return "Submitted";
  if (statusId === "SESSION_VOIDED") return "Voided";
}
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--spacer-base);
}

.progress-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
}

.progress-summary ion-card {
  flex: 0 1 305px;
}

.big-number {
  font-size: 78px;
  line-height: 1.2;
  margin: 0;
  color: rgba(var(--ion-text-color));
}

.segments-container {
  border-bottom: 1px solid var(--ion-color-light);
  margin-top: var(--spacer-lg);
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
</style>