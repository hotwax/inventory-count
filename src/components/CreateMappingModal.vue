<template>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal"> 
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
      <div>
        <ion-list>
          <ion-item-divider>
            <ion-label>{{ translate("Required") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFields(fields, true)">
            <ion-select :label="translate(fieldValues.label)" interface="popover" :placeholder = "translate('Select')" v-model="fieldMapping[field]">
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item-divider>
            <ion-label>{{ translate("Optional") }} </ion-label>
          </ion-item-divider>
          <ion-item :key="field" v-for="(fieldValues, field) in getFields(fields, false)">
            <ion-select :label="translate(fieldValues.label)" interface="popover" :placeholder = "translate('Select')" v-model="fieldMapping[field]">
              <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
      </div>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="saveMapping">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </template>

<script setup>
import {
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  IonList,
  modalController
} from '@ionic/vue';

import { close, saveOutline } from "ionicons/icons";
import { computed, defineProps, onMounted, ref } from "vue";
import { useStore } from "vuex";
import { showToast } from '@/utils';
import { translate } from "@hotwax/dxp-components";

const store = useStore();

const props = defineProps(["content", "seletedFieldMapping", "mappingType"])
const fieldMappings = computed(() => store.getters["user/getFieldMappings"])

let mappingName = ref(null)
let fieldMapping = ref ({})
let fileColumns = ref([])
const fields = process.env["VUE_APP_MAPPING_INVCOUNT"] ? JSON.parse(process.env["VUE_APP_MAPPING_INVCOUNT"]) : {}

onMounted(() => {
  fieldMapping.value = { ...props.seletedFieldMapping }
  fileColumns.value = Object.keys(props.content[0]);
})

function getFields(fields, required = true) {
  return Object.keys(fields).reduce((result, key) => {
    if (fields[key].required === required) {
      result[key] = fields[key];
    }
    return result;
  }, {});
}
function closeModal() {
  modalController.dismiss({ dismissed: true });
}
async function saveMapping() {
  if(!mappingName.value || !mappingName.value.trim()) {
    showToast(translate("Enter mapping name"));
    return
  }
  if (!areAllFieldsSelected()) {
    showToast(translate("Map all required fields"));
    return
  }
  const id = generateUniqueMappingPrefId();
  await store.dispatch("user/createFieldMapping", { id, name: mappingName.value, value: fieldMapping.value, mappingType: props.mappingType })
  closeModal();
}

function areAllFieldsSelected() {
  const requiredFields = Object.keys(getFields(fields, true));
  const selectedFields = Object.keys(fieldMapping.value).filter(key => fieldMapping.value[key] !== '')

  return requiredFields.every(field => selectedFields.includes(field));
}

//Todo: Generating unique identifiers as we are currently storing in local storage. Need to remove it as we will be storing data on server.
function generateUniqueMappingPrefId() {
  const id = Math.floor(Math.random() * 1000);
  return !fieldMappings.value[id] ? id : this.generateUniqueMappingPrefId();
}

</script>
<style scoped>
  ion-content {
    --padding-bottom: 80px;
  }
</style>