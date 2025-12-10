<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pending-review" />
        <ion-title>{{ translate("Review count") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <template v-if="isLoading">
        <ProgressBar :total-items="totalItems" :loaded-items="loadedItems" />
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

            <ion-item>
              <ion-icon :icon="calendarClearOutline" slot="start"></ion-icon>
              <ion-label>
                <p class="overline">{{ translate("Start Date") }}</p>
                {{ getDateTimeWithOrdinalSuffix(workEffort.estimatedStartDate) }}
              </ion-label>
            </ion-item>

            <ion-item lines="none" class="due-date">
              <ion-icon :icon="calendarClearOutline" slot="start"></ion-icon>
              <ion-label>
                <p class="overline">{{ translate("Due Date") }}</p>
                {{ workEffort.estimatedCompletionDate ? getDateTimeWithOrdinalSuffix(workEffort.estimatedCompletionDate) : translate("Not set") }}
              </ion-label>
            </ion-item>
          </ion-card>
          <ion-card>
            <ion-item>
              <ion-label>{{ translate("First item counted") }}</ion-label>
              <ion-label slot="end" class="ion-text-end">
                {{ aggregatedSessionItems.length !== 0 ? getDateTimeWithOrdinalSuffix(firstCountedAt) : '-' }}
                <p v-if="aggregatedSessionItems.length !== 0 && workEffort.estimatedStartDate">{{ getTimeDifference(firstCountedAt, workEffort.estimatedStartDate) }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>{{ translate("Last item counted") }}</ion-label>
              <ion-label slot="end" class="ion-text-end">
                {{ aggregatedSessionItems.length !== 0 ? getDateTimeWithOrdinalSuffix(lastCountedAt) : '-' }}
                <p v-if="aggregatedSessionItems.length !== 0 && workEffort.estimatedCompletionDate">{{ getTimeDifference(lastCountedAt, workEffort.estimatedCompletionDate) }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <div class="statistics">
            <ion-card>
              <ion-item lines="none">
                <ion-label>
                  {{ translate("Review progress", { progressRate: Math.floor((submittedItemsCount / totalItems) * 100)}) }}
                  <p>{{ translate("submitted counts", { submittedItemsCount: submittedItemsCount, totalItems: totalItems }) }}</p>
                </ion-label>
              </ion-item>
              <ion-card-content>
                <ion-progress-bar :value="submittedItemsCount / totalItems"></ion-progress-bar>
              </ion-card-content>
            </ion-card>
            <ion-card>
              <ion-item lines="full">
                <ion-label>
                  <p class="overline">{{ translate("Overall variance (Filtered)") }}</p>
                  <h3>
                    {{
                      translate("filtered variance", {
                        overallFilteredVarianceQtyProposed: overallFilteredVarianceQtyProposed,
                      })
                    }}
                  </h3>
                  <p>
                    {{
                      translate("filtered variance based", {
                        filteredSessionItemsCount: filteredSessionItems.length,
                      })
                    }}
                  </p>
                </ion-label>
              </ion-item>
            </ion-card>
          </div>
        </div>

        <SmartFilterSortBar
          :items="aggregatedSessionItems"
          :selected-items="selectedProductsReview"
          :show-search="true"
          :show-status="true"
          :show-compliance="true"
          :show-sort="true"
          :show-select="true"
          :status-options="[
            { label: translate('Open'), value: 'open' },
            { label: translate('Accepted'), value: 'accepted' },
            { label: translate('Rejected'), value: 'rejected' }
          ]"
          :sort-options="[
            { label: translate('Alphabetic'), value: 'alphabetic' },
            { label: translate('Variance (Low → High)'), value: 'variance-asc' },
            { label: translate('Variance (High → Low)'), value: 'variance-desc' }
          ]"
          @update:filtered="filteredSessionItems = $event"
          @select-all="toggleSelectAll"
        />

        <div class="results ion-margin-top" v-if="filteredSessionItems?.length">
          <ion-accordion-group>
          <DynamicScroller :items="filteredSessionItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120">
            <template #default="{ item, index, active }">
              <DynamicScrollerItem :item="item" :index="index" :active="active">
                  <ion-accordion :key="item.productId" @click="getCountSessions(item.productId)">
                    <!-- HEADER -->
                    <div class="list-item count-item-rollup" slot="header">
                      <div class="item-key">
                        <ion-checkbox :color="item.decisionOutcomeEnumId ? 'medium' : 'primary'" :disabled="item.decisionOutcomeEnumId" @click.stop="stopAccordianEventProp" :checked="isSelected(item) || item.decisionOutcomeEnumId" @ionChange="() => toggleSelectedForReview(item)"></ion-checkbox>
                        <ion-item lines="none">
                          <ion-thumbnail slot="start">
                            <Image :src="item.detailImageUrl" />
                          </ion-thumbnail>
                          <ion-label>{{ item.internalName }}</ion-label>
                        </ion-item>
                      </div>

                      <ion-label class="stat">
                        {{ item.quantity || '-' }}/{{ item.quantityOnHand || '-' }}
                        <p>{{ translate("counted/systemic") }}</p>
                      </ion-label>

                      <ion-label class="stat">
                        {{ item.proposedVarianceQuantity }}
                        <p>{{ translate("variance") }}</p>
                      </ion-label>

                      <!-- ACTION BUTTONS -->
                      <div v-if="!item.decisionOutcomeEnumId" class="actions">
                        <ion-button
                          fill="outline"
                          color="success"
                          size="small"
                          @click.stop="stopAccordianEventProp"
                          @click="
                            submitSingleProductReview(
                              item.productId,
                              item.proposedVarianceQuantity,
                              'APPLIED',
                              item.quantityOnHand,
                              item.quantity,
                              item
                            )
                          "
                        >
                          {{ translate("Accept") }}
                        </ion-button>

                        <ion-button
                          fill="outline"
                          color="danger"
                          size="small"
                          @click.stop="stopAccordianEventProp"
                          @click="
                            submitSingleProductReview(
                              item.productId,
                              item.proposedVarianceQuantity,
                              'SKIPPED',
                              item.quantityOnHand,
                              item.quantity,
                              item
                            )
                          "
                        >
                          {{ translate("Reject") }}
                        </ion-button>
                      </div>

                      <ion-badge
                        v-else
                        :color="item.decisionOutcomeEnumId === 'APPLIED' ? 'success' : 'danger'"
                        style="--color: white;"
                      >
                        {{ item.decisionOutcomeEnumId }}
                      </ion-badge>
                    </div>

                    <!-- ACCORDION CONTENT -->
                    <div slot="content" @click.stop="stopAccordianEventProp">
                      <ion-list v-if="sessions === null">
                        <ion-item v-for="number in item.numberOfSessions" :key="number">
                          <ion-avatar slot="start">
                            <ion-skeleton-text animated style="width: 100%; height: 40px"></ion-skeleton-text>
                          </ion-avatar>
                          <ion-label><ion-skeleton-text animated style="width: 60%"></ion-skeleton-text></ion-label>
                        </ion-item>
                      </ion-list>

                      <div
                        v-else
                        v-for="session in sessions"
                        :key="session.inventoryCountImportId"
                        class="list-item count-item"
                        @click.stop="stopAccordianEventProp"
                      >
                        <ion-item lines="none">
                          <ion-icon :icon="personCircleOutline" slot="start"></ion-icon>
                          <ion-label>
                            {{ session.countImportName || "-" }}
                            <p>{{ session.uploadedByUserLogin }}</p>
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
                          <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline"></ion-icon>
                        </ion-button>
                      </div>
                    </div>
                  </ion-accordion>
                </DynamicScrollerItem>
              </template>
            </DynamicScroller>
          </ion-accordion-group>

          <!-- SESSION POPOVER -->
          <ion-popover
            :is-open="isSessionPopoverOpen"
            :event="sessionPopoverEvent"
            @did-dismiss="closeSessionPopover"
            show-backdrop="false"
          >
            <ion-content>
              <ion-list>
                <ion-list-header>{{ selectedProductCountReview?.internalName }}</ion-list-header>
                <ion-item size="small">{{ translate('Last Counted') }}: {{ getDateTimeWithOrdinalSuffix(selectedSession?.createdDate) }}</ion-item>
                <ion-item v-if="!selectedProductCountReview?.decisionOutcomeEnumId" button @click="showEditImportItemsModal" size="small">{{ translate('Edit Count') }}: {{ selectedSession?.counted }}</ion-item>
                <ion-item v-if="!selectedProductCountReview?.decisionOutcomeEnumId" button @click="removeProductFromSession()">
                  <ion-label>
                    {{ translate('Remove from count') }}
                  </ion-label>
                  <ion-icon :icon="removeCircleOutline" slot="icon-only"></ion-icon>
                </ion-item>
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

      <!-- EDIT ITEM MODAL -->
      <ion-modal :is-open="isEditImportItemModalOpen" @did-dismiss="closeEditImportItemModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeEditImportItemModal">
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
                <Image :src="selectedProductCountReview?.detailImageUrl" />
              </ion-thumbnail>

              <ion-label>
                {{ selectedProductCountReview?.internalName }}
                <p>{{ selectedProductCountReview?.productId }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>{{ translate("Cycle count total") }}</ion-label>
              <ion-label slot="end">{{ selectedProductCountReview?.quantity }} {{ translate("units") }}</ion-label>
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
              <ion-item slot="end">
                <!-- MINUS BUTTON -->
                <ion-button fill="clear" @click="adjustEdit(-1)">
                  <ion-icon slot="icon-only" :icon="removeCircleOutline"></ion-icon>
                </ion-button>
  
                <!-- INPUT -->
                <ion-input class="ion-text-center" type="number" v-model.number="editAdjustment"></ion-input>
  
                <!-- PLUS BUTTON -->
                <ion-button fill="clear" @click="adjustEdit(1)">
                  <ion-icon slot="icon-only" :icon="addCircleOutline"></ion-icon>
                </ion-button>
              </ion-item>
            </ion-item>

            <!-- NEW TOTALS -->
            <ion-item>
              <ion-label>{{ translate("New session count total") }}</ion-label>
              <ion-label slot="end">{{ newSessionTotal }} {{ translate("units") }}</ion-label>
            </ion-item>

            <ion-item>
              <ion-label>{{ translate("New cycle count total") }}</ion-label>
              <ion-label slot="end">{{ newCycleCountTotal }} {{ translate("units") }}</ion-label>
            </ion-item>
          </ion-card>

          <!-- FLOAT SAVE BUTTON -->
          <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button @click="saveEditImportItems">
              <ion-icon :icon="checkmarkDoneOutline" />
            </ion-fab-button>
          </ion-fab>
        </ion-content>
      </ion-modal>
    </ion-content>

    <!-- FOOTER ACTIONS -->
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            :disabled="selectedProductsReview.length === 0"
            fill="outline"
            color="success"
            size="small"
            @click="submitSelectedProductReviews('APPLIED')"
          >
            {{ translate("Accept") }}
          </ion-button>

          <ion-button
            :disabled="selectedProductsReview.length === 0"
            fill="outline"
            color="danger"
            size="small"
            class="ion-margin-horizontal"
            @click="submitSelectedProductReviews('SKIPPED')"
          >
            {{ translate("Reject") }}
          </ion-button>
        </ion-buttons>

        <ion-buttons slot="end">
          <ion-button :disabled="isLoading" fill="outline" color="dark" size="small" @click="handleCloseClick">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>

    <!-- BULK CLOSE MODAL -->
    <ion-modal :is-open="isBulkCloseModalOpen" @did-dismiss="closeBulkCloseModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ translate("Close count") }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeBulkCloseModal">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <template v-if="openItems.length">
          <ion-list>
            <ion-radio-group v-model="bulkAction">
              <ion-item>
                <ion-radio value="APPLIED">{{ translate("Accept all outstanding variances and close") }}</ion-radio>
              </ion-item>

              <ion-item>
                <ion-radio value="SKIPPED">{{ translate("Reject all outstanding variances and close") }}</ion-radio>
              </ion-item>
            </ion-radio-group>
          </ion-list>

          <ion-button expand="block" color="primary" class="ion-margin"
            :disabled="!bulkAction" @click="performBulkCloseAction">
            {{ translate("Confirm") }}
          </ion-button>
        </template>

        <template v-else>
          <p>{{ translate("All items are already reviewed. Do you want to close the cycle count?") }}</p>

          <ion-button expand="block" color="primary" class="ion-margin-top" @click="forceCloseWithoutAction">
            {{ translate("Close Cycle Count") }}
          </ion-button>
        </template>
      </ion-content>
    </ion-modal>

    <!-- CLOSE ALERT -->
    <ion-alert
      :is-open="isCloseAlertOpen"
      header="Close Cycle Count"
      message="All items are already reviewed. Do you want to close the cycle count?"
      @didDismiss="isCloseAlertOpen = false"
      :buttons="[
        { text: 'Cancel', role: 'cancel' },
        { text: 'Confirm', handler: forceCloseWithoutAction }
      ]"
    ></ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
/* imports stay EXACTLY the same */
import {
  IonAlert, IonProgressBar, IonInput, IonAccordion, IonAccordionGroup, IonAvatar,
  IonBackButton, IonBadge, IonButtons, IonButton, IonCard, IonCardContent,
  IonCheckbox, IonContent, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon,
  IonItem, IonLabel, IonList, IonListHeader, IonModal, IonPage, IonPopover,
  IonRadio, IonRadioGroup, IonTitle, IonToolbar,
  IonThumbnail, onIonViewDidEnter, IonSkeletonText
} from "@ionic/vue";
import {
  addCircleOutline, checkmarkDoneOutline, closeOutline, removeCircleOutline, calendarClearOutline,
  businessOutline, personCircleOutline, ellipsisVerticalOutline
} from "ionicons/icons";
import { ref, computed, defineProps } from "vue";
import { translate } from "@/i18n";
import router from "@/router";
import { DateTime } from "luxon";
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { useInventoryCountImport } from "@/composables/useInventoryCountImport";
import { useProductStore } from "@/stores/productStore";
import { loader, showToast } from "@/services/uiUtils";
import ProgressBar from "@/components/ProgressBar.vue";
import Image from "@/components/Image.vue";
import SmartFilterSortBar from "@/components/SmartFilterSortBar.vue";
import { DynamicScroller, DynamicScrollerItem } from "vue-virtual-scroller";
import { getDateTimeWithOrdinalSuffix } from "@/services/utils";

/* props */
const props = defineProps({
  workEffortId: String,
});

/* state */
const aggregatedSessionItems = ref<any[]>([]);
const filteredSessionItems = ref<any[]>([]);
const selectedProductsReview = ref<any[]>([]);
const sessions = ref();

const isLoading = ref(false);
const isEditImportItemModalOpen = ref(false);
const isSessionPopoverOpen = ref(false);
const sessionPopoverEvent = ref<Event | null>(null);
const selectedSession = ref<any | null>(null);
const selectedProductCountReview = ref<any | null>(null);

const isBulkCloseModalOpen = ref(false);
const isCloseAlertOpen = ref(false);
const bulkAction = ref(null);

const workEffort = ref<any>(null);
const totalItems = ref(0);
const loadedItems = ref(0);
const submittedItemsCount = ref(0);

const firstCountedAt = ref();
const lastCountedAt = ref();

/* computed */
const openItems = computed(() =>
  aggregatedSessionItems.value.filter((item) => !item.decisionOutcomeEnumId)
);

const overallFilteredVarianceQtyProposed = computed(() =>
  filteredSessionItems.value.reduce(
    (sum, item) => sum + item.proposedVarianceQuantity,
    0
  )
);

const editAdjustment = ref(0);

const newSessionTotal = computed(() => {
  return (selectedSession.value?.counted || 0) + editAdjustment.value;
});

const newCycleCountTotal = computed(() => {
  return (selectedProductCountReview.value?.quantity || 0) + editAdjustment.value;
});

function adjustEdit(delta: number) {
  const result = editAdjustment.value + delta;
  editAdjustment.value = Math.max(0, result);
}
/* lifecycle */
onIonViewDidEnter(async () => {
  isLoading.value = true;
  loadedItems.value = 0;

  try {
    const resp = await useInventoryCountRun().getProductReviewDetailCount({
      workEffortId: props.workEffortId,
    });
    totalItems.value = resp?.data?.count || 0;
  } catch {
    totalItems.value = 0;
  }

  await getWorkEffortDetails();
  if (workEffort.value) {
    await getInventoryCycleCount();
  }

  isLoading.value = false;
});

/* PRODUCT SELECTION */
function isSelected(product: any) {
  return selectedProductsReview.value.some(
    (productReview) => productReview.productId === product.productId
  );
}

function toggleSelectedForReview(product: any) {
  const index = selectedProductsReview.value.findIndex(
    (productReview) => productReview.productId === product.productId
  );
  if (index === -1) selectedProductsReview.value.push(product);
  else selectedProductsReview.value.splice(index, 1);
}

function toggleSelectAll(isChecked: any) {
  if (isChecked) {
    selectedProductsReview.value = filteredSessionItems.value.filter(
      (item) => !item.decisionOutcomeEnumId
    );
  } else {
    selectedProductsReview.value = [];
  }
}

/* SESSION POPOVER */
function openSessionPopover(event: Event, session: any, parentItem: any) {
  selectedSession.value = session;
  selectedProductCountReview.value = parentItem;
  sessionPopoverEvent.value = event;
  isSessionPopoverOpen.value = true;
}

function closeSessionPopover() {
  isSessionPopoverOpen.value = false;
  selectedSession.value = null;
  selectedProductCountReview.value = null;
}

/* EDIT ITEM MODAL */
function closeEditImportItemModal() {
  isEditImportItemModalOpen.value = false;
  closeSessionPopover();
  editAdjustment.value = 0;
}

async function showEditImportItemsModal() {
  try {
    const resp = await useInventoryCountImport().getSessionItemsByImportId({
      inventoryCountImportId: selectedSession.value.inventoryCountImportId,
      productId: selectedSession.value.productId,
      facilityId: workEffort.value.facilityId,
    });
    if (resp?.data?.length) {
      selectedSession.value.importItems = resp.data;
      isEditImportItemModalOpen.value = true;
    }
  } catch {
    showToast("Failed to load count details");
  }
}

async function saveEditImportItems() {
  await loader.present("Saving...");
  try {
    const newTotal = newSessionTotal.value;

    await useInventoryCountImport().updateSessionItem({
      inventoryCountImportId: selectedSession.value.inventoryCountImportId,
      items: [{
        ...selectedSession.value.importItems[0],
        quantity: newTotal
      }],
    });

    selectedSession.value.counted = newTotal;

    const index = sessions.value.findIndex(
      (session: any) => session.inventoryCountImportId === selectedSession.value.inventoryCountImportId
    );
    if (index !== -1) {
      sessions.value[index] = {
        ...sessions.value[index],
        counted: newTotal
      };
    }

    const parent = selectedProductCountReview.value;

    // recompute total counted from all sessions for this product
    const headerTotal = sessions.value.reduce(
      (sum: number, session: any) => sum + Number(session.counted || 0),
      0
    );

    parent.quantity = headerTotal;
    parent.proposedVarianceQuantity = headerTotal - parent.quantityOnHand;

    const listIndex = filteredSessionItems.value.findIndex(
      sessionItem => sessionItem.productId === parent.productId
    );
    if (listIndex !== -1) {
      filteredSessionItems.value[listIndex] = {
        ...filteredSessionItems.value[listIndex],
        quantity: parent.quantity,
        proposedVarianceQuantity: parent.proposedVarianceQuantity
      };
    }

    const aggIndex = aggregatedSessionItems.value.findIndex(
      aggregatedItem => aggregatedItem.productId === parent.productId
    );
    if (aggIndex !== -1) {
      aggregatedSessionItems.value[aggIndex] = {
        ...aggregatedSessionItems.value[aggIndex],
        quantity: parent.quantity,
        proposedVarianceQuantity: parent.proposedVarianceQuantity
      };
    }

    closeEditImportItemModal();
  } catch {
    showToast("Failed to update count");
  }
  aggregatedSessionItems.value = [...aggregatedSessionItems.value];
  loader.dismiss();
}

/* REMOVE FROM SESSION */
async function removeProductFromSession() {
  await loader.present("Removing...");
  try {
    const resp = await useInventoryCountImport().getSessionItemsByImportId({
      inventoryCountImportId: selectedSession.value.inventoryCountImportId,
      productId: selectedSession.value.productId,
      facilityId: workEffort.value.facilityId,
    });

    await useInventoryCountImport().deleteSessionItem({
      inventoryCountImportId: selectedSession.value.inventoryCountImportId,
      data: resp.data,
    });

    const parent = selectedProductCountReview.value;
    const removedSessionId = selectedSession.value.inventoryCountImportId;

    sessions.value = sessions.value.filter(
      (session: any) => session.inventoryCountImportId !== removedSessionId
    );

    if (sessions.value.length > 0) {
      const newTotal = sessions.value.reduce(
        (sum: number, session: any) => sum + Number(session.counted || 0),
        0
      );

      parent.quantity = newTotal;
      parent.proposedVarianceQuantity = newTotal - parent.quantityOnHand;

      const aggregatedIndex = aggregatedSessionItems.value.findIndex(
        (item) => item.productId === parent.productId
      );
      if (aggregatedIndex !== -1) {
        aggregatedSessionItems.value[aggregatedIndex] = {
          ...aggregatedSessionItems.value[aggregatedIndex],
          quantity: parent.quantity,
          proposedVarianceQuantity: parent.proposedVarianceQuantity,
        };
      }

      const filterIndex = filteredSessionItems.value.findIndex(
        (item) => item.productId === parent.productId
      );
      if (filterIndex !== -1) {
        filteredSessionItems.value[filterIndex] = {
          ...filteredSessionItems.value[filterIndex],
          quantity: parent.quantity,
          proposedVarianceQuantity: parent.proposedVarianceQuantity,
        };
      }

    } else {
      aggregatedSessionItems.value = aggregatedSessionItems.value.filter(
        (item) => item.productId !== parent.productId
      );
      filteredSessionItems.value = filteredSessionItems.value.filter(
        (item) => item.productId !== parent.productId
      );
    }

    closeSessionPopover();
  } catch {
    showToast("Failed to remove item");
  }
  aggregatedSessionItems.value = [...aggregatedSessionItems.value];
  loader.dismiss();
}

/* API CALLS */
async function getWorkEffortDetails() {
  const resp = await useInventoryCountRun().getWorkEffort({
    workEffortId: props.workEffortId,
  });
  workEffort.value = resp?.data;
}

async function getInventoryCycleCount() {
  let pageIndex = 0;
  let pageSize = totalItems.value > 5000 ? 500 : 250;
  let hasMore = true;

  try {
    while (hasMore) {
      const resp = await useInventoryCountRun().getCycleCount({
        workEffortId: props.workEffortId,
        pageSize,
        pageIndex,
      });

      if (!resp?.data?.length) break;

      aggregatedSessionItems.value.push(...resp.data);

      loadedItems.value = aggregatedSessionItems.value.length;

      if (resp.data.length < pageSize) {
        hasMore = false;
        break;
      }
      pageIndex++;
    }

    if (aggregatedSessionItems.value.length) {
      const minTimes = aggregatedSessionItems.value.map((item) => item.minLastUpdatedAt);
      const maxTimes = aggregatedSessionItems.value.map((item) => item.maxLastUpdatedAt);

      firstCountedAt.value = Math.min(...minTimes);
      lastCountedAt.value = Math.max(...maxTimes);
    }

    submittedItemsCount.value = aggregatedSessionItems.value.filter(
      (item) => item.decisionOutcomeEnumId
    ).length;
    filteredSessionItems.value = [...aggregatedSessionItems.value].sort((predecessor, successor) =>
      (predecessor.internalName || '').localeCompare(successor.internalName || '')
    );
  } catch {
    aggregatedSessionItems.value = [];
    filteredSessionItems.value = [];
  }
}

async function getCountSessions(productId: any) {
  sessions.value = null;
  try {
    const resp = await useInventoryCountRun().getSessionsCount({
      workEffortId: props.workEffortId,
      productId,
    });
    sessions.value = resp?.data || [];
  } catch {
    sessions.value = [];
  }
}

/* REVIEW SUBMISSION */
async function submitSingleProductReview(
  productId: any,
  variance: any,
  outcome: any,
  systemQ: any,
  countedQ: any,
  item: any
) {
  await loader.present("Submitting...");
  try {
    const body = [
      {
        workEffortId: props.workEffortId,
        productId,
        facilityId: workEffort.value.facilityId,
        varianceQuantity: variance,
        systemQuantity: systemQ,
        countedQuantity: countedQ,
        decisionOutcomeEnumId: outcome,
        decisionReasonEnumId: "PARTIAL_SCOPE_POST",
      },
    ];

    await useInventoryCountRun().submitProductReview({
      inventoryCountProductsList: body,
    });

    item.decisionOutcomeEnumId = outcome;
    submittedItemsCount.value++;
  } catch {
    showToast("Error submitting review");
  }
  aggregatedSessionItems.value = [...aggregatedSessionItems.value];
  loader.dismiss();
}

async function submitSelectedProductReviews(outcome: any) {
  await loader.present("Submitting Review...");

  try {
    const items = selectedProductsReview.value.map((product) => ({
      workEffortId: props.workEffortId,
      productId: product.productId,
      facilityId: workEffort.value.facilityId,
      varianceQuantity: product.proposedVarianceQuantity,
      systemQuantity: product.quantityOnHand,
      countedQuantity: product.quantity,
      decisionOutcomeEnumId: outcome,
      decisionReasonEnumId: "PARTIAL_SCOPE_POST",
    }));

    const batchSize = 250;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      await useInventoryCountRun().submitProductReview({
        inventoryCountProductsList: batch,
      });

      const processedIds = batch.map((batch) => batch.productId);

      filteredSessionItems.value.forEach((item) => {
        if (processedIds.includes(item.productId)) {
          item.decisionOutcomeEnumId = outcome;
        }
      });

      submittedItemsCount.value += batch.length;
    }

    selectedProductsReview.value = [];

    showToast("Submitted successfully");
  } catch {
    showToast("Some items failed");
  }
  aggregatedSessionItems.value = [...aggregatedSessionItems.value];

  loader.dismiss();
}

/* CLOSE CYCLE COUNT */
async function closeCycleCount() {
  await loader.present("Closing Cycle Count...");
  try {
    await useInventoryCountRun().updateWorkEffort({
      workEffortId: props.workEffortId,
      statusId: "CYCLE_CNT_CLOSED",
      actualCompletionDate: DateTime.now().toMillis(),
    });
    router.replace(`/closed/${props.workEffortId}`);
  } catch {
    showToast("Failed to close cycle count");
  }
  loader.dismiss();
}

function handleCloseClick() {
  if (!openItems.value.length) {
    isCloseAlertOpen.value = true;
  } else {
    openBulkCloseModal();
  }
}

function openBulkCloseModal() {
  isBulkCloseModalOpen.value = true;
  bulkAction.value = null;
}

function closeBulkCloseModal() {
  isBulkCloseModalOpen.value = false;
}

async function performBulkCloseAction() {
  if (!bulkAction.value) return showToast("Please select an action");

  closeBulkCloseModal();
  await loader.present("Closing cycle count...");

  try {
    const itemsToProcess = openItems.value.map((item) => ({
      workEffortId: props.workEffortId,
      productId: item.productId,
      facilityId: workEffort.value.facilityId,
      varianceQuantity: item.proposedVarianceQuantity,
      systemQuantity: item.quantityOnHand,
      countedQuantity: item.quantity,
      decisionOutcomeEnumId: bulkAction.value,
      decisionReasonEnumId: "PARTIAL_SCOPE_POST",
    }));

    const batchSize = 250;

    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize);

      await useInventoryCountRun().submitProductReview({
        inventoryCountProductsList: batch,
      });

      const ids = batch.map((batch) => batch.productId);

      aggregatedSessionItems.value.forEach((item) => {
        if (ids.includes(item.productId)) item.decisionOutcomeEnumId = bulkAction.value;
      });

      submittedItemsCount.value += batch.length;
    }

    await closeCycleCount();
  } catch (error: any) {
    showToast("Bulk action failed");
  }
  aggregatedSessionItems.value = [...aggregatedSessionItems.value];
  loader.dismiss();
}

async function forceCloseWithoutAction() {
  closeBulkCloseModal();
  await closeCycleCount();
}

/* HELPERS */
function stopAccordianEventProp(event: Event) {
  event.stopPropagation();
}

function getFacilityName(id: any) {
  const facilities = useProductStore().getFacilities || [];
  return facilities.find((facility) => facility.facilityId === id)?.facilityName || id;
}

function getTimeDifference(actual: any, expected: any) {
    if (!actual || !expected) return '';
    const dtActual = DateTime.fromMillis(actual);
    const dtExpected = DateTime.fromMillis(expected);
    const diff = dtActual.diff(dtExpected, ['days', 'hours', 'minutes']);
  
    const isLate = diff.toMillis() > 0;
    const absDiff = diff.mapUnits(number => Math.abs(number));
  
    const duration = absDiff.toFormat("d'd' h'h' m'm'")
      .replace(/\b0[dhm]\s*/g, '')
      .trim();
  
    if (!duration) return translate('On time');
  
    return `${duration} ${isLate ? translate('late') : translate('early')}`;
}
</script>

<style scoped>
/* NO CSS CHANGES */
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

.filters > * {
  flex: 1;
}

.list-item.count-item-rollup {
  --columns-desktop: 5;
  border-top: 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.list-item.count-item {
  --columns-desktop: 5;
}

.list-item .item-key {
  padding-inline-start: var(--spacer-sm);
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-self: stretch;
}

.item-key ion-item {
  flex: 1;
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