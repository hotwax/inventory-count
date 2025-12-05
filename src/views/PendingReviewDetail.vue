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
            <ion-select v-model="complianceFilter" :label="complianceLabel" placeholder="All" interface="popover" @ionChange="handleComplianceChange">
              <ion-select-option value="all">{{ translate("All") }}</ion-select-option>
              <ion-select-option value="acceptable">{{ translate("Acceptable") }}</ion-select-option>
              <ion-select-option value="rejectable">{{ translate("Rejectable") }}</ion-select-option>
              <ion-select-option value="configure">{{ translate("Configure threshold") }}</ion-select-option>
            </ion-select>
          </ion-item>
          </ion-list>
          <ion-item-divider color="light">
            <ion-checkbox slot="start" :checked="isAllSelected" @ionChange="toggleSelectAll"/>
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
                        <ion-checkbox :color="item.decisionOutcomeEnumId ? 'medium' : 'primary'" :disabled="item.decisionOutcomeEnumId" @click.stop="stopAccordianEventProp" :checked="isSelected(item) || item.decisionOutcomeEnumId" @ionChange="() => toggleSelectedForReview(item)"></ion-checkbox>
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
                      <div v-if="!item.decisionOutcomeEnumId" class="actions">
                        <ion-button fill="outline" color="success" size="small" @click.stop="stopAccordianEventProp" @click="submitSingleProductReview(item.productId, item.proposedVarianceQuantity, 'APPLIED', item.quantityOnHand, item.quantity, item)">
                          {{ translate("Accept") }}
                        </ion-button>
                        <ion-button fill="outline" color="danger" size="small" @click.stop="stopAccordianEventProp" @click="submitSingleProductReview(item.productId, item.proposedVarianceQuantity, 'SKIPPED', item.quantityOnHand, item.quantity, item)">
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
                          <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline"></ion-icon>
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
                <ion-item size="small">{{ translate('Last Counted') }}: {{ getDateTimeWithOrdinalSuffix(selectedSession?.createdDate) }}</ion-item>
                <ion-item button @click="showEditImportItemsModal" size="small">{{ translate('Edit Count') }}: {{ selectedSession?.counted }}</ion-item>
                <ion-item button @click="removeProductFromSession()">
                  <ion-label>
                    {{ translate('Remove from Count') }}
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
            <ion-list>
              <ion-list-header>{{ selectedSession?.countImportName }}</ion-list-header>
              <ion-item v-for="item in selectedSession?.importItems" :key="item.importItemSeqId">
                <ion-label>
                  {{ item.importItemSeqId }}
                </ion-label>
                <ion-input @ion-input="item.changed = true" slot="end" type="number" inputmode="numeric" min="0" v-model.number="item.quantity"></ion-input>
              </ion-item>
            </ion-list>
            <ion-fab vertical="bottom" horizontal="end" slot="fixed">
              <ion-fab-button @click="saveEditImportItems">
                <ion-icon :icon="checkmarkDoneOutline" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-modal>

        <ion-modal :is-open="isConfigureThresholdModalOpen" @did-dismiss="closeConfigureThresholdModal" :backdrop-dismiss="false">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="closeConfigureThresholdModal">
                  <ion-icon :icon="closeOutline" slot="icon-only" />
                </ion-button>
              </ion-buttons>
              <ion-title>{{ translate("Configure Threshold") }}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list>
              <ion-item>
                <ion-select v-model="thresholdConfig.unit" label="Unit of Measurement" interface="popover">
                  <ion-select-option value="units">{{ translate("Units") }}</ion-select-option>
                  <ion-select-option value="percent">{{ translate("Percent") }}</ion-select-option>
                  <ion-select-option value="cost">{{ translate("Cost") }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-input 
                  v-model.number="thresholdConfig.value" 
                  type="number" 
                  inputmode="decimal"
                  min="0"
                  :label="translate('Threshold Value')"
                  label-placement="floating"
                ></ion-input>
              </ion-item>
            </ion-list>
            <ion-fab vertical="bottom" horizontal="end" slot="fixed">
              <ion-fab-button @click="saveThresholdConfig">
                <ion-icon :icon="checkmarkDoneOutline" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-modal>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :disabled="selectedProductsReview?.length === 0" fill="outline" color="success" size="small" @click="submitSelectedProductReviews('APPLIED')">
            {{ translate("Accept") }}
          </ion-button>
          <!-- TODO: Add the action later :disabled="" @click="recountItem() -->
          <ion-button :disabled="selectedProductsReview?.length === 0" fill="outline" color="danger" size="small" class="ion-margin-horizontal" @click="submitSelectedProductReviews('SKIPPED')">
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
    <ion-modal :is-open="isBulkCloseModalOpen" @did-dismiss="closeBulkCloseModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ translate("Close Count") }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeBulkCloseModal">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <template v-if="openItems.length">
          <ion-list>
            <ion-radio-group v-model="bulkAction">
              <ion-item>
                <ion-radio value="APPLIED" slot="start"></ion-radio>
                <ion-label>{{ translate("Accept all outstanding variances and close") }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-radio value="SKIPPED" slot="start"></ion-radio>
                <ion-label>{{ translate("Reject all outstanding variances and close") }}</ion-label>
              </ion-item>
            </ion-radio-group>
          </ion-list>

          <ion-button expand="block" color="primary" class="ion-margin"
            @click="performBulkCloseAction">
            {{ translate("Confirm") }}
          </ion-button>
        </template>

        <template v-else>
          <p>{{ translate("All items are already reviewed. Do you want to close the cycle count?") }}</p>

          <ion-button expand="block" color="primary" class="ion-margin-top"
            @click="forceCloseWithoutAction">
            {{ translate("Close Cycle Count") }}
          </ion-button>
        </template>
      </ion-content>
    </ion-modal>
    <ion-alert :is-open="isCloseAlertOpen" header="Close Cycle Count" message="All items are already reviewed. Do you want to close the cycle count?" @didDismiss="isCloseAlertOpen = false" :buttons="[
      { text: 'Cancel', role: 'cancel' },
      { text: 'Confirm', handler: forceCloseWithoutAction }
    ]">
    </ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, defineProps, reactive, ref, toRefs, watch } from "vue";
import { IonAlert, IonProgressBar, IonInput, IonAccordion, IonAccordionGroup, IonAvatar, IonBackButton, IonBadge, IonButtons, IonButton, IonCard, IonCardContent, IonCheckbox, IonContent, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonListHeader, IonModal, IonPage, IonPopover, IonRadio, IonRadioGroup, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonThumbnail, onIonViewDidEnter, IonSkeletonText } from "@ionic/vue";
import { checkmarkDoneOutline, closeOutline, removeCircleOutline, calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import router from "@/router";
import { DateTime } from "luxon";
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { loader, showToast } from "@/services/uiUtils"
import { useProductStore } from "@/stores/productStore";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import ProgressBar from '@/components/ProgressBar.vue';
import Image from "@/components/Image.vue";
import { useInventoryCountImport } from "@/composables/useInventoryCountImport";
import { getDateTimeWithOrdinalSuffix } from "@/services/utils";

const props = defineProps({
  workEffortId: String
})

const THRESHOLD_STORAGE_KEY = 'cyclecount_compliance_threshold';
const isBulkCloseModalOpen = ref(false)
const bulkAction = ref<any>(null)
const isCloseAlertOpen = ref(false)

const openItems = computed(() =>
  aggregatedSessionItems.value.filter(item => !item.decisionOutcomeEnumId)
)

onIonViewDidEnter(async () => {
  isLoading.value = true;
  loadedItems.value = 0
  loadThresholdConfig();
  try {
    const resp = await useInventoryCountRun().getProductReviewDetailCount({workEffortId: props.workEffortId})
    if (resp?.status === 200) {
      totalItems.value = resp.data.count || 0
    } else {
      console.error("Error fetching total items:", resp)
    }
    await getWorkEffortDetails();
    if (workEffort.value) {
      await getInventoryCycleCount();
    }
  } catch (error) {
    console.error("Error fetching total items:", error) 
  }
  isLoading.value = false;
})
const filterAndSortBy = reactive({
  dcsnRsn: 'all',
  sortBy: 'alphabetic',
  complianceFilter: 'all'
});

const  { dcsnRsn, sortBy, complianceFilter } = toRefs(filterAndSortBy);

const searchedProductString = ref(''); 

const isLoading = ref(false);
const workEffort = ref();

const aggregatedSessionItems = ref<any[]>([]);
const filteredSessionItems = ref<any[]>([]);
const totalItems = ref(0);
const loadedItems = ref(0);
const submittedItemsCount = ref (0);
const overallFilteredVarianceQtyProposed = computed(() => filteredSessionItems.value.reduce((sum, item) => sum + item.proposedVarianceQuantity, 0));

const isEditImportItemModalOpen = ref(false);
const isConfigureThresholdModalOpen = ref(false);

const thresholdConfig = reactive({
  unit: 'units',
  value: 2
});

const sessions = ref();
const selectedProductsReview = ref<any[]>([]);
const isSessionPopoverOpen = ref(false);
const selectedSession = ref<any | null>(null);
const sessionPopoverEvent = ref<Event | null>(null);
const selectedProductCountReview = ref<any | null>(null);
const firstCountedAt = ref();
const lastCountedAt = ref();

function loadThresholdConfig() {
  try {
    const stored = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      thresholdConfig.unit = config.unit ?? 'units';
      thresholdConfig.value = config.value ?? 2;
    }
  } catch (error) {
    console.error('Error loading threshold config:', error);
  }
}

function saveThresholdConfig() {
  try {
    localStorage.setItem(THRESHOLD_STORAGE_KEY, JSON.stringify({
      unit: thresholdConfig.unit,
      value: thresholdConfig.value
    }));
    showToast(translate('Threshold saved successfully'));
    closeConfigureThresholdModal();
  } catch (error) {
    console.error('Error saving threshold config:', error);
    showToast(translate('Failed to save threshold'));
  }
}

function handleComplianceChange(event: CustomEvent) {
  if (event.detail.value === 'configure') {
    openConfigureThresholdModal();
  }
}

function openConfigureThresholdModal() {
  isConfigureThresholdModalOpen.value = true;
  complianceFilter.value = 'all';
}

function closeConfigureThresholdModal() {
  isConfigureThresholdModalOpen.value = false;
}

function isItemCompliant(item: any): boolean {
  const variance = Math.abs(item.proposedVarianceQuantity);
  
  if (thresholdConfig.unit === 'units') {
    return variance <= thresholdConfig.value;
  } else if (thresholdConfig.unit === 'percent') {
    if (item.quantityOnHand === 0) return item.proposedVarianceQuantity === 0;
    const percentVariance = Math.abs((item.proposedVarianceQuantity / item.quantityOnHand) * 100);
    return percentVariance <= thresholdConfig.value;
  } else if (thresholdConfig.unit === 'cost') {
    // Cost filtering not implemented yet, show all items
    return true;
  }
  return true;
}

const complianceLabel = computed(() => {
  const unitText = thresholdConfig.unit === 'percent' ? '%' : ` ${thresholdConfig.unit}`;
  return `${translate('Compliance')} (${thresholdConfig.value}${unitText})`;
});

async function removeProductFromSession() {
  await loader.present("Removing...");

  try {
    const getResp = await useInventoryCountImport().getSessionItemsByImportId({
      inventoryCountImportId: selectedSession.value.inventoryCountImportId,
      productId: selectedSession.value.productId,
      facilityId: workEffort.value.facilityId
    });

    if (getResp?.status !== 200 || !getResp.data?.length) {
      throw getResp;
    }

    const importItemsToDelete = getResp.data;

    const resp = await useInventoryCountImport().deleteSessionItem({
      inventoryCountImportId: selectedSession.value.inventoryCountImportId,
      data: importItemsToDelete
    });

    if (resp?.status !== 200) {
      throw resp;
    }
    try {
      const sessionIndex = sessions.value.findIndex(
        (session: any) =>
          session.inventoryCountImportId === selectedSession.value.inventoryCountImportId
      );

      if (sessionIndex !== -1) {
        sessions.value.splice(sessionIndex, 1);
      }

      if (sessions.value.length === 0) {
        const filterredProdIndex = filteredSessionItems.value.findIndex(
          (product: any) => product.productId === selectedSession.value.productId
        );

        if (filterredProdIndex !== -1) {
          filteredSessionItems.value.splice(filterredProdIndex, 1);
        }

        const prodIndex = aggregatedSessionItems.value.findIndex(
          (product: any) => product.productId === selectedSession.value.productId
        );

        if (prodIndex !== -1) {
          aggregatedSessionItems.value.splice(prodIndex, 1);
        }
      } else {
        selectedProductCountReview.value.quantity -= selectedSession.value.quantity;
        selectedProductCountReview.value.proposedVarianceQuantity -= selectedSession.value.quantity;
      }

      closeSessionPopover();
    } catch (error) {
      console.error("Error Updating UI");
    }

  } catch (error) {
    console.error("Failed to delete item from the count", error);
    showToast("Failed to remove item from count");
  }

  loader.dismiss();
}

function closeEditImportItemModal () {
  isEditImportItemModalOpen.value = false;
  closeSessionPopover()
}

async function showEditImportItemsModal () {
  try {
    const resp = await useInventoryCountImport().getSessionItemsByImportId({ inventoryCountImportId: selectedSession.value.inventoryCountImportId, productId: selectedSession.value.productId, facilityId: workEffort.value.facilityId } );
    if (resp?.status === 200 && resp.data?.length) {
      selectedSession.value.importItems = resp.data;
    } else {
      throw resp;
    }
    isEditImportItemModalOpen.value = true;
  } catch (error) {
    console.error("Failed to get Import Items: ", error);
    showToast("Failed to Item Details");
  }
}

async function saveEditImportItems () {
  await loader.present("Saving...");
  try {
    const items = selectedSession.value.importItems.filter((item: any) => item.changed);
    const resp = await useInventoryCountImport().updateSessionItem({
      inventoryCountImportId: selectedSession.value.inventoryCountImportId,
      items
    });
    
    if (resp?.status === 200) {
      try {
        const updatedSessionTotal = selectedSession.value.importItems.reduce(
          (sum: any, item: any) => sum + (Number(item.quantity) || 0),
          0
        );
        selectedSession.value.counted = updatedSessionTotal;

        if (sessions.value.length) {
          const productTotal = sessions.value.reduce(
            (total: any, session: any) => total + (Number(session.counted) || 0),
            0
          );
          selectedProductCountReview.value.quantity = productTotal;
          selectedProductCountReview.value.proposedVarianceQuantity = productTotal - selectedProductCountReview.value.quantityOnHand;
        }
      } catch (error) {
        console.error("Error Updating UI", error);
      }
      closeEditImportItemModal();
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Failed to udpate Item: ", error);
    showToast("Failed to Update Item Count");
  }
  loader.dismiss();
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

  // Apply compliance filtering
  if (complianceFilter.value === 'acceptable') {
    results = results.filter(item => isItemCompliant(item));
  } else if (complianceFilter.value === 'rejectable') {
    results = results.filter(item => !isItemCompliant(item));
  }

  if (sortBy.value === 'alphabetic') {
    results.sort((predecessor, successor) => (predecessor.internalName || '').localeCompare(successor.internalName || ''));
  } else if (sortBy.value === 'variance') {
    results.sort((predecessor, successor) => (predecessor.proposedVarianceQuantity || 0) - (successor.proposedVarianceQuantity || 0));
  }

  filteredSessionItems.value = results;
}

watch([searchedProductString, dcsnRsn, sortBy, complianceFilter], () => {
  applySearchAndSort();
}, { deep: true });

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
    filteredSessionItems.value?.length > 0 && selectedProductsReview.value?.length === filteredSessionItems.value.length
  );
});

function toggleSelectAll(event: CustomEvent) {
  const isChecked = event.detail.checked;

  if (isChecked) {
    selectedProductsReview.value = filteredSessionItems.value.filter(
      (cycle: any) => !cycle.decisionOutcomeEnumId
    );
  } else {
    selectedProductsReview.value = [];
  }
}

async function closeCycleCount() {
  await loader.present("Closing Cycle Count...");
  try {
    const resp = await useInventoryCountRun().updateWorkEffort({ workEffortId: props.workEffortId, statusId: "CYCLE_CNT_CLOSED", actualCompletionDate: DateTime.now().toMillis() });
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
      decisionOutcomeEnumId,
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

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.resp?.status === 200) {
        const batch = result.value.batch;

        const processedIds = batch.map(p => p.productId);
        filteredSessionItems.value.forEach(productReview => {
          if (processedIds.includes(productReview.productId)) {
            productReview.decisionOutcomeEnumId = decisionOutcomeEnumId;
          }
        });

        submittedItemsCount.value += batch.length;

      } else {
        console.error("Batch failed:", result);
      }
    }

    selectedProductsReview.value = [];

  } catch (err) {
    console.error("Error while submitting:", err);
    showToast("Something Went Wrong");
  }
  loader.dismiss();
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

async function submitSingleProductReview(productId: any, proposedVarianceQuantity: any, decisionOutcomeEnumId: string, systemQuantity: any, countedQuantity: any, item: any) {
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
      item.decisionOutcomeEnumId = decisionOutcomeEnumId;
      submittedItemsCount.value++;
    } else {
      throw resp.data;
    }
  } catch (error) {
    showToast(translate("Something Went Wrong"));
    console.error("Error Submitting Review: ", error);
  }
  loader.dismiss();
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
        internalName: searchedProductString.value || null,
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
    applySearchAndSort();
  } catch (error) {
    console.error("Error fetching all cycle count records:", error);
    showToast(translate("Something Went Wrong"));
    aggregatedSessionItems.value = [];
  }
}
// Bulk Close Modal Functions
function openBulkCloseModal() {
  isBulkCloseModalOpen.value = true
  bulkAction.value = null
}

function closeBulkCloseModal() {
  isBulkCloseModalOpen.value = false
}

function handleCloseClick() {
  if (openItems.value.length === 0) {
    // All reviewed → Show alert instead of modal
    isCloseAlertOpen.value = true
  } else {
    // Still open items → show bulk modal
    openBulkCloseModal()
  }
}

async function performBulkCloseAction() {
  if (!bulkAction.value) {
    showToast("Please select an action")
    return
  }
  const decisionOutcomeEnumId = bulkAction.value
  closeBulkCloseModal()
  await loader.present("Closing cycle count...")

  try {
    const itemsToProcess = openItems.value.map(item => ({
      workEffortId: props.workEffortId,
      productId: item.productId,
      facilityId: workEffort.value.facilityId,
      varianceQuantity: item.proposedVarianceQuantity,
      systemQuantity: item.quantityOnHand,
      countedQuantity: item.quantity,
      decisionOutcomeEnumId,
      decisionReasonEnumId: "PARTIAL_SCOPE_POST"
    }))

    const batchSize = 250

    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize)
      const resp = await useInventoryCountRun().submitProductReview({
        inventoryCountProductsList: batch
      })

      if (resp?.status === 200) {

        const processedIds = batch.map(p => p.productId);

        aggregatedSessionItems.value.forEach(item => {
          if (processedIds.includes(item.productId)) {
            item.decisionOutcomeEnumId = decisionOutcomeEnumId;
          }
        });
        submittedItemsCount.value += batch.length;
      } else {
        console.error("Batch failed", resp)
      }
    }
    await closeCycleCount()
  } catch (err) {
    console.error(err)
    showToast("Bulk Action Failed")
  }

  loader.dismiss()
}

async function forceCloseWithoutAction() {
  closeBulkCloseModal()
  await closeCycleCount()
}

function getFacilityName(id: string) {
  const facilities: any[] = useProductStore().getFacilities || [];
  return facilities.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

function getTimeDifference(actual: any, expected: any) {
  if (!actual || !expected) return '';
  const dtActual = DateTime.fromMillis(actual);
  const dtExpected = DateTime.fromMillis(expected);
  const diff = dtActual.diff(dtExpected, ['days', 'hours', 'minutes']);

  const isLate = diff.toMillis() > 0;
  const absDiff = diff.mapUnits(x => Math.abs(x));

  const duration = absDiff.toFormat("d'd' h'h' m'm'")
    .replace(/\b0[dhm]\s*/g, '')
    .trim();

  if (!duration) return translate('On time');

  return `${duration} ${isLate ? translate('late') : translate('early')}`;
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
