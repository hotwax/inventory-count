<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Import CSV") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item>
      <ion-select :label="translate('Product identifier')" interface="popover" placeholder="Select">
        <ion-select-option>example-1</ion-select-option>
        <ion-select-option>example-2</ion-select-option>
        <ion-select-option>example-3</ion-select-option>
      </ion-select>
    </ion-item>
    
    <ion-list>
      <ion-list-header>{{ translate("Select the column containing products") }}</ion-list-header>
      <ion-radio-group>
        <ion-item>
          <ion-radio justify="space-between">column 1</ion-radio>
        </ion-item>
        <ion-item>
          <ion-radio justify="space-between">column 2</ion-radio>
        </ion-item>
      </ion-radio-group>
    </ion-list>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button>
        <ion-icon :icon="saveOutline"/>  
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>
  
<script lang="ts">
import { 
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components'

export default defineComponent({
  name: "DraftImportCsvModal",
  components: { 
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonListHeader,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true});
    },
  },
  setup() {

    return {
      closeOutline,
      saveOutline,
      translate
    };
  },
});
</script>
    