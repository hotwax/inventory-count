<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ systemMessage.systemMessageId }}</ion-list-header>
      <ion-item v-if="systemMessage.statusId === 'SmsgReceived'" button @click="cancelUpload()">
        <ion-icon slot="end" />
        {{ translate("Cancel") }}
      </ion-item>
      <ion-item v-if="systemMessage.statusId === 'SmsgError'" button @click="viewErrorModal()">
        <ion-icon slot="end"/>
        {{ translate("View error") }}
      </ion-item>
      <ion-item lines="none" button @click="viewFile()">
        <ion-icon slot="end"/>
        {{ translate("View file") }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  IonListHeader,
  modalController,
  popoverController
} from "@ionic/vue"
import { defineProps } from "vue";
import { translate } from "@/i18n"
import store from "@/store";
import { downloadCsv, hasError, showToast } from "@/utils";
import logger from "@/logger";
import BulkUploadErrorModal from "./BulkUploadErrorModal.vue";

import { useInventoryCountImport } from "@/composables/useInventoryCountImport";

const { fetchCycleCountUploadedFileData, cancelCycleCountFileProcessing } = useInventoryCountImport();

const props = defineProps(["systemMessage", "fileName"])

function closePopover() {
  popoverController.dismiss()
}
async function viewFile() {
  try {
    const resp = await fetchCycleCountUploadedFileData({
      systemMessageId: props.systemMessage.systemMessageId,
    });
    if (!hasError(resp)) {
      downloadCsv(resp.data.csvData, props.fileName)
    } else {
      throw resp.data;
    }
  } catch (err) {
    showToast(translate('Failed to download uploaded cycle count file.'))
    logger.error(err);
  }
  closePopover()
}
async function viewErrorModal() {
  const bulkUploadErrorModal = await modalController.create({
    component: BulkUploadErrorModal,
    componentProps: { systemMessage: props.systemMessage }
  });

  // dismissing the popover once the picker modal is closed
  bulkUploadErrorModal.onDidDismiss().finally(() => {
    closePopover();
  });
  return bulkUploadErrorModal.present();
}
async function cancelUpload () {
  try {
    const resp = await cancelCycleCountFileProcessing({
      systemMessageId: props.systemMessage.systemMessageId,
      statusId: 'SmsgCancelled'
    });
    if (!hasError(resp)) {
      showToast(translate('Cycle count cancelled successfully.'))
      await store.dispatch('count/fetchCycleCountImportSystemMessages')
    } else {
      throw resp.data;
    }
  } catch (err) {
    showToast(translate('Failed to cancel uploaded cycle count.'))
    logger.error(err);
  }
  closePopover()
}
</script>