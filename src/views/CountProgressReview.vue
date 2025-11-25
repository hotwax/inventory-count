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
      <div class="header ion-padding">
        <div class="header-actions">
          <ion-button :disabled="isLoading && isLoadingUncounted" fill="outline" color="success">
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
                  <ion-badge slot="end">{{ useProductStore().getStatusDescription(workEffort?.currentStatusId) }}</ion-badge>
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
            </ion-list>
          </ion-card>

          <!-- Card 2: Products Counted -->
          <ion-card>
            <ion-card-header>
              <p class="overline">
                {{ translate("Products counted") }}
              </p>
              <ion-label class="big-number">{{ countedItems.length }}</ion-label>
              <p v-if="uncountedItems.length">{{ uncountedItems.length }} products remaining</p>
            </ion-card-header>
          </ion-card>
        </div>
        <!-- <div class="actions">
          <ion-button fill="outline" color="success">
            <ion-icon slot="start" :icon="checkmarkDoneOutline" />
            {{ translate("SUBMIT FOR REVIEW") }}
          </ion-button>
        </div> -->
      </div>
      <!-- Segments -->

      <div class="segments-container">
        <ion-segment value="counted">
          <ion-segment-button value="uncounted" content-id="uncounted">
            <ion-label>{{ uncountedItems.length }} UNCOUNTED</ion-label>
          </ion-segment-button>
          <ion-segment-button value="counted" content-id="counted">
            <ion-label>{{ countedItems.length }} COUNTED</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <!-- List -->
      <ion-segment-view>
        <ion-segment-content id="uncounted">
          <ion-item-divider v-if="workEffort?.workEffortPurposeTypeId === 'HARD_COUNT'">
            <ion-button :disabled="!(uncountedItems.length > 0)" slot="end" fill="outline" @click="createSessionForUncountedItems">Create Session</ion-button>
          </ion-item-divider>
          <div v-if="isLoadingUncounted" class="empty-state">
            <p>{{ translate("Loading...") }}</p>
          </div>
          <div v-else-if="!isLoadingUncounted && uncountedItems.length === 0" class="empty-state">
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
                      {{ item.quantityOnHand || item.quantityOnHandTotal || '-' }}
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
                  <ion-accordion :key="item.productId" @click="getCountSessions(item.productId)">
                    <div class="list-item count-item-rollup" slot="header"> 
                      <ion-item lines="none">
                        <ion-thumbnail slot="start">
                          <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                        </ion-thumbnail>
                        <ion-label>
                          <h2>{{ useProductMaster().primaryId(item.product) }}</h2>
                          <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                        </ion-label>
                      </ion-item>
                      <ion-label>
                        {{ item.quantity }}/{{ item.quantityOnHand }}
                        <p>{{ translate("counted/systemic") }}</p>
                      </ion-label>
                      <ion-label>
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
        </ion-segment-content>
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
  IonItemDivider,
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
import { useUserProfile } from '@/stores/userProfileStore';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';

const isLoadingUncounted = ref(false);
const totalItems = ref(0);
const loadedItems = ref(0);
const workEffort = ref() as any;
const isLoading = ref(false);

const allProducts = ref<any[]>([]);

const uncountedItems = ref<any[]>([]);
const countedItems = ref<any[]>([]);

const props = defineProps<{
  workEffortId: string;
}>();

onIonViewDidEnter (async () => {
  isLoading.value = true;
  await getWorkEffortDetails();
  await getInventoryCycleCount();
  isLoading.value = false;
});

async function getWorkEffortDetails() {
  const workEffortResp = await useInventoryCountRun().getWorkEffort({ workEffortId: props.workEffortId });
  if (workEffortResp && workEffortResp.status === 200 && workEffortResp.data) {
    workEffort.value = workEffortResp.data;
    const sessionsResp = await useInventoryCountRun().getCycleCountSessions({ workEffortId: props.workEffortId });
    if (sessionsResp?.status === 200 && sessionsResp.data?.length) {
      workEffort.value.sessions = sessionsResp.data;
    }
    const resp = await useInventoryCountRun().getProductReviewDetailCount({workEffortId: props.workEffortId});
    if (resp?.status === 200 && resp.data) {
      totalItems.value = resp.data.count || 0;
    } else {
      console.error("Error fetching total items:", resp);
    }
  } else {
    showToast(translate("Something Went Wrong"));
    console.error("Error getting the Cycle Count Details", workEffortResp);
  }
}

async function getInventoryCycleCount() {
  try {
    if (workEffort.value?.workEffortPurposeTypeId === 'DIRECTED_COUNT') {
      await loadDirectedCount();
    } else {
      await loadHardCount();
    }
  } catch (error) {
    console.error("Error fetching inventory cycle count:", error);
  }
}

function safeTimeVal(v: any) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

async function loadDirectedCount() {
  isLoadingUncounted.value = true;
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
      if (resp?.status === 200 && resp.data?.length) {
        countedItems.value.push(...resp.data.filter((item: any) => item.quantity && item.quantity > 0));
        uncountedItems.value.push(...resp.data.filter((item: any) => !item.quantity || item.quantity === 0));
        if (resp.data.length < pageSize) {
          hasMore = false;
        } else {
          pageIndex++;
        }
      } else {
        hasMore = false;
      }
      loadedItems.value = countedItems.value.length + uncountedItems.value.length;
    }

    uncountedItems.value.sort((a, b) => safeTimeVal(a.maxLastUpdatedAt) - safeTimeVal(b.maxLastUpdatedAt));
    countedItems.value.sort((a, b) => safeTimeVal(a.maxLastUpdatedAt) - safeTimeVal(b.maxLastUpdatedAt));

    const countedProductIds = [...new Set(countedItems.value
      .filter(i => i?.productId)
      .map(i => i.productId)
    )];

    if (countedProductIds.length) {
      useProductMaster().prefetch(countedProductIds)
        .then(async () => {
          for (const productId of countedProductIds) {
            const { product } = await useProductMaster().getById(productId);
            if (!product) continue;
            countedItems.value
            .filter(item => item.productId === productId)
            .forEach(item => {
              item.product = product;
            });
          }
        })
        .catch(err => {
          console.warn("Prefetch Failed for counted items:", err);
        })
    }
    const uncountedProductIds = [...new Set(uncountedItems.value
      .filter(i => i?.productId)
      .map(i => i.productId)
    )];

    if (uncountedProductIds.length) {
      useProductMaster().prefetch(uncountedProductIds)
      .then(async () => {
        for (const productId of uncountedProductIds) {
          const { product } = await useProductMaster().getById(productId);
          if (!product) continue;
          uncountedItems.value
          .filter(item => item.productId === productId)
          .forEach(item => {
            item.product = product;
          });
        }
      })
      .catch(err => {
        console.warn("Prefetch Failed for uncounted items:", err);
      })
      .finally(() => {
        isLoadingUncounted.value = false;
      });
    }
  } catch (error) {
    console.error("Error fetching all cycle count records (directed):", error);
    showToast(translate("Something Went Wrong"));
    countedItems.value = [];
    uncountedItems.value =[];
  }
}

async function loadHardCount() {
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
      if (resp?.status === 200 && resp.data?.length) {
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
    countedItems.value.sort((a, b) => safeTimeVal(a.maxLastUpdatedAt) - safeTimeVal(b.maxLastUpdatedAt));
    console.log("These are items: ", countedItems.value);
    getUncountedItems();
    const productIds = [...new Set(
      countedItems.value
        .filter(item => item?.productId)
        .map(item => item.productId)
    )];

    if (productIds.length) {
      useProductMaster().prefetch(productIds)
        .then(async () => {
          for (const productId of productIds) {
            const { product } = await useProductMaster().getById(productId);
            if (!product) continue;

            countedItems.value
            .filter(item => item.productId === productId)
            .forEach(item => {
              item.product = product;
            });
        }
      })
      .catch(err => {
        console.warn('Prefetch Failed for hard count:', err);
      })
    }
    console.log("Pre-fetched items: ", productIds.length);
  } catch (error) {
    console.error("Error fetching all cycle count records (hard):", error);
    showToast(translate("Something Went Wrong"));
    countedItems.value = [];
    uncountedItems.value = [];
  }
}

async function getAllProductsOnFacility() {
  try {
    let pageIndex = 0;
    const pageSize = 500;
    let hasMore = true;
    allProducts.value = [];

    while (hasMore) {
      const resp = await useProductMaster().getInventoryOnFacility({
        facilityId: workEffort.value?.facilityId,
        pageSize,
        pageIndex
      });

      if (resp?.status === 200 && resp?.data?.entityValueList) {
      const list = resp.data.entityValueList;
        allProducts.value.push(...list);

        if (list.length < pageSize) {
          hasMore = false;
        } else {
          pageIndex++;
        }
      } else {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error(`Error Getting all products on facility: ${workEffort.value?.facilityId}`, error);
  }
}

async function getUncountedItems() {
  isLoadingUncounted.value = true;
  try {
    await getAllProductsOnFacility();

    const countedSet = new Set(countedItems.value.map(i => i.productId));
    const rawUncounted = allProducts.value.filter((p: any) => !countedSet.has(p.productId));
    const productIds = [...new Set(
      rawUncounted.map(p => p.productId).filter(Boolean)
    )];

  if (!productIds.length) {
    uncountedItems.value = [];
    isLoadingUncounted.value = false;
    return;
  }

  useProductMaster().prefetch(productIds)
    .then(async () => {
      const items: any[] = [];

      for (const item of rawUncounted) {
        const { product } = await useProductMaster().getById(item.productId);
        items.push(product ? { ...item, product } : item);
      }

      uncountedItems.value = items;
    })
    .catch(err => {
      console.warn('Prefetch Failed for uncounted items:', err);
      uncountedItems.value = rawUncounted;
    })
    .finally(() => {
      isLoadingUncounted.value = false;
    });
  } catch (error) {
    console.error("Error fetching uncounted:", error);
    showToast(translate("Something Went Wrong"));
    uncountedItems.value = [];
  }
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

    if (resp?.status === 200 && resp.data?.length) {
      sessions.value = resp.data;
    } else {
      sessions.value = [];
      throw resp;
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
  return statusId;
}

async function createSessionForUncountedItems() {
  if (workEffort.value?.workEffortPurposeTypeId === 'DIRECTED_COUNT') return;

  try {
    const resp = await useInventoryCountRun().createSessionOnServer({
      countImportName: workEffort.value?.workEffortName,
      statusId: "SESSION_SUBMITTED",
      uploadedByUserLogin: useUserProfile().getUserProfile.username,
      createdDate: DateTime.now().toMillis(),
      dueDate: workEffort.value?.dueDate,
      workEffortId: workEffort.value?.workEffortId
    });

    if (resp?.status === 200 && resp.data) {
      const inventoryCountImportId = resp.data.inventoryCountImportId;
      await createUncountedImportItems(inventoryCountImportId);
    } else {
      throw resp;
    }

  } catch (error) {
    console.error("Error Creating Session for Uncounted Items", error);
    showToast(translate("Failed to Update Cycle Count"));
  }
}

async function createUncountedImportItems(inventoryCountImportId: any) {
  try {
    const batchSize = 250;
    const batches: any[] = [];
    const username = useUserProfile().getUserProfile.username;

    for (let i = 0; i < uncountedItems.value.length; i += batchSize) {
      const chunk = uncountedItems.value.slice(i, i + batchSize);

      const batchPayload = chunk.map((item: any) => ({
        inventoryCountImportId,
        productId: item.productId,
        quantity: 0,
        uploadedByUserLogin: username,
        uuid: uuidv4(),
        createdDate: DateTime.now().toMillis()
      }));

      batches.push(batchPayload);
    }

    for (const batch of batches) {
      try {
        const resp = await useInventoryCountImport().updateSessionItem({
          inventoryCountImportId,
          items: batch
        });

        if (resp?.status === 200) {
          const successfulProductIds = new Set(batch.map((item: any) => item.productId));
          uncountedItems.value = uncountedItems.value.filter((item: any) => !successfulProductIds.has(item.productId));
        } else {
          console.error("Batch failed:", resp);
        }
      } catch (err) {
        console.error("Batch failed:", err);
      }
    }
  } catch (error) {
    console.error("Error creating uncounted import items", error);
    showToast(translate("Failed to Update Uncounted Items"));
  }
}

</script>

<style scoped>

.header {
  display: flex;
  justify-content: space-between;
  align-items: start;
}

.progress-summary {
  flex: 1;
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

ion-segment {
  justify-content: start;
  border-bottom: 1px solid var(--ion-color-medium);
  margin-top: var(--spacer-lg);
}

ion-segment-view {
  height: unset;
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

</style>