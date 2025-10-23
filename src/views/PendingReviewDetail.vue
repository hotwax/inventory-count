<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pending-review" />
        <ion-title>{{ translate("Review count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header">
        <ion-card>
          <ion-item lines="none">
            <ion-label>
              <p class="overline">workEfforId</p>
              <h1>workEffortName</h1>
            </ion-label>
            <ion-button slot="end" fill="outline" color="medium">
              Edit
            </ion-button>
          </ion-item>
          <ion-item>
            <ion-icon :icon="businessOutline" slot="start"></ion-icon>
            <ion-label>
              facilityName
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-icon :icon="calendarClearOutline" slot="start"></ion-icon>
            <ion-label>Due date</ion-label>
            <ion-datetime-button slot="end"></ion-datetime-button>
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
        <div class="filters">
          <ion-searchbar placeholder="Search"></ion-searchbar>

          <ion-item>
            <ion-select label="Status" placeholder="Select one" interface="popover">
              <ion-select-option value="1">Option 1</ion-select-option>
              <ion-select-option value="2">Option 2</ion-select-option>
              <ion-select-option value="3">Option 3</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-select label="Compliance" placeholder="Select another" interface="popover">
              <ion-select-option value="a">Option A</ion-select-option>
              <ion-select-option value="b">Option B</ion-select-option>
              <ion-select-option value="c">Option C</ion-select-option>
            </ion-select>
          </ion-item>
        </div>
        <ion-item-divider color="light">
          <ion-checkbox slot="start"/>
          5 results
          <ion-select slot="end" label="Sort by"></ion-select>
        </ion-item-divider>
      </div>

      <div class="results ion-margin-top">
        <ion-accordion-group>
          <ion-accordion value="first">
            <div class="list-item" slot="header">
              <div class="item-key">
                <ion-checkbox></ion-checkbox>
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <dxp-image></dxp-image>
                  </ion-thumbnail>
                  <ion-label>
                      Primary Id
                      <p>Secondary Id</p>
                  </ion-label>                
                </ion-item>
              </div>
              <ion-label class="stat">
                6/3
                <p>counted/systemic</p>
              </ion-label>
              <ion-label class="stat">
                +3
                <p>variance</p>
              </ion-label>
              <div class="actions">
                <ion-button fill="outline" color="success">
                  Accept
                </ion-button>
                <ion-button fill="outline" color="danger">
                  Reject
                </ion-button>
              </div>
            </div>
            <div v-for="n in 4" :key="n" class="list-item count-item" slot="content">
              item content
            </div>
          </ion-accordion>
        </ion-accordion-group>
      </div>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="currentCycleCount.inventoryCountImportId">
      <ion-fab-button :disabled="isLoadingItems || !isAllItemsMarkedAsCompletedOrRejected" @click="completeCount">
        <ion-icon :icon="receiptOutline" />
      </ion-fab-button>
    </ion-fab>
    
    <ion-footer v-if="currentCycleCount.inventoryCountImportId">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button :fill="segmentSelected ==='accept' ? 'outline' : 'clear'" color="success" size="small" :disabled="isAnyItemSelected || !isSelectedItemsHasQuantity()" @click="acceptItem()">
            <ion-icon slot="icon-only" :icon="thumbsUpOutline"/>
          </ion-button>
          <ion-button fill="clear" color="warning" size="small" class="ion-margin-horizontal" :disabled="isAnyItemSelected" @click="recountItem()">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
          <ion-button :fill="segmentSelected ==='reject' ? 'outline' : 'clear'" color="danger" size="small" :disabled="isAnyItemSelected" @click="updateItemStatus('INV_COUNT_REJECTED')">
            <ion-icon slot="icon-only" :icon="thumbsDownOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { calendarClearOutline, businessOutline, thermometerOutline, thumbsUpOutline, refreshOutline, thumbsDownOutline, checkboxOutline, addOutline, receiptOutline, playBackOutline, squareOutline } from "ionicons/icons";
import { IonAccordion, IonAccordionGroup, IonBackButton, IonButtons, IonButton, IonCard, IonCheckbox, IonContent, IonDatetimeButton, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonNote, IonPage, IonSearchbar, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonThumbnail, modalController, onIonViewWillEnter, onIonViewWillLeave } from "@ionic/vue";
import { translate } from '@/i18n'
import { computed, defineProps, nextTick, ref } from "vue";
import store from "@/store"
import { CountService } from "@/services/CountService"
import emitter from '@/event-bus';
import { showToast, getDateWithOrdinalSuffix, hasError, getFacilityName, getPartyName, getValidItems, timeFromNow, getDateTime, sortListByField } from "@/utils"
import logger from "@/logger";
import AddProductModal from "@/components/AddProductModal.vue";
import router from "@/router";
import Image from "@/components/Image.vue"
import { DateTime } from "luxon";
import { getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import ProgressBar from '@/components/ProgressBar.vue';

const props = defineProps({
  inventoryCountImportId: String
})

const productIdentificationStore = useProductIdentificationStore();

const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])

const filteredItems = computed(() => {
  let items = currentCycleCount.value.items

  if(segmentSelected.value === "accept") {
    items = currentCycleCount.value.items.filter((item: any) => isItemReadyToAccept(item) && item.itemStatusId === "INV_COUNT_CREATED")
  } else if(segmentSelected.value === "reject") {
    items = currentCycleCount.value.items.filter((item: any) => isItemReadyToReject(item) && item.itemStatusId === "INV_COUNT_CREATED")
  }

  return items
})

const isAnyItemSelected = computed(() => {
  return !currentCycleCount.value.items?.some((item: any) => item.isChecked)
})

const isAllItemsMarkedAsCompletedOrRejected = computed(() => {
  return currentCycleCount.value.items?.every((item: any) => item.itemStatusId === "INV_COUNT_COMPLETED" || item.itemStatusId === "INV_COUNT_REJECTED")
})

const dateTimeModalOpen = ref(false)
const currentCycleCount = ref({}) as any
const countNameRef = ref()
let isCountNameUpdating = ref(false)
let countName = ref("")
let segmentSelected = ref("all")
let varianceThreshold = ref(40)
let isLoadingItems = ref(true)
let cycleCountItemsProgress = ref(0)

onIonViewWillEnter(async () => {
  emitter.on("addProductToCount", addProductToCount);

  currentCycleCount.value = {}
  try {
    const resp = await CountService.fetchCycleCount(props.inventoryCountImportId as string)

    if(!hasError(resp) && resp.data?.inventoryCountImportId && resp.data?.statusId === "INV_COUNT_REVIEW") {
      currentCycleCount.value = {
        countName: resp.data.countImportName,
        countId: resp.data.inventoryCountImportId,
        items: [],
        ...resp.data
      }

      countName.value = resp.data.countImportName
      await fetchCountItems();
    }
  } catch(err) {
    logger.error()
  }

  isLoadingItems.value = false;
})

onIonViewWillLeave(() => {
  emitter.off("addProductToCount", addProductToCount)
  cycleCountItemsProgress.value = 0
})

async function fetchCountItems() {
  store.dispatch("count/fetchCycleCountStats", [props.inventoryCountImportId])
  let items = [] as any, resp, pageIndex = 0;

  try {
    do {
      resp = await CountService.fetchCycleCountItems({ inventoryCountImportId : props?.inventoryCountImportId, pageSize: 100, pageIndex })
      if(!hasError(resp) && resp.data?.itemList?.length) {
        items = items.concat(resp.data.itemList)
        cycleCountItemsProgress.value = items.length
        pageIndex++;
      } else {
        throw resp.data;
      }
    } while(resp.data.itemList?.length >= 100)
  } catch(err) {
    logger.error(err)
  }

  items = sortListByField(getValidItems(items), "parentProductName");

  currentCycleCount.value["items"] = items.map((item: any) => ({ ...item, isChecked: false }))
  store.dispatch("product/fetchProducts", { productIds: [...new Set(items.map((item: any) => item.productId))] })
}

async function addProductToCount(productId: any) {
  if(!productId) {
    showToast(translate("Failed to add product to count"))
    return;
  }

  try {
    const resp = await CountService.addProductToCount({
      inventoryCountImportId: currentCycleCount.value.countId,
      itemList: [{
        // Passing both productId and idValue for the backend compatibility
        // idValue will be removed in the future.
        idValue: productId,
        productId,
        statusId: "INV_COUNT_CREATED"
      }]
    })

    if(!hasError(resp)) {
      showToast(translate("Added product to count"))
      // Fetching all the items again as in the current add api we do not get all the information required to be displayed on UI
      await fetchCountItems();
    }
  } catch(err) {
    logger.error("Failed to add product to count", err)
    showToast(translate("Failed to add product to count"))
  }
}

function getVarianceInformation() {
  let totalItemsQuantityCount = 0, totalItemsExpectedCount = 0

  currentCycleCount.value.items?.map((item: any) => {
    totalItemsQuantityCount += parseInt(item.quantity || 0)
    totalItemsExpectedCount += parseInt(item.qoh || 0)
  })

  // TODO: internationalize text
  return `${totalItemsQuantityCount} counted | ${totalItemsExpectedCount} expected`
}

function getProgress() {
  const currentStats = cycleCountStats.value(currentCycleCount.value.countId) || {}
  const progress = ((currentStats.itemCounted || 0) / (currentStats.totalItems || 0)) * 100
  return `${isNaN(progress) ? 0 : progress.toFixed(2)}% progress`
}

async function editCountName() {
  isCountNameUpdating.value = !isCountNameUpdating.value;
  // Waiting for DOM updations before focus inside the text-area, as it is conditionally rendered in the DOM
  await nextTick()
  countNameRef.value.$el.setFocus();
}

async function updateCountName() {
  if(!countName.value?.trim()) {
    showToast(translate("Enter a valid cycle count name"))
    return;
  }

  if(countName.value.trim() !== currentCycleCount.value.countName?.trim()) {
    await CountService.updateCycleCount({ inventoryCountImportId: currentCycleCount.value.countId, countImportName: countName.value.trim() })
    .then(() => {
      currentCycleCount.value.countName = countName.value.trim()
    }).catch(() => {
      countName.value = currentCycleCount.value.countName.trim()
    })
  }

  isCountNameUpdating.value = false
}

function isItemReadyToAccept(item: any) {
  // If the items qoh/quantity is not available then we will consider that the variance percentage is 100%, as we are unable to identify the % without qoh/quantity. Thus if qoh/quantity is not present for an item
  // then we will suggest it for acceptance only when variance threshold is set to 100%
  return item.quantity > 0 ? (item.qoh > 0 ? Math.round(Math.abs(((item.quantity - item.qoh) / item.qoh) * 100)) : 100) <= varianceThreshold.value : item.quantity === undefined ? false : 100 <= varianceThreshold.value
}

function isItemReadyToReject(item: any) {
  return item.quantity > 0 ? (item.qoh > 0 ? Math.round(Math.abs(((item.quantity - item.qoh) / item.qoh) * 100)) : 100) > varianceThreshold.value : item.quantity === undefined ? false : 100 > varianceThreshold.value
}

function isItemCompletedOrRejected(item: any) {
  return item.itemStatusId === "INV_COUNT_REJECTED" || item.itemStatusId === "INV_COUNT_COMPLETED"
}

function selectItem(checked: boolean, item: any) {
  return item.isChecked = checked
}

function selectAll() {
  // When all the items are already selected then unselect the items again
  // Added check for every item selection as we need to check the items of the current segment, and filteredItems returns items based on current selected segment
  if(areAllItemsSelected()) {
    currentCycleCount.value.items = currentCycleCount.value.items.map((item: any) => ({ ...item, isChecked: false }))
    return;
  }

  // When an item is having created status, in that case only we want the item to be selected, for the case of item rejected and completed we do not want all the items to be marked as checked
  currentCycleCount.value.items = currentCycleCount.value.items.map((item: any) => ({ ...item, isChecked: item.itemStatusId === "INV_COUNT_CREATED" && ((segmentSelected.value === "accept" && isItemReadyToAccept(item)) || (segmentSelected.value === "reject" && isItemReadyToReject(item)) || segmentSelected.value === "all") ? true : false }))
}

function areAllItemsSelected(): boolean {
  // Only checking for those items which are in created status
  return filteredItems.value.length > 0 && filteredItems.value.filter((item: any) => item.itemStatusId === "INV_COUNT_CREATED").every((item: any) => item.isChecked)
}

function segmentChanged() {
  // When changing the segment make the isChecked property again to false.
  currentCycleCount.value.items = currentCycleCount.value.items.map((item: any) => ({ ...item, isChecked: false }))
}

async function addProduct() {
  const addProductModal = await modalController.create({
    component: AddProductModal,
    componentProps: { cycleCount: currentCycleCount.value },
    showBackdrop: false,
  });

  await addProductModal.present();
}

async function updateItemStatus(statusId: string, item?: any) {
  let itemList: Array<any> = []
  if(item) {
    itemList = [{
      importItemSeqId: item.importItemSeqId,
      statusId
    }]
  } else {
    currentCycleCount.value.items.map((item: any) => {
      if(item.isChecked) {
        itemList.push({
          importItemSeqId: item.importItemSeqId,
          statusId
        })
      }
    })
  }

  if(!itemList.length) {
    return;
  }

  try {
    const resp = await CountService.updateProductsInCount({
      inventoryCountImportId: currentCycleCount.value.inventoryCountImportId,
      itemList
    })

    const itemsCount = itemList.length
    if (!hasError(resp)) {
      showToast(translate(`${itemsCount} ${itemsCount > 1 ? 'count items were' : 'count item was'} ${statusId === 'INV_COUNT_REJECTED' ? 'rejected' : 'updated'}.`))
      await fetchCountItems();
    } else {
      throw resp.data
    }

  } catch(err) {
    showToast(translate(`Failed to update ${itemList.length > 1 ? 'count items' : 'count item'}`))
    logger.error("Failed to update items", err)
  }
}

async function recountItem(item?: any) {
  let importItemSeqIds: Array<string> = []
  if(item) {
    importItemSeqIds = [item.importItemSeqId]
  } else {
    currentCycleCount.value.items.map((item: any) => {
      if(item.isChecked) {
        importItemSeqIds.push(item.importItemSeqId)
      }
    })
  }

  if(!importItemSeqIds.length) {
    return;
  }

  try {
    const resp = await CountService.recountItems({
      inventoryCountImportId: currentCycleCount.value.inventoryCountImportId,
      importItemSeqIds
    })

    const itemsCount = importItemSeqIds.length
    if (!hasError(resp)) {
      showToast(translate(`${itemsCount} ${itemsCount > 1 ? 'count items were' : 'count item was'} recounted.`))
      await fetchCountItems();
    } else {
      throw resp.data
    }

  } catch(err) {
    showToast(translate(`Failed to recount ${importItemSeqIds.length > 1 ? 'count items' : 'count item'}`))
    logger.error("Failed to recount items", err)
  }
}

async function completeCount() {
  emitter.emit("presentLoader");
  try {
    const resp = await CountService.fetchCycleCountItemsCount({
      inventoryCountImportId: props?.inventoryCountImportId,
      statusId: "INV_COUNT_CREATED",
    })

    if(!hasError(resp) && resp.data?.count > 0) {
      showToast(translate("Unable to complete the count as some items are still pending review. Please review the updated item list and try again"))
      await fetchCountItems();
      emitter.emit("dismissLoader")
      return;
    }

    try {
      await CountService.updateCycleCount({
        inventoryCountImportId: currentCycleCount.value.countId,
        statusId: "INV_COUNT_COMPLETED"
      })
      emitter.emit("dismissLoader")
      router.push("/closed")
      showToast(translate("Count has been marked as completed"))
    } catch(err) {
      showToast(translate("Failed to complete cycle count"))
    }
  } catch(err) {
    showToast(translate("Failed to complete cycle count"))
    logger.error(err)
  }
  emitter.emit("dismissLoader")
}

async function reassignCount() {
  try {
    await CountService.updateCycleCount({
      inventoryCountImportId: currentCycleCount.value.countId,
      statusId: "INV_COUNT_ASSIGNED"
    })
    router.push("/assigned")
    showToast(translate("Count has been re-assigned"))
  } catch(err) {
    showToast(translate("Failed to re-assign cycle count"))
  }
}

async function acceptItem(item?: any) {
  const payloads = []
  if(item) {
    payloads.push({
      inventoryCountImportId: currentCycleCount.value.inventoryCountImportId,
      importItemSeqId: item.importItemSeqId,
      quantity: item.quantity,
      reason: "CYCLE_COUNT",
      systemQOH: item.qoh,
      varianceQty: (item.quantity ? +(item.quantity) : 0) - (item.qoh ? +(item.qoh) : 0)
    })
  } else {
    currentCycleCount.value.items.map((item: any) => {
      if(item.isChecked) {
        payloads.push({
          inventoryCountImportId: currentCycleCount.value.inventoryCountImportId,
          importItemSeqId: item.importItemSeqId,
          quantity: item.quantity,
          reason: "CYCLE_COUNT",
          systemQOH: item.qoh,
          varianceQty: (item.quantity ? +(item.quantity) : 0) - (item.qoh ? +(item.qoh) : 0)
        })
      }
    })
  }

  const resp = await Promise.allSettled(payloads.map((payload: any) => CountService.acceptItem(payload)))

  const isAnyRespHasError = resp.some((response: any) => response.status === "rejected")

  const itemsCount = payloads.length
  if(isAnyRespHasError) {
    showToast(translate(`Failed to accept ${itemsCount > 1 ? 'count items' : 'count item'}`))
  } else {
    showToast(translate(`${itemsCount} ${itemsCount > 1 ? 'count items were' : 'count item was'} accepted`))
  }
  await fetchCountItems()
}

function openDateTimeModal() {
  dateTimeModalOpen.value = true;
}

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { setZone: true}).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

function updateCustomTime(event: any) {
  const date = handleDateTimeInput(event.detail.value)
  CountService.updateCycleCount({
    inventoryCountImportId: currentCycleCount.value.countId,
    dueDate: date
  }).then(() => {
    currentCycleCount.value.dueDate = date
  }).catch(err => {
    logger.info(err)
  })
}

// Method checks whether all the items selected all counted(having some quantity) or not, as we do not allow accepting those items on which quantity is not set
function isSelectedItemsHasQuantity() {
  return filteredItems.value?.length > 0 && filteredItems.value.filter((item: any) => item.itemStatusId === "INV_COUNT_CREATED" && item.isChecked).every((item: any) => item.quantity >= 0)
}
</script>

<style scoped>

.filters {
  display: flex;
  padding-inline-start: var(--spacer-sm);
  gap: var(--spacer-sm);
  align-items: end;
}

.filters>* {
  flex: 1;
}

.list-item {
  --columns-desktop: 4;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.list-item .item-key {
  padding-inline-start: var(--spacer-sm);
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
}

.list-item .actions {
  display: flex;
  gap: var(--spacer-xs);
}

.header {
  display: grid;
}
</style>
