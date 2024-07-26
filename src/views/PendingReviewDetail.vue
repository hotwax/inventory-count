<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pending-review" />
        <ion-title>{{ translate("Review count")}}</ion-title>
        <ion-buttons slot="end" v-if="currentCycleCount.inventoryCountImportId">
          <ion-button :disabled="!filteredItems?.length" @click="selectAll()">
            <ion-icon v-show="areAllItemsSelected()" slot="icon-only" :icon="checkboxOutline"/>
            <ion-icon v-show="!areAllItemsSelected()" slot="icon-only" :icon="squareOutline"/>
          </ion-button>
          <ion-button @click="addProduct()">
            <ion-icon slot="icon-only" :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="main-content">
      <template v-if="currentCycleCount.inventoryCountImportId">
        <div class="header">
          <div class="search ion-padding">
            <ion-item lines="none">
              <ion-label slot="start">
                <h1 v-show="!isCountNameUpdating">{{ countName }}</h1>
                <!-- Added class as we can't change the background of ion-input with css property, and we need to change the background to show the user that now this value is editable -->
                <ion-input ref="countNameRef" :class="isCountNameUpdating ? 'name' : ''" v-show="isCountNameUpdating" aria-label="group name" v-model="countName"></ion-input>
                <p>{{ currentCycleCount.countId }}</p>
              </ion-label>

              <ion-button v-show="!isCountNameUpdating" slot="end" color="medium" fill="outline" size="small" @click="editCountName()">
                {{ translate("Rename") }}
              </ion-button>
              <ion-button v-show="isCountNameUpdating" slot="end" color="medium" fill="outline" size="small" @click="updateCountName()">
                {{ translate("Save") }}
              </ion-button>
            </ion-item>
            <ion-chip outline @click="openDateTimeModal">
              <ion-icon :icon="calendarClearOutline"></ion-icon>
              <ion-label>{{ getDateWithOrdinalSuffix(currentCycleCount.dueDate) }}</ion-label>
            </ion-chip>
            <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
              <ion-content :force-overscroll="false">
                <ion-datetime
                  id="schedule-datetime"
                  :value="currentCycleCount.dueDate ? getDateTime(currentCycleCount.dueDate) : getDateTime(DateTime.now().toMillis())"
                  @ionChange="updateCustomTime($event)"
                  :min="DateTime.now().toISO()"
                  presentation="date"
                  showDefaultButtons
                />
              </ion-content>
            </ion-modal>
            <ion-chip outline>
              <ion-icon :icon="businessOutline"></ion-icon>
              <ion-label>{{ getFacilityName(currentCycleCount.facilityId) }}</ion-label>
            </ion-chip>
            <ion-chip outline @click="reassignCount">
              <ion-icon :icon="playBackOutline"></ion-icon>
              <ion-label>{{ translate("Re-assign") }}</ion-label>
            </ion-chip>
          </div>
          <ion-list>
            <div class="filters ion-padding">
              <ion-item>
                <ion-label>{{ translate("Progress") }}</ion-label>
                <ion-label slot="end">{{ getProgress() }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Variance") }}</ion-label>
                <ion-label slot="end">{{ getVarianceInformation() }}</ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-icon slot="start" :icon="thermometerOutline"/>
                <ion-label>{{ translate("Item variance threshold") }}</ion-label>
                <ion-label slot="end">{{ varianceThreshold }} {{ "%" }}</ion-label>
              </ion-item>
              <ion-item lines="none">
                <div slot="start"></div>
                <ion-range :value="varianceThreshold" @ionChange="updateVarianceThreshold"></ion-range>
              </ion-item>
            </div>
          </ion-list>
        </div>

        <div class="header border">
          <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
            <ion-segment-button value="all">
              <ion-label>{{ translate("All") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="accept">
              <ion-icon color="success" :icon="thermometerOutline"/>
            </ion-segment-button>
            <ion-segment-button value="reject">
              <ion-icon color="danger" :icon="thermometerOutline"/>
            </ion-segment-button>
          </ion-segment>
        </div>

        <template v-if="filteredItems?.length">
          <div class="list-item" v-for="item in filteredItems" :key="item.importItemSeqId">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="getProduct(item.productId).mainImageUrl"/>
              </ion-thumbnail>
              <ion-label class="ion-text-wrap">
                <h2>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(item.productId)) }}</h2>
                <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, getProduct(item.productId)) }}</p>
              </ion-label>
            </ion-item>

            <ion-label v-if="item.quantity >= 0">
              {{ item.quantity }} / {{ item.qoh }}
              <p>{{ translate("counted / systemic") }}</p>
            </ion-label>

            <ion-label v-else>
              {{ item.qoh }}
              <p>{{ translate("systemic") }}</p>
            </ion-label>

            <ion-label v-if="item.quantity >= 0">
              {{ +(item.quantity) - +(item.qoh) }}
              <p>{{ getPartyName(item) }}</p>
            </ion-label>

            <ion-item lines="none" v-else>
              <ion-label class="ion-text-center">
                <ion-badge color="danger">{{ translate("not counted") }}</ion-badge>
                <p>{{ item.lastCountedDate ? translate("last counted") : "" }} {{ timeFromNow(item.lastCountedDate) }}</p>
              </ion-label>
            </ion-item>

            <div class="tablet">
              <ion-button :disabled="isItemCompletedOrRejected(item)" :fill="isItemReadyToAccept(item) && item.itemStatusId === 'INV_COUNT_CREATED' ? 'outline' : 'clear'" color="success" size="small" @click="acceptItem(item)">
                <ion-icon slot="icon-only" :icon="thumbsUpOutline"></ion-icon>
              </ion-button>
              <ion-button :disabled="isItemCompletedOrRejected(item)" :fill="item.quantity === undefined && item.itemStatusId === 'INV_COUNT_CREATED' ? 'outline' : 'clear'" color="warning" size="small" class="ion-margin-horizontal" @click="recountItem(item)">
                <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
              </ion-button>
              <ion-button :disabled="isItemCompletedOrRejected(item)" :fill="isItemReadyToReject(item) && item.itemStatusId === 'INV_COUNT_CREATED' ? 'outline' : 'clear'" color="danger" size="small" @click="updateItemStatus('INV_COUNT_REJECTED', item)">
                <ion-icon slot="icon-only" :icon="thumbsDownOutline"></ion-icon>
              </ion-button>
            </div>

            <div>
              <ion-item lines="none">
                <ion-badge v-if="isItemCompletedOrRejected(item)" :color="item.itemStatusId === 'INV_COUNT_REJECTED' ? 'danger' : 'success'">{{ translate(item.itemStatusId === "INV_COUNT_COMPLETED" ? "accepted" : "rejected") }}</ion-badge>
                <ion-checkbox v-else aria-label="checked" v-model="item.isChecked" @ionChange="selectItem($event.detail.checked, item)"></ion-checkbox>
              </ion-item>
            </div>
          </div>
        </template>

        <p v-else class="empty-state">
          {{ translate("No items found") }}
        </p>
      </template>
      <template v-else>
        <p class="empty-state">{{ translate("Cycle count not found") }}</p>
      </template>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="currentCycleCount.inventoryCountImportId">
      <ion-fab-button :disabled="!isAllItemsMarkedAsCompletedOrRejected" @click="completeCount">
        <ion-icon :icon="receiptOutline" />
      </ion-fab-button>
    </ion-fab>
    
    <ion-footer v-if="currentCycleCount.inventoryCountImportId">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button :fill="segmentSelected ==='accept' ? 'outline' : 'clear'" color="success" size="small" :disabled="isAnyItemSelected" @click="acceptItem()">
            <ion-icon slot="icon-only" color="success" :icon="thumbsUpOutline"/>
          </ion-button>
          <ion-button fill="clear" color="warning" size="small" class="ion-margin-horizontal" :disabled="isAnyItemSelected" @click="recountItem()">
            <ion-icon slot="icon-only" color="warning" :icon="refreshOutline" />
          </ion-button>
          <ion-button :fill="segmentSelected ==='reject' ? 'outline' : 'clear'" color="danger" size="small" :disabled="isAnyItemSelected" @click="updateItemStatus('INV_COUNT_REJECTED')">
            <ion-icon slot="icon-only" color="danger" :icon="thumbsDownOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { calendarClearOutline, businessOutline, thermometerOutline, thumbsUpOutline, refreshOutline, thumbsDownOutline, checkboxOutline, addOutline, receiptOutline, playBackOutline, squareOutline } from "ionicons/icons";
import { IonBackButton, IonBadge, IonButtons, IonButton, IonCheckbox, IonChip, IonContent, IonDatetime, IonModal, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon, IonItem, IonInput, IonLabel, IonList, IonPage, IonRange, IonSegment, IonSegmentButton, IonThumbnail, IonTitle, IonToolbar, modalController, onIonViewWillEnter, onIonViewWillLeave } from "@ionic/vue";
import { translate } from '@/i18n'
import { computed, defineProps, nextTick, ref } from "vue";
import store from "@/store"
import { CountService } from "@/services/CountService"
import emitter from '@/event-bus';
import { showToast, getDateWithOrdinalSuffix, hasError, getFacilityName, getPartyName, timeFromNow, getProductIdentificationValue, getDateTime } from "@/utils"
import logger from "@/logger";
import AddProductModal from "@/components/AddProductModal.vue";
import router from "@/router";
import Image from "@/components/Image.vue"
import { DateTime } from "luxon";

const props = defineProps({
  inventoryCountImportId: String
})

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

onIonViewWillEnter(async () => {
  emitter.emit("presentLoader", { message: "Loading cycle count details" })
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

  emitter.emit("dismissLoader")
})

onIonViewWillLeave(() => {
  emitter.off("addProductToCount", addProductToCount)
})

async function fetchCountItems() {
  try {
    const resp = await CountService.fetchCycleCountItems(props.inventoryCountImportId as string)

    if(!hasError(resp) && resp.data?.itemList?.length) {
      currentCycleCount.value["items"] = resp.data.itemList.map((item: any) => ({ ...item, isChecked: false }))
      store.dispatch("product/fetchProducts", { productIds: [...new Set(resp.data.itemList.map((item: any) => item.productId))] })
    }
  } catch(err) {
    logger.error(err)
  }
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
        idValue: productId,
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
  if(countName.value?.trim() && countName.value.trim() !== currentCycleCount.value.countName.trim()) {
    const inventoryCountImportId = await CountService.updateCycleCount({ inventoryCountImportId: currentCycleCount.value.countId, countImportName: countName.value.trim() })
    if(inventoryCountImportId) {
      currentCycleCount.value.countName = countName.value
    } else {
      countName.value = currentCycleCount.value.countName.trim()
    }
  }

  isCountNameUpdating.value = false
}

function updateVarianceThreshold(event: any) {
  varianceThreshold.value = event.detail.value
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

    if(!hasError(resp)) {
      await fetchCountItems();
    } else {
      throw resp.data
    }

  } catch(err) {
    showToast(translate("Failed to update items"))
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

    if(!hasError(resp)) {
      await fetchCountItems();
    } else {
      throw resp.data
    }

  } catch(err) {
    showToast(translate("Failed to recount items"))
    logger.error("Failed to recount items", err)
  }
}

async function completeCount() {
  try {
    await CountService.updateCycleCount({
      inventoryCountImportId: currentCycleCount.value.countId,
      statusId: "INV_COUNT_COMPLETED"
    })
    router.push("/closed")
    showToast(translate("Count has been marked as completed"))
  } catch(err) {
    showToast(translate("Failed to complete cycle count"))
  }
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
  if(isAnyRespHasError) {
    showToast(translate("Some of the item(s) are failed to accept"))
  } else {
    showToast(translate("All of the item(s) are accepted"))
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
</script>

<style scoped>
.border {
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
}

/* To remove overlapping of fab button with footer buttons */
ion-footer ion-buttons {
  padding-right: 80px;
}

.main-content {
  --padding-bottom: 80px;
}

@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style>
