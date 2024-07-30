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
          <ion-select-option value="facilityId">Internal Id</ion-select-option>
          <ion-select-option value="externalId">External Id</ion-select-option>
          <ion-select-option value="facilityName">Facility name</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="inset">
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.primaryProductId" disabled>{{ translate("Primary product ID") }}</ion-checkbox>
        <ion-select aria-label="primaryProduct" interface="popover" value="default" slot="end" v-model="selectedPrimaryProductId">
          <ion-select-option v-for="identification in productIdentifications" :key="identification">{{ identification }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="inset">
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.secondaryProductId">{{ translate("Secondary product ID") }}</ion-checkbox>
        <ion-select aria-label="secondaryProduct" interface="popover" value="default" slot="end" v-model="selectedSecondaryProductId">
          <ion-select-option v-for="identification in productIdentifications" :key="identification">{{ identification }}</ion-select-option>
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
  alertController,
  modalController
} from "@ionic/vue";
import { computed, ref } from "vue";
import { closeOutline, cloudDownloadOutline } from "ionicons/icons";
import { getDateWithOrdinalSuffix, getProductIdentificationValue, hasError, jsonToCsv } from "@/utils";
import { CountService } from "@/services/CountService"
import { translate } from '@/i18n';
import { DateTime } from "luxon";
import logger from "@/logger";
import store from "@/store";


const cycleCounts = computed(() => store.getters["count/getCounts"])
const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const facilities = computed(() => store.getters["user/getFacilities"])
const currentFacility = computed(() => store.getters["user/getCurrentFacility"])

const productIdentifications = ["productId", "SKU", "UPCA", "SHOPIFY_PROD_SKU", "SHOPIFY_PROD_ID"]

const selectedFields: any = ref({
  countId: true,
  countName: false,
  acceptedByUser: false,
  createdDate: false,
  lastSubmittedDate: false,
  closedDate: false,
  facility: true,
  expectedQuantity: false,
  countedQuantity: false,
  variance: false,
  primaryProductId: true,
  secondaryProductId: false,
  lineStatus: false
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
      facilityName: facility.facilityName
    };
    return details;
  }, {});
}

async function fetchBulkCycleCountItems() {
  let payload = {
    statusId: "INV_COUNT_COMPLETED",
    pageSize: 200,
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
  try {
    const resp = await store.dispatch("product/fetchProducts", { productIds });
    if (!hasError(resp) && resp.data?.response.docs.length) {
      return resp.data.response.docs;
    }
  } catch (err) {
    logger.error(err);
  }
  return [];
}

async function downloadCSV() {
  const facilityDetails = getFacilityDetails();
  const selectedFieldMappings: any = {
    countId: "inventoryCountImportId",
    countName: "countImportName",
    acceptedByUser: "uploadedByUserLogin",
    createdDate: "createdDate",
    lastSubmittedDate: "lastSubmittedDate",
    closedDate: "closedDate",
    facility: "facilityId",
    expectedQuantity: "qoh",
    countedQuantity: "quantity",
    variance: "varianceQuantityOnHand",
    primaryProductId: "primaryProductId",
    secondaryProductId: "secondaryProductId",
    lineStatus: "statusId"
  };

  const selectedData = Object.keys(selectedFields.value).filter((field) => selectedFields.value[field]);
  
  const cycleCountItems = await fetchBulkCycleCountItems();
  const products = await fetchProducts([... new Set(cycleCountItems.map((item: any) => item.productId))]);
  
  const downloadData = await Promise.all(cycleCountItems.map(async (item: any) => {
    const facility = facilityDetails[item?.facilityId];
    const product = products?.find((product: any) => product.productId === item.productId);

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
        details[property] = getProductIdentificationValue(selectedPrimaryProductId.value, product);
      } else if (property === 'secondaryProductId') {
        details[property] = getProductIdentificationValue(selectedSecondaryProductId.value, product);
      } else {
        details[property] = item[selectedFieldMappings[property]];
      }
      return details;
    }, {});
  
    return cycleCountDetails;
  }));

  const alert = await alertController.create({
    header: translate("Download closed counts"),
    message: translate("Are you sure you want to download the cycle counts?"),
    buttons: [{
      text: translate("Cancel"),
      role: 'cancel',
    }, {
      text: translate("Download"),
      handler: async () => {
        const fileName = `CycleCounts-${currentFacility.value.facilityId}-${DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}.csv`;
        await jsonToCsv(downloadData, { download: true, name: fileName });
        modalController.dismiss({ dismissed: true });
      }
    }]
  });
  return alert.present();
}
</script>

<style scoped>
 ion-content {
    --padding-bottom: 70px;
  }
</style>