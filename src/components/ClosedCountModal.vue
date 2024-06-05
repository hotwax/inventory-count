<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button>
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Download results") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-list-header>
        <ion-label>Select fields</ion-label>
      </ion-list-header>
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Count ID</ion-label>
      </ion-item>
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Count name</ion-label>
      </ion-item>
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Accepted by user</ion-label>
      </ion-item>
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Created date</ion-label>
      </ion-item>
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Last submitted date</ion-label>
      </ion-item>
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Closed date</ion-label>
      </ion-item>
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Facility</ion-label>
      </ion-item>
      <ion-item lines="inset">
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Primary product ID</ion-label>
        <ion-select aria-label="Label" interface="popover" value="default" slot="end">
          <ion-select-option value="default">SKU</ion-select-option>
          <ion-select-option>Product store ID</ion-select-option>
          <ion-select-option>UPC</ion-select-option>
        </ion-select>
      </ion-item> 
      <ion-item lines="inset">
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Secondary Product ID</ion-label>
        <ion-select aria-label="Label" interface="popover" value="default" slot="end">
          <ion-select-option value="default">Product ID</ion-select-option>
          <ion-select-option>Product store ID</ion-select-option>
        </ion-select>
      </ion-item> 
      <ion-item lines="inset">
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Line status</ion-label>
        <ion-select aria-label="Label" interface="popover" value="all" slot="end">
          <ion-select-option value="all">All</ion-select-option>
          <ion-select-option>Counted</ion-select-option>
          <ion-select-option>Pending</ion-select-option>
        </ion-select>
      </ion-item> 
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Expected quantity</ion-label>
      </ion-item>
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Counted quantity</ion-label>
      </ion-item> 
      <ion-item>
        <ion-checkbox aria-label="Label" slot="start"></ion-checkbox>
        <ion-label>Variance</ion-label>
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
  IonToolbar
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
  setup() {

    return {
      closeOutline,
      cloudDownloadOutline,
      translate
    };
  },
});
</script>