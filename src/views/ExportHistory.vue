<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/closed"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ translate("Export history") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>{{ translate("Latest exports are at the top") }}</ion-label>
        </ion-list-header>
        <div class="list-item" v-for="message in systemMessages" :key="message.systemMessageId">
          <ion-item lines="none">
            <ion-icon :icon="documentOutline" slot="start"></ion-icon>
            <ion-label>
              {{ extractFilename(message) || '-' }}
              <p>{{ message.systemMessageId }}</p>
            </ion-label>
          </ion-item>
          <ion-label>
            {{ formatDate(message.initDate) }}
            <p>{{ translate("Created Date") }}</p>
          </ion-label>
          <ion-label>
            {{ formatDate(message.processedDate) }}
            <p>{{ translate("Exported Date") }}</p>
          </ion-label>
          <ion-label>
            {{ getUserLogin(message) || '-' }}
            <p>{{ translate("User Login") }}</p>
          </ion-label>
          <ion-chip outline :color="getStatusColor(message.statusId)">
            <ion-label>{{ getStatusLabel(message.statusId) }}</ion-label>
          </ion-chip>
          <ion-button fill="clear" color="tertiary" :disabled="message.statusId !== 'SmsgSent' || !extractFilename(message)" @click.stop="downloadExport(message)">
            <ion-icon slot="icon-only" :icon="downloadOutline"></ion-icon>
          </ion-button>
        </div>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonList, IonItem, IonLabel, IonIcon, IonChip, IonListHeader, onIonViewDidEnter } from '@ionic/vue';
import { ref } from 'vue';
import { translate } from '@common';
import { documentOutline, downloadOutline } from 'ionicons/icons';
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { hasError } from '@common';
import { showToast } from '@/services/uiUtils';
import logger from '@/logger';
import { getDateTimeWithOrdinalSuffix } from '@/services/utils';
import { saveAs } from 'file-saver';

const systemMessages = ref<any[]>([]);

onIonViewDidEnter(async () => {
  await fetchExportHistory();
});

async function fetchExportHistory() {
  try {
    const resp = await useInventoryCountRun().getExportedCycleCountsSystemMessages({systemMessageTypeId: 'ExportInventoryCounts', orderByField: 'initDate DESC'});

    if (!hasError(resp)) {
      const data = resp?.data || {};
      systemMessages.value = Array.isArray(data.systemMessages) ? data.systemMessages : Array.isArray(data) ? data : [];
    } else {
      systemMessages.value = [];
      throw resp.data;
    }
  } catch (err) {
    logger.error('Error fetching exported cycle counts system messages', err);
    systemMessages.value = [];
    showToast(translate('Failed to load export history.'));
  }
}

function formatDate(value: any) {
  return value ? getDateTimeWithOrdinalSuffix(value) : '-';
}

function getUserLogin(message: any) {
  const messageText = message?.messageText;
  if (!messageText) return '';
  if (typeof messageText === 'string') {
    try {
      const parsed = JSON.parse(messageText);
      return parsed.partyId || '';
    } catch {
      return '';
    }
  }
  return messageText.partyId || '';
}

function extractFilename(message: any) {
  const messageText = message?.messageText;
  let filePath = '';

  if (messageText) {
    if (typeof messageText === 'string') {
      try {
        const parsed = JSON.parse(messageText);
        filePath = parsed.filePath || '';
      } catch {
        filePath = '';
      }
    } else {
      filePath = messageText.filePath || '';
    }
  }

  if (!filePath) return '';
  const parts = filePath.split('/');
  return parts[parts.length - 1] || '';
}

function getStatusLabel(statusId: string) {
  if (statusId === 'SmsgSending' || statusId === 'SmsgProduced') return translate('Exporting');
  if (statusId === 'SmsgSent') return translate('Generated');
  if (statusId === 'SmsgError') return translate('Error');
  return statusId || '';
}

function getStatusColor(statusId: string) {
  if (statusId === 'SmsgSending') return 'medium';
  if (statusId === 'SmsgSent') return 'success';
  if (statusId === 'SmsgError') return 'danger';
  return 'medium';
}

async function downloadExport(message: any) {
  try {
    const resp = await useInventoryCountRun().getExportedCycleCountsFileData({
      systemMessageId: message.systemMessageId
    });

    if (!hasError(resp)) {
      const csvData = resp?.data?.csvData || resp.data;
      downloadCsv(csvData, extractFilename(message) || 'CycleCountsExport.csv');
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to download exported cycle count file', err);
    showToast(translate('Failed to download exported cycle count file.'));
  }
}

function downloadCsv(csv: any, fileName: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName ? fileName : 'CycleCountsExport.csv');
  return blob;
}
</script>

<style scoped>

.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

</style>
