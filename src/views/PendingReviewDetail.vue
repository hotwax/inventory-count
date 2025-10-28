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
        <p class="empty-state">{{ translate("Fetching cycle counts...") }}</p>
      </template>
      <template v-else>
        <div class="header">
          <ion-card>
            <ion-item lines="none">
              <ion-label>
                <p class="overline">{{ workEffort?.workEfforId }}</p>
                <h1>{{ workEffort?.workEffortName }}</h1>
              </ion-label>
              <ion-button slot="end" fill="outline" color="medium">
                Edit
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
                <p class="overline">{{ getDateWithOrdinalSuffix(workEffort?.dueDate) }}</p>
                <ion-datetime-button datetime="datetime"></ion-datetime-button>
                <ion-modal :keep-contents-mounted="true">
                  <ion-datetime id="datetime"></ion-datetime>
                </ion-modal>
              </div>
            </ion-item>
          </ion-card>
          <ion-card>
            <ion-item>
              <ion-label>First item counted</ion-label>
              <ion-note slot="end">8:05 PM 3rd March 2024</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Last item counted</ion-label>
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
                  <p class="overline">Overall variance (Filtered)</p>
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
            <ion-item>
            <ion-select v-model="dcsnRsn" label="Status" placeholder="All" interface="popover">
              <ion-select-option value="all">All</ion-select-option>
              <ion-select-option value="open">Open</ion-select-option>
              <ion-select-option value="accepted">Accepted</ion-select-option>
              <ion-select-option value="rejected">Rejected</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-select label="Compliance" placeholder="All" interface="popover">
              <ion-select-option value="all">All</ion-select-option>
              <ion-select-option value="acceptable">Acceptable</ion-select-option>
              <ion-select-option value="rejectable">Rejectable</ion-select-option>
              <ion-select-option value="configure">Configure threshold</ion-select-option>
            </ion-select>
          </ion-item>
          </ion-list>
          <ion-item-divider color="light">
            <ion-checkbox slot="start"/>
            5 results out of 1,200
            <ion-select slot="end" label="Sort by" interface="popover">
                <ion-select-option value="parent">Parent product</ion-select-option>
                <ion-select-option value="alphabetic">Alphabetic</ion-select-option>
                <ion-select-option value="variance">Variance</ion-select-option>
            </ion-select>
          </ion-item-divider>
        </div>

        <div class="results ion-margin-top" v-if="cycleCounts?.length">
          <ion-accordion-group>
            <ion-accordion v-for="cycleCount in cycleCounts" :key="cycleCount.workEffortId" @click="fetchCountSessions(cycleCount.productId)">
              <div class="list-item count-item-rollup" slot="header"> 
                <div class="item-key">
                  <ion-checkbox @click.stop="stopAccordianEventProp"></ion-checkbox>
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <dxp-image></dxp-image>
                    </ion-thumbnail>
                    <ion-label>
                        {{ cycleCount.internalName }}
                        <!-- <p>Secondary Id</p> -->
                    </ion-label>
                  </ion-item>
                </div>
                <ion-label class="stat">
                  {{ cycleCount.quantity }}/{{ cycleCount.quantityOnHand }}
                  <p>counted/systemic</p>
                </ion-label>
                <ion-label class="stat">
                  {{ cycleCount.proposedVarianceQuantity }}
                  <p>variance</p>
                </ion-label>
                <div v-if="!cycleCount.decisionOutcomeEnumId" class="actions">
                  <ion-button fill="outline" color="success" size="small" @click.stop="stopAccordianEventProp" @click="submitSingleProductReview(cycleCount.productId, cycleCount.proposedVarianceQuantity, 'APPLIED', cycleCount.quantityOnHand, cycleCount.quantity, cycleCount)">
                    Accept
                  </ion-button>
                  <ion-button fill="outline" color="danger" size="small" @click.stop="stopAccordianEventProp" @click="submitSingleProductReview(cycleCount.productId, cycleCount.proposedVarianceQuantity, 'SKIPPED', cycleCount.quantityOnHand, cycleCount.quantity, cycleCount)">
                    Reject
                  </ion-button>
                </div>
                <ion-badge
                  v-else
                  :color="cycleCount.decisionOutcomeEnumId === 'APPLIED' ? 'primary' : 'danger'"
                  style="--color: white;"
                >
                  {{ cycleCount.decisionOutcomeEnumId }}
                </ion-badge>

              </div>
              <div v-if="loadingSessions">
              <ion-spinner name="crescent"></ion-spinner>
                <p>Loading items...</p>
              </div>
              <div v-else v-for="session in sessions" :key="session.inventoryCountImportId" class="list-item count-item" slot="content">
                <ion-item lines="none">
                  <ion-icon :icon="personCircleOutline" slot="start"></ion-icon>
                  <ion-label>
                    {{ session.uploadedByUserLogin }}
                  </ion-label>
                </ion-item>

                <ion-label>
                  {{ session.counted }}
                  <p>counted</p>
                </ion-label>
                <ion-label>
                  {{ session.createdDate }}
                  <p>started</p>
                </ion-label>
                <ion-label>
                  {{ session.itemCreatedDate }}
                  <p>last updated</p>
                </ion-label>
                <ion-button fill="clear" color="medium">
                  <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline"></ion-icon>
                </ion-button>
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </div>
        <div v-else class="empty-state">
          <p>No Results</p>
        </div>
        <ion-fab vertical="bottom" horizontal="end" slot="fixed" :edge="true">
          <!-- TODO: :disabled="isLoadingItems || !isAllItemsMarkedAsCompletedOrRejected" @click="completeCount" -->
          <ion-fab-button>
            <ion-icon :icon="receiptOutline" />
          </ion-fab-button>
        </ion-fab>
      </template>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="outline" color="success" size="small">
            Accept
          </ion-button>
          <!-- TODO: Add the action later :disabled="" @click="recountItem() -->
          <ion-button fill="clear" color="danger" size="small" class="ion-margin-horizontal">
            Reject
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { calendarClearOutline, businessOutline, personCircleOutline, receiptOutline, ellipsisVerticalOutline } from "ionicons/icons";
import { IonAccordion, IonAccordionGroup, IonBackButton, IonButtons, IonButton, IonCard, IonCheckbox, IonContent, IonDatetime,IonDatetimeButton, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonModal, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonThumbnail, modalController, onIonViewWillEnter, onIonViewWillLeave, onIonViewDidEnter, IonSpinner } from "@ionic/vue";
import { translate } from '@/i18n'
import { computed, defineProps, nextTick, reactive, ref, toRefs, watch } from "vue";
import store from "@/store"
import { useInventoryCountImport } from "@/composables/useInventoryCountImport";
import { showToast, getDateWithOrdinalSuffix, hasError, getFacilityName, getPartyName, getValidItems, timeFromNow, getDateTime, sortListByField } from "@/utils"
import { facilityContext, getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";


const props = defineProps({
  workEffortId: String
})

onIonViewDidEnter(async () => {
  isLoading.value = true;
  await fetchInventoryCycleCount();
  isLoading.value = false;
})

const productIdentificationStore = useProductIdentificationStore();

const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])

const filters = reactive({
  dcsnRsn: 'all',
  searchedProductString: ''
});

const  { dcsnRsn, searchedProductString } = toRefs(filters);

const isLoading = ref(false);

const loadingSessions = ref(false);

const workEffort = ref();

const cycleCounts = ref();

const pagination = reactive({
  pageSize: 25,
  pageIndex: 0
});

watch(() => filters, async () => {

  const count = await fetchCycleCount({
    workEffortId: props.workEffortId,
    pageSize: pagination.pageSize,
    pageIndex: pagination.pageIndex,
    internalName: searchedProductString.value || null,
    internalName_op: searchedProductString.value ? "contains" : null,
    decisionOutcomeEnumId: getDcsnFilter() === 'empty' ? null : getDcsnFilter(),
    decisionOutcomeEnumId_op: getDcsnFilter() === 'empty' ? 'empty' : null
  });

  if (count && count.status === 200 && count.data) {
    cycleCounts.value = count.data;
  } else {
    showToast(translate("Something Went Wrong!"));
    console.error("Error Fetching Cycle Count: ", count);
  }
},{ deep: true });

const sessions = ref();

const { getProductReviewDetail, fetchSessions, fetchWorkEffort, fetchCycleCount, submitProductReview } = useInventoryCountImport();

async function filterProductByInternalName() {

  const productReviewDetail = await getProductReviewDetail({
    workEffortId: props.workEffortId,
    internalName: searchedProductString.value
  });

  if (productReviewDetail && productReviewDetail.status === 200) {
    cycleCounts.value = productReviewDetail.data;
  } else {
    showToast(translate("Product Not Found in this Count"));
  }
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

async function fetchCountSessions(productId: any) {
  loadingSessions.value = true;
  sessions.value = [];
  const resp = await fetchSessions({
    workEffortId: props.workEffortId,
    productId: productId
  });

  if (resp && resp.status && resp.data && resp.data.length) {
    sessions.value = resp.data;
  }
  loadingSessions.value = false;
}

async function submitSingleProductReview(productId: any, proposedVarianceQuantity: any, decisionOutcomeEnumId: string, systemQuantity: any, countedQuantity: any, cycleCount: any) {
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

  const resp = await submitProductReview({ "inventoryCountProductsList": inventoryCountProductsList});

  if (resp?.status === 200) {
    cycleCount.decisionOutcomeEnumId = decisionOutcomeEnumId;
  } else {
    showToast(translate("Something Went Wrong"));
  }
}

async function fetchInventoryCycleCount (pSize?: any, pIndex?: any) {

  const workEffortResp = await fetchWorkEffort({
    workEffortId: props.workEffortId
  }
  );

  if (workEffortResp && workEffortResp.status === 200 && workEffortResp.data) {
    workEffort.value = workEffortResp.data;
  }

  const resp = await fetchCycleCount({
    workEffortId: props.workEffortId,
    pageSize: pSize || 25,
    pageIndex: pIndex || 0,
    internalName: searchedProductString.value || null,
    decisionOutcomeEnumId: getDcsnFilter(),
    decisionOutcomeEnumId_op: getDcsnFilter() === 'empty' ? 'empty' : null
  });

  if (resp && resp.status === 200 && resp.data && resp.data.length) {
    cycleCounts.value = resp.data;
  } else {
    cycleCounts.value = [
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10001",
        "internalName": "Product 10001",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 141,
        "unitCost": 19.3,
        "quantity": 140,
        "price": 31.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -1,
        "systemQuantity": 141,
        "countedQuantity": 140,
        "parentProductId": "11001",
        "parentProductInternalName": "Parent Product 11001",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -19.3,
        "extendedPrice": -31.25
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10002",
        "internalName": "Product 10002",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 142,
        "unitCost": 20.1,
        "quantity": 142,
        "price": 32.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 0,
        "systemQuantity": 142,
        "countedQuantity": 142,
        "parentProductId": "11002",
        "parentProductInternalName": "Parent Product 11002",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10003",
        "internalName": "Product 10003",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 143,
        "unitCost": 20.9,
        "quantity": 144,
        "price": 33.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 1,
        "systemQuantity": 143,
        "countedQuantity": 144,
        "parentProductId": "11003",
        "parentProductInternalName": "Parent Product 11003",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 20.9,
        "extendedPrice": 33.75
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10004",
        "internalName": "Product 10004",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 144,
        "unitCost": 21.7,
        "quantity": 146,
        "price": 35.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 2,
        "systemQuantity": 144,
        "countedQuantity": 146,
        "parentProductId": "11004",
        "parentProductInternalName": "Parent Product 11004",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 43.4,
        "extendedPrice": 70.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10005",
        "internalName": "Product 10005",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 145,
        "unitCost": 22.5,
        "quantity": 143,
        "price": 36.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -2,
        "systemQuantity": 145,
        "countedQuantity": 143,
        "parentProductId": "11005",
        "parentProductInternalName": "Parent Product 11005",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -45.0,
        "extendedPrice": -72.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10006",
        "internalName": "Product 10006",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 146,
        "unitCost": 18.5,
        "quantity": 145,
        "price": 37.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -1,
        "systemQuantity": 146,
        "countedQuantity": 145,
        "parentProductId": "11006",
        "parentProductInternalName": "Parent Product 11006",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -18.5,
        "extendedPrice": -37.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10007",
        "internalName": "Product 10007",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 147,
        "unitCost": 19.3,
        "quantity": 147,
        "price": 38.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 0,
        "systemQuantity": 147,
        "countedQuantity": 147,
        "parentProductId": "11007",
        "parentProductInternalName": "Parent Product 11007",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10008",
        "internalName": "Product 10008",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 148,
        "unitCost": 20.1,
        "quantity": 149,
        "price": 30.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 1,
        "systemQuantity": 148,
        "countedQuantity": 149,
        "parentProductId": "11008",
        "parentProductInternalName": "Parent Product 11008",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 20.1,
        "extendedPrice": 30.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10009",
        "internalName": "Product 10009",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 149,
        "unitCost": 20.9,
        "quantity": 151,
        "price": 31.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 2,
        "systemQuantity": 149,
        "countedQuantity": 151,
        "parentProductId": "11009",
        "parentProductInternalName": "Parent Product 11009",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 41.8,
        "extendedPrice": 62.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10010",
        "internalName": "Product 10010",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 150,
        "unitCost": 21.7,
        "quantity": 148,
        "price": 32.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -2,
        "systemQuantity": 150,
        "countedQuantity": 148,
        "parentProductId": "11010",
        "parentProductInternalName": "Parent Product 11010",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -43.4,
        "extendedPrice": -65.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10011",
        "internalName": "Product 10011",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 151,
        "unitCost": 22.5,
        "quantity": 150,
        "price": 33.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -1,
        "systemQuantity": 151,
        "countedQuantity": 150,
        "parentProductId": "11011",
        "parentProductInternalName": "Parent Product 11011",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -22.5,
        "extendedPrice": -33.75
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10012",
        "internalName": "Product 10012",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 152,
        "unitCost": 18.5,
        "quantity": 152,
        "price": 35.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 0,
        "systemQuantity": 152,
        "countedQuantity": 152,
        "parentProductId": "11012",
        "parentProductInternalName": "Parent Product 11012",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10013",
        "internalName": "Product 10013",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 153,
        "unitCost": 19.3,
        "quantity": 154,
        "price": 36.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 1,
        "systemQuantity": 153,
        "countedQuantity": 154,
        "parentProductId": "11013",
        "parentProductInternalName": "Parent Product 11013",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 19.3,
        "extendedPrice": 36.25
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10014",
        "internalName": "Product 10014",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 154,
        "unitCost": 20.1,
        "quantity": 156,
        "price": 37.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 2,
        "systemQuantity": 154,
        "countedQuantity": 156,
        "parentProductId": "11014",
        "parentProductInternalName": "Parent Product 11014",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 40.2,
        "extendedPrice": 75.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10015",
        "internalName": "Product 10015",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 155,
        "unitCost": 20.9,
        "quantity": 153,
        "price": 38.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -2,
        "systemQuantity": 155,
        "countedQuantity": 153,
        "parentProductId": "11015",
        "parentProductInternalName": "Parent Product 11015",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -41.8,
        "extendedPrice": -77.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10016",
        "internalName": "Product 10016",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 156,
        "unitCost": 21.7,
        "quantity": 155,
        "price": 30.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -1,
        "systemQuantity": 156,
        "countedQuantity": 155,
        "parentProductId": "11016",
        "parentProductInternalName": "Parent Product 11016",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -21.7,
        "extendedPrice": -30.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10017",
        "internalName": "Product 10017",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 157,
        "unitCost": 22.5,
        "quantity": 157,
        "price": 31.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 0,
        "systemQuantity": 157,
        "countedQuantity": 157,
        "parentProductId": "11017",
        "parentProductInternalName": "Parent Product 11017",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10018",
        "internalName": "Product 10018",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 158,
        "unitCost": 18.5,
        "quantity": 159,
        "price": 32.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 1,
        "systemQuantity": 158,
        "countedQuantity": 159,
        "parentProductId": "11018",
        "parentProductInternalName": "Parent Product 11018",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 18.5,
        "extendedPrice": 32.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10019",
        "internalName": "Product 10019",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 159,
        "unitCost": 19.3,
        "quantity": 161,
        "price": 33.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 2,
        "systemQuantity": 159,
        "countedQuantity": 161,
        "parentProductId": "11019",
        "parentProductInternalName": "Parent Product 11019",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 38.6,
        "extendedPrice": 67.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10020",
        "internalName": "Product 10020",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 140,
        "unitCost": 20.1,
        "quantity": 138,
        "price": 35.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -2,
        "systemQuantity": 140,
        "countedQuantity": 138,
        "parentProductId": "11020",
        "parentProductInternalName": "Parent Product 11020",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -40.2,
        "extendedPrice": -70.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10021",
        "internalName": "Product 10021",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 141,
        "unitCost": 20.9,
        "quantity": 140,
        "price": 36.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -1,
        "systemQuantity": 141,
        "countedQuantity": 140,
        "parentProductId": "11021",
        "parentProductInternalName": "Parent Product 11021",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -20.9,
        "extendedPrice": -36.25
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10022",
        "internalName": "Product 10022",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 142,
        "unitCost": 21.7,
        "quantity": 142,
        "price": 37.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 0,
        "systemQuantity": 142,
        "countedQuantity": 142,
        "parentProductId": "11022",
        "parentProductInternalName": "Parent Product 11022",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10023",
        "internalName": "Product 10023",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 143,
        "unitCost": 22.5,
        "quantity": 144,
        "price": 38.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 1,
        "systemQuantity": 143,
        "countedQuantity": 144,
        "parentProductId": "11023",
        "parentProductInternalName": "Parent Product 11023",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 22.5,
        "extendedPrice": 38.75
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10024",
        "internalName": "Product 10024",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 144,
        "unitCost": 18.5,
        "quantity": 146,
        "price": 30.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 2,
        "systemQuantity": 144,
        "countedQuantity": 146,
        "parentProductId": "11024",
        "parentProductInternalName": "Parent Product 11024",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 37.0,
        "extendedPrice": 60.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10025",
        "internalName": "Product 10025",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 145,
        "unitCost": 19.3,
        "quantity": 143,
        "price": 31.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -2,
        "systemQuantity": 145,
        "countedQuantity": 143,
        "parentProductId": "11025",
        "parentProductInternalName": "Parent Product 11025",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -38.6,
        "extendedPrice": -62.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10026",
        "internalName": "Product 10026",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 146,
        "unitCost": 20.1,
        "quantity": 145,
        "price": 32.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -1,
        "systemQuantity": 146,
        "countedQuantity": 145,
        "parentProductId": "11026",
        "parentProductInternalName": "Parent Product 11026",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -20.1,
        "extendedPrice": -32.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10027",
        "internalName": "Product 10027",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 147,
        "unitCost": 20.9,
        "quantity": 147,
        "price": 33.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 0,
        "systemQuantity": 147,
        "countedQuantity": 147,
        "parentProductId": "11027",
        "parentProductInternalName": "Parent Product 11027",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10028",
        "internalName": "Product 10028",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 148,
        "unitCost": 21.7,
        "quantity": 149,
        "price": 35.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 1,
        "systemQuantity": 148,
        "countedQuantity": 149,
        "parentProductId": "11028",
        "parentProductInternalName": "Parent Product 11028",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 21.7,
        "extendedPrice": 35.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10029",
        "internalName": "Product 10029",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 149,
        "unitCost": 22.5,
        "quantity": 151,
        "price": 36.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 2,
        "systemQuantity": 149,
        "countedQuantity": 151,
        "parentProductId": "11029",
        "parentProductInternalName": "Parent Product 11029",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 45.0,
        "extendedPrice": 72.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10030",
        "internalName": "Product 10030",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 150,
        "unitCost": 18.5,
        "quantity": 148,
        "price": 37.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -2,
        "systemQuantity": 150,
        "countedQuantity": 148,
        "parentProductId": "11030",
        "parentProductInternalName": "Parent Product 11030",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -37.0,
        "extendedPrice": -75.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10031",
        "internalName": "Product 10031",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 151,
        "unitCost": 19.3,
        "quantity": 150,
        "price": 38.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -1,
        "systemQuantity": 151,
        "countedQuantity": 150,
        "parentProductId": "11031",
        "parentProductInternalName": "Parent Product 11031",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -19.3,
        "extendedPrice": -38.75
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10032",
        "internalName": "Product 10032",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 152,
        "unitCost": 20.1,
        "quantity": 152,
        "price": 30.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 0,
        "systemQuantity": 152,
        "countedQuantity": 152,
        "parentProductId": "11032",
        "parentProductInternalName": "Parent Product 11032",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10033",
        "internalName": "Product 10033",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 153,
        "unitCost": 20.9,
        "quantity": 154,
        "price": 31.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 1,
        "systemQuantity": 153,
        "countedQuantity": 154,
        "parentProductId": "11033",
        "parentProductInternalName": "Parent Product 11033",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 20.9,
        "extendedPrice": 31.25
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10034",
        "internalName": "Product 10034",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 154,
        "unitCost": 21.7,
        "quantity": 156,
        "price": 32.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 2,
        "systemQuantity": 154,
        "countedQuantity": 156,
        "parentProductId": "11034",
        "parentProductInternalName": "Parent Product 11034",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 43.4,
        "extendedPrice": 65.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10035",
        "internalName": "Product 10035",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 155,
        "unitCost": 22.5,
        "quantity": 153,
        "price": 33.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -2,
        "systemQuantity": 155,
        "countedQuantity": 153,
        "parentProductId": "11035",
        "parentProductInternalName": "Parent Product 11035",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -45.0,
        "extendedPrice": -67.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10036",
        "internalName": "Product 10036",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 156,
        "unitCost": 18.5,
        "quantity": 155,
        "price": 35.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -1,
        "systemQuantity": 156,
        "countedQuantity": 155,
        "parentProductId": "11036",
        "parentProductInternalName": "Parent Product 11036",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -18.5,
        "extendedPrice": -35.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10037",
        "internalName": "Product 10037",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 157,
        "unitCost": 19.3,
        "quantity": 157,
        "price": 36.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 0,
        "systemQuantity": 157,
        "countedQuantity": 157,
        "parentProductId": "11037",
        "parentProductInternalName": "Parent Product 11037",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10038",
        "internalName": "Product 10038",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 158,
        "unitCost": 20.1,
        "quantity": 159,
        "price": 37.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 1,
        "systemQuantity": 158,
        "countedQuantity": 159,
        "parentProductId": "11038",
        "parentProductInternalName": "Parent Product 11038",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 20.1,
        "extendedPrice": 37.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10039",
        "internalName": "Product 10039",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 159,
        "unitCost": 20.9,
        "quantity": 161,
        "price": 38.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 2,
        "systemQuantity": 159,
        "countedQuantity": 161,
        "parentProductId": "11039",
        "parentProductInternalName": "Parent Product 11039",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 41.8,
        "extendedPrice": 77.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10040",
        "internalName": "Product 10040",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 140,
        "unitCost": 21.7,
        "quantity": 138,
        "price": 30.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -2,
        "systemQuantity": 140,
        "countedQuantity": 138,
        "parentProductId": "11040",
        "parentProductInternalName": "Parent Product 11040",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -43.4,
        "extendedPrice": -60.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10041",
        "internalName": "Product 10041",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 141,
        "unitCost": 22.5,
        "quantity": 140,
        "price": 31.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -1,
        "systemQuantity": 141,
        "countedQuantity": 140,
        "parentProductId": "11041",
        "parentProductInternalName": "Parent Product 11041",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -22.5,
        "extendedPrice": -31.25
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10042",
        "internalName": "Product 10042",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 142,
        "unitCost": 18.5,
        "quantity": 142,
        "price": 32.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 0,
        "systemQuantity": 142,
        "countedQuantity": 142,
        "parentProductId": "11042",
        "parentProductInternalName": "Parent Product 11042",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10043",
        "internalName": "Product 10043",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 143,
        "unitCost": 19.3,
        "quantity": 144,
        "price": 33.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 1,
        "systemQuantity": 143,
        "countedQuantity": 144,
        "parentProductId": "11043",
        "parentProductInternalName": "Parent Product 11043",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 19.3,
        "extendedPrice": 33.75
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10044",
        "internalName": "Product 10044",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 144,
        "unitCost": 20.1,
        "quantity": 146,
        "price": 35.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 2,
        "systemQuantity": 144,
        "countedQuantity": 146,
        "parentProductId": "11044",
        "parentProductInternalName": "Parent Product 11044",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 40.2,
        "extendedPrice": 70.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10045",
        "internalName": "Product 10045",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 145,
        "unitCost": 20.9,
        "quantity": 143,
        "price": 36.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": -2,
        "systemQuantity": 145,
        "countedQuantity": 143,
        "parentProductId": "11045",
        "parentProductInternalName": "Parent Product 11045",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -41.8,
        "extendedPrice": -72.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10046",
        "internalName": "Product 10046",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 146,
        "unitCost": 21.7,
        "quantity": 145,
        "price": 37.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -1,
        "systemQuantity": 146,
        "countedQuantity": 145,
        "parentProductId": "11046",
        "parentProductInternalName": "Parent Product 11046",
        "proposedVarianceQuantity": -1,
        "extendedUnitCost": -21.7,
        "extendedPrice": -37.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10047",
        "internalName": "Product 10047",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 147,
        "unitCost": 22.5,
        "quantity": 147,
        "price": 38.75,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 0,
        "systemQuantity": 147,
        "countedQuantity": 147,
        "parentProductId": "11047",
        "parentProductInternalName": "Parent Product 11047",
        "proposedVarianceQuantity": 0,
        "extendedUnitCost": 0.0,
        "extendedPrice": 0.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10048",
        "internalName": "Product 10048",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 148,
        "unitCost": 18.5,
        "quantity": 149,
        "price": 30.0,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": 1,
        "systemQuantity": 148,
        "countedQuantity": 149,
        "parentProductId": "11048",
        "parentProductInternalName": "Parent Product 11048",
        "proposedVarianceQuantity": 1,
        "extendedUnitCost": 18.5,
        "extendedPrice": 30.0
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10049",
        "internalName": "Product 10049",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 149,
        "unitCost": 19.3,
        "quantity": 151,
        "price": 31.25,
        "decisionOutcomeEnumId": "APPLIED",
        "varianceQuantity": 2,
        "systemQuantity": 149,
        "countedQuantity": 151,
        "parentProductId": "11049",
        "parentProductInternalName": "Parent Product 11049",
        "proposedVarianceQuantity": 2,
        "extendedUnitCost": 38.6,
        "extendedPrice": 62.5
      },
      {
        "facilityId": "BROOKLYN",
        "workEffortId": "M10001",
        "productId": "10050",
        "internalName": "Product 10050",
        "primaryProductCategoryId": "BROWSE_ROOT",
        "quantityOnHand": 150,
        "unitCost": 20.1,
        "quantity": 148,
        "price": 32.5,
        "decisionOutcomeEnumId": "SKIPPED",
        "varianceQuantity": -2,
        "systemQuantity": 150,
        "countedQuantity": 148,
        "parentProductId": "11050",
        "parentProductInternalName": "Parent Product 11050",
        "proposedVarianceQuantity": -2,
        "extendedUnitCost": -40.2,
        "extendedPrice": -65.0
      }
    ]
  }
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