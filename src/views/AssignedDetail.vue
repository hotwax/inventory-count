<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/assigned" />
        <ion-title>{{ translate("Assigned count")}}</ion-title>
        <ion-buttons slot="end" v-if="currentCycleCount.inventoryCountImportId">
          <ion-button @click="addProduct()">
            <ion-icon slot="icon-only" :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
 
    <ion-content class="main-content" :scroll-y="false">
      <template v-if="currentCycleCount.inventoryCountImportId">
        <div class="header">
          <div class="search ion-padding">
            <ion-item lines="none">
              <ion-label slot="start">
                <p class="overline" v-if="currentCycleCount.countTypeEnumId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
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
              <ion-icon :icon="calendarClearOutline"/>
              <ion-label>{{ getDateWithOrdinalSuffix(currentCycleCount.dueDate) }}</ion-label>
            </ion-chip>
            <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
              <ion-content :force-overscroll="false">
                <ion-datetime
                  id="schedule-datetime"
                  :value="currentCycleCount.dueDate ? getDateTime(currentCycleCount.dueDate) : getDateTime(DateTime.now().toMillis())"
                  @ionChange="updateCustomTime($event)"
                  :min="DateTime.now().toISO()"
                  :max="DateTime.now().plus({ years: 10 }).toISO()"
                  presentation="date"
                  showDefaultButtons
                />
              </ion-content>
            </ion-modal>
            <ion-chip outline>
              <ion-icon :icon="businessOutline"/>
              <ion-label>{{ getFacilityName(currentCycleCount.facilityId) }}</ion-label>
            </ion-chip>
          </div>
          <div class="filters">
            <ion-list>
              <ion-item v-if="currentCycleCount.countTypeEnumId !== 'HARD_COUNT'">
                <ion-label>{{ translate("Progress") }}</ion-label>
                <ion-label slot="end">{{ getProgress() }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Variance") }}</ion-label>
                <ion-label slot="end">{{ getVarianceInformation() }}</ion-label>
              </ion-item>
            </ion-list>
          </div>
        </div>

        <hr/>

        <template v-if="currentCycleCount.items?.length">
          <DynamicScroller class="virtual-scroller" :items="currentCycleCount.items" key-field="importItemSeqId" :min-item-size="80" :buffer="400">
            <template v-slot="{ item, index, active }">
              <DynamicScrollerItem :item="item" :active="active" :index="index">
                <div class="list-item">
                  <ion-item lines="none">
                    <ion-thumbnail slot="start">
                      <Image :src="getProduct(item.productId).mainImageUrl"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p :class="item.itemStatusId === 'INV_COUNT_COMPLETED' ? 'overline status-success' : 'overline status-danger'" v-if="item.itemStatusId === 'INV_COUNT_COMPLETED' || item.itemStatusId === 'INV_COUNT_REJECTED'">{{ translate(item.itemStatusId === "INV_COUNT_COMPLETED" ? "accepted" : "rejected") }}</p>
                      {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}
                      <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>          
                    </ion-label>
                  </ion-item>

                  <ion-label>
                    {{ item.qoh }}
                    <p>{{ translate("QoH") }}</p>
                  </ion-label>

                  <template v-if="item.quantity >=0 ">
                    <ion-label>
                      {{ item.quantity }}
                      <p>{{ translate("counted") }}</p>
                    </ion-label>

                    <ion-label>
                      {{ +(item.quantity) - +(item.qoh) }}
                      <p>{{ translate("variance") }}</p>
                    </ion-label>
                  </template>

                  <ion-chip outline class="tablet grid-span-columns" v-else>
                    <ion-label>{{ translate("count pending") }}</ion-label>
                  </ion-chip>

                  <ion-chip outline v-if="item.quantity >= 0">
                    <ion-icon :icon="personCircleOutline"/>
                    <ion-label>{{ getPartyName(item) }}</ion-label>
                  </ion-chip>

                  <div class="tablet ion-margin-end" v-else>
                    <ion-icon class="standalone-icon" :icon="personCircleOutline"></ion-icon>
                  </div>

                  <ion-button fill="clear" color="medium" @click="openAssignedCountPopover($event, item)">
                    <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
                  </ion-button>
                </div>
              </DynamicScrollerItem>
            </template>          
          </DynamicScroller>
        </template>
        <p v-else class="empty-state">
          {{ translate("No items added to count") }}
        </p>
      </template>
      <template v-else>
        <p class="empty-state">
          {{ translate("Cycle count not found") }}
        </p>
      </template>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="currentCycleCount.inventoryCountImportId">
      <ion-fab-button @click="updateCountStatus">
        <ion-icon :icon="lockClosedOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, defineProps, nextTick, ref } from "vue";
import { translate } from '@/i18n'
import { addOutline, calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline, lockClosedOutline } from "ionicons/icons";
import { IonBackButton, IonButton, IonButtons, IonChip, IonContent, IonDatetime, IonModal, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonThumbnail, IonTitle, IonToolbar, modalController, onIonViewWillEnter, popoverController, onIonViewWillLeave } from "@ionic/vue";
import AssignedCountPopover from "@/components/AssignedCountPopover.vue"
import store from "@/store"
import logger from "@/logger"
import { CountService } from "@/services/CountService"
import { hasError, showToast, getDateWithOrdinalSuffix, getDateTime, getFacilityName, getPartyName, sortListByField } from "@/utils"
import emitter from '@/event-bus';
import AddProductModal from "@/components/AddProductModal.vue"
import router from "@/router";
import Image from "@/components/Image.vue"
import { DateTime } from "luxon";
import { getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'

const props = defineProps({
  inventoryCountImportId: String
})

const productIdentificationStore = useProductIdentificationStore();

const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))

const dateTimeModalOpen = ref(false)
const currentCycleCount = ref({}) as any
const countNameRef = ref()
let isCountNameUpdating = ref(false)
let countName = ref("")

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
      // TODO: Fetching all the items again as in the current add api we do not get all the information required to be displayed on UI
      await fetchCountItems();
    }
  } catch(err) {
    logger.error("Failed to add product to count", err)
    showToast(translate("Failed to add product to count"))
  }
}

onIonViewWillEnter(async () => {
  emitter.emit("presentLoader", { message: "Loading cycle count details" })
  emitter.on("addProductToCount", addProductToCount);

  currentCycleCount.value = {}
  try {
    const resp = await CountService.fetchCycleCount(props.inventoryCountImportId as string)

    if(!hasError(resp) && resp.data?.inventoryCountImportId && resp.data.statusId === "INV_COUNT_ASSIGNED") {
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
  store.dispatch("count/fetchCycleCountStats", [props.inventoryCountImportId])
  let items = [] as any, resp, pageIndex = 0;

  try {
    do {
      resp = await CountService.fetchCycleCountItems({ inventoryCountImportId : props?.inventoryCountImportId, pageSize: 100, pageIndex })
      if(!hasError(resp) && resp.data?.itemList?.length) {
        items = items.concat(resp.data.itemList)
        pageIndex++;
      } else {
        throw resp.data;
      }
    } while(resp.data.itemList?.length >= 100)
  } catch(err) {
    logger.error(err)
  }

  items = sortListByField(items, "parentProductName");

  currentCycleCount.value["items"] = items
  store.dispatch("product/fetchProducts", { productIds: [...new Set(items.map((item: any) => item.productId))] })
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

async function deleteItemFromCount(seqId: string) {
  try {
    const resp = await CountService.deleteCycleCountItem({
      inventoryCountImportId: currentCycleCount.value.countId,
      importItemSeqId: seqId
    })

    if(!hasError(resp)) {
      currentCycleCount.value.items = currentCycleCount.value.items.filter((item: any) => item.importItemSeqId !== seqId)
      showToast(translate("Item has been removed from the cycle count"))
    } else {
      throw "Failed to remove the item from the count"
    }
  } catch(err) {
    showToast(translate("Failed to remove the item from the count"))
    logger.error(err)
  }
}

async function openAssignedCountPopover(event: any, item: any){
  const popover = await popoverController.create({
    component: AssignedCountPopover,
    event,
    componentProps: {
      item
    },
    showBackdrop: false,
  });

  popover.onDidDismiss().then(async (result) => {
    // considered that if a role is available on dismiss, it will be a negative role in which we don't need to perform any action
    if(result.role) {
      return;
    }

    if(result.data?.itemAction === "remove") {
      await deleteItemFromCount(item.importItemSeqId)
    }
  })

  await popover.present();
}

async function addProduct() {
  const addProductModal = await modalController.create({
    component: AddProductModal,
    componentProps: { cycleCount: currentCycleCount.value },
    showBackdrop: false,
  });

  await addProductModal.present();
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

async function updateCountStatus() {
  try {
    await CountService.updateCycleCount({
      inventoryCountImportId: currentCycleCount.value.countId,
      statusId: "INV_COUNT_REVIEW"
    })
    router.push("/pending-review")
    showToast(translate("Count has been submitted for review"))
  } catch(err) {
    showToast(translate("Failed to change the cycle count status"))
  }
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

.grid-span-columns {
  grid-column: 3/5;
}

.main-content {
  --padding-bottom: 80px;
}

.status-success {
  color: var(--ion-color-success);
}

.status-danger {
  color: var(--ion-color-danger);
}

.virtual-scroller {
  --virtual-scroller-offset: 220px;
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
