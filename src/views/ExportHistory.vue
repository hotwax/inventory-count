<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/closed" data-testid="export-history-back-btn"></ion-back-button>
        </ion-buttons>
        <ion-title data-testid="export-history-page-title">{{ translate("Export history") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list data-testid="export-history-list">
        <ion-list-header data-testid="export-history-header">
          <ion-label data-testid="export-history-header-label">{{ translate("Latest exports are at the top") }}</ion-label>
        </ion-list-header>
        <div class="list-item" v-for="message in systemMessages" :key="message.systemMessageId" :data-testid="'export-history-item-' + message.systemMessageId">
          <ion-item lines="none" data-testid="export-history-item-header">
            <ion-icon :icon="documentOutline" slot="start"></ion-icon>
            <ion-label data-testid="export-history-item-label">
              <span data-testid="export-history-item-filename">{{ extractFilename(message) || '-' }}</span>
              <p data-testid="export-history-item-id">{{ message.systemMessageId }}</p>
            </ion-label>
          </ion-item>
          <ion-label data-testid="export-history-item-created-date">
            <span data-testid="export-history-item-created-date-val">{{ formatDate(message.initDate) }}</span>
            <p data-testid="export-history-item-created-date-label">{{ translate("Created Date") }}</p>
          </ion-label>
          <ion-label data-testid="export-history-item-exported-date">
            <span data-testid="export-history-item-exported-date-val">{{ formatDate(message.processedDate) }}</span>
            <p data-testid="export-history-item-exported-date-label">{{ translate("Exported Date") }}</p>
          </ion-label>
          <ion-label data-testid="export-history-item-user">
            <span data-testid="export-history-item-user-val">{{ getUserLogin(message) || '-' }}</span>
            <p data-testid="export-history-item-user-label">{{ translate("User Login") }}</p>
          </ion-label>
          <ion-chip outline :color="getStatusColor(message)" data-testid="export-history-item-status-chip">
            <ion-label data-testid="export-history-item-status-label">{{ getStatusLabel(message) }}</ion-label>
          </ion-chip>
          <ion-button v-if="isExportFailed(message)" fill="clear" color="danger" :aria-label="translate('View error')" @click.stop="openErrorModal(message)" data-testid="export-history-item-view-error-btn">
            <ion-icon slot="icon-only" :icon="alertCircleOutline"></ion-icon>
          </ion-button>
          <ion-button v-else fill="clear" color="tertiary" :disabled="message.statusId !== 'SmsgSent' || !extractFilename(message)" @click.stop="downloadExport(message)" data-testid="export-history-item-download-btn">
            <ion-icon slot="icon-only" :icon="downloadOutline"></ion-icon>
          </ion-button>
        </div>
      </ion-list>
    </ion-content>

    <ion-modal :is-open="isErrorModalOpen" @did-dismiss="closeErrorModal" data-testid="export-history-error-modal">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeErrorModal" data-testid="export-history-error-modal-close-btn">
              <ion-icon slot="icon-only" :icon="close" />
            </ion-button>
          </ion-buttons>
          <ion-title data-testid="export-history-error-modal-title">{{ translate("Export error") }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list data-testid="export-history-error-modal-list">
          <ion-list-header>
            <ion-label>{{ selectedMessageId }}</ion-label>
          </ion-list-header>
          <ion-item v-if="!isErrorLoading" lines="none" data-testid="export-history-error-modal-msg-item">
            <ion-label class="ion-text-wrap" data-testid="export-history-error-modal-msg">
              <template v-if="exportError?.errorText">
                {{ exportError.errorText }}
                <p>{{ formatDate(exportError.errorDate) }}</p>
              </template>
              <template v-else>
                {{ translate("No data found") }}
              </template>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonList, IonItem, IonLabel, IonIcon, IonChip, IonListHeader, IonModal, onIonViewDidEnter } from '@ionic/vue';
import { ref } from 'vue';
import { commonUtil, translate, logger } from '@common';
import { alertCircleOutline, close, documentOutline, downloadOutline } from 'ionicons/icons';
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { saveAs } from 'file-saver';

const systemMessages = ref<any[]>([]);
const isErrorModalOpen = ref(false);
const isErrorLoading = ref(false);
const selectedMessageId = ref('');
const exportError = ref<any>(null);

onIonViewDidEnter(async () => {
  await fetchExportHistory();
});

async function fetchExportHistory() {
  try {
    const resp = await useInventoryCountRun().getExportedCycleCountsSystemMessages({systemMessageTypeId: 'ExportInventoryCounts', orderByField: 'initDate DESC'});

    if (!commonUtil.hasError(resp)) {
      const data = resp?.data || {};
      systemMessages.value = Array.isArray(data.systemMessages) ? data.systemMessages : Array.isArray(data) ? data : [];
    } else {
      systemMessages.value = [];
      throw resp.data;
    }
  } catch (err) {
    logger.error('Error fetching exported cycle counts system messages', err);
    systemMessages.value = [];
    commonUtil.showToast(translate('Failed to load export history.'));
  }
}

function formatDate(value: any) {
  return value ? commonUtil.getDateTimeWithOrdinalSuffix(value) : '-';
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

// A failed send puts the message back to SmsgProduced with failCount incremented, so a
// produced message that has already failed is an error, not an export in progress.
function isExportFailed(message: any) {
  return message.statusId === 'SmsgError' || (message.statusId === 'SmsgProduced' && Number(message.failCount) > 0);
}

function getStatusLabel(message: any) {
  if (isExportFailed(message)) return translate('Error');
  if (message.statusId === 'SmsgSending' || message.statusId === 'SmsgProduced') return translate('Exporting');
  if (message.statusId === 'SmsgSent') return extractFilename(message) ? translate('Generated') : translate('No file');
  return message.statusId || '';
}

function getStatusColor(message: any) {
  if (isExportFailed(message)) return 'danger';
  if (message.statusId === 'SmsgSent' && !extractFilename(message)) return 'medium';
  return commonUtil.getStatusColor(message.statusId);
}

async function openErrorModal(message: any) {
  selectedMessageId.value = message.systemMessageId;
  exportError.value = null;
  isErrorLoading.value = true;
  isErrorModalOpen.value = true;
  try {
    const resp = await useInventoryCountRun().getCycleCountImportErrors({ systemMessageId: message.systemMessageId });
    if (!commonUtil.hasError(resp)) {
      const errors = Array.isArray(resp?.data) ? resp.data : [];
      // Show the most recent attempt's error
      exportError.value = errors.sort((a: any, b: any) => (b.errorDate || 0) - (a.errorDate || 0))[0] || null;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to fetch export errors', err);
  } finally {
    isErrorLoading.value = false;
  }
}

function closeErrorModal() {
  isErrorModalOpen.value = false;
}


async function downloadExport(message: any) {
  try {
    const resp = await useInventoryCountRun().getExportedCycleCountsFileData({
      systemMessageId: message.systemMessageId
    });

    if (!commonUtil.hasError(resp)) {
      const csvData = resp?.data?.csvData || resp.data;
      downloadCsv(csvData, extractFilename(message) || 'CycleCountsExport.csv');
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to download exported cycle count file', err);
    commonUtil.showToast(translate('Failed to download exported cycle count file.'));
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
