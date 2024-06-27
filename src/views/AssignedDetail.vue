<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/assigned" />
        <ion-title>{{ translate("Assigned count")}}</ion-title>
        <ion-buttons slot="end">
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
            <ion-icon :icon="calendarClearOutline"/>
            <ion-label>{{ getDateWithOrdinalSuffix(currentCycleCount.dueDate) || "-" }}</ion-label>
          </ion-chip>
          <ion-chip outline>
            <ion-icon :icon="businessOutline"/>
            <ion-label>{{ getFacilityName(currentCycleCount.facilityId) }}</ion-label>
          </ion-chip>
        </div>
        <div class="filters ion-padding">
          <ion-list>
            <ion-item>
              <ion-spinner slot="start" name="circular" :paused="true"/>
              <ion-label>{{ translate("Progress") }}</ion-label>
              <ion-label slot="end">{{ getProgress() }}</ion-label>
            </ion-item>  
            <ion-item>
              <ion-spinner slot="start" name="circular" :paused="true"/>
              <ion-label>{{ translate("Variance") }}</ion-label>
              <ion-label slot="end">{{ getVarianceInformation() }}</ion-label>
            </ion-item>  
          </ion-list>
        </div>
      </div>

      <hr/>

      <template v-if="currentCycleCount.items?.length">
        <div class="list-item" v-for="item in currentCycleCount.items" :key="item.importItemSeqId">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg />
            </ion-thumbnail>
            <ion-label>
              {{ item.productId }}
            </ion-label>
          </ion-item>
          
          <ion-label>
            {{ item.qoh }}
            <p>{{ translate("QoH") }}</p>
          </ion-label>

          <template v-if="item.quantity">
            <ion-label>
              {{ item.quantity }}
              <p>{{ translate("counted") }}</p>
            </ion-label>

            <ion-label>
              {{ +(item.quantity) - +(item.qoh) }}
              <p>{{ translate("variance") }}</p>
            </ion-label>
          </template>

          <ion-chip outline class="tablet" v-else>
            <ion-label>{{ translate("count pending") }}</ion-label>
          </ion-chip>
  
          <ion-chip outline v-if="item.quantity">
            <ion-icon :icon="personCircleOutline"/>
            <!-- TODO: fetch username instead of partyId -->
            <ion-label>{{ item.performedByPartyId }}</ion-label>
          </ion-chip>

          <div class="tablet" v-else>
            <ion-item lines="none">
              <ion-icon :icon="personCircleOutline" ></ion-icon>
            </ion-item>
          </div>
  
          <ion-button fill="clear" color="medium" @click="openAssignedCountPopover($event, item)">
            <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
          </ion-button>
        </div>
      </template>
      <p v-else class="empty-state">
        {{ translate("No items found") }}
      </p>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="updateCountStatus">
        <ion-icon :icon="lockClosedOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, onUnmounted, ref } from "vue";
import { DxpShopifyImg } from "@hotwax/dxp-components";
import { translate } from '@/i18n'
import { addOutline, calendarClearOutline, businessOutline, personCircleOutline, ellipsisVerticalOutline, lockClosedOutline } from "ionicons/icons";
import { IonBackButton, IonButton, IonButtons, IonChip, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonSpinner, IonThumbnail, IonTitle, IonToolbar, modalController, onIonViewWillEnter, popoverController } from "@ionic/vue";
import AssignedCountPopover from "@/components/AssignedCountPopover.vue"
import store from "@/store"
import logger from "@/logger"
import { CountService } from "@/services/CountService"
import { hasError, showToast, getDateWithOrdinalSuffix } from "@/utils"
import emitter from '@/event-bus';
import AddProductModal from "@/components/AddProductModal.vue"
import router from "@/router";

const props = defineProps({
  inventoryCountImportId: String
})

const facilities = computed(() => store.getters["user/getFacilities"])
const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))

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
        idValue: productId
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
      currentCycleCount.value["items"] = resp.data.itemList
      store.dispatch("product/fetchProducts", { productIds: [...new Set(resp.data.itemList.map((item: any) => item.productId))] })
    }
  } catch(err) {
    logger.error()
  }
}

async function editCountName() {
  isCountNameUpdating.value = !isCountNameUpdating.value;
  // Waiting for DOM updations before focus inside the text-area, as it is conditionally rendered in the DOM
  await nextTick()
  countNameRef.value.$el.setFocus();
}

async function updateCountName() {
  if(countName.value.trim() && countName.value.trim() !== currentCycleCount.value.countName.trim()) {
    const inventoryCountImportId = await updateCycleCount({ countImportName: countName.value.trim() })
    if(inventoryCountImportId) {
      currentCycleCount.value.countName = countName.value
    } else {
      countName.value = currentCycleCount.value.countName.trim()
    }
  }

  isCountNameUpdating.value = false
}

async function updateCycleCount(payload: any) {
  const params = {
    inventoryCountImportId: currentCycleCount.value.countId,
    ...payload
  }

  try {
    const resp = await CountService.updateCycleCount(params)

    if(!hasError(resp)) {
      return Promise.resolve(resp.data?.inventoryCountImportId)
    } else {
      throw "Failed to update cycle count information"
    }
  } catch(err) {
    showToast(translate("Failed to update cycle count information"))
    return Promise.reject("Failed to update cycle count information")
  }
}

function getFacilityName(id: string) {
  return facilities.value.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

async function deleteItemFromCount(seqId: string) {
  try {
    const resp = await CountService.deleteCycleCountItem({
      inventoryCountImportId: currentCycleCount.value.countId,
      importItemSeqId: seqId
    })

    if(!hasError(resp)) {
      currentCycleCount.value.items = currentCycleCount.value.items.filter((item: any) => item.importItemSeqId !== seqId)
      showToast(translate("Item has been successfully removed the cycle count"))
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
  return `${isNaN(progress) ? 0 : progress}% progress`
}

async function updateCountStatus() {
  try {
    await updateCycleCount({
      statusId: "INV_COUNT_REVIEW"
    })
    router.push("/assigned")
    showToast(translate("Count status changed successfully"))
  } catch(err) {
    showToast(translate("Failed to change the cycle count status"))
  }
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

@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style>
