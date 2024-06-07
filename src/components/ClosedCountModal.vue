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
        <ion-checkbox justify="start" label-placement="end">{{ translate("Count ID") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Count name") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Accepted by user") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Created date") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Last submitted date") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Closed date") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Facility") }}</ion-checkbox>
      </ion-item>
      <ion-item lines="inset">
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
      </ion-item> 
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Expected quantity") }}</ion-checkbox>
      </ion-item>
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Counted quantity") }}</ion-checkbox>
      </ion-item> 
      <ion-item>
        <ion-checkbox justify="start" label-placement="end">{{ translate("Variance") }}</ion-checkbox>
      </ion-item> 
    </ion-list>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button>
      <ion-icon :icon="cloudDownloadOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
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
import { defineComponent } from "vue";
import { closeOutline, cloudDownloadOutline } from "ionicons/icons";
import { translate } from '@/i18n'
  
export default defineComponent({
  name: "ClosedCountModal",
  components: {
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
    IonToolbar
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true});
    },
  },
  setup() {

    return {
      closeOutline,
      cloudDownloadOutline,
      translate
    };
  },
});
</script>