<template>
  <!-- TODO: implement support for i18n -->
  <ion-card>
    <ion-card-header>
      <ion-card-title>
        {{ 'Product Identifier' }}
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      {{ 'Choosing a product identifier allows you to view products with your preferred identifiers.' }}
    </ion-card-content>

    <ion-item :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE)">
      <ion-select :label="$t('Primary')" interface="popover" :placeholder="'primary identifier'" :value="productIdentificationPref.primaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'primaryId')">
        <ion-select-option v-for="identification in productIdentificationOptions" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId">{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none" :disabled="!hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE)">
      <ion-select :label="$t('Secondary')" interface="popover" :placeholder="'secondary identifier'" :value="productIdentificationPref.secondaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'secondaryId')">
        <ion-select-option v-for="identification in productIdentificationOptions" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId" >{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
        <!-- <ion-select-option value="">{{ "None" }}</ion-select-option> -->
      </ion-select>
    </ion-item>
  </ion-card>
</template>

<script setup lang="ts">
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonItem, IonSelect, IonSelectOption } from '@ionic/vue';
import { computed, onMounted } from 'vue';
import { Actions, hasPermission } from '@/authorization';
import { useProductStore } from '@/stores/useProductStore';

const currentEComStore = computed(() =>  useProductStore().getCurrentProductStore)
const productIdentificationPref = computed(() => useProductStore().getProductIdentificationPref);
const productIdentificationOptions = computed(() => useProductStore().getProductIdentificationOptions);
onMounted(() => {
  useProductStore().prepareProductIdentifierOptions();
  useProductStore().getDxpIdentificationPref(currentEComStore.value.productStoreId);
})

function setProductIdentificationPref(value: string | any, id: string) {
  useProductStore().setDxpProductIdentificationPref(id, value, currentEComStore.value.productStoreId)
}

</script>