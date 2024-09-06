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
  
    <ion-content class="ion-padding">
      <div>
        <ion-list>
          <ion-item :key="field" v-for="(fieldValues, field) in getFields()">
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
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  IonItem,
  IonList,
  onIonViewDidEnter,
  modalController
} from '@ionic/vue';

import { close, save, saveOutline } from "ionicons/icons";
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
let identificationTypeId = ref('SKU')

onMounted(() => {
  fieldMapping.value = { ...props.seletedFieldMapping }
  fileColumns.value = Object.keys(props.content[0]);
})

function getFields() {
  const fields = process.env["VUE_APP_MAPPING_" + props.mappingType];
  return fields ? JSON.parse(fields) : {};
}
function closeModal() {
  modalController.dismiss({ dismissed: true });
}
async function saveMapping() {
  if(!mappingName.value) {
    showToast(translate("Enter mapping name"));
    return
  }
  if (!areAllFieldsSelected()) {
    showToast(translate("Map all fields"));
    return
  }
  const id = generateUniqueMappingPrefId();
  await store.dispatch("user/createFieldMapping", { id, name: mappingName.value, value: fieldMapping.value, mappingType: props.mappingType })
  closeModal();
}
function areAllFieldsSelected() {
  return Object.values(fieldMapping.value).every(field => field !== "");
}

//Todo: Generating unique identifiers as we are currently storing in local storage. Need to remove it as we will be storing data on server.
function generateUniqueMappingPrefId() {
  const id = Math.floor(Math.random() * 1000);
  return !fieldMappings.value[id] ? id : this.generateUniqueMappingPrefId();
}

</script>