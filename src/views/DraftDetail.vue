<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/draft" data-testid="draft-detail-back-btn"/>
        <ion-title data-testid="draft-detail-page-title">{{ translate("Draft count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content data-testid="draft-detail-content">
      <div v-if="isLoading" class="loading-overlay" data-testid="draft-detail-loading">
        <ProgressBar :total-items="totalItems" :loaded-items="loadedItems" />
      </div>
      <template v-else-if="workEffort">
        <div class="header" data-testid="draft-detail-header">
          <ion-card data-testid="draft-detail-info-card">
            <ion-item lines="none">
              <ion-label>
                <p class="overline" data-testid="draft-detail-work-effort-id">{{ workEffort?.workEffortId }}</p>
                <h1 data-testid="draft-detail-name">{{ workEffort?.workEffortName }}</h1>
              </ion-label>
              <ion-button id="present-edit-count-alert" slot="end" fill="outline" color="medium" @click="openEditNameAlert" data-testid="draft-detail-edit-name-btn">
                {{ translate("Edit") }}
              </ion-button>
            </ion-item>
            <ion-item>
              <ion-icon :icon="businessOutline" slot="start" data-testid="draft-detail-facility-icon"></ion-icon>
              <ion-label data-testid="draft-detail-facility-name">
                {{ getFacilityName(workEffort?.facilityId) }}
              </ion-label>
            </ion-item>
            <!-- TODO: Need to Revisit the date-time-button css -->
            <ion-item data-testid="draft-detail-start-date-item">
              <ion-icon :icon="calendarClearOutline" slot="start" data-testid="draft-detail-start-date-icon"></ion-icon>
              <ion-label data-testid="draft-detail-start-date-label">{{ translate("Start Date") }}</ion-label>
              <ion-datetime-button v-if="workEffort?.estimatedStartDate" slot="end" datetime="estimatedStartDate" data-testid="draft-detail-start-date-btn"/>
              <ion-button v-else id="open-start-date-modal" slot="end" fill="outline" color="medium" data-testid="draft-detail-add-start-date-btn">{{ translate("Add Date") }}</ion-button>
            </ion-item>

            <ion-modal class="ion-datetime-button-overlay date-time-modal" trigger="open-start-date-modal" keep-contents-mounted data-testid="draft-detail-start-date-modal">
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

            <ion-item lines="none" data-testid="draft-detail-due-date-item">
              <ion-icon :icon="calendarClearOutline" slot="start" data-testid="draft-detail-due-date-icon"></ion-icon>
              <ion-label data-testid="draft-detail-due-date-label">{{ translate("Due Date") }}</ion-label>
              <ion-datetime-button v-if="workEffort?.estimatedCompletionDate" slot="end" datetime="estimatedCompletionDate" data-testid="draft-detail-due-date-btn"/>
              <ion-button v-else id="open-due-date-modal" slot="end" fill="outline" color="medium" data-testid="draft-detail-add-due-date-btn">{{ translate("Add Date") }}</ion-button>
            </ion-item>

            <ion-modal class="ion-datetime-button-overlay date-time-modal" trigger="open-due-date-modal" keep-contents-mounted data-testid="draft-detail-due-date-modal">
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
          <ion-card class="add-items" data-testid="draft-detail-add-items-card">
            <div class="mode">
              <h5 class="ion-margin-horizontal" data-testid="draft-detail-add-items-title">{{ translate("Add items") }}</h5>
              <ion-segment v-model="mode" @ionChange="segmentChange($event.target.value as string)" data-testid="draft-detail-add-items-segment">
                <ion-segment-button value="scan" content-id="scan" data-testid="draft-detail-scan-segment-btn">
                  <ion-icon :icon="barcodeOutline" />
                </ion-segment-button>
                <ion-segment-button value="search" content-id="search" data-testid="draft-detail-search-segment-btn">
                  <ion-icon :icon="searchOutline" />
                </ion-segment-button>
              </ion-segment>
            </div>

            <!-- The count's session is what items are written to; without it there is nothing to add to -->
            <ion-item lines="none" v-if="!targetSessionId" data-testid="draft-detail-add-items-no-session">
              <ion-icon :icon="cloudOfflineOutline" slot="start" />
              <ion-label>
                {{ translate("No session available for this count") }}
                <p>{{ translate("Items cannot be added until a session exists") }}</p>
              </ion-label>
            </ion-item>

            <template v-else>
              <div v-show="mode === 'scan'">
                <ion-item lines="full">
                  <ion-input ref="scanInput" v-model="queryString" :label="translate('Scan barcode')" :placeholder="barcodeIdentifier" @ionBlur="isScanningEnabled = false" @ionFocus="isScanningEnabled = true" @keyup.enter="scanProduct()" data-testid="draft-detail-scan-input" />
                </ion-item>

                <ion-item lines="none" v-if="isSearchingProduct" data-testid="draft-detail-scan-loading">
                  <ion-spinner name="crescent" />
                </ion-item>

                <ion-item lines="none" v-else-if="searchedProduct.productId" data-testid="draft-detail-scan-result">
                  <ion-thumbnail slot="start">
                    <Image :src="searchedProduct.mainImageUrl" />
                  </ion-thumbnail>
                  <ion-label>
                    {{ useProductMaster().primaryId(searchedProduct) || searchedProduct.internalName }}
                    <p>{{ useProductMaster().secondaryId(searchedProduct) }}</p>
                  </ion-label>
                  <ion-icon v-if="addedProductIds.has(searchedProduct.productId)" :icon="checkmarkCircle" color="success" slot="end" data-testid="draft-detail-scan-added-icon" />
                  <ion-spinner v-else-if="isAddingProduct" name="crescent" slot="end" />
                </ion-item>

                <ion-item lines="none" v-else-if="searchedProduct.scannedId" data-testid="draft-detail-scan-not-found">
                  <ion-icon :icon="cloudOfflineOutline" slot="start" />
                  <ion-label>
                    {{ searchedProduct.scannedId }} {{ translate("not found") }}
                    <p>{{ translate("Try searching using a keyword instead") }}</p>
                  </ion-label>
                  <ion-button size="small" slot="end" color="primary" @click="openAddProductModal(searchedProduct.scannedId)" data-testid="draft-detail-scan-switch-to-search-btn">
                    <ion-icon slot="start" :icon="searchOutline" />
                    {{ translate("Search") }}
                  </ion-button>
                </ion-item>

                <ion-item lines="none" v-else-if="!isScanningEnabled" data-testid="draft-detail-scan-unfocused">
                  <ion-label>
                    {{ translate("Your scanner isn’t focused yet.") }}
                    <p>{{ translate("Scanning is set to") }} {{ barcodeIdentifier }}</p>
                  </ion-label>
                  <ion-button slot="end" color="warning" size="small" @click="enableScan" data-testid="draft-detail-focus-scanning-btn">
                    <ion-icon slot="start" :icon="locateOutline" />
                    {{ translate("Focus scanning") }}
                  </ion-button>
                </ion-item>

                <ion-item lines="none" v-else data-testid="draft-detail-scan-idle">
                  <ion-label>
                    {{ translate("Begin scanning products to add them to this count") }}
                    <p>{{ translate("Scanning is set to") }} {{ barcodeIdentifier }}</p>
                  </ion-label>
                  <ion-badge slot="end" color="success">{{ translate("start scanning") }}</ion-badge>
                </ion-item>
              </div>

              <div v-show="mode === 'search'">
                <ion-searchbar ref="searchInput" v-model="queryString" :placeholder="translate('Search')" @ionClear="clearQuery" data-testid="draft-detail-search-input" />

                <ion-item lines="none" v-if="isSearchingProduct" data-testid="draft-detail-search-loading">
                  <ion-spinner name="crescent" />
                </ion-item>

                <ion-list lines="none" v-else-if="searchedProduct.productId" data-testid="draft-detail-search-result">
                  <ion-item>
                    <ion-thumbnail slot="start">
                      <Image :src="searchedProduct.mainImageUrl" />
                    </ion-thumbnail>
                    <ion-label>
                      {{ useProductMaster().primaryId(searchedProduct) || searchedProduct.internalName }}
                      <p>{{ useProductMaster().secondaryId(searchedProduct) }}</p>
                    </ion-label>
                    <ion-icon v-if="addedProductIds.has(searchedProduct.productId)" slot="end" :icon="checkmarkCircle" color="success" data-testid="draft-detail-search-added-icon" />
                    <ion-button v-else slot="end" fill="outline" :disabled="isAddingProduct" @click="addSearchedProduct()" data-testid="draft-detail-add-to-count-btn">
                      {{ isAddingProduct ? translate("Adding...") : translate("Add to count") }}
                    </ion-button>
                  </ion-item>
                  <ion-item button detail v-if="productSearchCount > 1" @click="openAddProductModal()" data-testid="draft-detail-view-more-results">
                    <ion-label>{{ translate("View more results") }} ({{ productSearchCount - 1 }} {{ translate("more") }})</ion-label>
                  </ion-item>
                </ion-list>

                <ion-item lines="none" v-else-if="queryString" data-testid="draft-detail-search-not-found">
                  <ion-icon :icon="cloudOfflineOutline" slot="start" />
                  <ion-label>
                    {{ translate("No product found") }}
                    <p>{{ translate("Try a different keyword") }}</p>
                  </ion-label>
                </ion-item>

                <ion-item lines="none" v-else data-testid="draft-detail-search-idle">
                  <ion-icon :icon="shirtOutline" slot="start" />
                  {{ translate("Search for products by their Parent name, SKU or UPC") }}
                </ion-item>
              </div>
            </template>
          </ion-card>
        </div>

        <SmartFilterSortBar
          :items="aggregatedSessionItems"
          :selected-items="selectedProducts"
          :show-status="false"
          :show-compliance="false"
          :show-select="true"
          :show-search="true"
          :show-sort="true"
          :sort-options="[
            { label: translate('Alphabetic'), value: 'alphabetic' },
            { label: translate('Variance (Low → High)'), value: 'variance-asc' },
            { label: translate('Variance (High → Low)'), value: 'variance-desc' }
          ]"
          :threshold-config="userProfile.getDetailPageFilters.threshold"
          @update:filtered="filteredSessionItems = $event"
          @select-all="toggleSelectAll"
          data-testid="draft-detail-filter-bar"
        />

        <div class="results ion-margin-top" v-if="filteredSessionItems?.length" data-testid="draft-detail-results">
          <ion-accordion-group>
          <DynamicScroller :items="filteredSessionItems" key-field="productId" :buffer="200" class="virtual-list" :min-item-size="120" data-testid="draft-detail-scroller">
            <template #default="{ item, index, active }">
              <DynamicScrollerItem :item="item" :index="index" :active="active">
                  <ion-accordion :key="item.productId" @click="getCountSessions(item.productId)" :data-testid="'draft-detail-product-accordion-' + item.productId">
                    <div class="list-item count-item-rollup" slot="header" :data-testid="'draft-detail-product-header-' + item.productId"> 
                      <div class="item-key">
                        <ion-checkbox @click.stop="stopAccordianEventProp" :checked="isSelected(item)" @ionChange="() => toggleSelected(item)" :data-testid="'draft-detail-item-checkbox-' + item.productId"></ion-checkbox>
                        <ion-item lines="none">
                          <ion-thumbnail slot="start" data-testid="draft-detail-product-thumbnail">
                            <Image :src="item.detailImageUrl" data-testid="draft-detail-product-img"/>
                          </ion-thumbnail>
                          <ion-label>
                            <h2 data-testid="draft-detail-product-primary-id">{{ productMaster.primaryId(item.product) || item.internalName }}</h2>
                            <p data-testid="draft-detail-product-secondary-id">{{ productMaster.secondaryId(item.product) }}</p>
                          </ion-label>
                        </ion-item>
                      </div>
                        <ion-label class="stat" data-testid="draft-detail-product-count-stat">
                          <span data-testid="draft-detail-product-counted-qty">{{ item.quantity || '-' }}</span>/<span data-testid="draft-detail-product-system-qty">{{ item.systemQuantityOnHand || '-' }}</span>
                          <p>{{ translate("counted/systemic") }}</p>
                        </ion-label>
                        <ion-label class="stat" data-testid="draft-detail-product-variance-stat">
                          <span data-testid="draft-detail-product-variance-qty">{{ item.proposedVarianceQuantity }}</span>
                          <p>{{ translate("variance") }}</p>
                        </ion-label>
                    </div>
                    <div slot="content" @click.stop="stopAccordianEventProp" :data-testid="'draft-detail-product-content-' + item.productId">
                      <ion-list v-if="sessions === null" data-testid="draft-detail-sessions-loading">
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
                      <div v-else :data-testid="'draft-detail-session-list-' + item.productId">
                        <div v-for="session in sessions" :key="session.inventoryCountImportId" class="list-item count-item" @click.stop="stopAccordianEventProp" :data-testid="'draft-detail-session-item-' + session.inventoryCountImportId">
                          <ion-item lines="none">
                            <ion-icon :icon="personCircleOutline" slot="start" data-testid="draft-detail-session-user-icon"></ion-icon>
                            <ion-label data-testid="draft-detail-session-user-label">
                              <span data-testid="draft-detail-session-name-text">{{ session.countImportName || "-" }}</span>
                              <p data-testid="draft-detail-session-user-login">
                                {{ session.uploadedByUserLogin }}
                              </p>
                            </ion-label>
                          </ion-item>
                          <ion-label data-testid="draft-detail-session-counted-stat">
                            <span data-testid="draft-detail-session-counted-qty">{{ session.counted }}</span>
                            <p>{{ translate("counted") }}</p>
                          </ion-label>
                          <ion-label data-testid="draft-detail-session-started-stat">
                            <span data-testid="draft-detail-session-started-date">{{ commonUtil.getDateTimeWithOrdinalSuffix(session.createdDate) }}</span>
                            <p>{{ translate("started") }}</p>
                          </ion-label>
                          <ion-label data-testid="draft-detail-session-updated-stat">
                            <span data-testid="draft-detail-session-updated-date">{{ commonUtil.getDateTimeWithOrdinalSuffix(session.lastUpdatedAt) }}</span>
                            <p>{{ translate("last updated") }}</p>
                          </ion-label>
                          <ion-button fill="clear" color="medium" @click="openSessionPopover($event, session, item)" :data-testid="'draft-detail-session-popover-btn-' + session.inventoryCountImportId">
                            <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                          </ion-button>
                        </div>
                      </div>
                    </div>
                  </ion-accordion>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
          </ion-accordion-group>
          <ion-popover :is-open="isSessionPopoverOpen" :event="sessionPopoverEvent" @did-dismiss="closeSessionPopover" show-backdrop="false" data-testid="draft-detail-session-popover">
              <ion-content data-testid="draft-detail-session-popover-content">
                <ion-list data-testid="draft-detail-session-popover-list">
                  <ion-list-header data-testid="draft-detail-session-popover-header">{{ selectedProductCountReview?.internalName }}</ion-list-header>
                  <ion-item size="small" data-testid="draft-detail-session-popover-item">
                    <ion-label data-testid="draft-detail-session-popover-last-counted-label">{{ translate('Last Counted') }}: {{ commonUtil.getDateTimeWithOrdinalSuffix(selectedSession?.lastUpdatedAt) }}</ion-label>
                  </ion-item>
                </ion-list>
              </ion-content>
            </ion-popover>
        </div>
        <div v-else class="empty-state" data-testid="draft-detail-empty-results">
          <p>{{ translate("No Results") }}</p>
        </div>
      </template>
      <template v-else>
        <p class="empty-state" data-testid="draft-detail-not-found">{{ translate("Cycle Count Not Found") }}</p>
      </template>
    </ion-content>
    <ion-footer data-testid="draft-detail-footer">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="danger" fill="outline" :disabled="!selectedProducts.length || isRemovingItems" @click="isRemoveItemsAlertOpen = true" data-testid="draft-detail-remove-items-btn">
            {{ translate("Remove items") }}
            <template v-if="selectedProducts.length"> ({{ selectedProducts.length }})</template>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button color="danger" fill="outline" @click="isCloseCountAlertOpen = true" data-testid="draft-detail-close-btn">
            {{ translate("Close") }}
          </ion-button>
          <!-- CYCLE_CNT_APPROVED is only reachable from CYCLE_CNT_CREATED in the status flow -->
          <ion-button v-if="workEffort?.statusId === 'CYCLE_CNT_CREATED'" color="success" fill="outline" :disabled="isApproving" @click="approveCycleCount()" data-testid="draft-detail-approve-btn">
            {{ translate("Approved") }}
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
    ]"
    data-testid="draft-detail-close-confirm-alert">
    </ion-alert>
    <ion-alert
    :is-open="isRemoveItemsAlertOpen"
    @did-dismiss="isRemoveItemsAlertOpen = false"
    :header="translate('Remove items')"
    :message="translate('Are you sure you want to remove the selected items from this count?')"
    :buttons="[
      { text: translate('Cancel'), role: 'cancel' },
      { text: translate('Remove'), handler: () => removeSelectedItems() }
    ]"
    data-testid="draft-detail-remove-items-confirm-alert">
    </ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, defineProps } from "vue";
import { IonAlert, IonPopover, IonAccordion, IonAccordionGroup, IonAvatar, IonBackButton, IonBadge, IonButton, IonButtons, IonCard, IonCheckbox, IonContent, IonDatetime, IonDatetimeButton, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonModal, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar, IonThumbnail, onIonViewDidEnter, IonSkeletonText, alertController, modalController } from "@ionic/vue";
import { calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline, barcodeOutline, searchOutline, cloudOfflineOutline, locateOutline, shirtOutline, checkmarkCircle } from "ionicons/icons";
import { translate, commonUtil, useSolrSearch } from '@common'
import { v4 as uuidv4 } from 'uuid';
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { useInventoryCountImport } from "@/composables/useInventoryCountImport";
import { useProductMaster } from "@/composables/useProductMaster";
import { loader } from "@/services/uiUtils";
import { DateTime } from "luxon";
import { useProductStore } from "@/stores/productStore";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import ProgressBar from '@/components/ProgressBar.vue'
import Image from "@/components/Image.vue";
import AddProductModal from "@/components/AddProductModal.vue";
import SmartFilterSortBar from "@/components/SmartFilterSortBar.vue";
import router from "@/router";
import { useUserProfile } from "@/stores/userProfileStore";


const facilities = computed(() => useProductStore().getFacilities);

const props = defineProps({
  workEffortId: String
})
const totalItems = ref(0)
const loadedItems = ref(0)

const isCloseCountAlertOpen = ref(false);
const isApproving = ref(false);

/** Bulk selection for removing items from the count */
const selectedProducts = ref<any[]>([]);
const isRemoveItemsAlertOpen = ref(false);
const isRemovingItems = ref(false);

/** Add-items (scan / search) state */
const mode = ref("scan");
const queryString = ref("");
const searchedProduct = ref({}) as any;
const productSearchCount = ref(0);
const isSearchingProduct = ref(false);
const isAddingProduct = ref(false);
const isScanningEnabled = ref(false);
const scanInput = ref();
const searchInput = ref();
const addedProductIds = ref(new Set<string>());
// The session new items are written to. Creating a cycle count always creates one session.
const targetSessionId = ref("");

const barcodeIdentifier = computed(() => useProductStore().getBarcodeIdentificationPref || "SKU");
let searchTimeoutId: any;

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
    await loadTargetSession()
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
    commonUtil.showToast(translate("Something Went Wrong"));
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
      commonUtil.showToast(translate("Updated Successfully"))
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error Udpating Cycle Count: ", error);
    commonUtil.showToast(`Failed to Update: ${currentField} on Cycle Count`);
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
              commonUtil.showToast(translate("Count Name Updated Successfully"));
            } else {
              throw resp;
            }
          } catch (error) {
            commonUtil.showToast(translate("Failed to Update Cycle Count Name"));
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
    commonUtil.showToast(translate("Something Went Wrong"));
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
    filteredSessionItems.value = [...aggregatedSessionItems.value].sort((a, b) =>
      (a.internalName || '').localeCompare(b.internalName || '')
    );
    scheduleProductHydration(aggregatedSessionItems.value);
  } catch (error) {
    console.error("Error fetching all cycle count records:", error);
    commonUtil.showToast(translate("Something Went Wrong"));
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
      console.warn("Prefetch failed in DraftDetail", error);
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
    console.warn("Failed to hydrate products in DraftDetail", error);
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

/** Resolve the session that new items are written to. */
async function loadTargetSession() {
  try {
    const resp = await useInventoryCountRun().getCycleCountSessions({ workEffortId: props.workEffortId });
    if (resp?.status === 200 && resp.data?.length) {
      targetSessionId.value = resp.data[0].inventoryCountImportId;
    } else {
      targetSessionId.value = "";
    }
  } catch (error) {
    targetSessionId.value = "";
    console.error("Error getting sessions for this count: ", error);
  }
}

// Debounced keyword search. Scanning resolves on Enter instead, so it is skipped here.
watch(queryString, (value) => {
  if (mode.value === "scan") return;
  const searchedString = value?.trim();

  if (searchTimeoutId) clearTimeout(searchTimeoutId);
  if (!searchedString) {
    isSearchingProduct.value = false;
    searchedProduct.value = {};
    productSearchCount.value = 0;
    return;
  }

  isSearchingProduct.value = true;
  searchTimeoutId = setTimeout(() => {
    findProduct(searchedString);
  }, 300);
});

async function findProduct(term: string) {
  isSearchingProduct.value = true;
  try {
    const query = productMaster.buildProductQuery({
      keyword: term,
      viewSize: 50,
      filter: "isVirtual:false,productTypeId:FINISHED_GOOD,-prodCatalogCategoryTypeIds:PCCT_DISCONTINUED"
    });
    const resp = await useSolrSearch().runSolrQuery(query);
    const docs = resp?.data?.response?.docs || [];

    // numFound is the true match count, so "view more" reflects everything, not just this page
    productSearchCount.value = resp?.data?.response?.numFound || docs.length;
    searchedProduct.value = docs.length ? docs[0] : {};
  } catch (error) {
    searchedProduct.value = {};
    productSearchCount.value = 0;
    console.error("Failed to search products: ", error);
  }
  isSearchingProduct.value = false;
}

async function scanProduct() {
  const scannedId = queryString.value?.trim();
  if (!scannedId) return;

  isSearchingProduct.value = true;
  try {
    const query = productMaster.buildProductQuery({
      filter: `goodIdentifications:${barcodeIdentifier.value}/${scannedId},isVirtual:false,productTypeId:FINISHED_GOOD,-prodCatalogCategoryTypeIds:PCCT_DISCONTINUED`,
      viewSize: 1
    });
    const resp = await useSolrSearch().runSolrQuery(query);
    const product = resp?.data?.response?.docs?.[0];

    if (product) {
      searchedProduct.value = product;
      // A scan is an explicit intent to add, so it does not wait for a second tap
      await addSearchedProduct();
    } else {
      searchedProduct.value = { scannedId };
    }
  } catch (error) {
    searchedProduct.value = { scannedId };
    console.error("Failed to scan product: ", error);
  }
  isSearchingProduct.value = false;
  queryString.value = "";
}

/** Shared by the inline result row and the "view more results" modal. Resolves true when added. */
async function addProductToCount(product: any): Promise<boolean> {
  if (!product?.productId || !targetSessionId.value) return false;
  if (addedProductIds.value.has(product.productId)) return true;

  try {
    const resp = await useInventoryCountImport().updateSessionItem({
      inventoryCountImportId: targetSessionId.value,
      items: [{
        inventoryCountImportId: targetSessionId.value,
        productId: product.productId,
        uploadedByUserLogin: userProfile.getUserProfile?.username,
        uuid: uuidv4(),
        createdDate: DateTime.now().toMillis()
      }]
    });

    if (resp?.status === 200) {
      addedProductIds.value = new Set(addedProductIds.value).add(product.productId);
      // Mirrors how CountProgressReview/PendingReviewDetail update after updateSessionItem:
      // patch local state rather than re-fetching the aggregated list.
      if (!aggregatedSessionItems.value.some((item: any) => item.productId === product.productId)) {
        const newItem = {
          productId: product.productId,
          internalName: product.internalName,
          // The list row reads detailImageUrl; Solr docs carry the image as mainImageUrl
          detailImageUrl: product.mainImageUrl,
          product
        };
        aggregatedSessionItems.value.push(newItem);
        filteredSessionItems.value = [...aggregatedSessionItems.value].sort((a: any, b: any) =>
          (a.internalName || '').localeCompare(b.internalName || '')
        );
        totalItems.value = aggregatedSessionItems.value.length;
        loadedItems.value = aggregatedSessionItems.value.length;
      }
      commonUtil.showToast(translate("Item added to count"));
      return true;
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error adding item to count: ", error);
    commonUtil.showToast(translate("Failed to add item to count"));
    return false;
  }
}

async function addSearchedProduct() {
  if (isAddingProduct.value) return;
  isAddingProduct.value = true;
  await addProductToCount(searchedProduct.value);
  isAddingProduct.value = false;
}

function isSelected(product: any) {
  return selectedProducts.value.some((selected: any) => selected.productId === product.productId);
}

function toggleSelected(product: any) {
  const index = selectedProducts.value.findIndex((selected: any) => selected.productId === product.productId);
  if (index === -1) selectedProducts.value.push(product);
  else selectedProducts.value.splice(index, 1);
}

function toggleSelectAll(isChecked: any) {
  selectedProducts.value = isChecked ? [...filteredSessionItems.value] : [];
}

async function removeSelectedItems() {
  if (isRemovingItems.value) return;
  if (!selectedProducts.value.length) return;
  if (!targetSessionId.value) {
    commonUtil.showToast(translate("No session available for this count"));
    return;
  }

  isRemovingItems.value = true;
  await loader.present("Removing items...");
  try {
    const productIds = selectedProducts.value.map((product: any) => product.productId);

    // The delete body is the session item rows themselves, matching how
    // PendingReviewDetail.removeProductFromSession builds its payload.
    const itemResponses = await Promise.all(productIds.map((productId: string) =>
      useInventoryCountImport().getSessionItemsByImportId({
        inventoryCountImportId: targetSessionId.value,
        productId,
        facilityId: workEffort.value?.facilityId
      })
    ));

    const itemsToDelete = itemResponses.flatMap((resp: any) => resp?.data || []);

    if (!itemsToDelete.length) {
      commonUtil.showToast(translate("No items found to remove"));
    } else {
      const resp = await useInventoryCountImport().deleteSessionItem({
        inventoryCountImportId: targetSessionId.value,
        data: itemsToDelete
      });

      if (resp?.status === 200) {
        const removedIds = new Set(itemsToDelete.map((item: any) => item.productId));

        // Local patch rather than a re-fetch, consistent with the add flow and the review pages
        aggregatedSessionItems.value = aggregatedSessionItems.value.filter((item: any) => !removedIds.has(item.productId));
        filteredSessionItems.value = filteredSessionItems.value.filter((item: any) => !removedIds.has(item.productId));
        totalItems.value = aggregatedSessionItems.value.length;
        loadedItems.value = aggregatedSessionItems.value.length;

        const remainingAdded = new Set(addedProductIds.value);
        removedIds.forEach((id: any) => remainingAdded.delete(id));
        addedProductIds.value = remainingAdded;

        commonUtil.showToast(translate("Items removed from count"));
      } else {
        throw resp;
      }
    }
    selectedProducts.value = [];
  } catch (error) {
    console.error("Error removing items from count: ", error);
    commonUtil.showToast(translate("Failed to remove items from count"));
  }
  loader.dismiss();
  isRemovingItems.value = false;
}

async function openAddProductModal(query?: string) {
  const productModal = await modalController.create({
    component: AddProductModal,
    componentProps: {
      query: query ?? queryString.value,
      addedProductIds: addedProductIds.value,
      onAddProduct: addProductToCount
    }
  });
  await productModal.present();
}

async function enableScan() {
  mode.value = "scan";
  isScanningEnabled.value = true;
  await nextTick();
  scanInput.value?.$el?.setFocus?.();
}

async function enableSearch() {
  mode.value = "search";
  isScanningEnabled.value = false;
  await nextTick();
  searchInput.value?.$el?.setFocus?.();
}

function segmentChange(modeValue: string) {
  clearQuery();
  modeValue === "search" ? enableSearch() : enableScan();
}

function clearQuery() {
  queryString.value = "";
  searchedProduct.value = {};
  productSearchCount.value = 0;
  isSearchingProduct.value = false;
}

async function approveCycleCount() {
  if (isApproving.value) return;
  isApproving.value = true;
  await loader.present("Approving Cycle Count");
  try {
    const resp = await useInventoryCountRun().updateWorkEffort({
      workEffortId: workEffort.value.workEffortId,
      statusId: "CYCLE_CNT_APPROVED"
    });

    if (resp?.status === 200) {
      workEffort.value.statusId = "CYCLE_CNT_APPROVED";
      commonUtil.showToast(translate("Cycle Count Approved Successfully"));
      // The count no longer matches the Draft list's CYCLE_CNT_CREATED filter, so go back to the list
      router.replace("/draft");
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error approving cycle count:", error);
    commonUtil.showToast(translate("Failed to approve cycle count"));
  }
  loader.dismiss();
  isApproving.value = false;
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
        commonUtil.showToast(translate("Cycle Count Closed Successfully"));
        router.replace("/draft");
      } else {
        throw updateCountResp;
      }
    } else {
      throw resp;
    }
  } catch (error) {
    console.error("Error closing cycle count:", error);
    commonUtil.showToast(translate("Failed to close cycle count"));
  }
}

</script>

<style scoped>

.add-items .mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-items .mode ion-segment {
  grid-auto-columns: minmax(auto, 150px);
  justify-content: end;
  flex: 0 1 max-content;
}

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
