<template>
  <ion-searchbar v-model="query.queryString" @keyup.enter="updateQueryString('queryString', $event.target.value)" />
  <ion-item lines="none">
    <ion-icon slot="start" :icon="swapVerticalOutline" />
    <ion-select :label="translate('Sort by')" :value="query.sortBy" @ionChange="updateQuery('sortBy', $event.detail.value)" interface="popover">
      <ion-select-option value="dueDate desc">{{ translate("Due date") }}</ion-select-option>
      <ion-select-option value="createdDate desc">{{ translate("Created date") }}</ion-select-option>
      <ion-select-option value="countImportName asc">{{ translate("Alphabetic") }}</ion-select-option>
    </ion-select> 
  </ion-item>
</template>

<script setup lang="ts">
import { IonIcon, IonItem, IonSearchbar, IonSelect, IonSelectOption } from "@ionic/vue";
import { swapVerticalOutline } from "ionicons/icons";
import { computed, defineEmits } from "vue"
import { translate } from "@/i18n";
import store from "@/store";

const emit = defineEmits(['queryStringUpdated'])

const query = computed(() => store.getters["count/getQuery"])

async function updateQueryString(key: string, value: any) {
  await store.dispatch("count/updateQueryString", { key, value })
  emit('queryStringUpdated')
}

async function updateQuery(key: string, value: any) {
  await store.dispatch("count/updateQuery", { key, value })
}
</script>