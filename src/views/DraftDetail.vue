<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/draft" />
        <ion-title>{{ translate("Draft count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="main-content">
      <template v-if="currentCycleCount.inventoryCountImportId">
        <div class="header">
          <div class="search">
            <ion-item lines="none" class="ion-padding">
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
          </div>
          <div class="filters">
            <ion-list class="ion-padding">
              <ion-item>
                <ion-icon slot="start" :icon="cloudUploadOutline"/>
                <ion-label>{{ translate("Import CSV") }}</ion-label>
                <input @change="parse" ref="file" class="ion-hide" type="file" id="updateProductFile" :key="fileUploaded.toString()"/>
                <label for="updateProductFile" class="pointer">{{ translate("Upload") }}</label>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="calendarNumberOutline" />
                <ion-label>{{ translate("Due date") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal">{{ currentCycleCount.dueDate ? getDateWithOrdinalSuffix(currentCycleCount.dueDate) : translate("Select date") }}</ion-button>
                <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
                  <ion-content force-overscroll="false">
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
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="businessOutline"/>
                <ion-label>{{ translate("Facility") }}</ion-label>
                <ion-label v-if="currentCycleCount.facilityId" slot="end">{{ getFacilityName(currentCycleCount.facilityId) }}</ion-label>
                <ion-button fill="clear" slot="end" v-if="currentCycleCount.facilityId" @click="openSelectFacilityModal">
                  <ion-icon slot="icon-only" :icon="pencilOutline" />
                </ion-button>
                <ion-button v-else fill="outline" @click="openSelectFacilityModal">
                  <ion-icon slot="start" :icon="addCircleOutline"/>
                  {{ translate("Assign") }}
                </ion-button>
              </ion-item>
            </ion-list>
          </div>
        </div>

        <div class="item-search">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="listOutline"/>
            <ion-input
              :label="translate('Add product')"
              label-placement="floating"
              :clear-input="true"
              v-model="queryString"
              @keyup.enter="addProductToCount"
              :helper-text="translate('Searching on SKU')"
            >
            </ion-input>
          </ion-item>
          <ion-item lines="none" v-if="isSearchingProduct">
            <ion-spinner color="secondary" name="crescent"></ion-spinner>
          </ion-item>
          <ion-item lines="none" v-else-if="searchedProduct.productId">
            <ion-thumbnail slot="start">
              <Image :src="getProduct(searchedProduct.productId).mainImageUrl"/>
            </ion-thumbnail>
            <ion-label>
              <p class="overline">{{ translate("Search result") }}</p>
              {{ searchedProduct.internalName || searchedProduct.sku || searchedProduct.productId }}
            </ion-label>
            <ion-button slot="end" fill="clear" @click="addProductToCount" :color="isProductAvailableInCycleCount ? 'success' : 'primary'">
              <ion-icon slot="icon-only" :icon="isProductAvailableInCycleCount ? checkmarkCircle : addCircleOutline"/>
            </ion-button>
          </ion-item>
          <p v-else-if="queryString">{{ translate("No items added to count") }}</p>
        </div>

        <hr />

        <template v-if="currentCycleCount.items?.length">
          <div class="list-item" v-for="item in currentCycleCount.items" :key="item.importItemSeqId">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="getProduct(item.productId).mainImageUrl"/>
              </ion-thumbnail>
              <ion-label class="ion-text-wrap">
                <h2>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</h2>
                <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, getProduct(item.productId)) }}</p>
              </ion-label>
            </ion-item>
            <ion-label>
              {{ item.qoh }}
              <p>{{ translate("QoH") }}</p>
            </ion-label>
            <div class="tablet">
              <ion-chip outline>
                <ion-label>{{ getDateWithOrdinalSuffix(item.lastCountedDate) }}</ion-label>
              </ion-chip>
              <ion-label class="config-label">{{ translate("last counted") }}</ion-label>
            </div>
            <!-- TODO: make it dynamic, as currently we are not getting rejection history information in any of the api -->
            <!-- <div class="tablet">
              <ion-chip outline>
                <ion-label>{{ item.rejectionHistory ? translate("3 rejections in the last week") : translate("No rejection history") }}</ion-label>
              </ion-chip>
            </div> -->
            <ion-button fill="clear" color="medium" slot="end" @click="deleteItemFromCount(item.importItemSeqId)">
              <ion-icon slot="icon-only" :icon="closeCircleOutline"/>
            </ion-button>
          </div>
        </template>
        <template v-else>
          <p class="empty-state">{{ translate("No items found") }}</p>
        </template>
      </template>
      <template v-else>
        <p class="empty-state">{{ translate("Cycle count not found") }}</p>
      </template>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" v-if="currentCycleCount.inventoryCountImportId">
      <ion-fab-button @click="updateCountStatus">
        <ion-icon :icon="sendOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from "@/i18n";
import ImportCsvModal from "@/components/ImportCsvModal.vue"
import SelectFacilityModal from "@/components/SelectFacilityModal.vue"
import { calendarNumberOutline, checkmarkCircle, businessOutline, addCircleOutline, pencilOutline, listOutline, closeCircleOutline, cloudUploadOutline, sendOutline } from "ionicons/icons";
import { IonBackButton, IonButton, IonChip, IonContent, IonDatetime, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonPage, IonSpinner, IonThumbnail, IonTitle, IonToolbar, modalController, onIonViewDidEnter, onIonViewWillEnter} from "@ionic/vue";
import { CountService } from "@/services/CountService"
import { defineProps, ref, nextTick, computed, watch } from "vue"
import { hasError, getDateTime, getDateWithOrdinalSuffix, handleDateTimeInput, getFacilityName, getProductIdentificationValue, showToast, parseCsv } from "@/utils";
import emitter from "@/event-bus"
import logger from "@/logger"
import { DateTime } from "luxon"
import store from "@/store";
import { ProductService } from "@/services/ProductService";
import router from "@/router"
import Image from "@/components/Image.vue"

const props = defineProps({
  inventoryCountImportId: String
})

const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])

const isProductAvailableInCycleCount = computed(() => {
  if(!searchedProduct.value.productId) return false
  return currentCycleCount.value.items?.some((item: any) => item.productId == searchedProduct.value.productId)
})

const dateTimeModalOpen = ref(false)
const currentCycleCount = ref({}) as any
const countNameRef = ref()
let isCountNameUpdating = ref(false)
let countName = ref("")
let queryString = ref("")
let searchedProduct = ref({} as any)
let isSearchingProduct = ref(false)
let content = ref([]) as any 
let fileColumns = ref([]) as any 
let uploadedFile = ref({}) as any
const fileUploaded = ref(false);
 let timeoutId = ref()

// Implemented watcher to display the search spinner correctly. Mainly the watcher is needed to not make the findProduct call always and to create the debounce effect.
// Previously we were using the `debounce` property of ion-input but it was updating the searchedString and making other related effects after the debounce effect thus the spinner is also displayed after the debounce
// effect is completed.
watch(queryString, (value) => {
  const searchedString = value.trim()

  if(searchedString?.length) {
    isSearchingProduct.value = true
  } else {
    searchedProduct.value = {}
    isSearchingProduct.value = false
  }

  if(timeoutId.value) {
    clearTimeout(timeoutId.value)
  }

  // Storing the setTimeoutId in a variable as watcher is invoked multiple times creating multiple setTimeout instance those are all called, but we only need to call the function once.
  timeoutId.value = setTimeout(() => {
    if(searchedString?.length) findProduct()
  }, 1000)

}, { deep: true })

onIonViewWillEnter(async () => {
  emitter.emit("presentLoader", { message: "Loading cycle count details" })
  currentCycleCount.value = {}
  try {
    const resp = await CountService.fetchCycleCount(props.inventoryCountImportId as string)

    if(!hasError(resp) && resp.data?.inventoryCountImportId && resp.data.statusId === "INV_COUNT_CREATED") {
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

onIonViewDidEnter(async() => {
  uploadedFile.value = {}
  content.value = []
})

async function parse(event: any) {
  let file = event.target.files[0];
  try {
    if (file) { 
      uploadedFile.value = file;
      content.value = await parseCsv(uploadedFile.value);
      fileColumns.value = Object.keys(content.value[0]);
      showToast(translate("File uploaded successfully"));
      fileUploaded.value =!fileUploaded.value; 
      openImportCsvModal();
    } else {
      showToast(translate("No new file upload. Please try again"));
    }
  } catch {
    content.value = []
    showToast(translate("Please upload a valid csv to continue"));
  }
}

async function fetchCountItems() {
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

  currentCycleCount.value["items"] = items
  store.dispatch("product/fetchProducts", { productIds: [...new Set(items.map((item: any) => item.productId))] })
}

async function openImportCsvModal() {
  const importCsvModal = await modalController.create({
    component: ImportCsvModal,
    componentProps: {
      fileColumns: fileColumns.value,
      content: content.value, 
      countId: props.inventoryCountImportId
    }
  })
  // On modal dismiss, if it returns identifierData, add the product to the count by calling addProductToCount()
  importCsvModal.onDidDismiss().then((result: any) => {
    if (result?.data?.identifierData && Object.keys(result?.data?.identifierData).length) {
      findProductFromIdentifier(result.data.identifierData)
    }
  })
  importCsvModal.present();
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
      CountService.updateCycleCount({
        inventoryCountImportId: currentCycleCount.value.countId,
        facilityId: result.data.value
      }).then(async () => {
        currentCycleCount.value.facilityId = result.data.value
        // Fetching items information again as on changing facility, the QOH of the items needs to be updated
        await fetchCountItems()
      }).catch((err: any) => {
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
  CountService.updateCycleCount({
    inventoryCountImportId: currentCycleCount.value.countId,
    dueDate: date
  }).then(() => {
    currentCycleCount.value.dueDate = date
  }).catch(err => {
    logger.info(err)
  })
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

  if(countName.value.trim() !== currentCycleCount.value.countName.trim()) {
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

async function findProduct() {
  if(!queryString.value.trim()) {
    showToast(translate("Enter a valid product sku"));
    return;
  }

  try {
    const resp = await ProductService.fetchProducts({
      "filters": ['isVirtual: false', `sku: ${queryString.value}`], // Made exact searching as when using fuzzy searching the products are not searched as expected
      "viewSize": 1 // as we only need a single record
    })
    if (!hasError(resp) && resp.data.response?.docs?.length) {
      searchedProduct.value = resp.data.response.docs[0];
    } else {
      throw resp.data
    }
  } catch(err) {
    searchedProduct.value = {}
    logger.error("Product not found", err)
  }

  isSearchingProduct.value = false
}

async function findProductFromIdentifier(payload: any) {
  
  const idType = payload.idType;
  const idValues = payload.idValue;

  if(!idValues || !idValues.length) {
    return showToast(translate("CSV data is missing or incorrect. Please check your file."));
  }

  const filterString = (idType === 'productId') ? `${idType}: (${idValues.join(' OR ')})` : `goodIdentifications: (${idValues.map((value: any) => `${idType}/${value}`).join(' OR ')})`;

  try {
    const resp = await ProductService.fetchProducts({
      "filters": [filterString],
      "viewSize": idValues.length
    })
    // We first fetch the products and then check whether they are available in the current count, instead of doing it in reverse order, it reduces the number of checks and improve performance.
    // This ensures that we have the most up-to-date product data and can accurately determine their presence in the current cycle count.

    if (!hasError(resp) && resp.data.response?.docs?.length) {
      const products = resp.data.response.docs;
      const itemsAlreadyInCycleCount = currentCycleCount.value.items.map((item: any) => item.productId);

      // Filter payload products to only include items that have a matching product and are not already in the cycle count.
      const filteredProducts = products.filter((product: any) => {
        const identificationValue = getProductIdentificationValue(idType, product);
        return idValues.includes(identificationValue) && !itemsAlreadyInCycleCount.includes(product.productId);
      })

      const productsToAdd = filteredProducts.map((product: any) => ({ idValue: product.productId }));
      if(!productsToAdd) {
        return showToast(translate("Failed to add product to count"))
      }

      await addProductToCount(productsToAdd);
      showToast(translate("Added products to the cycle count out of.", {added: productsToAdd.length, total: idValues.length}))
    } else {
      throw { toast: translate("No product found, please verify your CSV") };
    }
  } catch(err: any) {
    if (err.toast) {
      showToast(err.toast);
    } else {
      showToast(translate("Failed to fetch the products."));
    }
    logger.error("Failed to add products to count", err);
  }
}

async function addProductToCount(payload?: any) {

  if (!payload.length) {
    // If product is not found in the searched string then do not make the api call
    // check is only required to handle the case when user presses the enter key on the input and we do not have any result in the searchedProduct
    if (!searchedProduct.value.productId ||!queryString.value) return;
    if (isProductAvailableInCycleCount.value) return;
  }

  let itemList;
  if (payload && payload.length) {
    itemList = payload.map((data: any) => ({ ...data, statusId: "INV_COUNT_CREATED" }));
  } else {
    itemList = [{
      idValue: searchedProduct.value.productId,
      statusId: "INV_COUNT_CREATED"
    }];
  }

  try {
    const resp = await CountService.addProductToCount({
      inventoryCountImportId: currentCycleCount.value.countId,
      itemList: itemList
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

async function updateCountStatus() {
  if(!currentCycleCount.value.facilityId) {
    showToast(translate("Assign a facility to the cycle count"))
    return;
  }

  try {
    await CountService.updateCycleCount({
      inventoryCountImportId: currentCycleCount.value.countId,
      statusId: "INV_COUNT_ASSIGNED"
    })
    router.push("/assigned")
    showToast(translate("Count has been successfully assigned"))
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

/* Added to make the last Counted date chip to be displayed in center when missing data */
.tablet {
  text-align: center;
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

.main-content {
  --padding-bottom: 80px;
}

.pointer {
  cursor: pointer;
}

.item-search {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 40px;
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
