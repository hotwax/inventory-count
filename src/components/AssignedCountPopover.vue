<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</ion-list-header>
      <ion-item :lines="isRemoveItemEligible(item) ? 'full' : 'none'">
        <ion-label>{{ translate("Last counted")}}</ion-label>
        <ion-note slot="end">{{ timeFromNow(item.lastCountedDate) }}</ion-note>
      </ion-item>
      <ion-item v-if="isRemoveItemEligible(item)" lines="none" button @click="updateItem('remove')">
        <ion-label>{{ translate("Remove from count")}}</ion-label>
        <ion-icon slot="end" :icon="removeCircleOutline"/>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  popoverController
} from "@ionic/vue"
import { removeCircleOutline } from "ionicons/icons";
import { computed, defineProps } from "vue";
import { translate } from "@/i18n"
import { getProductIdentificationValue, timeFromNow } from "@/utils"
import store from "@/store";

defineProps(["item"])

const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])

function updateItem(action: string) {
  popoverController.dismiss({ itemAction: action })
}

function isRemoveItemEligible(item: any) {
  return item.itemStatusId !== 'INV_COUNT_REJECTED' && item.itemStatusId !== 'INV_COUNT_COMPLETED' && !item.quantity;
}
</script>