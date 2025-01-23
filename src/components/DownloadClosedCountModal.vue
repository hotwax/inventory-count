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
import { computed, ref } from "vue";
import { closeOutline, cloudDownloadOutline } from "ionicons/icons";
import { getDateWithOrdinalSuffix, getProductIdentificationValue, hasError, jsonToCsv } from "@/utils";
import { CountService } from "@/services/CountService"
import { translate } from '@/i18n';
import { DateTime } from "luxon";
import logger from "@/logger";
import store from "@/store";


const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const facilities = computed(() => store.getters["user/getFacilities"])
const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))
const query = computed(() => store.getters["count/getQuery"])

const productIdentifications = {
  "Internal ID": "productId",
  "Internal Name": "internalName",
  "SKU": "SKU",
  "UPC": "UPCA"
};

const selectedFields: any = ref({
  countId: true,
  countName: true,
  acceptedByUser: true,
  createdDate: true,
  lastSubmittedDate: true,
  closedDate: true,
  facility: true,
  primaryProductId: true,
  secondaryProductId: true,
  lineStatus: true,
  expectedQuantity: true,
  countedQuantity: true,
  variance: true,
});

const selectedFacilityField: any = ref('facilityId');
const selectedPrimaryProductId: any = ref('productId');
const selectedSecondaryProductId: any = ref('productId');

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
  let payload = {
    statusId: "INV_COUNT_COMPLETED",
    pageSize: 200,
    facilityId: query.value.facilityIds,
    pageIndex: 0
  };

  let allItems = [] as any;
  let resp;

  try {
    do {
      resp = await CountService.fetchBulkCycleCountItems(payload);
      if (!hasError(resp) && resp?.data.itemList.length) {
        allItems = allItems.concat(resp.data.itemList);
        payload.pageIndex++;
      } else {
        throw resp.data;
      }
    } while (resp.data.itemList.length >= payload.pageSize);
  } catch (err) {
    logger.error(err);
    return [];
  }

  return allItems;
}

async function fetchProducts(productIds: any){
  await store.dispatch("product/fetchProducts", { productIds });
}

async function downloadCSV() {
  await modalController.dismiss({ dismissed: true });
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
</script>

<style scoped>
 ion-content {
    --padding-bottom: 70px;
  }
</style>