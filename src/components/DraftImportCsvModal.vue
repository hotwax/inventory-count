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
      <ion-select :label="translate('Product identifier')" interface="popover" :placeholder="translate('Select')" v-model="selectedIdentifier">
        <ion-select-option v-for="identification in productIdentifications" :key="identification">{{ identification }}</ion-select-option>
      </ion-select>
    </ion-item>
    
    <ion-list>
      <ion-list-header>{{ translate("Select the column containing products") }}</ion-list-header>
      <ion-radio-group v-model="selectedColumn">
        <ion-item v-for="column in fileColumns" :key="column">
          <ion-radio :value="column" justify="space-between">{{ column }}</ion-radio>
        </ion-item>
      </ion-radio-group>
    </ion-list>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="saveImportData">
        <ion-icon :icon="saveOutline"/>  
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>
  
<script setup lang="ts">
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
import { defineProps, ref } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import { showToast } from "@/utils";


const props = defineProps(["fileColumns", "content", "countId"])
const productIdentifications = process.env.VUE_APP_PRDT_IDENT ? JSON.parse(process.env.VUE_APP_PRDT_IDENT) : []

const selectedIdentifier = ref('')
const selectedColumn = ref('')

function closeModal(identifierData: any) {
  if (!identifierData || !identifierData.length) {
    identifierData = null;
  }
  modalController.dismiss({ dismissed: true, identifierData });
}

function saveImportData() {
  if (!selectedIdentifier.value) {
    showToast(translate("Please select a Product identifier"));
  }

  if (!selectedColumn.value) {
    showToast(translate("Please select the column that corresponds to the product identifier"));
  }

  const identifierData = props.content.map((row: any) => {
    return {
      idType: selectedIdentifier.value,
      idValue: row[selectedColumn.value]
    }
  })

  closeModal(identifierData)
}


</script>
    