<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/draft" />
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
            <ion-chip :disabled="!content.length" outline="true" @click="addFieldMapping()">
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
            <ion-select interface="popover" :disabled="!content.length" :placeholder = "translate('Select')" v-model="fieldMapping[field]">
              <ion-label slot="label" class="ion-text-wrap">
                {{translate(fieldValues.label)}}
                <p>{{ fieldValues.description }}</p>
              </ion-label>
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item-divider>
            <ion-label>{{ translate("Optional") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFilteredFields(fields, false)">
            <ion-select interface="popover" :disabled="!content.length" :placeholder = "translate('Select')" v-model="fieldMapping[field]">
              <ion-label slot="label" class="ion-text-wrap">
                {{translate(fieldValues.label)}}
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
              <ion-button slot="end" fill="clear" color="medium" @click="openUploadActionPopover($event, systemMessage)">
                <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
              </ion-button>
            </div>
          </ion-item>
        </ion-list>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonBackButton,
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter,
  alertController,
  modalController,
  popoverController
} from '@ionic/vue';
import { addOutline, cloudUploadOutline, ellipsisVerticalOutline, trashBinOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import { computed, ref } from "vue";
import { useStore } from 'vuex';
import { hasError, jsonToCsv, parseCsv, showToast } from "@/utils";
import CreateMappingModal from "@/components/CreateMappingModal.vue";
import { CountService } from "@/services/CountService"
import CycleCountUploadActionPopover from "@/components/CycleCountUploadActionPopover.vue"

const store = useStore();

const fieldMappings = computed(() => store.getters["user/getFieldMappings"])
const systemMessages = computed(() => store.getters["count/getCycleCountImportSystemMessages"])

let file = ref(null)
let uploadedFile = ref({})
let fileName = ref(null)
let content = ref([])
let fieldMapping = ref({})
let fileColumns = ref([])
let selectedMappingId = ref(null)
const fileUploaded = ref(false);
const fields = process.env["VUE_APP_MAPPING_INVCOUNT"] ? JSON.parse(process.env["VUE_APP_MAPPING_INVCOUNT"]) : {}


onIonViewDidEnter(async() => {
  uploadedFile.value = {}
  content.value = []
  fileName.value = null
  
  resetFieldMapping();
  file.value.value = null;
  await store.dispatch('user/getFieldMappings')
  await store.dispatch('count/fetchCycleCountImportSystemMessages')
})
function resetFieldMapping() {
  fieldMapping.value = Object.keys(fields).reduce((fieldMapping, field) => {
    fieldMapping[field] = ""
    return fieldMapping;
  }, {})
}
function resetDefaults() {
  resetFieldMapping();
  uploadedFile.value = {}
  content.value = []
  fileName.value = null
  file.value.value = ''
  selectedMappingId.value = null
}
function extractFilename(filePath) {
  if (!filePath) {
    return;
  }
  // Get the part of the string after the last '/'
  const filenameWithTimestamp = filePath?.substring(filePath?.lastIndexOf('/') + 1);
  
  // Use a regex to remove the timestamp and return the base filename
  const baseFilename = filenameWithTimestamp.replace(/_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\d{3}\.csv$/, '.csv');
  
  return baseFilename;
}

function getFilteredFields(fields, required = true) {
  return Object.keys(fields).reduce((result, key) => {
    if (fields[key].required === required) {
      result[key] = fields[key];
    }
    return result;
  }, {});
}
function getFileProcessingStatus(systemMessage) {
  let processingStatus = "pending"
  if (systemMessage.statusId === 'SmsgConsumed') {
    processingStatus = "processed"
  } else if (systemMessage.statusId === 'SmsgConsuming') {
    processingStatus = "processing"
  } else if (systemMessage.statusId === 'SmsgCancelled') {
    processingStatus = 'cancelled'
  } else if (systemMessage.statusId === 'SmsgError') {
    processingStatus = 'error'
  }
  return processingStatus;
}

async function openUploadActionPopover(event, systemMessage){
  const popover = await popoverController.create({
    component: CycleCountUploadActionPopover,
    event,
    componentProps: {
      systemMessage,
      fileName: extractFilename(systemMessage.messageText)
    },
    showBackdrop: false,
  });
  await popover.present();
}

async function parse(event) {
  const file = event.target.files[0];
  try {
    if (file) {
      const fileExtension = file.name.split('.')[1];      
      // Added n file extension check
      if(fileExtension !== 'csv'){
        console.log("Not a csv file.")
        showToast(translate("Please upload a csv file only."));
        return;
      }
      
      resetDefaults();
      console.log(uploadedFile.value.size);
      if(uploadedFile.value != {}){
        console.log("There is already a file");
        // return;
      }else{
        console.log("There is no file");
      }
      uploadedFile.value = file;
      fileName.value = file.name
      content.value = await parseCsv(uploadedFile.value);
      fileColumns.value = Object.keys(content.value[0]);
      showToast(translate("File uploaded successfully."));
      fileUploaded.value = !fileUploaded.value;
      selectedMappingId.value = null;
      resetFieldMapping();
    } else {
      showToast(translate("No new file upload. Please try again."));
    }
  } catch {
    content.value = []
    showToast(translate("Please upload a valid csv to continue"));
  }
}
async function save(){
  if (!areAllFieldsSelected()) {
    showToast(translate("Select all the required fields to continue"));
    return;
  }

  const uploadedData = content.value.map(item => {
    return {
      countImportName: item[fieldMapping.value.countImportName],
      statusId: item[fieldMapping.value.statusId] ? item[fieldMapping.value.statusId] : "INV_COUNT_CREATED",
      idValue: item[fieldMapping.value.productSku],
      idType: "SKU",
      dueDate: item[fieldMapping.value.dueDate],
      facilityId: '',
      externalFacilityId: item[fieldMapping.value.facility]
    }
  })
  const alert = await alertController.create({
    header: translate("Bulk Upload Cycle Counts"),
    message: translate("Make sure all the columns are mapped correctly."),
    buttons: [
        {
          text: translate("Cancel"),
          role: 'cancel',
        },
        {
          text: translate("Upload"),
          handler: () => {
            const data = jsonToCsv(uploadedData)
            const formData = new FormData();
            formData.append("uploadedFile", data, fileName.value);
            formData.append("fileName", fileName.value.replace(".csv", ""));
            
            CountService.bulkUploadInventoryCounts({
              data: formData,
              headers: {
                'Content-Type': 'multipart/form-data;'
              }
            }).then(async (resp) => {
              if (hasError(resp)) {
                throw resp.data
              }
              resetDefaults()
              await store.dispatch('count/fetchCycleCountImportSystemMessages')
              showToast(translate("The cycle counts file uploaded successfully."))
            }).catch(() => {
              showToast(translate("Something went wrong, please try again"));
            })
          },
        },
      ],
    });
  return alert.present();  
}
function mapFields(mapping, mappingId) {
  const fieldMappingData = JSON.parse(JSON.stringify(mapping));

  // TODO: Store an object in this.content variable, so everytime when accessing it, we don't need to use 0th index
  const csvFields = Object.keys(content.value[0]);

  const missingFields = Object.values(fieldMappingData.value).filter(field => {
    if(!csvFields.includes(field)) return field;
  });
  if(missingFields.length) showToast(translate("Some of the mapping fields are missing in the CSV: ", { missingFields: missingFields.join(", ") }))

  Object.keys(fieldMappingData.value).map((key) => {
    if(!csvFields.includes(fieldMappingData.value[key])){
      fieldMappingData.value[key] = "";
    }
  })
  fieldMapping.value = fieldMappingData.value;
  selectedMappingId.value = mappingId
}
function areAllFieldsSelected() {
  const requiredFields = Object.keys(getFilteredFields(fields, true));
  const selectedFields = Object.keys(fieldMapping.value).filter(key => fieldMapping.value[key] !== '')

  return requiredFields.every(field => selectedFields.includes(field));
}
async function addFieldMapping() {
  const createMappingModal = await modalController.create({
    component: CreateMappingModal,
    componentProps: { content: content.value, seletedFieldMapping: fieldMapping.value, mappingType: 'INVCOUNT'}
  });
  return createMappingModal.present();
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
