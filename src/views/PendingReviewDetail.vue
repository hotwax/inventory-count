<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pending-review" />
        <ion-title>{{ translate("Review count")}}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="selectAll()">
            <ion-icon slot="icon-only" :icon="checkboxOutline"/>
          </ion-button>
          <ion-button @click="addProduct()">
            <ion-icon slot="icon-only" :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
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
          <ion-chip outline>
            <ion-icon :icon="calendarClearOutline"></ion-icon>
            <ion-label>{{ getDateWithOrdinalSuffix(currentCycleCount.dueDate) }}</ion-label>
          </ion-chip>
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
        <ion-segment v-model="segmentSelected">
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
              <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl"/>
            </ion-thumbnail>
            <ion-label class="ion-text-wrap">
              {{ item.productId }}
            </ion-label>
          </ion-item>
          
          <ion-label v-if="item.quantity">
            {{ item.quantity }} / {{ item.qoh }}
            <p>{{ translate("counted / systemic") }}</p>
          </ion-label>
          
          <ion-label v-else>
            {{ item.qoh }}
            <p>{{ translate("systemic") }}</p>
          </ion-label>
          
          <ion-label v-if="item.quantity">
            {{ +(item.quantity) - +(item.qoh) }}
            <p>{{ item.performedByPartyId || "-" }}</p>
          </ion-label>

          <ion-item lines="none" v-else>
            <ion-label class="ion-text-center">
              <ion-badge color="danger">{{ translate("not counted") }}</ion-badge>
              <p>{{ item.lastCountedDate ? translate("last counted") : "" }} {{ timeFromNow(item.lastCountedDate) }}</p>
            </ion-label>  
          </ion-item>

          <div class="tablet">
            <ion-button :disabled="isItemCompletedOrRejected(item)" :fill="isItemReadyToAccept(item) ? 'outline' : 'clear'" color="success" size="small" @click="updateItemStatus('INV_COUNT_COMPLETED', item)">
              <ion-icon slot="icon-only" :icon="thumbsUpOutline"></ion-icon>
            </ion-button>
            <ion-button :disabled="isItemCompletedOrRejected(item)" :fill="!item.quantity ? 'outline' : 'clear'" color="warning" size="small" class="ion-margin-horizontal" @click="recountItem(item)">
              <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
            </ion-button>
            <ion-button :disabled="isItemCompletedOrRejected(item)" :fill="isItemReadyToReject(item) ? 'outline' : 'clear'" color="danger" size="small" @click="updateItemStatus('INV_COUNT_REJECTED', item)">
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
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="!isAllItemsMarkedAsCompletedOrRejected" @click="completeCount">
        <ion-icon :icon="receiptOutline" />
      </ion-fab-button>
    </ion-fab>
    
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button :fill="segmentSelected ==='accept' ? 'outline' : 'clear'" color="success" size="small" :disabled="isAnyItemSelected" @click="updateItemStatus('INV_COUNT_COMPLETED')">
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
import { DxpShopifyImg } from "@hotwax/dxp-components";
import { calendarClearOutline, businessOutline, thermometerOutline, thumbsUpOutline, refreshOutline, thumbsDownOutline, checkboxOutline, addOutline, receiptOutline, playBackOutline } from "ionicons/icons";
import { IonBackButton, IonBadge, IonButtons, IonButton, IonCheckbox, IonChip, IonContent, IonFab, IonFabButton, IonFooter, IonHeader, IonIcon, IonItem, IonInput, IonLabel, IonList, IonPage, IonRange, IonSegment, IonSegmentButton, IonSpinner, IonThumbnail, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { translate } from '@/i18n'
import { computed, defineProps, nextTick, onMounted, onUnmounted, ref } from "vue";
import store from "@/store"
import { CountService } from "@/services/CountService"
import emitter from '@/event-bus';
import { showToast, getDateWithOrdinalSuffix, hasError, getFacilityName, timeFromNow } from "@/utils"
import logger from "@/logger";
import AddProductModal from "@/components/AddProductModal.vue";
import router from "@/router";

const props = defineProps({
  inventoryCountImportId: String
})

const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))

const filteredItems = computed(() => {
  let items = currentCycleCount.value.items

  if(segmentSelected.value === "accept") {
    items = currentCycleCount.value.items.filter((item: any) => isItemReadyToAccept(item))
  } else if(segmentSelected.value === "reject") {
    items = currentCycleCount.value.items.filter((item: any) => isItemReadyToReject(item))
  }

  return items
})

const isAnyItemSelected = computed(() => {
  return !currentCycleCount.value.items?.some((item: any) => item.isChecked)
})

const isAllItemsMarkedAsCompletedOrRejected = computed(() => {
  return currentCycleCount.value.items?.every((item: any) => item.itemStatusId === "INV_COUNT_COMPLETED" || item.itemStatusId === "INV_COUNT_REJECTED")
})

const currentCycleCount = ref({}) as any
const countNameRef = ref()
let isCountNameUpdating = ref(false)
let countName = ref("")
let segmentSelected = ref("all")
let varianceThreshold = ref(40)

onMounted(async () => {
  emitter.emit("presentLoader", { message: "Loading cycle count details" })
  emitter.on("addProductToCount", addProductToCount);

  currentCycleCount.value = {}
  try {
    const resp = await CountService.fetchCycleCount(props.inventoryCountImportId as string)

    if(!hasError(resp) && resp.data?.inventoryCountImportId) {
      currentCycleCount.value = {
        countName: resp.data.countImportName,
        countId: resp.data.inventoryCountImportId,
        items: [],
        ...resp.data
      }

      countName.value = resp.data.countImportName
    }
  } catch(err) {
    logger.error()
  }

  await fetchCountItems();

  emitter.emit("dismissLoader")
})

onUnmounted(() => {
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
    logger.error()
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
      // TODO: Fetching all the items again as in the current add api we do not get all the information required to be displayed on UI
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
  if(countName.value.trim() && countName.value.trim() !== currentCycleCount.value.countName.trim()) {
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
  return item.quantity ? (item.quantity / (item.qoh || 0)) * 100 < varianceThreshold.value : false
}

function isItemReadyToReject(item: any) {
  return item.quantity ? (item.quantity / (item.qoh || 0)) * 100 >= varianceThreshold.value : false
}

function isItemCompletedOrRejected(item: any) {
  return item.itemStatusId === "INV_COUNT_REJECTED" || item.itemStatusId === "INV_COUNT_COMPLETED"
}

function selectItem(checked: boolean, item: any) {
  return item.isChecked = checked
}

function selectAll() {
  // When an item is having created status, in that case only we want the item to be selected, for the case of item rejected and completed we do not all the item to be marked as checked
  currentCycleCount.value.items = currentCycleCount.value.items.map((item: any) => ({ ...item, isChecked: item.itemStatusId === "INV_COUNT_CREATED" ? true : false }))
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

@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style>
