<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal"> 
            <ion-icon :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Import Error") }}</ion-title>
      </ion-toolbar>
    </ion-header>
  
    <ion-content>
      <ion-list>
        <ion-item lines="full">
          <ion-icon :icon="bookOutline" slot="start"/>
          {{ translate("View upload guide") }}
          <ion-button size="default" color="medium" fill="clear" slot="end" @click="viewUploadGuide">
            <ion-icon slot="icon-only" :icon="openOutline"/>
          </ion-button>
        </ion-item>
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <template v-if="systemMessageError.errorText">
              {{ systemMessageError.errorText }}
            </template>
            <template v-else>
              {{ translate("No data found") }}
            </template>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </template>

<script setup>
import {
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar,
  IonList,
  modalController
} from '@ionic/vue';

import { bookOutline, close, openOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { defineProps, onMounted, ref } from 'vue';
import { translate } from "@hotwax/dxp-components";
import { CountService } from "@/services/CountService"
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { hasError } from "@/utils";
import logger from "@/logger";

const store = useStore();
let systemMessageError = ref({})

const { fetchCycleCountImportErrors } = useInventoryCountImport();

const props = defineProps(["systemMessage"])
onMounted(async() => {
  await fetchCycleCountImportErrorsFromServer()
})

function viewUploadGuide() {
  window.open('https://docs.hotwax.co/documents/retail-operations/inventory/introduction/draft-cycle-count', '_blank');
}
function closeModal() {
  modalController.dismiss({ dismissed: true });
}

async function fetchCycleCountImportErrorsFromServer () {
  try {
    const resp = await fetchCycleCountImportErrors({
      systemMessageId: props.systemMessage.systemMessageId,
    });
    if (!hasError(resp)) {
      systemMessageError.value = resp?.data[0]
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
  }
}
</script>