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

    <ion-item :disabled="!appContext.hasPermission(appContext.Actions.APP_PRODUCT_IDENTIFIER_UPDATE)">
      <ion-select :label="$t('Primary')" interface="popover" :placeholder="'primary identifier'" :value="productIdentificationPref.primaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'primaryId')">
        <ion-select-option v-for="identification in productIdentificationOptions" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId" >{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none" :disabled="!appContext.hasPermission(appContext.Actions.APP_PRODUCT_IDENTIFIER_UPDATE)">
      <ion-select :label="$t('Secondary')" interface="popover" :placeholder="'secondary identifier'" :value="productIdentificationPref.secondaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'secondaryId')">
        <ion-select-option v-for="identification in productIdentificationOptions" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId" >{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
        <ion-select-option value="">{{ "None" }}</ion-select-option>
      </ion-select>
    </ion-item>
    <template v-if="currentSampleProduct">
      <ion-item lines="full" color="light">
        <ion-label color="medium">{{ $t('Preview Product Identifier') }}</ion-label>
      </ion-item>
      <ion-item lines="none">
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="currentSampleProduct.mainImageUrl"/>
        </ion-thumbnail>
        <ion-label>
          {{ getProductIdentificationValue(productIdentificationPref.primaryId, currentSampleProduct) ? getProductIdentificationValue(productIdentificationPref.primaryId, currentSampleProduct) : currentSampleProduct.productId }}
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, currentSampleProduct) }}</p>
        </ion-label>
        <ion-button size="default" fill="clear" @click="shuffle">  
          <ion-icon slot="icon-only" :icon="shuffleOutline"/>
        </ion-button>
      </ion-item>
    </template>
  </ion-card>
</template>

<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonItem, IonLabel, IonSelect, IonSelectOption, IonThumbnail } from '@ionic/vue';
import { useProductIdentificationStore } from 'src/store/productIdentification';
import { useUserStore } from 'src/store/user'
import { computed, onMounted } from 'vue';
import { appContext, DxpShopifyImg, getProductIdentificationValue } from "../index";
import { shuffleOutline } from "ionicons/icons";

const productIdentificationStore = useProductIdentificationStore();
const userStore = useUserStore()

const currentEComStore = computed(() =>  userStore.getCurrentEComStore)
const productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref);
const productIdentificationOptions = computed(() => productIdentificationStore.getProductIdentificationOptions);
const currentSampleProduct = computed(() => productIdentificationStore.getCurrentSampleProduct)
onMounted(() => {
  productIdentificationStore.prepareProductIdentifierOptions();
  productIdentificationStore.getIdentificationPref(currentEComStore.value.productStoreId);
  productIdentificationStore.fetchProducts(); 
})

function setProductIdentificationPref(value: string | any, id: string) {
  productIdentificationStore.setProductIdentificationPref(id, value, currentEComStore.value.productStoreId)
}

function shuffle() {
  productIdentificationStore.shuffleProduct()
}

</script>
