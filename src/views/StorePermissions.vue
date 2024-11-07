<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Store permissions") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="permission-cards">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Quantity on hand') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ translate("Show the current physical quantity expected at locations while counting to help gauge inventory accuracy.") }}</p>
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle :checked="productStoreSettings['showQoh']" @click.prevent="updateProductStoreSetting($event, 'showQoh')">
              {{ translate("Show systemic inventory") }}
            </ion-toggle>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Force scan') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content v-html="barcodeContentMessage"></ion-card-content>
          <ion-item lines="none">
            <ion-toggle :checked="productStoreSettings['forceScan']" @click.prevent="updateProductStoreSetting($event, 'forceScan')">
              {{ translate("Require barcode scanning") }}
            </ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-select :label="translate('Barcode Identifier')" interface="popover" :placeholder="translate('Select')" :value="productStoreSettings['barcodeIdentificationPref']" @ionChange="setBarcodeIdentificationPref($event.detail.value)">
              <ion-select-option v-for="identification in productIdentifications" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </div>
    </ion-content> 
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { translate } from '@/i18n'
import store from "@/store";
import { computed } from "vue";

const barcodeContentMessage = translate("Require inventory to be scanned when counting instead of manually entering values. If the identifier is not found, the scan will default to using the internal name.", { space: '<br /><br />' })
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])
const productIdentifications = computed(() => store.getters["user/getGoodIdentificationTypes"])

onIonViewWillEnter(async () => {
  await store.dispatch("user/getProductStoreSetting")
})

function updateProductStoreSetting(event: any, key: string) {
  event.stopImmediatePropagation();
  store.dispatch("user/setProductStoreSetting", { key, value: !productStoreSettings.value[key] })
}

function setBarcodeIdentificationPref(value: any) {
  store.dispatch("user/setProductStoreSetting", { key: "barcodeIdentificationPref", value })
}
</script>

<style scoped>
.permission-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(325px, 3fr));
  align-items: start;
}
</style>