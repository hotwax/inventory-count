<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Draft bulk") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="main">
        <ion-item lines="full">
          <ion-label>{{ translate("Cycle count") }}</ion-label>
          <ion-label class="ion-text-right ion-padding-end">{{ uploadedFile.name }}</ion-label>
          <input @change="parse" ref="file" class="ion-hide" type="file" id="inventoryCountInputFile"/>
          <label for="inventoryCountInputFile">{{ translate("Upload") }}</label>
        </ion-item>

        <ion-button color="medium" expand="block" @click="downloadTemplate">
          {{ translate("Download template") }}
          <ion-icon slot="end" :icon="downloadOutline" />
        </ion-button>



        <ion-list class="field-mappings">
          <ion-item-divider color="light">
            <ion-label>{{ translate("Required") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFilteredFields(fields, true)">
            <ion-select interface="popover" :disabled="!content.length" :placeholder="translate('Select')" v-model="fieldMapping[field]">
              <ion-label slot="label" class="ion-text-wrap">
                {{ translate(fieldValues.label) }}
                <p>{{ fieldValues.description }}</p>
              </ion-label>
              <ion-select-option v-if="field === 'productSku'" value="skip">{{ translate("Skip") }}</ion-select-option>
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item-divider color="light">
            <ion-label>{{ translate("Optional") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFilteredFields(fields, false)">
            <ion-select interface="popover" :disabled="!content.length" :placeholder="translate('Select')" v-model="fieldMapping[field]">
              <ion-label slot="label" class="ion-text-wrap">
                {{ translate(fieldValues.label) }}
                <p>{{ fieldValues.description }}</p>
              </ion-label>
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-button :disabled="!content.length" @click="save" expand="block">
          {{ translate("Submit") }}
          <ion-icon slot="end" :icon="cloudUploadOutline" />
        </ion-button>

        <ion-list v-if="systemMessages.length" class="system-message-section">
          <ion-list-header>
            <ion-label>
                {{ translate("Recently uploaded counts") }}
              </ion-label>
              <ion-label class="ion-text-end">
                {{ nextExecutionRemaining.includes("ago") ? translate("Last run") : translate("Next run") }} {{ nextExecutionRemaining }}
              </ion-label>
          </ion-list-header>
          <ion-item v-for="systemMessage in systemMessages" :key="systemMessage.systemMessageId">
            <ion-label>
              <p class="overline">{{ systemMessage.systemMessageId }}</p>
              {{ extractFilename(systemMessage.messageText) }}
            </ion-label>
            <div slot="end" class="system-message-action">
              <ion-note>{{ getFileProcessingStatus(systemMessage) }}</ion-note>
              <ion-button size="default" fill="clear" color="medium" @click="openUploadActionPopover($event, systemMessage)">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>



    <ion-popover :is-open="isUploadPopoverOpen" :event="popoverEvent" @did-dismiss="closeUploadPopover" show-backdrop="false">
      <ion-content>
        <ion-list>
          <ion-list-header>{{ selectedSystemMessage?.systemMessageId }}</ion-list-header>
          <ion-item v-if="selectedSystemMessage?.statusId === 'SmsgReceived'" button @click="cancelUpload">
            <ion-icon slot="end" />
            {{ translate("Cancel") }}
          </ion-item>
          <ion-item v-if="selectedSystemMessage?.statusId === 'SmsgError'" button @click="openErrorModal">
            <ion-icon slot="end" />
            {{ translate("View error") }}
          </ion-item>
          <ion-item
            v-if="selectedSystemMessage?.statusId === 'SmsgError'"
            button
            @click="openCorrectionModal"
          >
            <ion-icon slot="end" />
            {{ translate("Correct with agent") }}
          </ion-item>
          <ion-item lines="none" button @click="viewFile">
            <ion-icon slot="end" />
            {{ translate("View file") }}
          </ion-item>
        </ion-list>

        <ion-modal :is-open="isErrorModalOpen" :keep-contents-mounted="true" @did-dismiss="closeErrorModal">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="closeErrorModal">
                  <ion-icon :icon="close" />
                </ion-button>
              </ion-buttons>
              <ion-title>{{ translate("Import Error") }}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list>
              <ion-item lines="full">
                <ion-icon :icon="bookOutline" slot="start" />
                {{ translate("View upload guide") }}
                <ion-button size="default" color="medium" fill="clear" slot="end" @click="viewUploadGuide">
                  <ion-icon slot="icon-only" :icon="openOutline" />
                </ion-button>
              </ion-item>

              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <template v-if="systemMessageError?.errorText">
                    {{ systemMessageError.errorText }}
                  </template>
                  <template v-else>
                    {{ translate("No data found") }}
                  </template>
                </ion-label>
              </ion-item>
              <ion-item lines="none" v-if="systemMessageError?.errorText">
                <ion-label class="ion-text-wrap">
                  <p class="overline">{{ translate("Agent suggestions") }}</p>
                  <ion-spinner v-if="agentHelpLoading" name="dots" />
                  <template v-else-if="agentHelpResponse">
                    <div class="agent-help-text">{{ agentHelpResponse }}</div>
                  </template>
                  <template v-else-if="agentHelpError">
                    {{ agentHelpError }}
                  </template>
                </ion-label>
              </ion-item>
              <ion-item lines="none" v-if="systemMessageError?.errorText">
                <ion-label class="ion-text-wrap">
                  <p class="overline">{{ translate("Corrected file") }}</p>
                  <ion-spinner v-if="agentCorrectionLoading" name="dots" />
                  <template v-else-if="agentCorrectionSummary">
                    <div class="agent-help-text">{{ agentCorrectionSummary }}</div>
                    <ion-button size="small" class="agent-download" @click="downloadCorrectedFile">
                      {{ translate("Download corrected file") }}
                    </ion-button>
                  </template>
                  <template v-else-if="agentCorrectionError">
                    {{ agentCorrectionError }}
                  </template>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-content>
        </ion-modal>

        <ion-modal :is-open="isCorrectionModalOpen" :keep-contents-mounted="true" @did-dismiss="closeCorrectionModal">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="closeCorrectionModal">
                  <ion-icon :icon="close" />
                </ion-button>
              </ion-buttons>
              <ion-title>{{ translate("Agent correction") }}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p class="overline">{{ translate("Corrected file") }}</p>
                  <ion-spinner v-if="agentCorrectionLoading" name="dots" />
                  <template v-else-if="agentCorrectionSummary">
                    <div class="agent-help-text">{{ agentCorrectionSummary }}</div>
                    <ion-button size="small" class="agent-download" @click="downloadCorrectedFile">
                      {{ translate("Download corrected file") }}
                    </ion-button>
                  </template>
                  <template v-else-if="agentCorrectionError">
                    {{ agentCorrectionError }}
                  </template>
                  <template v-else>
                    {{ translate("Run the agent to correct the file.") }}
                  </template>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-button expand="block" :disabled="agentCorrectionLoading" @click="runCorrection">
                  {{ translate("Run correction") }}
                </ion-button>
              </ion-item>
            </ion-list>
          </ion-content>
        </ion-modal>
      </ion-content>
    </ion-popover>
  </ion-page>
</template>

<script setup>
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonListHeader, IonNote, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewDidEnter, IonModal, IonPopover, IonButtons, IonSpinner } from '@ionic/vue';
import { cloudUploadOutline, ellipsisVerticalOutline, bookOutline, close, downloadOutline, openOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import { onBeforeUnmount, ref } from "vue";
import { useRoute } from "vue-router";
import logger from "@/logger";
import { hasError } from '@/stores/authStore';
import { showToast } from "@/services/uiUtils";
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { askInventoryAgent, executeAgentTool } from '@/services/AgentAPI';
import { buildAgentContext } from '@/services/agentContext';
import { useProductStore } from '@/stores/productStore';

import { saveAs } from 'file-saver';
import Papa from 'papaparse'
import { DateTime } from 'luxon';


const systemMessages = ref([]);
const nextExecutionTimestamp = ref(null);
let refreshInterval = null;
let countdownInterval = null;
const route = useRoute();


onIonViewDidEnter(async () => {
  resetDefaults();

  await fetchSystemMessages();
  await fetchJobExecutionTime();

  startCountdownTimer();

  refreshInterval = setInterval(async () => {
    await fetchSystemMessages();
    await fetchJobExecutionTime();
  }, 15000);
});

onBeforeUnmount(() => {
  clearInterval(refreshInterval);
  clearInterval(countdownInterval);
});

async function fetchSystemMessages() {
  systemMessages.value = await useInventoryCountRun().getCycleCntImportSystemMessages();
}

async function fetchJobExecutionTime() {
  const jobResp = await useInventoryCountImport().getServiceJobDetail(
    "consume_AllReceivedSystemMessages_frequent"
  );

  if (!hasError(jobResp) && jobResp.data?.jobDetail?.nextExecutionDateTime) {
    nextExecutionTimestamp.value = jobResp.data.jobDetail.nextExecutionDateTime;
  }
}

function startCountdownTimer() {
  countdownInterval = setInterval(() => {
    if (!nextExecutionTimestamp.value) return;
    const timeDiff = DateTime.fromMillis(nextExecutionTimestamp.value).diff(DateTime.local());
    nextExecutionRemaining.value = DateTime.local().plus(timeDiff).toRelative();
  }, 1000);
}
/* ---------- Existing BulkUpload Data ---------- */
let file = ref(null);
let uploadedFile = ref({});
let fileName = ref(null);
let content = ref([]);
let fieldMapping = ref({});
let fileColumns = ref([]);

const fields = process.env["VUE_APP_MAPPING_INVCOUNT"] ? JSON.parse(process.env["VUE_APP_MAPPING_INVCOUNT"]) : {};

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
const selectedSystemMessage = ref(null);
const isErrorModalOpen = ref(false);
const isCorrectionModalOpen = ref(false);
const systemMessageError = ref({});
const nextExecutionRemaining = ref("…");
const agentHelpLoading = ref(false);
const agentHelpResponse = ref('');
const agentHelpError = ref('');
const agentCorrectionLoading = ref(false);
const agentCorrectionSummary = ref('');
const agentCorrectionCsv = ref('');
const agentCorrectionError = ref('');

const parseValuesFromError = (errorText, label) => {
  if (!errorText) return [];
  const regex = new RegExp(`${label}[^:\\n]*:\\s*([^\\n]+)`, 'i');
  const match = errorText.match(regex);
  if (!match?.[1]) return [];
  const raw = match[1].trim();
  const parts = raw.split(/[,;|]+/).map((value) => value.trim()).filter(Boolean);
  if (parts.length) return parts;
  return raw.split(/\s+/).map((value) => value.trim()).filter(Boolean);
};

const parseCsvData = async (csvData) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        if (results.errors.length) {
          reject(results.errors)
        } else {
          resolve(results.data)
        }
      }
    });
  })
}

const requestUploadErrorHelp = async (errorText) => {
  if (!errorText?.trim()) return;
  agentHelpLoading.value = true;
  agentHelpResponse.value = '';
  agentHelpError.value = '';

  const missingSkus = parseValuesFromError(errorText, 'sku');
  const missingFacilities = parseValuesFromError(errorText, 'facility');

  const prompt = `Help me fix this bulk upload error: ${errorText}`;

  try {
    const context = await buildAgentContext(route, prompt);
    if (!context.intentData || typeof context.intentData !== 'object') context.intentData = {};
    if (missingSkus.length) context.intentData.missingSkus = missingSkus;
    if (missingFacilities.length) context.intentData.missingFacilities = missingFacilities;
    context.uploadError = { errorText, missingSkus, missingFacilities };

    const response = await askInventoryAgent(prompt, context);
    agentHelpResponse.value = response?.text || JSON.stringify(response?.data, null, 2);
  } catch (err) {
    logger.error(err);
    agentHelpError.value = translate("Unable to fetch agent suggestions.");
  } finally {
    agentHelpLoading.value = false;
  }
};

const requestUploadCorrection = async (errorText) => {
  const systemMessageId = selectedSystemMessage.value?.systemMessageId;
  const failCount = Number(selectedSystemMessage.value?.failCount || systemMessageError.value?.failCount || 0);
  if (!systemMessageId || failCount <= 0 || !errorText?.trim()) return;

  agentCorrectionLoading.value = true;
  agentCorrectionSummary.value = '';
  agentCorrectionCsv.value = '';
  agentCorrectionError.value = '';

  const missingSkus = parseValuesFromError(errorText, 'sku');
  const missingFacilities = parseValuesFromError(errorText, 'facility');

  try {
    const fileResp = await useInventoryCountRun().getCycleCountUploadedFileData({ systemMessageId });
    if (hasError(fileResp)) throw fileResp.data;

    const csvData = fileResp.data?.csvData || '';
    const rows = await parseCsvData(csvData);
    if (!rows?.length) throw new Error('No rows found in uploaded file.');
    const columns = rows?.length ? Object.keys(rows[0]) : [];

    const currentFacility = useProductStore().getCurrentFacility;
    const requiredFields = Object.keys(getFilteredFields(fields, true));

    const toolInput = {
      rows,
      errorText,
      missingSkus,
      missingFacilities,
      requiredFields,
      dateFormat: "MM-dd-yyyy HH:mm:ss",
      defaultFacilityId: currentFacility?.facilityId,
    };

    const prompt = `Correct this bulk upload CSV and return the corrected CSV. Use bulkUploadCorrectionInput from context with the bulk-upload-corrector tool. Error: ${errorText}`;
    const context = await buildAgentContext(route, prompt);
    context.uploadError = { errorText, missingSkus, missingFacilities };
    context.bulkUploadFile = {
      fileName: extractFilename(selectedSystemMessage.value?.messageText),
      columns,
      rows,
    };
    context.bulkUploadCorrectionInput = toolInput;

    let correctionResult = null;
    try {
      const response = await askInventoryAgent(prompt, context);
      correctionResult = response?.data || response;
    } catch {
      correctionResult = null;
    }

    if (!correctionResult?.correctedCsv) {
      const toolResponse = await executeAgentTool('bulk-upload-corrector', toolInput);
      correctionResult = toolResponse?.data || toolResponse;
    }

    if (correctionResult?.correctedCsv) {
      agentCorrectionCsv.value = correctionResult.correctedCsv;
      agentCorrectionSummary.value = correctionResult.summary || translate("Corrected file is ready to download.");
    } else {
      throw new Error('Corrected file data was not returned.');
    }
  } catch (err) {
    logger.error(err);
    agentCorrectionError.value = translate("Unable to generate corrected file.");
  } finally {
    agentCorrectionLoading.value = false;
  }
};

function openUploadActionPopover(event, systemMessage) {
  isUploadPopoverOpen.value = true;
  popoverEvent.value = event;
  selectedSystemMessage.value = systemMessage;
}
function closeUploadPopover() {
  isUploadPopoverOpen.value = false;
}
function openErrorModal() {
  isErrorModalOpen.value = true;
  if (systemMessageError.value?.errorText) return;
  getCycleCountImportErrorsFromServer();
}
function closeErrorModal() {
  isErrorModalOpen.value = false;
  agentHelpLoading.value = false;
  agentHelpResponse.value = '';
  agentHelpError.value = '';
  agentCorrectionLoading.value = false;
  agentCorrectionSummary.value = '';
  agentCorrectionCsv.value = '';
  agentCorrectionError.value = '';
  closeUploadPopover();
}
function openCorrectionModal() {
  isCorrectionModalOpen.value = true;
  if (systemMessageError.value?.errorText) return;
  getCycleCountImportErrorsFromServer();
}
function closeCorrectionModal() {
  isCorrectionModalOpen.value = false;
  agentCorrectionLoading.value = false;
  agentCorrectionSummary.value = '';
  agentCorrectionCsv.value = '';
  agentCorrectionError.value = '';
  closeUploadPopover();
}
function viewUploadGuide() {
  window.open("https://docs.hotwax.co/documents/retail-operations/inventory/introduction/draft-cycle-count", "_blank");
}
async function getCycleCountImportErrorsFromServer() {
  try {
    const resp = await useInventoryCountRun().getCycleCountImportErrors({ systemMessageId: selectedSystemMessage.value?.systemMessageId });
    if (!hasError(resp)) {
      systemMessageError.value = resp?.data[0];
      const errorText = systemMessageError.value?.errorText || '';
      if (errorText) requestUploadErrorHelp(errorText);
      if (errorText) requestUploadCorrection(errorText);
    }
  } catch (err) { logger.error(err); }
}
async function viewFile() {
  try {
    const resp = await useInventoryCountRun().getCycleCountUploadedFileData({ systemMessageId: selectedSystemMessage.value?.systemMessageId });
    if (!hasError(resp)) downloadCsv(resp.data.csvData, extractFilename(selectedSystemMessage.value.messageText));
    else throw resp.data;
  } catch (err) {
    showToast(translate("Failed to download uploaded cycle count file."));
    logger.error(err);
  }
  closeUploadPopover();
}
async function cancelUpload() {
  try {
    const resp = await useInventoryCountRun().cancelCycleCountFileProcessing({ systemMessageId: selectedSystemMessage.value?.systemMessageId, statusId: "SmsgCancelled" });
    if (!hasError(resp)) {
      showToast(translate("Cycle count cancelled successfully."));
      systemMessages.value = await useInventoryCountRun().getCycleCntImportSystemMessages();
    }
  } catch (err) {
    showToast(translate("Failed to cancel uploaded cycle count."));
    logger.error(err);
  }
  closeUploadPopover();
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
function getFileProcessingStatus(systemMessage) {
  if (systemMessage.statusId === "SmsgConsumed") return "processed";
  if (systemMessage.statusId === "SmsgConsuming") return "processing";
  if (systemMessage.statusId === "SmsgCancelled") return "cancelled";
  if (systemMessage.statusId === "SmsgError") return "error";
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
      showToast(translate("File uploaded successfully"));
      resetFieldMapping();
    }
  } catch {
    content.value = [];
    showToast(translate("Please upload a valid csv to continue"));
  }
}
async function save() {
  const required = Object.keys(getFilteredFields(fields, true));
  const selected = Object.keys(fieldMapping.value).filter(key => fieldMapping.value[key]);
  if (!required.every(field => selected.includes(field))) return showToast(translate("Select all required fields to continue"));
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
  fd.append("uploadedFile", data, fileName.value);
  fd.append("fileName", fileName.value.replace(".csv", ""));
  try {
    const resp = await useInventoryCountImport().bulkUploadInventoryCounts({ data: fd, headers: { "Content-Type": "multipart/form-data;" } });
    if (!hasError(resp)) {
      resetDefaults();
      systemMessages.value = await useInventoryCountRun().getCycleCntImportSystemMessages();
      showToast(translate("The cycle counts file uploaded successfully."));
    } else throw resp.data;
  } catch (err) {
    logger.error(err);
    showToast(translate("Failed to upload the file, please try again"));
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

const downloadCorrectedFile = () => {
  if (!agentCorrectionCsv.value) return;
  const baseName = extractFilename(selectedSystemMessage.value?.messageText) || 'CycleCountImport.csv';
  const correctedName = baseName.replace(/\.csv$/i, '-corrected.csv');
  downloadCsv(agentCorrectionCsv.value, correctedName);
};

const runCorrection = async () => {
  const errorText = systemMessageError.value?.errorText || '';
  await requestUploadCorrection(errorText);
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
.agent-help-text {
  white-space: pre-wrap;
}

.agent-download {
  margin-top: var(--spacer-xs);
}
</style>
