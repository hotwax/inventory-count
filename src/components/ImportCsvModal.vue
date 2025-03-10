<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal()"> 
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
const productIdentifications = ["productId", "SKU", "UPCA", "SHOPIFY_PROD_ID"]

const selectedIdentifier = ref('')
const selectedColumn = ref('')

function closeModal(identifierData: any = {}) {
  modalController.dismiss({ dismissed: true, identifierData });
}

function saveImportData() {
  if (!selectedIdentifier.value) {
    return showToast(translate("Please select a Product identifier"));
  }

  if (!selectedColumn.value) {
    return showToast(translate("Please select the column that corresponds to the product identifier"));
  }

  const idType = selectedIdentifier.value;
  const idValues = props.content.map((row: any) => row[selectedColumn.value]).filter(data => data);

  let identifierData = {
    idType: idType,
    idValue: idValues
  };

  closeModal(identifierData);
}

</script>
    
<style scoped>
 ion-content {
    --padding-bottom: 70px;
  }
</style>