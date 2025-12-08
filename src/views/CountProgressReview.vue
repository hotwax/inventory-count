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
            <!-- Card 1: Count Info -->
            <ion-card>
              <ion-card-header>
                <div>
                  <ion-label v-if="workEffort?.workEffortPurposeTypeId === 'HARD_COUNT'" color="warning" class="overline">
                    {{ translate("HARD COUNT") }}
                  </ion-label>
                  <ion-item lines="none" class="ion-no-padding">
                    <h1>{{ workEffort?.workEffortName }}</h1>
                    <ion-badge slot="end" :color="workEffort?.statusId === 'CYCLE_CNT_CMPLTD' ? 'success' : undefined">
                      {{ useProductStore().getStatusDescription(workEffort?.statusId) }}
                    </ion-badge>
                  </ion-item>
                  <ion-card-subtitle>{{ getDateTimeWithOrdinalSuffix(workEffort?.createdDate) || '-' }}</ion-card-subtitle>
                </div>
              </ion-card-header>

              <ion-item lines="none">
                <ion-label>{{ translate("Due date") }}</ion-label>
                <ion-note slot="end">{{ getDateTimeWithOrdinalSuffix(workEffort?.estimatedCompletionDate) || '-' }}</ion-note>
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
                    <ion-note slot="end">{{ useProductStore().getStatusDescription(session.statusId) }}</ion-note>
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

            <!-- Card 3: Submit for Review -->
            <ion-card v-if="workEffort?.statusId === 'CYCLE_CNT_CMPLTD' && !isLoading" class="submission-card">
              <ion-card-header>
                <h2>{{ translate("Count submitted for review") }}</h2>
                <p>{{ translate("This count has been submitted for review.") }}</p>
              </ion-card-header>
            </ion-card>
            <ion-card v-else-if="isWorkEffortInProgress && !isLoading" class="submission-card">
              <ion-card-header v-if="!canSubmitForReview">
                <ion-card-subtitle>{{ translate("Submit requirements") }}</ion-card-subtitle>
                <h3>{{ translate("Complete these steps to send your count for review") }}</h3>
              </ion-card-header>
              <ion-list v-if="!canSubmitForReview">
                <ion-item v-for="requirement in submissionRequirements" :key="requirement.id" lines="none" :detail="false">
                  <ion-icon slot="start" :color="requirement.met ? 'success' : 'warning'" :icon="requirement.met ? checkmarkCircleOutline : alertCircleOutline" />
                  <ion-label>
                    {{ requirement.title }}
                    <p>{{ requirement.helpText }}</p>
                  </ion-label>
                </ion-item>
              </ion-list>
              <ion-button class="ion-margin" expand="block" :disabled="isSubmitDisabled || isSubmitted" color="success" @click="markAsCompleted">
                <ion-icon slot="start" :icon="checkmarkDoneOutline" />
                {{ translate("SUBMIT FOR REVIEW") }}
              </ion-button>
              <ion-item v-if="canSubmitForReview" lines="none">
                <ion-icon slot="start" :icon="checkmarkCircleOutline" color="success" />
                <ion-label>
                  <p class="overline">{{ translate("All tasks completed") }}</p>
                  {{ translate("This count is ready to submit for review.") }}
                </ion-label>
              </ion-item>
            </ion-card>
        </div>
        <!-- Segments -->

        <div class="segments-container">
          <ion-segment value="counted">
            <ion-segment-button value="uncounted" content-id="uncounted">
              <ion-label>{{ uncountedItems.length }} UNCOUNTED</ion-label>
            </ion-segment-button>
            <ion-segment-button v-if="workEffort?.workEffortPurposeTypeId === 'DIRECTED_COUNT'" value="undirected" content-id="undirected">
              <ion-label>{{ undirectedItems.length }} UNDIRECTED</ion-label>
            </ion-segment-button>
            <ion-segment-button value="counted" content-id="counted">
              <ion-label>{{ countedItems.length }} COUNTED</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <!-- List -->
        <ion-segment-view>
          <ion-segment-content id="uncounted">
            <div v-if="!canPreviewItems" class="empty-state">
              <p>{{ translate("You need the PREVIEW_COUNT_ITEM permission to view item details.") }}</p>
            </div>
            <template v-else>
              <ion-item
                v-if="canManageCountProgress && uncountedItems.length > 0"
                lines="full"
              >
                <ion-label>
                  {{ translate("Save uncounted items as out of stock") }}
                  <p>{{ translate("This will mark all uncounted items as out of stock when this cycle count is accepted") }}</p>
                  <p v-if="isMarkOutOfStockDisabled && markOutOfStockDisabledReason" class="helper-text">{{ markOutOfStockDisabledReason }}</p>
                </ion-label>
                <ion-button color="warning" slot="end" fill="outline" :disabled="isMarkOutOfStockDisabled || isSubmitted" @click="createSessionForUncountedItems">{{ translate("Mark as Out of Stock") }}</ion-button>
              </ion-item>
              <div v-if="isLoadingUncounted" class="empty-state">
                <p>{{ translate("Loading...") }}</p>
              </div>
              <div v-else-if="!isLoadingUncounted && uncountedItems.length === 0" class="empty-state">
                <p>{{ translate("All items have been counted. Submit all sessions and submit for review.") }}</p>
              </div>
              <ion-item-group v-else>
                <DynamicScroller :items="uncountedItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120" :emit-update="true">
                  <template #default="{ item, index, active }">
                    <DynamicScrollerItem :item="item" :index="index" :active="active">
                        <div class="list-item count-item-rollup">
                          <ion-item lines="none">
                            <ion-thumbnail slot="start">
                              <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                            </ion-thumbnail>
                            <ion-label>
                              <h2>{{ useProductMaster().primaryId(item.product) }}</h2>
                              <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                            </ion-label>
                          </ion-item>
                          <ion-label slot="end" v-if="showQoh">
                            {{ item.quantityOnHand || item.quantityOnHandTotal || '-' }}
                            {{ translate("QoH") }}
                          </ion-label>
                        </div>
                    </DynamicScrollerItem>
                  </template>
                </DynamicScroller>
              </ion-item-group>
            </template>
          </ion-segment-content>

          <ion-segment-content v-if="workEffort?.workEffortPurposeTypeId === 'DIRECTED_COUNT'" id="undirected">
            <div v-if="isLoadingUndirected" class="empty-state">
              <p>{{ translate("Loading...") }}</p>
            </div>
            <div v-else-if="!isLoadingUndirected && undirectedItems.length === 0" class="empty-state">
              <h2>{{ translate("No undirected items") }}</h2>
              <p>{{ translate("Undirected items are products you counted even though they weren't requested in this directed count. Review this section to decide whether to keep them before completing the count.") }}</p>
            </div>
            <template v-else>
            <ion-item :disabled="!canManageCountProgress">
              <ion-label>
                {{ translate("If these items were not intended to be counted in this session, discard them here before sending the count for head office approval.") }}
              </ion-label>
              <ion-button :disabled="undirectedItems.length === 0 || undirectedItems.every((item: any) => item.decisionOutcomeEnumId === 'SKIPPED') || isSubmitted" slot="end" fill="outline" color="danger" @click="skipAllUndirectedItems">
                {{ translate("Discard all undirected items") }}
              </ion-button>
            </ion-item>
              <ion-accordion-group>
                <DynamicScroller :items="undirectedItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120" :emit-update="true">
                  <template #default="{ item, index, active }">
                    <DynamicScrollerItem :item="item" :index="index" :active="active">
                      <ion-accordion :key="item.productId" @click="getCountSessions(item.productId)">
                        <div class="list-item count-item-rollup" slot="header"> 
                          <ion-item lines="none">
                            <ion-thumbnail slot="start">
                              <Image :src="item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                            </ion-thumbnail>
                            <ion-label>
                              <h2>{{ useProductMaster().primaryId(item.product) || item.internalName }}</h2>
                              <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                            </ion-label>
                          </ion-item>
                          <ion-label>
                            {{ showQoh ? `${item.quantity}/${item.quantityOnHand}` : item.quantity }}
                            <p>{{ translate(showQoh ? "counted/systemic" : "counted") }}</p>
                          </ion-label>
                          <ion-label v-if="showQoh">
                            {{ item.proposedVarianceQuantity }}
                            <p>{{ translate("variance") }}</p>
                          </ion-label>
                          <div v-if="!item.decisionOutcomeEnumId" class="actions">
                            <ion-button :disabled="!canManageCountProgress || isSubmitted" fill="outline" color="danger" size="small" @click="skipSingleProduct(item.productId, item.proposedVarianceQuantity, item.quantityOnHand, item.quantity, item, $event)">
                              {{ translate("Discard") }}
                            </ion-button>
                          </div>
                          <ion-badge
                            v-else
                            color="danger"
                            style="--color: white;"
                          >
                            {{ item.decisionOutcomeEnumId }}
                          </ion-badge>
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
            </template>
          </ion-segment-content>

          <ion-segment-content id="counted">
            <SmartFilterSortBar
              v-if="countedItems.length"
              :items="countedItems"
              :show-search="true"
              :show-status="false"
              :show-compliance="true"
              :show-sort="true"
              :show-select="false"
              :sort-options="[
                { label: translate('Alphabetic'), value: 'alphabetic' },
                { label: translate('Variance (Low → High)'), value: 'variance-asc' },
                { label: translate('Variance (High → Low)'), value: 'variance-desc' }
              ]"
              @update:filtered="filteredCountedItems = $event"
            />
            <div v-if="!canPreviewItems" class="empty-state">
              <p>{{ translate("You need the PREVIEW_COUNT_ITEM permission to view item details.") }}</p>
            </div>
            <div v-else-if="!countedItems.length" class="empty-state">
              <p>{{ translate("No items have been counted yet") }}</p>
            </div>
            <ion-accordion-group v-else>
              <DynamicScroller :items="filteredCountedItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120" :emit-update="true">
                <template #default="{ item, index, active }">
                  <DynamicScrollerItem :item="item" :index="index" :active="active">
                    <ion-accordion :key="item.productId" @click="getCountSessions(item.productId)">
                      <div class="list-item count-item-rollup" slot="header"> 
                        <ion-item lines="none">
                          <ion-thumbnail slot="start">
                            <Image :src="item.detailImageUrl || item.product?.mainImageUrl || defaultImage" :key="item.product?.mainImageUrl"/>
                          </ion-thumbnail>
                          <ion-label>
                            <h2>{{ useProductMaster().primaryId(item.product) || item.internalName }}</h2>
                            <p>{{ useProductMaster().secondaryId(item.product) }}</p>
                          </ion-label>
                        </ion-item>
                        <ion-label>
                          {{ showQoh ? `${item.quantity}/${item.quantityOnHand}` : item.quantity }}
                          <p>{{ translate(showQoh ? "counted/systemic" : "counted") }}</p>
                        </ion-label>
                        <ion-label v-if="showQoh">
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
                          <ion-button fill="clear" color="medium" :disabled="isSubmitted"
                            @click.stop="openSessionPopover($event, session, item)">
                            <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
                          </ion-button>
                        </div>
                      </div>
                    </ion-accordion>
                  </DynamicScrollerItem>
                </template>
              </DynamicScroller>
              <ion-popover :is-open="isSessionPopoverOpen" :event="sessionPopoverEvent" @did-dismiss="closeSessionPopover" show-backdrop="false">
                <ion-content>
                  <ion-list>
                    <ion-list-header>{{ selectedProduct?.internalName }}</ion-list-header>
                    <ion-item button @click="showEditImportItemsModal()">
                      {{ translate("Edit Count") }}: {{ selectedSession?.counted }}
                    </ion-item>
                  </ion-list>
                </ion-content>
              </ion-popover>

            </ion-accordion-group>
          </ion-segment-content>
        </ion-segment-view>
      </div>
    </ion-content>
    <!-- EDIT ITEM MODAL -->
    <ion-modal :is-open="isEditImportItemModalOpen" @did-dismiss="closeEditImportItemModal">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeEditImportItemModal" :disabled="isSubmitted">
              <ion-icon :icon="closeOutline" slot="icon-only" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ translate("Edit Item Count") }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content>

        <ion-card>
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <Image :src="selectedProduct?.detailImageUrl || selectedProduct?.product?.mainImageUrl" />
            </ion-thumbnail>
            <ion-label>
              <h2>{{ selectedProduct?.internalName }}</h2>
              <p class="overline">{{ selectedProduct?.productId }}</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-label>{{ translate("Cycle count total") }}</ion-label>
            <ion-label slot="end">{{ selectedProduct?.quantity }} {{ translate("units") }}</ion-label>
          </ion-item>

          <ion-item>
            <ion-label>{{ translate("Session count total") }}</ion-label>
            <ion-label slot="end">{{ selectedSession?.counted }} {{ translate("units") }}</ion-label>
          </ion-item>
        </ion-card>

        <!-- EDIT SECTION -->
        <ion-card>
          <ion-item lines="full">
            <ion-label>{{ translate("Edit session count") }}</ion-label>
            <ion-item slot="end" lines="none">
              <ion-button fill="clear" @click="adjustEdit(-1)">
                <ion-icon :icon="removeCircleOutline"></ion-icon>
              </ion-button>

              <ion-input class="ion-text-center" type="number" v-model.number="editAdjustment"></ion-input>

              <ion-button fill="clear" @click="adjustEdit(1)">
                <ion-icon :icon="addCircleOutline"></ion-icon>
              </ion-button>
            </ion-item>
          </ion-item>

          <ion-item>
            <ion-label>{{ translate("New session count total") }}</ion-label>
            <ion-label slot="end">{{ newSessionTotal }} {{ translate("units") }}</ion-label>
          </ion-item>

          <ion-item>
            <ion-label>{{ translate("New cycle count total") }}</ion-label>
            <ion-label slot="end">{{ newCycleCountTotal }} {{ translate("units") }}</ion-label>
          </ion-item>
        </ion-card>

        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="saveEditImportItems">
            <ion-icon :icon="checkmarkDoneOutline" />
          </ion-fab-button>
        </ion-fab>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, defineProps } from 'vue';
import { IonAccordion, IonAccordionGroup, IonPage, IonHeader, IonToolbar, IonBackButton, IonTitle, IonContent, IonButton, IonButtons, IonIcon, IonCard, IonCardHeader, IonCardSubtitle, IonBadge, IonFab, IonModal, IonFabButton, IonInput, IonNote, IonPopover, IonSegment, IonSegmentButton, IonLabel, IonList, IonListHeader, IonItem, IonItemGroup, IonThumbnail, IonSegmentContent, IonSegmentView, IonAvatar, IonSkeletonText, onIonViewDidEnter } from '@ionic/vue';
import Image from '@/components/Image.vue'; 
import { addCircleOutline, alertCircleOutline, checkmarkCircleOutline, checkmarkDoneOutline, closeOutline, personCircleOutline, removeCircleOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { translate } from '@/i18n';
import { loader, showToast } from '@/services/uiUtils';
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
import { Actions, hasPermission } from '@/authorization';
import SmartFilterSortBar from "@/components/SmartFilterSortBar.vue";

const isLoadingUncounted = ref(false);
const isLoadingUndirected = ref(false);
const totalItems = ref(0);
const loadedItems = ref(0);
const workEffort = ref() as any;
const isLoading = ref(false);

const allProducts = ref<any[]>([]);

const uncountedItems = ref<any[]>([]);
const countedItems = ref<any[]>([]);
const filteredCountedItems = ref<any[]>([]);
const undirectedItems = ref<any[]>([]);

const sessions = ref();

const isCountStarted = computed(() => {
  const startDateTime = workEffort.value?.estimatedStartDate;
  if (!startDateTime) return false;

  const parsedStart = typeof startDateTime === 'number'
    ? DateTime.fromMillis(startDateTime)
    : DateTime.fromISO(startDateTime);

  if (!parsedStart.isValid) return false;

  return parsedStart <= DateTime.now();
});

const isCountStatusBeyondCreated = computed(() => {
  const statusId = workEffort.value?.statusId;
  return !!statusId && statusId !== 'CYCLE_CNT_CREATED';
});

const isSubmitted = computed(() => workEffort.value?.statusId === 'CYCLE_CNT_CMPLTD');

const canPreviewItems = computed(() => (
  isCountStarted.value || isCountStatusBeyondCreated.value || hasPermission(Actions.APP_PREVIEW_COUNT_ITEM)
));

const canManageCountProgress = computed(() => hasPermission(Actions.APP_MANAGE_COUNT_PROGRESS));

const isMarkOutOfStockDisabled = computed(() => (
  !areAllSessionCompleted()
  || isLoadingUncounted.value
));

const markOutOfStockDisabledReason = computed(() => {
  if (!areAllSessionCompleted()) {
    return translate('Submit or complete all sessions before marking uncounted items as out of stock.');
  }

  if (isLoadingUncounted.value) {
    return translate('Uncounted items are still loading.');
  }

  return '';
});

const isWorkEffortInProgress = computed(() => workEffort.value?.statusId === 'CYCLE_CNT_IN_PRGS');

const areSessionsSubmitted = computed(() => {
  const sessions = workEffort.value?.sessions ?? [];
  return sessions.length > 0 && !sessions.some((session: any) => session.statusId === 'SESSION_CREATED' || session.statusId === 'SESSION_ASSIGNED');
});

const areRequestedItemsCounted = computed(() => uncountedItems.value.length === 0);

const canSubmitForReview = computed(() => (
  canManageCountProgress.value && isWorkEffortInProgress.value && areSessionsSubmitted.value && areRequestedItemsCounted.value
));

const submissionRequirements = computed(() => [
  {
    id: 'permission',
    met: canManageCountProgress.value,
    title: translate('Permission granted'),
    helpText: canManageCountProgress.value
      ? translate('You have the required permission to submit counts for review.')
      : translate('You need one of these permissions: COMMON_ADMIN, INV_COUNT_ADMIN, or INV_COUNT_SUBMIT.')
  },
  {
    id: 'in-progress',
    met: isWorkEffortInProgress.value,
    title: translate('Count is in progress'),
    helpText: isWorkEffortInProgress.value
      ? translate('You have moved this count to the in progress state.')
      : translate('Move the count to In progress to enable submission.')
  },
  {
    id: 'sessions-submitted',
    met: areSessionsSubmitted.value,
    title: translate('All sessions submitted'),
    helpText: areSessionsSubmitted.value
      ? translate('Every session has been submitted.')
      : translate('Submit each session so they show as Submitted in this list.')
  },
  {
    id: 'items-counted',
    met: areRequestedItemsCounted.value,
    title: translate('All requested items counted'),
    helpText: areRequestedItemsCounted.value
      ? translate('Requested items have been counted or marked out of stock.')
      : translate('Count the remaining requested items to finish this count.')
  },
]);

const isSubmitDisabled = computed(() => (
  isLoading.value
  || isLoadingUncounted.value
  || isLoadingUndirected.value
  || !canSubmitForReview.value
));

const showQoh = computed(() => useProductStore().getShowQoh);

const isEditImportItemModalOpen = ref(false);
const selectedProduct = ref<any | null>(null);
const selectedSession = ref<any | null>(null);

const isSessionPopoverOpen = ref(false);
const sessionPopoverEvent = ref<Event | null>(null);

function openSessionPopover(event: Event, session: any, product: any) {
  event.stopPropagation();
  selectedSession.value = session;
  selectedProduct.value = product;
  sessionPopoverEvent.value = event;
  isSessionPopoverOpen.value = true;
}

function closeSessionPopover() {
  isSessionPopoverOpen.value = false;
  sessionPopoverEvent.value = null;
}

const editAdjustment = ref(0);

const newSessionTotal = computed(() => {
  return (selectedSession.value?.counted || 0) + editAdjustment.value;
});

const newCycleCountTotal = computed(() => {
  return (selectedProduct.value?.quantity || 0) + editAdjustment.value;
});

function adjustEdit(delta: number) {
  editAdjustment.value = Math.max(0, editAdjustment.value + delta);
}

async function showEditImportItemsModal() {
  const resp = await useInventoryCountImport().getSessionItemsByImportId({
    inventoryCountImportId: selectedSession.value.inventoryCountImportId,
    productId: selectedSession.value.productId,
    facilityId: workEffort.value.facilityId,
  });

  selectedSession.value.importItems = resp.data;
  editAdjustment.value = 0;

  isEditImportItemModalOpen.value = true;
}

function closeEditImportItemModal() {
  isEditImportItemModalOpen.value = false;
  selectedProduct.value = null;
  selectedSession.value = null;
  editAdjustment.value = 0;
  closeSessionPopover();
}

async function saveEditImportItems() {
  await loader.present("Saving...");

  try {
    const total = newSessionTotal.value;

    await useInventoryCountImport().updateSessionItem({
      inventoryCountImportId: selectedSession.value.inventoryCountImportId,
      items: [{
        ...selectedSession.value.importItems[0],
        quantity: total
      }],
    });

    // update session count
    selectedSession.value.counted = total;

    // recompute parent total
    const newTotal = sessions.value.reduce(
      (sum: number, s: any) => sum + Number(s.counted || 0),
      0
    );

    selectedProduct.value.quantity = newTotal;
    selectedProduct.value.proposedVarianceQuantity = newTotal - selectedProduct.value.quantityOnHand;

    countedItems.value = [...countedItems.value];
    filteredCountedItems.value = [...filteredCountedItems.value];

    closeEditImportItemModal();
  } catch (err) {
    console.error(err);
    showToast("Failed to update count");
  }
  loader.dismiss();
}

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
  if (workEffortResp?.status === 200 && workEffortResp.data) {
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

async function loadDirectedCount() {
  isLoadingUncounted.value = true;
  isLoadingUndirected.value = true;
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
        // Filter out undirected items (isRequested === 'N') from counted and uncounted lists
        // Only include directed items (isRequested === 'Y' or null/undefined)

        try {
          const productsIds = [...new Set(resp.data
            .filter((item: any) => item?.productId)
            .map((item: any) => item.productId)
          )];

          await useProductMaster().prefetch(productsIds as any);
          for (const productId of productsIds) {
            const { product } = await useProductMaster().getById(productId as any);
            if (!product) continue;
            resp.data
            .filter((item: any) => item.productId === productId)
            .forEach((item: any) => {
              item.product = product;
            });
          }
        } catch (error) {
          console.error("Error in Prefetch: ", error);
        }

        const directedItems = resp.data.filter((item: any) => !item.isRequested || item.isRequested !== 'N');
        const undirected = resp.data.filter((item: any) => item.isRequested === 'N');
        undirectedItems.value.push(...undirected);
        directedItems.forEach((item: any) => {
          if (item.quantity >= 0) countedItems.value.push(item);
          else uncountedItems.value.push(item);
        })
        if (resp.data.length < pageSize) {
          hasMore = false;
        } else {
          pageIndex++;
        }
      } else {
        hasMore = false;
      }
      loadedItems.value = countedItems.value.length + uncountedItems.value.length + undirectedItems.value.length;
    }

    uncountedItems.value.sort((a, b) => a.maxLastUpdatedAt - b.maxLastUpdatedAt);
    countedItems.value.sort((a, b) => a.maxLastUpdatedAt - b.maxLastUpdatedAt);
    filteredCountedItems.value = [...countedItems.value];
    undirectedItems.value.sort((a, b) => a.maxLastUpdatedAt - b.maxLastUpdatedAt);

  } catch (error) {
    console.error("Error fetching all cycle count records (directed):", error);
    showToast(translate("Something Went Wrong"));
    countedItems.value = [];
    uncountedItems.value =[];
    undirectedItems.value = [];
  }
  isLoadingUncounted.value = false;
  isLoadingUndirected.value = false;
}

async function skipSingleProduct(productId: any, proposedVarianceQuantity: any, systemQuantity: any, countedQuantity: any, item: any, event:  Event) {
  stopAccordianEventProp(event);
  await loader.present("Skipping...");
  try {

    const inventoryCountProductsList = [{
      workEffortId: props.workEffortId,
      productId: productId,
      facilityId: workEffort.value.facilityId,
      varianceQuantity: proposedVarianceQuantity,
      systemQuantity,
      countedQuantity,
      decisionOutcomeEnumId: 'SKIPPED',
      decisionReasonEnumId: 'PARTIAL_SCOPE_POST'
    }];

    const resp = await useInventoryCountRun().submitProductReview({ inventoryCountProductsList} );

    if (resp?.status === 200) {
      item.decisionOutcomeEnumId = 'SKIPPED';
      showToast(translate("Successfully skipped product count"))
    } else {
      throw resp.data;
    }
  } catch (error) {
    showToast(translate("Failed to skip product"));
    console.error("Error Skipping Product: ", error);
  }
  loader.dismiss();
}

async function skipAllUndirectedItems() {
  if (!canManageCountProgress.value) {
    showToast(translate('You do not have permission to access this page'));
    return;
  }
  const unskippedItems = undirectedItems.value.filter((item: any) => !item.decisionOutcomeEnumId);
  
  if (unskippedItems.length === 0) {
    showToast(translate("No undirected items to skip"));
    return;
  }
  
  await loader.present("Skipping all undirected items...");
  try {

    const inventoryCountProductsList = unskippedItems.map(product => ({
      workEffortId: props.workEffortId,
      productId: product.productId,
      facilityId: workEffort.value.facilityId,
      varianceQuantity: product.proposedVarianceQuantity,
      systemQuantity: product.quantityOnHand,
      countedQuantity: product.quantity,
      decisionOutcomeEnumId: 'SKIPPED',
      decisionReasonEnumId: 'PARTIAL_SCOPE_POST'
    }));

    const batchSize = 250;
    const batches = [];

    for (let i = 0; i < inventoryCountProductsList.length; i += batchSize) {
      batches.push(inventoryCountProductsList.slice(i, i + batchSize));
    }

    const results = await Promise.allSettled(
      batches.map(batch =>
        useInventoryCountRun().submitProductReview({
          inventoryCountProductsList: batch
        }).then(resp => ({ resp, batch }))
      )
    );
    let isAnyFailed = false;
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.resp?.status === 200) {
        const batch = result.value.batch;

        const processedIds = batch.map(p => p.productId);
        undirectedItems.value.forEach(productReview => {
          if (processedIds.includes(productReview.productId)) {
            productReview.decisionOutcomeEnumId = 'SKIPPED';
          }
        });
      } else {
        isAnyFailed = true;
        console.error("Batch failed:", result);
      }
      isAnyFailed ? showToast(translate("Something Went Wrong")) : showToast("Successfully skipped all products");
    }
  } catch (err) {
    console.error("Error while skipping all undirected items:", err);
    showToast(translate("Failed to skip all undirected items"));
  }
  loader.dismiss();
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
        try {
          const productIds = [...new Set(
            resp.data
              .filter((item: any) => item?.productId)
              .map((item: any) => item.productId)
          )];

          if (productIds.length) {
            await useProductMaster().prefetch(productIds as any);
            for (const productId of productIds) {
              const { product } = await useProductMaster().getById(productId as any);
              if (!product) continue;

              countedItems.value
              .filter(item => item.productId === productId)
              .forEach(item => {
                item.product = product;
              });
            }
          }
        } catch (error) {
          console.warn("Error in Prefetch: ", error);
        }
      } else {
        hasMore = false;
      }
      loadedItems.value = countedItems.value.length;
    }
    countedItems.value.sort((a, b) => a.maxLastUpdatedAt - b.maxLastUpdatedAt);
    filteredCountedItems.value = [...countedItems.value];
    getUncountedItems();
  } catch (error) {
    console.error("Error fetching all cycle count records (hard):", error);
    showToast(translate("Something Went Wrong"));
    countedItems.value = [];
    uncountedItems.value = [];
  }
}

async function getUncountedItems() {
  isLoadingUncounted.value = true;
  try {
    let pageIndex = 0;
    const pageSize = 500;
    let hasMore = true;
    const countedSet = new Set(countedItems.value.map(item => item.productId));
    allProducts.value = [];

    while (hasMore) {
      const resp = await useProductMaster().getProductsOnFacility({
        facilityId: workEffort.value?.facilityId,
        pageSize,
        pageIndex
      });

      if (resp?.status === 200 && resp?.data?.entityValueList && resp?.data?.entityValueList.length > 0) {
      const list = resp.data.entityValueList;
        allProducts.value.push(...list);

        if (list.length < pageSize) {
          hasMore = false;
        } else {
          pageIndex++;
        }
        const rawUncounted = list.filter((product: any) => !countedSet.has(product.productId));
        uncountedItems.value.push(...rawUncounted);
        try {
          const productIds = [...new Set(
            rawUncounted.map((product: any) => product.productId).filter(Boolean)
          )];

          if (productIds.length) {
            await useProductMaster().prefetch(productIds as any);
            for (const productId of productIds) {
              const { product } = await useProductMaster().getById(productId as any);
              if (!product) continue;

              uncountedItems.value
              .filter(item => item.productId === productId)
              .forEach(item => {
                item.product = product;
              });
            }
          }
        } catch (error) {
          console.warn("Error in Prefetch: ", error);
        }
      } else {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error(`Error Getting all products on facility: ${workEffort.value?.facilityId}`, error);
    showToast(translate("Something Went Wrong"));
    isLoadingUncounted.value = false;
    uncountedItems.value = [];
  }
  isLoadingUncounted.value = false;
}

function stopAccordianEventProp(event: Event) {
  event.stopPropagation();
}

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

async function createSessionForUncountedItems() {
  if (!canManageCountProgress.value) {
    showToast(translate('You do not have permission to perform this action'));
    return;
  }
  await loader.present(translate("Marking items as out of stock..."));
  try {
    const newSession = {
      countImportName: `Auto OOS Session – ${workEffort.value?.workEffortName} – ${DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS")}`,
      statusId: "SESSION_SUBMITTED",
      uploadedByUserLogin: useUserProfile().getUserProfile.username,
      createdDate: DateTime.now().toMillis(),
      workEffortId: workEffort.value?.workEffortId
    }
    const resp = await useInventoryCountRun().createSessionOnServer(newSession);

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
  loader.dismiss();
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
          countedItems.value.push(...uncountedItems.value.filter((item: any) => successfulProductIds.has(item.productId)));
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

async function markAsCompleted() {
  if (!canManageCountProgress.value) {
    showToast(translate('You do not have permission to perform this action'));
    return;
  }
  
  await loader.present("Submitting...");
  try {
    const response = await useInventoryCountRun().updateWorkEffort({
      workEffortId: workEffort.value.workEffortId,
      statusId: 'CYCLE_CNT_CMPLTD'
    });
    if (response?.status === 200) {
      workEffort.value.statusId = 'CYCLE_CNT_CMPLTD';
      showToast(translate('Count submitted for review successfully'));
    } else {
      throw response;
    }
  } catch (error) {
    console.error("Error Updating Cycle Count: ", error);
      showToast(translate('Failed to send session for review'));
  }
  loader.dismiss();
}

function areAllSessionCompleted() {
  return !workEffort.value?.sessions?.length || !workEffort.value?.sessions.some((session: any) => session.statusId === 'SESSION_CREATED' || session.statusId === 'SESSION_ASSIGNED');
}

</script>

<style scoped>

.header {
  display: flex;
  align-items: start;
  flex-wrap: wrap;
}

.header ion-card {
  flex: 0 1 350px;
}

.submission-card {
  margin-inline-start: auto;
}

.big-number {
  font-size: 78px;
  line-height: 1.2;
  margin: 0;
  color: rgba(var(--ion-text-color));
}

.helper-text {
  color: var(--ion-color-medium);
  margin-top: 4px;
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
  --columns-desktop: 4;
  border-top : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.list-item.count-item {
  --columns-desktop: 5;
}

.disabled-section {
  pointer-events: none;
  opacity: 0.5;
}
</style>