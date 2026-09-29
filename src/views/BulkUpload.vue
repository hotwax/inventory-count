<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button data-testid="settings-menu-btn" />
        </ion-buttons>
        <ion-title data-testid="bulk-upload-page-title">{{ translate("Draft bulk") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="main">
        <ion-item lines="full" data-testid="bulk-upload-file-item">
          <ion-label data-testid="bulk-upload-file-label">{{ translate("Cycle count") }}</ion-label>
          <ion-label class="ion-text-right ion-padding-end" data-testid="bulk-upload-filename">{{ uploadedFile.name }}</ion-label>
          <input @change="parse" ref="file" class="ion-hide" type="file" id="inventoryCountInputFile" data-testid="bulk-upload-input"/>
          <label for="inventoryCountInputFile" data-testid="bulk-upload-label">{{ translate("Upload") }}</label>
        </ion-item>

        <ion-button color="medium" expand="block" @click="downloadTemplate" data-testid="bulk-upload-download-template-btn">
          {{ translate("Download template") }}
          <ion-icon slot="end" :icon="downloadOutline" />
        </ion-button>



        <ion-list class="field-mappings">
          <ion-item-divider color="light" data-testid="bulk-upload-required-divider">
            <ion-label>{{ translate("Required") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFilteredFields(fields, true)" :data-testid="'bulk-upload-required-field-' + field">
            <ion-select interface="popover" :disabled="!content.length" :placeholder="translate('Select')" v-model="fieldMapping[field]" :data-testid="'bulk-upload-required-field-select-' + field">
              <ion-label slot="label" class="ion-text-wrap" :data-testid="'bulk-upload-required-field-label-' + field">
                {{ translate(fieldValues.label) }}
                <p :data-testid="'bulk-upload-required-field-desc-' + field">{{ fieldValues.description }}</p>
              </ion-label>
              <ion-select-option v-if="field === 'productSku'" value="skip" data-testid="bulk-upload-field-option-skip">{{ translate("Skip") }}</ion-select-option>
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns" :value="prop" :data-testid="'bulk-upload-required-field-option-' + field + '-' + index">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item-divider color="light" data-testid="bulk-upload-optional-divider">
            <ion-label>{{ translate("Optional") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFilteredFields(fields, false)" :data-testid="'bulk-upload-optional-field-' + field">
            <ion-select interface="popover" :disabled="!content.length" :placeholder="translate('Select')" v-model="fieldMapping[field]" :data-testid="'bulk-upload-optional-field-select-' + field">
              <ion-label slot="label" class="ion-text-wrap" :data-testid="'bulk-upload-optional-field-label-' + field">
                {{ translate(fieldValues.label) }}
                <p :data-testid="'bulk-upload-optional-field-desc-' + field">{{ fieldValues.description }}</p>
              </ion-label>
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns" :value="prop" :data-testid="'bulk-upload-optional-field-option-' + field + '-' + index">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-button :disabled="!content.length" @click="save" expand="block" data-testid="bulk-upload-submit-btn">
          {{ translate("Submit") }}
          <ion-icon slot="end" :icon="cloudUploadOutline" />
        </ion-button>

        <ion-list v-if="dataManagerLogs.length" class="system-message-section" data-testid="bulk-upload-recent-list">
          <ion-list-header data-testid="bulk-upload-recent-header">
            <ion-label data-testid="bulk-upload-recent-title">
                {{ translate("Recently uploaded counts") }}
              </ion-label>
          </ion-list-header>
          <ion-item v-for="dataManagerLog in dataManagerLogs" :key="systemMessage.systemMessageId" :data-testid="'bulk-upload-recent-item-' + dataManagerLog.logId">
            <ion-label data-testid="bulk-upload-recent-item-label">
              <p class="overline" data-testid="bulk-upload-recent-item-id">{{ dataManagerLog.logId }}</p>
              <h2 data-testid="bulk-upload-recent-item-filename">{{ extractFilename(dataManagerLog?.contents.filter(content => content.logContentTypeEnumId === 'DmcntImported')[0].fileName ) }}</h2>
            </ion-label>
            <div slot="end" class="system-message-action" data-testid="bulk-upload-recent-item-actions">
              <ion-note data-testid="bulk-upload-recent-item-status">{{ getFileProcessingStatus(dataManagerLog) }}</ion-note>
              <ion-button size="default" fill="clear" color="medium" @click="openUploadActionPopover($event, dataManagerLog)" :data-testid="'bulk-upload-recent-item-popover-btn-' + systemMessage.systemMessageId">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>



    <ion-popover :is-open="isUploadPopoverOpen" :event="popoverEvent" @did-dismiss="closeUploadPopover" show-backdrop="false" data-testid="bulk-upload-popover">
      <ion-content data-testid="bulk-upload-popover-content">
        <ion-list data-testid="bulk-upload-popover-list">
          <ion-list-header data-testid="bulk-upload-popover-header">{{ selectedDataManagerLog?.logId }}</ion-list-header>
          <ion-item v-if="selectedDataManagerLog?.statusId === 'DmlsPending'" button @click="cancelUpload" data-testid="bulk-upload-cancel-btn">
            <ion-icon slot="end" />
            {{ translate("Cancel") }}
          </ion-item>
          <ion-item v-if="selectedDataManagerLog?.statusId === 'DmlsCrashed' || selectedDataManagerLog?.statusId === 'DmlsFailed' || selectedDataManagerLog.failedRecordCount > 0" button @click="viewFile(true)" data-testid="bulk-upload-view-error-btn">
            <ion-icon slot="end" />
            {{ translate("View error records") }}
          </ion-item>
          <ion-item lines="none" button @click="viewFile(false)" data-testid="bulk-upload-view-file-btn">
            <ion-icon slot="end" />
            {{ translate("View file") }}
          </ion-item>
        </ion-list>

        <ion-modal :is-open="isErrorModalOpen" :keep-contents-mounted="true" @did-dismiss="closeErrorModal" data-testid="bulk-upload-error-modal">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="closeErrorModal" data-testid="bulk-upload-error-modal-close-btn">
                  <ion-icon :icon="close" />
                </ion-button>
              </ion-buttons>
              <ion-title data-testid="bulk-upload-error-modal-title">{{ translate("Import Error") }}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content data-testid="bulk-upload-error-modal-content">
            <ion-list data-testid="bulk-upload-error-modal-list">
              <ion-item lines="full" data-testid="bulk-upload-error-modal-guide-item">
                <ion-icon :icon="bookOutline" slot="start" />
                {{ translate("View upload guide") }}
                <ion-button size="default" color="medium" fill="clear" slot="end" @click="viewUploadGuide" data-testid="bulk-upload-error-modal-guide-btn">
                  <ion-icon slot="icon-only" :icon="openOutline" />
                </ion-button>
              </ion-item>

              <ion-item lines="none" data-testid="bulk-upload-error-modal-msg-item">
                <ion-label class="ion-text-wrap" data-testid="bulk-upload-error-modal-msg">
                  <template v-if="dataManagerError?.errorText">
                    {{ dataManagerError.errorText }}
                  </template>
                  <template v-else>
                    {{ translate("No data found") }}
                  </template>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-content>
        </ion-modal>
      </ion-content>
    </ion-popover>
  </ion-page>
</template>

<script setup>
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonListHeader, IonNote,   IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewDidEnter, IonModal, IonPopover, IonButtons, IonMenuButton } from '@ionic/vue';
import { cloudUploadOutline, ellipsisVerticalOutline, bookOutline, close, downloadOutline, openOutline } from "ionicons/icons";
import { commonUtil, translate, logger } from '@common';
import { onBeforeUnmount, ref } from "vue";
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';

import { saveAs } from 'file-saver';
import Papa from 'papaparse'


const dataManagerLogs = ref([]);
let refreshInterval = null;
let countdownInterval = null;


onIonViewDidEnter(async () => {
  resetDefaults();

  await prepareCycleCountDataManagerLogs();

  refreshInterval = setInterval(async () => {
    await prepareCycleCountDataManagerLogs();
  }, 15000);
});

onBeforeUnmount(() => {
  clearInterval(refreshInterval);
  clearInterval(countdownInterval);
});

/* ---------- Existing BulkUpload Data ---------- */
let file = ref(null);
let uploadedFile = ref({});
let fileName = ref(null);
let content = ref([]);
let fieldMapping = ref({});
let fileColumns = ref([]);

const fields = import.meta.env["VITE_MAPPING_INVCOUNT"] ? JSON.parse(import.meta.env["VITE_MAPPING_INVCOUNT"]) : {};

const templateRows = [
  {
    countImportName: "Weekly store audit",
    purposeType: "DIRECTED_COUNT",
    productSku: "SKU-12345",
    facility: "FACILITY_100",
    estimatedCompletionDate: "02-20-2001 02:00:00",
    estimatedStartDate: "07-21-2003 08:20:00"
  },
  {
    countImportName: "Distribution center spot check",
    purposeType: "HARD_COUNT",
    productSku: "",
    facility: "FACILITY_DC_01",
    estimatedCompletionDate: "02-20-2001 02:00:00",
    estimatedStartDate: "07-21-2003 08:20:00"
  }
];



/* ---------- UploadActionPopover Logic ---------- */
const isUploadPopoverOpen = ref(false);
const popoverEvent = ref(null);
const selectedDataManagerLog = ref(null);
const isErrorModalOpen = ref(false);
const dataManagerError = ref({});

function openUploadActionPopover(event, dataManagerLog) {
  isUploadPopoverOpen.value = true;
  popoverEvent.value = event;
  selectedDataManagerLog.value = dataManagerLog;
}
function closeUploadPopover() {
  isUploadPopoverOpen.value = false;
}

function closeErrorModal() {
  isErrorModalOpen.value = false;
  closeUploadPopover();
}
function viewUploadGuide() {
  window.open("https://docs.hotwax.co/documents/retail-operations/inventory/cycle-count/bulk-upload", "_blank", "noreferrer");
}

async function viewFile(isError) {
  try {    
    const { logContentId, fileName } = isError ? selectedDataManagerLog.value.contents.filter(content => content.logContentTypeEnumId === 'DmcntError')[0]
      : selectedDataManagerLog.value.contents.filter(content => content.logContentTypeEnumId === 'DmcntImported')[0];

    const resp = await useInventoryCountRun().getCycleCountUploadedFileData({ logContentId: logContentId });
    if (!hasError(resp)) downloadCsv(resp.data, fileName);
    else throw resp.data;
  } catch (err) {
    commonUtil.showToast(translate("Failed to download uploaded cycle count file."));
    logger.error(err);
  }
  closeUploadPopover();
}
async function cancelUpload() {
  try {
    const resp = await useInventoryCountRun().cancelCycleCountFileProcessing({ logId: selectedDataManagerLog.value?.logId, statusId: "DmlsCancelled" });
    if (resp?.status === 200) {
      if (resp.data?.statusChanged === true) {
        showToast(translate("Cycle count cancelled successfully."));
      } else {
        console.error("Failed to cancel import", resp.data);
        showToast(translate("Failed to cancel import, file might be processed already."));
      }
    } else {
      throw resp;
    }
    await prepareCycleCountDataManagerLogs();
  } catch (err) {
    commonUtil.showToast(translate("Failed to cancel uploaded cycle count."));
    logger.error(err);
  }
  closeUploadPopover();
}

async function prepareCycleCountDataManagerLogs() {
  dataManagerLogs.value = await useInventoryCountRun().getCycleCntImportDataManagerLogs({ configId: 'INV_COUNT_IMPORT' });
}

/* ---------- Bulk Upload Logic ---------- */
function getFilteredFields(fields, required = true) {
  return Object.keys(fields).reduce((row, key) => { if (fields[key].required === required) row[key] = fields[key]; return row; }, {});
}
function extractFilename(path) {
  if (!path) return;
  const fn = path.substring(path.lastIndexOf("/") + 1);
  return fn.replace(/_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\d{3}\.csv$/, ".csv");
}
function getFileProcessingStatus(dataManagerLog) {
  if (dataManagerLog.statusId === "DmlsFailed" || dataManagerLog.statusId === "DmlsCrashed" || (dataManagerLog.failedRecordCount > 0)) return "error";
  if (dataManagerLog.statusId === "DmlsFinished") return "processed";
  if (dataManagerLog.statusId === "DmlsPending") return "pending";
  if (dataManagerLog.statusId === "DmlsRunning") return "processing";
  if (dataManagerLog.statusId === "DmlsCancelled") return "cancelled";
  return "pending";
}
function resetFieldMapping() { fieldMapping.value = Object.keys(fields).reduce((mapping, key) => (mapping[key] = "", mapping), {}); }
function resetDefaults() {
  resetFieldMapping();
  uploadedFile.value = {};
  content.value = [];
  fileName.value = null;
  file.value.value = "";

}

function downloadTemplate() {
  const columns = Object.keys(fields);
  const rowsWithColumns = templateRows.map(row => {
    if (!columns.length) return row;
    return columns.reduce((result, key) => ({ ...result, [key]: row[key] || "" }), {});
  });

  jsonToCsv(rowsWithColumns, {
    parse: {},
    download: true,
    name: "CycleCountTemplate.csv"
  });
}

async function parse(event) {
  const file = event.target.files[0];
  try {
    if (file) {
      uploadedFile.value = file;
      fileName.value = file.name;
      content.value = await parseCsv(file);
      fileColumns.value = Object.keys(content.value[0]);
      commonUtil.showToast(translate("File uploaded successfully"));
      resetFieldMapping();
    }
  } catch {
    content.value = [];
    commonUtil.showToast(translate("Please upload a valid csv to continue"));
  }
}
async function save() {
  const required = Object.keys(getFilteredFields(fields, true));
  const selected = Object.keys(fieldMapping.value).filter(key => fieldMapping.value[key]);
  if (!required.every(field => selected.includes(field))) return commonUtil.showToast(translate("Select all required fields to continue"));
  const uploadedData = content.value.map(row => ({
    countImportName: row[fieldMapping.value.countImportName],
    purposeType: row[fieldMapping.value.purposeType] || "DIRECTED_COUNT",
    idValue: fieldMapping.value.productSku === "skip" ? "" : row[fieldMapping.value.productSku],
    idType: "SKU",
    estimatedCompletionDate: row[fieldMapping.value.estimatedCompletionDate],
    estimatedStartDate: row[fieldMapping.value.estimatedStartDate],
    facilityId: row[fieldMapping.value.facility],
    externalFacilityId: row[fieldMapping.value.externalFacility],
  }));
  const data = jsonToCsv(uploadedData, {
    parse: {},
    download: false,
    name: fileName.value
  });
  const fd = new FormData();
  fd.append("contentFile", data, fileName.value);
  fd.append("contentFile", data, fileName.value);
  fd.append("fileName", fileName.value.replace(".csv", ""));
  try {
    const resp = await useInventoryCountImport().bulkUploadInventoryCounts({ data: fd, headers: { "Content-Type": "multipart/form-data;" }, params: { configId: "INV_COUNT_IMPORT" } });
    if (!commonUtil.hasError(resp)) {
      resetDefaults();
      await prepareCycleCountDataManagerLogs();
      commonUtil.showToast(translate("The cycle counts file uploaded successfully."));
    } else throw resp.data;
  } catch (err) {
    logger.error(err);
    commonUtil.showToast(translate("Failed to upload the file, please try again"));
  }
}

const parseCsv = async (file, options) => {
  return new Promise ((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        if (results.errors.length) {
          reject(results.error)
        } else {
          resolve(results.data)
        }
      },
      ...options
    });
  })
}

const jsonToCsv = (file, options) => {
  const csv = Papa.unparse(file, {
    ...options.parse
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  if (options.download) {
    saveAs(blob, options.name ? options.name : "default.csv");
  }

  return blob;
};

const downloadCsv = (csv, fileName) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName ? fileName : "CycleCountImport.csv");

  return blob;
};

</script>

<style scoped>
.main {
  max-width: 560px;
  margin: var(--spacer-sm) auto 0;
}
.field-mappings {
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
  margin-block: var(--spacer-lg);
}

.field-mappings ion-select::part(label) {
  max-width: 80%;
}

.field-mappings ion-select.select-disabled::part(placeholder), .field-mappings ion-select.select-disabled::part(icon) {
  opacity: .3;
}

.field-mappings ion-select ion-label {
  padding-block: var(--spacer-xs)
}

.field-mappings ion-item ion-label[slot="label"], .field-mappings ion-item ion-select.select-disabled {
  opacity: 1;
}

.system-message-section {
  margin-bottom: var(--spacer-sm);
}
.system-message-action>ion-button {
  vertical-align: middle;
}
</style>
