<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>
        {{ translate('Force scan') }}
      </ion-card-title>
    </ion-card-header>
    <ion-card-content v-html="barcodeContentMessage"></ion-card-content>
    <ion-item lines="none" :disabled="!hasPermission('APP_DRAFT_VIEW')">
      <ion-toggle :checked="productStoreSettings['forceScan']" @click.prevent="updateProductStoreSetting($event, 'forceScan')">
        {{ translate("Require barcode scanning") }}
      </ion-toggle>
    </ion-item>
    <ion-item lines="none" :disabled="!hasPermission('APP_DRAFT_VIEW')">
      <ion-select :label="translate('Barcode Identifier')" interface="popover" :placeholder="translate('Select')" :value="productStoreSettings['barcodeIdentificationPref']" @ionChange="setBarcodeIdentificationPref($event.detail.value)">
        <ion-select-option v-for="identification in productIdentifications" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
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
  IonToggle
} from "@ionic/vue";
import { translate } from '@/i18n'
import store from "@/store";
import { computed } from "vue";
import { hasPermission } from "@/authorization"
import { useProductIdentificationStore } from "@hotwax/dxp-components";

const productIdentificationStore = useProductIdentificationStore();

const barcodeContentMessage = translate("Require inventory to be scanned when counting instead of manually entering values. If the identifier is not found, the scan will default to using the internal name.", { space: '<br /><br />' })
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])
const productIdentifications = computed(() => productIdentificationStore.getGoodIdentificationOptions)

function updateProductStoreSetting(event: any, key: string) {
  event.stopImmediatePropagation();
  store.dispatch("user/setProductStoreSetting", { key, value: !productStoreSettings.value[key] })
}

function setBarcodeIdentificationPref(value: any) {
  store.dispatch("user/setProductStoreSetting", { key: "barcodeIdentificationPref", value })
}
</script>