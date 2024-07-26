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
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.countId">{{ translate("Count ID") }}</ion-checkbox>
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
        <ion-checkbox justify="start" label-placement="end" v-model="selectedFields.facility">{{ translate("Facility") }}</ion-checkbox>
        <ion-select aria-label="facilityField" interface="popover" v-model="selectedFacilityField" slot="end">
          <ion-select-option value="facilityId">Internal Id</ion-select-option>
          <ion-select-option value="externalId">External Id</ion-select-option>
          <ion-select-option value="facilityName">Facility name</ion-select-option>
        </ion-select>
      </ion-item>
      <!-- <ion-item lines="inset">
        <ion-checkbox justify="start" label-placement="end">{{ translate("Primary product ID") }}</ion-checkbox>
        <ion-select aria-label="primaryProduct" interface="popover" value="default" slot="end">
          <ion-select-option value="default">SKU</ion-select-option>
          <ion-select-option>Product store ID</ion-select-option>
          <ion-select-option>UPC</ion-select-option>
        </ion-select>
      </ion-item> 
      <ion-item lines="inset">
        <ion-checkbox justify="start" label-placement="end">{{ translate("Secondary product ID") }}</ion-checkbox>
        <ion-select aria-label="secondaryProduct" interface="popover" value="default" slot="end">
          <ion-select-option value="default">Product ID</ion-select-option>
          <ion-select-option>Product store ID</ion-select-option>
        </ion-select>
      </ion-item> 
      <ion-item lines="inset">
        <ion-checkbox justify="start" label-placement="end">{{ translate("Line status") }}</ion-checkbox>
        <ion-select aria-label="lineStatus" interface="popover" value="all" slot="end">
          <ion-select-option value="all">All</ion-select-option>
          <ion-select-option>Counted</ion-select-option>
          <ion-select-option>Pending</ion-select-option>
        </ion-select>
      </ion-item>  -->
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
import { getDateWithOrdinalSuffix, showToast, hasError, jsonToCsv } from "@/utils";
import { CountService } from "@/services/CountService"
import { translate } from '@/i18n';
import { DateTime } from "luxon";
import logger from "@/logger";
import store from "@/store";


const cycleCounts = computed(() => store.getters["count/getCounts"])
const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
const facilities = computed(() => store.getters["user/getFacilities"])
const currentFacility = computed(() => store.getters["user/getCurrentFacility"])

const selectedFields: any = ref({
  countId: false,
  countName: false,
  acceptedByUser: false,
  createdDate: false,
  lastSubmittedDate: false,
  closedDate: false,
  facility: false,
  expectedQuantity: false,
  countedQuantity: false,
  variance: false
});
const selectedFacilityField = ref('facilityId');


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

async function fetchCycleCountItems(countId: any) {
  try {
    const resp = await CountService.fetchCycleCountItems(countId.inventoryCountImportId);
    if(!hasError(resp) && resp.data?.itemList?.length) {
      return resp?.data;
    }
  } catch (err) {
    logger.error(err);
    return [];
  }
}

function getExpectedCount(items: any) {
  let totalItemsExpectedCount = 0;
  items?.itemList.map((item: any) => {
    totalItemsExpectedCount += parseInt(item.qoh || 0);
  });
  return totalItemsExpectedCount;
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
    variance: "varianceQuantityOnHand"
  };

  const selectedData = Object.keys(selectedFields.value).filter((field) => selectedFields.value[field]);
  console.log("selectedData", selectedData);

  if (!selectedData.length) {
    showToast(translate('Please select at least one field to generate CSV'));
    return;
  }

  const downloadData = await Promise.all(cycleCounts.value.map(async (count: any) => {
    const cycleCountItems = await fetchCycleCountItems(count);
    const facility = facilityDetails[count.facilityId];
    return cycleCountItems?.itemList.map((item: any) => {
      const cycleCountDetails = selectedData.reduce((details: any, property: any) => {
        if (property === 'createdDate') {
          details[property] = getDateWithOrdinalSuffix(count.createdDate);
        } else if (property === 'lastSubmittedDate') {
          details[property] = getLastSubmittedDate(count);
        } else if (property === 'closedDate') {
          details[property] = getClosedDate(count);
        } else if (property === 'facility') {
          details[property] = facility[selectedFacilityField.value];
        } else {
          details[property] = item[selectedFieldMappings[property]];
        }
        return details;
      }, {});
      return cycleCountDetails
    });
  }));

  const flattenedData = downloadData.flat().filter((data: any) => data);

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
        await jsonToCsv(flattenedData, { download: true, name: fileName });
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