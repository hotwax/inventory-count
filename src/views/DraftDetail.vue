<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/draft" />
        <ion-title>{{ translate("Draft count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header">
        <div class="search">
          <ion-item lines="none" class="ion-padding">
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
        </div>
        <div class="filters">
          <ion-list class="ion-padding">
            <ion-item>
              <ion-icon slot="start" :icon="cloudUploadOutline"/>
              <ion-label>{{ translate("Import CSV") }}</ion-label>
              <input id="inputFile" class="ion-hide"/>
              <label for="inputFile" @click="openDraftImportCsvModal">{{ translate("Upload") }}</label>
            </ion-item> 
            <ion-item>
              <ion-icon slot="start" :icon="calendarNumberOutline" />
              <ion-label>{{ translate("Due date") }}</ion-label>  
              <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal">{{ currentCycleCount.dueDate ? currentCycleCount.dueDate : translate("Select date") }}</ion-button>
              <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
                <ion-content force-overscroll="false">
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
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="businessOutline"/>
              <ion-label>{{ translate("Facility") }}</ion-label>
              <ion-label v-if="currentCycleCount.facilityId" slot="end">{{ getFacilityName(currentCycleCount.facilityId) }}</ion-label>
              <ion-icon v-if="currentCycleCount.facilityId" slot="end" :icon="pencilOutline"  @click="openSelectFacilityModal"/>
              <ion-button v-else fill="outline" @click="openSelectFacilityModal">
                <ion-icon slot="start" :icon="addCircleOutline"/>
                {{ translate("Assign") }}
              </ion-button>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <div class="list-item">
        <ion-item>
          <ion-icon slot="start" :icon="listOutline"/>
          <ion-input
            :label="translate('Add product')"
            label-placement="floating"
            :clear-input="true"
            v-model="queryString"
            @keyup.enter="findProduct()"
          >
          </ion-input>
        </ion-item>
        <ion-item lines="none" v-if="searchedProduct.productId">
          <ion-thumbnail slot="start">
            <DxpShopifyImg/>
          </ion-thumbnail>
          <ion-label>
            <p class="overline">{{ translate("Search result") }}</p>
            {{ searchedProduct.internalName || searchedProduct.sku || searchedProduct.productId }}
          </ion-label>
        </ion-item>
        <ion-button v-if="searchedProduct.productId" fill="clear" @click="addProductToCount">
          <ion-icon slot="icon-only" :icon="addCircleOutline"/>
        </ion-button>
      </div>
      
      <template v-if="currentCycleCount.items?.length">
        <div class="list-item" v-for="item in currentCycleCount.items" :key="item.importItemSeqId">
          <ion-item lines="none">
            <ion-thumbnail slot="start">
              <DxpShopifyImg/>
            </ion-thumbnail>
            <ion-label class="ion-text-wrap">
              <p>{{ item.productId }}</p>
            </ion-label>
          </ion-item>          
          <ion-label>
            {{ item.qoh }}
            <p>{{ translate("QoH") }}</p>
          </ion-label>
          <div class="tablet">
            <ion-chip outline>
              <ion-label>4th March 2024</ion-label>
            </ion-chip>
            <ion-label class="config-label">{{ translate("last counted") }}</ion-label>
          </div>
          <div class="tablet">
            <ion-chip outline>
              <ion-label>{{ translate("3 rejections in the last week") }}</ion-label>
            </ion-chip>
          </div>
          <ion-button fill="clear" slot="end" @click="deleteItemFromCount(item.importItemSeqId)">
            <ion-icon slot="icon-only" color="medium" :icon="closeCircleOutline"/>
          </ion-button>
        </div>
      </template>
      <template v-else>
        <p class="empty-state">{{ translate("No items found") }}</p>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { DxpShopifyImg } from "@hotwax/dxp-components";
import { translate } from "@/i18n";
import DraftImportCsvModal from "@/components/DraftImportCsvModal.vue"
import SelectFacilityModal from "@/components/SelectFacilityModal.vue"
import { cloudUploadOutline, calendarNumberOutline, businessOutline, addCircleOutline, pencilOutline, listOutline, closeCircleOutline } from "ionicons/icons";
import { IonBackButton, IonButton, IonChip, IonContent, IonDatetime, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonPage, IonThumbnail, IonTitle, IonToolbar, modalController} from "@ionic/vue";
import { CountService } from "@/services/CountService"
import { defineProps, ref, onMounted, nextTick, computed } from "vue"
import { hasError, getDateTime, handleDateTimeInput, showToast } from "@/utils";
import emitter from "@/event-bus"
import logger from "@/logger"
import { DateTime } from "luxon"
import store from "@/store";
import { ProductService } from "@/services/ProductService";

const props = defineProps({
  inventoryCountImportId: String
})

const facilities = computed(() => store.getters["user/getFacilities"])

const dateTimeModalOpen = ref(false)
const currentCycleCount = ref({}) as any
const countNameRef = ref()
let isCountNameUpdating = ref(false)
let countName = ref("")
let queryString = ref("")
let searchedProduct = ref({} as any)

onMounted(async () => {
  emitter.emit("presentLoader", { message: "Loading cycle count details" })
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

async function openDraftImportCsvModal() {
  const draftImportCsvModal = await modalController.create({
    component: DraftImportCsvModal,
  })
  draftImportCsvModal.present();
}
    
async function openSelectFacilityModal() {
  const selectFacilityModal = await modalController.create({
    component: SelectFacilityModal,
    componentProps: {
      currentCycleCount: currentCycleCount.value
    }
  })

  selectFacilityModal.onDidDismiss().then((result: any) => {
    if(result?.data?.value) {
      updateCycleCount({
        facilityId: result.data.value
      }).then(async () => {
        currentCycleCount.value.facilityId = result.data.value
        // Fetching items information again as on changing facility, the QOH of the items needs to be updated
        await fetchCountItems()
      }).catch(err => {
        logger.info(err)
      })
    }
  })

  selectFacilityModal.present();
}

function openDateTimeModal() {
  dateTimeModalOpen.value = true;
}

function updateCustomTime(event: any) {
  const date = handleDateTimeInput(event.detail.value)
  updateCycleCount({
    dueDate: date
  }).then(() => {
    currentCycleCount.value.dueDate = date
  }).catch(err => {
    logger.info(err)
  })
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
    logger.error(err)
    return Promise.reject("Failed to update cycle count information")
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

async function findProduct() {
  if(!queryString.value.trim()) {
    showToast(translate("Enter a valid search string"));
    return;
  }

  try {
    const resp = await ProductService.fetchProducts({
      "keyword": queryString.value,
      "viewSize": 1 // as we only need a single record
    })
    if (!hasError(resp) && resp.data.response?.docs?.length) {
      searchedProduct.value = resp.data.response.docs[0];
    }
  } catch(err) {
    logger.error("Product not found", err)
  }
}

async function addProductToCount() {
  try {
    const resp = await CountService.addProductToCount({
      inventoryCountImportId: currentCycleCount.value.countId,
      itemList: [{
        idValue: searchedProduct.value.productId
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

.config-label {
  display: block;
  text-align: center;
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
