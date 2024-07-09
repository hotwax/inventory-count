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
        <ion-select aria-label="primaryProduct" interface="popover" value="default" slot="end">
          <ion-select-option value="default">Internal Id</ion-select-option>
          <ion-select-option>External Id</ion-select-option>
          <ion-select-option>Facility name</ion-select-option>
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
import { getCycleCountStats, getDateWithOrdinalSuffix, showToast, jsonToCsv } from "@/utils"
import { translate } from '@/i18n';
import { DateTime } from "luxon";
import store from "@/store";


const cycleCounts = computed(() => store.getters["count/getCounts"])
const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))
  
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

function closeModal() {
  modalController.dismiss({ dismissed: true});
}

function getLastSubmittedDate(count: any) {
  const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory;
  if (!history) {
    return "-";
  }

  const submissionStatus = history.toReversed().find((status: any) => status.statusId === "INV_COUNT_COMPLETED");
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

async function downloadCSV() {
  
  const selectedFieldMappings: any = {
    countId: "inventoryCountImportId",
    countName: "countImportName",
    acceptedByUser: "uploadedByUserLogin",
    createdDate: "createdDate",
    lastSubmittedDate: "lastSubmittedDate",
    closedDate: "closedDate",
    facility: "facilityId",
    expectedQuantity: "expectedQuantity",
    countedQuantity: "itemCounted",
    variance: "totalVariance"
  };

  const selectedData = Object.keys(selectedFields.value).filter((field) => selectedFields.value[field]);

  if (!selectedData.length) {
    showToast(translate('Please select at least one field to generate CSV'));
    return;
  }

  const downloadData = cycleCounts.value.map((count: any) => {
    const orderInfo = selectedData.reduce((info: any, property: any) => {
      if (property === 'countedQuantity' || property === 'variance') {
        const stats = cycleCountStats.value(count.inventoryCountImportId);
        info[property] = stats[selectedFieldMappings[property]];
      } else if (property === 'lastSubmittedDate') {
        info[property] = getLastSubmittedDate(count);
      } else if (property === 'closedDate') {
        info[property] = getClosedDate(count);
      } else {
        info[selectedFieldMappings[property]] = count[selectedFieldMappings[property]];
      }
      return info;
    }, {});
    return orderInfo;
  });

  const alert = await alertController.create({
    header: translate("Download results"),
    message: translate("Make sure all the labels provided are correct."),
    buttons: [{
      text: translate("Cancel"),
      role: 'cancel',
    }, {
      text: translate("Download"),
      handler: async () => {
        const fileName = `CycleCounts-${DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}.csv`;
        await jsonToCsv(downloadData, { download: true, name: fileName });
      }
    }]
  });
  return alert.present();
}


</script>