<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Download results") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-list-header>
        <ion-label>{{ translate("Select fields") }}</ion-label>
      </ion-list-header>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.countId" disabled>{{ translate("Count ID") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.countName">{{ translate("Count name") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.acceptedByUser">{{ translate("Accepted by user") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.createdDate">{{ translate("Created date") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.lastSubmittedDate">{{ translate("Last submitted date") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.closedDate">{{ translate("Closed date") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.facility" disabled>{{ translate("Facility") }}</ion-checkbox>
        <ion-select aria-label="facilityField" interface="popover" v-model="selectedFacilityField" slot="end">
          <ion-select-option value="facilityId">Internal ID</ion-select-option>
          <ion-select-option value="externalId">External ID</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="inset">
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.primaryProductId" disabled>{{ translate("Primary product ID") }}</ion-checkbox>
        <ion-select aria-label="primaryProduct" interface="popover" value="default" slot="end" v-model="selectedPrimaryProductId">
          <ion-select-option v-for="(value, identificationsType) in productIdentifications" :key="identificationsType" :value="value">{{ identificationsType }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="inset">
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.secondaryProductId">{{ translate("Secondary product ID") }}</ion-checkbox>
        <ion-select aria-label="secondaryProduct" interface="popover" value="default" slot="end" v-model="selectedSecondaryProductId">
          <ion-select-option v-for="(value, identificationsType) in productIdentifications" :key="identificationsType" :value="value">{{ identificationsType }}</ion-select-option>
        </ion-select>
      </ion-item> 
      <ion-item lines="inset">
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.lineStatus">{{ translate("Line status") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.expectedQuantity">{{ translate("Expected quantity") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.countedQuantity">{{ translate("Counted quantity") }}</ion-checkbox>
      </ion-item> 
      <ion-item>
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.variance">{{ translate("Variance") }}</ion-checkbox>
      </ion-item> 
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="downloadCSV">
      <ion-icon :icon="cloudDownloadOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import emitter from "@/event-bus"
import { computed, onMounted, ref } from "vue";
import { closeOutline, cloudDownloadOutline } from "ionicons/icons";
import { convertIsoToMillis, getDateWithOrdinalSuffix, getProductIdentificationValue, hasError, jsonToCsv, showToast } from "@/utils";
import { CountService } from "@/services/CountService"
import { translate } from '@/i18n';
import { DateTime } from "luxon";
import logger from "@/logger";
import store from "@/store";
import { UserService } from "@/services/UserService";


const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const facilities = computed(() => store.getters["user/getFacilities"])
const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))
const query = computed(() => store.getters["count/getQuery"])
const userProfile = computed(() => store.getters["user/getUserProfile"])

const productIdentifications = {
  "Internal ID": "productId",
  "Internal Name": "internalName",
  "SKU": "SKU",
  "UPC": "UPCA"
};

const selectedFields: any = ref({
  countId: false,
  countName: false,
  acceptedByUser: false,
  createdDate: false,
  lastSubmittedDate: false,
  closedDate: false,
  facility: false,
  primaryProductId: false,
  secondaryProductId: false,
  lineStatus: false,
  expectedQuantity: false,
  countedQuantity: false,
  variance: false,
});

const selectedFacilityField: any = ref('facilityId');
const selectedPrimaryProductId: any = ref('productId');
const selectedSecondaryProductId: any = ref('productId');
const savedFieldMappings = ref("")

onMounted(async () => {
  const userId = userProfile.value.partyId
  try {
    const resp = await UserService.getUserPreference(userId, process.env.VUE_APP_DOWNLOAD_MAPPING_INVCOUNT as string);

    if(resp.length && resp[0].preferenceValue) {
      savedFieldMappings.value = resp[0].preferenceValue
      const savedMapping = savedFieldMappings.value.split(",");

      savedMapping.map((mapping: string) => {
        if(mapping.includes(":")) {
          const [key, value] = mapping.split(":")
          selectedFields.value[key] = true

          if(key === "facility") {
            selectedFacilityField.value = value
          }

          if(key === "primaryProductId") {
            selectedPrimaryProductId.value = value
          }

          if(key === "secondaryProductId") {
            selectedSecondaryProductId.value = value
          }
        } else {
          selectedFields.value[mapping] = true
        }

      })
    } else if(!resp[0]?.preferenceKey) {
      await UserService.createUserPreference(userId, process.env.VUE_APP_DOWNLOAD_MAPPING_INVCOUNT as string, "");
      // Make all the fields selected, if no user preference is found
      markAllFieldsSelected();
    }
  } catch(err) {
    // Make all the fields selected, if no user preference is found
    markAllFieldsSelected();
    logger.error(err)
  }
})

function markAllFieldsSelected() {
  selectedFields.value = Object.keys(selectedFields.value).reduce((updatedFields: any, field: string) => {
    updatedFields[field] = true
    return updatedFields
  }, {})
}

function closeModal() {
  modalController.dismiss({ dismissed: true});
}
function getLastSubmittedDate(count: any) {
  const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory;
  if (!history) {
    return "-";
  }

  const submissionStatus = history.toReversed().find((status: any) => status.statusId === "INV_COUNT_REVIEW");
  return getDateWithOrdinalSuffix(submissionStatus?.statusDate);
}

function getClosedDate(count: any) {
  const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory
  if(!history) {
    return "-";
  }

  const submissionStatus = history.toReversed().find((status: any) => status.statusId === "INV_COUNT_COMPLETED")
  return getDateWithOrdinalSuffix(submissionStatus?.statusDate)
}

function getFacilityDetails() {
  return facilities.value.reduce((details: any, facility: any) => {
    details[facility.facilityId] = {
      facilityId: facility.facilityId,
      externalId: facility.externalId,
    };
    return details;
  }, {});
}

async function fetchBulkCycleCountItems() {
  let resp = {} as any, counts = [] as any, pageIndex = 0;
  const pageSize = process.env.VUE_APP_VIEW_SIZE ? JSON.parse(process.env.VUE_APP_VIEW_SIZE) : 20;
  const params = {
    statusId: "INV_COUNT_COMPLETED,INV_COUNT_REJECTED",
    statusId_op: "in",
    facilityId: query.value.facilityIds.join(","),
    facilityId_op: "in",
    pageSize,
    pageIndex
  } as any;

  if(query.value.queryString.length) {
    params["countImportName"] = query.value.queryString
    params["countImportName_op"] = "contains"
  }

  // created after date
  if(query.value.createdDate_from) {
    params["createdDate_from"] = convertIsoToMillis(query.value.createdDate_from, "from");
  }
  // created before date
  if(query.value.createdDate_thru) {
    params["createdDate_thru"] = convertIsoToMillis(query.value.createdDate_thru, "thru");
  }
  // closed after date
  if(query.value.closedDate_from) {
    params["closedDate_from"] = convertIsoToMillis(query.value.closedDate_from, "from");
  }
  // closed before date
  if(query.value.closedDate_thru) {
    params["closedDate_thru"] = convertIsoToMillis(query.value.closedDate_thru, "thru");
  }

  try {
    do {
      resp = await CountService.fetchCycleCounts(params);
      if(!hasError(resp) && resp.data?.length) {
        counts = counts.concat(resp.data)
        pageIndex++;
      } else {
        throw resp
      }
    } while(resp.data.length >= pageSize)
  } catch(err) {
    logger.error(err)
  }

  if(!counts.length) return [];
  let countItems = [] as any, count = {} as any;

  for(count of counts) {
    let items = [] as any, resp, index = 0;
    try {
      do {
        resp = await CountService.fetchCycleCountItems({ inventoryCountImportId : count.inventoryCountImportId, pageSize: 100, pageIndex: index })
        if(!hasError(resp) && resp.data?.itemList?.length) {
          items = items.concat(resp.data.itemList)
          index++;
        } else {
          throw resp.data;
        }
      } while(resp.data.itemList?.length >= 100)
    } catch(err) {
      logger.error(err)
      items = []
    }

    countItems = countItems.concat(items);
  }

  return countItems
}

async function fetchProducts(productIds: any){
  await store.dispatch("product/fetchProducts", { productIds });
}

async function downloadCSV() {
  if(!query.value.facilityIds?.length) {
    showToast(translate("Please select atleast one facility in filters."))
    return;
  }

  if(!(query.value.createdDate_from && query.value.createdDate_thru) && !(query.value.closedDate_from && query.value.closedDate_thru)) {
    showToast(translate("Please select atleast one of the date filter range."))
    return;
  }

  await modalController.dismiss({ dismissed: true });
  await updateMappingPreference();
  emitter.emit("presentLoader", { message: "Preparing file to downlaod...", backdropDismiss: true });
  
  const facilityDetails = getFacilityDetails();
  const selectedFieldMappings: any = {
    countId: "inventoryCountImportId",
    countName: "countImportName",
    acceptedByUser: "acceptedByUserLoginId",
    createdDate: "createdDate",
    lastSubmittedDate: "lastSubmittedDate",
    closedDate: "closedDate",
    facility: "facilityId",
    primaryProductId: "primaryProductId",
    secondaryProductId: "secondaryProductId",
    lineStatus: "statusId",
    expectedQuantity: "qoh",
    countedQuantity: "quantity",
    variance: "varianceQuantityOnHand",
  };
  
  const selectedData = Object.keys(selectedFields.value).filter((field) => selectedFields.value[field]);
  
  const cycleCountItems = await fetchBulkCycleCountItems();
  await fetchProducts([... new Set(cycleCountItems.map((item: any) => item.productId))]);
  
  const downloadData = await Promise.all(cycleCountItems.map(async (item: any) => {
    const facility = facilityDetails[item?.facilityId];
    const product = getProduct.value(item.productId)

      const cycleCountDetails = selectedData.reduce((details: any, property: any) => {
        if (property === 'createdDate') {
          details[property] = getDateWithOrdinalSuffix(item.createdDate);
        } else if (property === 'lastSubmittedDate') {
          details[property] = getLastSubmittedDate(item);
        } else if (property === 'closedDate') {
          details[property] = getClosedDate(item);
        } else if (property === 'facility') {
          details[property] = facility[selectedFacilityField.value];
        } else if (property === 'primaryProductId') {
          details[property] = product.productId ? getProductIdentificationValue(selectedPrimaryProductId.value, product) : item.productId;
        } else if (product.productId && property === 'secondaryProductId') {
          details[property] = getProductIdentificationValue(selectedSecondaryProductId.value, product);
        } else if (property === 'countName' && item.countImportName) {
          details[property] = item.countImportName;
        } else if (property === "lineStatus") {
          details[property] = item.itemStatusId === 'INV_COUNT_COMPLETED' ? 'Completed' : item.itemStatusId === 'INV_COUNT_REJECTED' ? 'Rejected' : item.itemStatusId;
        } else {
          details[property] = item[selectedFieldMappings[property]];
        }
        return details;
      }, {});

      return cycleCountDetails;
  }));
  
  const fileName = `CycleCounts-${DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}.csv`;
  await jsonToCsv(downloadData, { download: true, name: fileName });
  emitter.emit("dismissLoader")
}

async function updateMappingPreference() {
  // Only fields those are selected by the user
  const selectedData = Object.keys(selectedFields.value).filter((field) => selectedFields.value[field]);

  const mappedData: Array<string> = selectedData.map((key: string) => {
    if(key === "facility") {
      return `facility:${selectedFacilityField.value}`
    }

    if(key === "primaryProductId") {
      return `primaryProductId:${selectedPrimaryProductId.value}`
    }

    if(key === "secondaryProductId") {
      return `secondaryProductId:${selectedSecondaryProductId.value}`
    }

    return key;
  })

  // No changes have been made in the mappings, so no need to update the user preference
  if(savedFieldMappings.value === mappedData.join(",")) {
    return;
  }

  try {
    await UserService.updateUserPreference(userProfile.value.partyId, process.env.VUE_APP_DOWNLOAD_MAPPING_INVCOUNT as string, mappedData.join(","))
  } catch(err) {
    logger.error("Failed to update user preference for mapping")
  }
}
</script>

<style scoped>
 ion-content {
    --padding-bottom: 70px;
  }
</style>