<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>
        {{ translate('Force scan') }}
      </ion-card-title>
    </ion-card-header>
    <ion-card-content v-html="barcodeContentMessage"></ion-card-content>
    <!-- <ion-item lines="none" :disabled="!hasPermission('APP_DRAFT_VIEW')">
      <ion-toggle :checked="productStoreSettings['forceScan']" @click.prevent="updateProductStoreSetting($event, 'forceScan')">
        {{ translate("Require barcode scanning") }}
      </ion-toggle>
    </ion-item> -->
    <!-- <ion-item v-if="!router.currentRoute.value.fullPath.includes('/tabs/')" lines="none" :disabled="!hasPermission('APP_DRAFT_VIEW')">
      <ion-toggle :checked="productStoreSettings['isFirstScanCountEnabled']" @click.prevent="updateProductStoreSetting($event, 'isFirstScanCountEnabled')">
        {{ translate("Count on first scan") }}
      </ion-toggle>
    </ion-item> -->
    <ion-item lines="none" :disabled="!hasPermission('APP_DRAFT_VIEW')">
      <ion-select :label="translate('Barcode Identifier')" interface="popover" :placeholder="translate('Select')" :value="productStoreSettings['barcodeIdentificationPref']" @ionChange="setBarcodeIdentificationPref($event.detail.value)">
        <ion-select-option v-for="identification in productIdentifications" :key="identification.goodIdentificationTypeId" :value="identification.goodIdentificationTypeId" >{{ identification.description ? identification.description : identification.goodIdentificationTypeId }}</ion-select-option>
      </ion-select>
    </ion-item>
  </ion-card>
</template>

<script setup lang="ts">
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonSelect,
  IonSelectOption,
  // IonToggle
} from "@ionic/vue";
import { translate } from '@/i18n'
import { computed } from "vue";
// import router from "@/router";
import { hasPermission } from "@/authorization"
import { useProductIdentificationStore } from "@/stores/productIdentification";
import { useUserProfileNew } from "@/stores/useUserProfile";
import { useProductStore } from "@/stores/useProductStore";

const productIdentificationStore = useProductIdentificationStore();

const barcodeContentMessage = translate("Require inventory to be scanned when counting instead of manually entering values. If the identifier is not found, the scan will default to using the internal name.", { space: '<br /><br />' })
const productStoreSettings = computed(() => useUserProfileNew().getProductStoreSettings)
const productIdentifications = computed(() => productIdentificationStore.getGoodIdentificationOptions) as any

function updateProductStoreSetting(event: any, key: string) {
  event.stopImmediatePropagation();
  useUserProfileNew().setProductStoreSetting(key, productStoreSettings.value[key], useProductStore().getCurrentProductStore.productStoreId);
}

function setBarcodeIdentificationPref(value: any) {
  useUserProfileNew().setProductStoreSetting("barcodeIdentificationPref", value, useProductStore().getCurrentProductStore.productStoreId);
}
</script>