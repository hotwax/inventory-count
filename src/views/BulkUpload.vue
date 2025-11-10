<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Draft bulk") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="main">
        <ion-item>
          <ion-label>{{ translate("Cycle count") }}</ion-label>
          <ion-label class="ion-text-right ion-padding-end">{{ uploadedFile.name }}</ion-label>
          <input @change="parse" ref="file" class="ion-hide" type="file" id="inventoryCountInputFile"/>
          <label for="inventoryCountInputFile">{{ translate("Upload") }}</label>
        </ion-item>

        <ion-list>
          <ion-list-header>{{ translate("Saved mappings") }}</ion-list-header>
          <div>
            <ion-chip :disabled="!content.length" outline="true" @click="openCreateMappingModal">
              <ion-icon :icon="addOutline" />
              <ion-label>{{ translate("New mapping") }}</ion-label>
            </ion-chip>
            <ion-chip :disabled="!content.length" v-for="(mapping, index) in fieldMappings('INVCOUNT') ?? []" :key="index" @click="mapFields(mapping, index)" :outline="selectedMappingId != index">
              {{ mapping.name }}
            </ion-chip>
          </div>
        </ion-list>   

        <ion-list>
          <ion-list-header>{{ translate("Select the following columns from the uploaded CSV") }}</ion-list-header>

          <ion-item-divider>
            <ion-label>{{ translate("Required") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFilteredFields(fields, true)">
            <ion-select interface="popover" :disabled="!content.length" :placeholder="translate('Select')" v-model="fieldMapping[field]">
              <ion-label slot="label" class="ion-text-wrap">
                {{ translate(fieldValues.label) }}
                <p>{{ fieldValues.description }}</p>
              </ion-label>
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item-divider>
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

        <ion-button :disabled="!content.length" color="medium" @click="save" expand="block">
          {{ translate("Upload") }}
          <ion-icon slot="end" :icon="cloudUploadOutline" />
        </ion-button>

        <ion-list v-if="systemMessages.length" class="system-message-section">
          <ion-list-header>{{ translate("Recently uploaded counts") }}</ion-list-header>
          <ion-item v-for="systemMessage in systemMessages" :key="systemMessage.systemMessageId">
            <ion-label>
              <p class="overline">{{ systemMessage.systemMessageId }}</p>
              {{ extractFilename(systemMessage.messageText) }}
            </ion-label>
            <div class="system-message-action">
              <ion-note slot="end">{{ getFileProcessingStatus(systemMessage) }}</ion-note>
              <ion-button size="default" slot="end" fill="clear" color="medium" @click="openUploadActionPopover($event, systemMessage)">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>

    <ion-modal :is-open="isCreateMappingModalOpen" :keep-contents-mounted="true" @did-dismiss="closeCreateMappingModal">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeCreateMappingModal">
              <ion-icon :icon="close" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ translate("CSV Mapping") }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-item>
        <ion-input :label="translate('Mapping name')" :placeholder="translate('Field mapping name')" v-model="mappingName" />
      </ion-item>

      <ion-content>
        <ion-list>
          <ion-item-divider>
            <ion-label>{{ translate("Required") }}</ion-label>
          </ion-item-divider>
          <ion-item v-for="(fieldValues, field) in getFields(fields, true)" :key="field">
            <ion-select :label="translate(fieldValues.label)" interface="popover" :placeholder="translate('Select')" v-model="modalFieldMapping[field]">
              <ion-select-option :key="index" v-for="(prop, index) in modalFileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item-divider>
            <ion-label>{{ translate("Optional") }}</ion-label>
          </ion-item-divider>
          <ion-item v-for="(fieldValues, field) in getFields(fields, false)" :key="field">
            <ion-select :label="translate(fieldValues.label)" interface="popover" :placeholder="translate('Select')" v-model="modalFieldMapping[field]">
              <ion-select-option :key="index" v-for="(prop, index) in modalFileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="saveMapping">
            <ion-icon :icon="saveOutline" />
          </ion-fab-button>
        </ion-fab>
      </ion-content>
    </ion-modal>

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
            </ion-list>
          </ion-content>
        </ion-modal>
      </ion-content>
    </ion-popover>
  </ion-page>
</template>

<script setup>
import { IonButton, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonListHeader, IonNote,   IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, onIonViewDidEnter, IonModal, IonPopover, IonButtons, IonInput, IonFab, IonFabButton } from '@ionic/vue';
import { addOutline, cloudUploadOutline, ellipsisVerticalOutline, bookOutline, close, openOutline, saveOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import { computed, ref } from "vue";
import logger from "@/logger";
import { hasError, jsonToCsv, parseCsv, showToast, downloadCsv } from "@/utils";
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { useUserProfileNew } from '@/stores/useUserProfile';

const fieldMappings = computed(() => useUserProfileNew().getFieldMappings);
const systemMessages = ref([]);

onIonViewDidEnter(async () => {
  resetDefaults();
  await useUserProfileNew().fetchFieldMappings();
  systemMessages.value = await useInventoryCountRun().getCycleCntImportSystemMessages();
});

/* ---------- Existing BulkUpload Data ---------- */
let file = ref(null);
let uploadedFile = ref({});
let fileName = ref(null);
let content = ref([]);
let fieldMapping = ref({});
let fileColumns = ref([]);
let selectedMappingId = ref(null);
const fields = process.env["VUE_APP_MAPPING_INVCOUNT"] ? JSON.parse(process.env["VUE_APP_MAPPING_INVCOUNT"]) : {};

/* ---------- CreateMappingModal Logic ---------- */
const isCreateMappingModalOpen = ref(false);
const mappingName = ref(null);
const modalFieldMapping = ref({});
const modalFileColumns = ref([]);

function openCreateMappingModal() {
  modalFieldMapping.value = { ...fieldMapping.value };
  modalFileColumns.value = Object.keys(content.value[0] || {});
  mappingName.value = null;
  isCreateMappingModalOpen.value = true;
}
function closeCreateMappingModal() {
  isCreateMappingModalOpen.value = false;
}
function getFields(fields, required = true) {
  return Object.keys(fields).reduce((result, key) => {
    if (fields[key].required === required) result[key] = fields[key];
    return result;
  }, {});
}
function areAllModalFieldsSelected() {
  const requiredFields = Object.keys(getFields(fields, true));
  const selectedFields = Object.keys(modalFieldMapping.value).filter(key => modalFieldMapping.value[key] !== '');
  return requiredFields.every(field => selectedFields.includes(field));
}
function generateUniqueMappingPrefId() {
  const id = Math.floor(Math.random() * 1000);
  return !fieldMappings.value[id] ? id : generateUniqueMappingPrefId();
}
async function saveMapping() {
  if (!mappingName.value || !mappingName.value.trim()) {
    showToast(translate("Enter mapping name"));
    return;
  }
  if (!areAllModalFieldsSelected()) {
    showToast(translate("Map all required fields"));
    return;
  }
  const id = generateUniqueMappingPrefId();
  await useUserProfileNew().createFieldMapping({
    id,
    name: mappingName.value,
    value: modalFieldMapping.value,
    mappingType: "INVCOUNT"
  })
  showToast(translate("Mapping saved"));
  closeCreateMappingModal();
}

/* ---------- UploadActionPopover Logic ---------- */
const isUploadPopoverOpen = ref(false);
const popoverEvent = ref(null);
const selectedSystemMessage = ref(null);
const isErrorModalOpen = ref(false);
const systemMessageError = ref({});

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
  getCycleCountImportErrorsFromServer();
}
function closeErrorModal() {
  isErrorModalOpen.value = false;
  closeUploadPopover();
}
function viewUploadGuide() {
  window.open("https://docs.hotwax.co/documents/retail-operations/inventory/introduction/draft-cycle-count", "_blank");
}
async function getCycleCountImportErrorsFromServer() {
  try {
    const resp = await useInventoryCountRun().getCycleCountImportErrors({ systemMessageId: selectedSystemMessage.value?.systemMessageId });
    if (!hasError(resp)) systemMessageError.value = resp?.data[0];
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
  return Object.keys(fields).reduce((r, k) => { if (fields[k].required === required) r[k] = fields[k]; return r; }, {});
}
function extractFilename(path) {
  if (!path) return;
  const fn = path.substring(path.lastIndexOf("/") + 1);
  return fn.replace(/_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\d{3}\.csv$/, ".csv");
}
function getFileProcessingStatus(s) {
  if (s.statusId === "SmsgConsumed") return "processed";
  if (s.statusId === "SmsgConsuming") return "processing";
  if (s.statusId === "SmsgCancelled") return "cancelled";
  if (s.statusId === "SmsgError") return "error";
  return "pending";
}
function resetFieldMapping() { fieldMapping.value = Object.keys(fields).reduce((m, k) => (m[k] = "", m), {}); }
function resetDefaults() {
  resetFieldMapping();
  uploadedFile.value = {};
  content.value = [];
  fileName.value = null;
  file.value.value = "";
  selectedMappingId.value = null;
}

async function parse(e) {
  const f = e.target.files[0];
  try {
    if (f) {
      uploadedFile.value = f;
      fileName.value = f.name;
      content.value = await parseCsv(f);
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
  const selected = Object.keys(fieldMapping.value).filter(k => fieldMapping.value[k]);
  if (!required.every(f => selected.includes(f))) return showToast(translate("Select all required fields to continue"));
  const uploadedData = content.value.map(i => ({
    countImportName: i[fieldMapping.value.countImportName],
    purposeType: i[fieldMapping.value.purposeType] || "DIRECTED_COUNT",
    statusId: i[fieldMapping.value.statusId] || "CYCLE_CNT_CREATED",
    idValue: i[fieldMapping.value.productSku],
    idType: "SKU",
    dueDate: i[fieldMapping.value.dueDate],
    estimatedStartDate: i[fieldMapping.value.estimatedStartDate],
    externalFacilityId: i[fieldMapping.value.facility],
  }));
  const data = jsonToCsv(uploadedData);
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
function mapFields(m, id) {
  const data = JSON.parse(JSON.stringify(m));
  const csvFields = Object.keys(content.value[0]);
  Object.keys(data.value).forEach(k => { if (!csvFields.includes(data.value[k])) data.value[k] = ""; });
  fieldMapping.value = data.value;
  selectedMappingId.value = id;
}
</script>

<style scoped>
.main {
  max-width: 732px;
  margin: var(--spacer-sm) auto 0;
}
.system-message-section {
  margin-bottom: 16px;
}
.system-message-action {
  display: flex;
  align-items: center;
}
</style>
