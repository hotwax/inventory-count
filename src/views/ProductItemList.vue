<template>
  <ion-item @click="selectedProduct(item)" button>
    <ion-thumbnail slot="start">
      <Image :src="getProduct(item.productId).mainImageUrl"/>
    </ion-thumbnail>
    <ion-label class="ion-text-wrap">
      <p class="overline">{{ item.itemStatusId === 'INV_COUNT_REJECTED' ? "rejected" : "" }}</p>
      <h2>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(item.productId)) }}</h2>
      <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, getProduct(item.productId)) }}</p>
    </ion-label>
    <ion-badge slot="end" color="danger" v-if="item.itemStatusId === 'INV_COUNT_REJECTED'">
      {{ item.quantity ? item.quantity : "-" }} {{ translate("units") }}
    </ion-badge>
    <ion-note v-else-if="item.itemStatusId === 'INV_COUNT_COMPLETED'" color="success">
      {{ translate("accepted") }}
    </ion-note>
    <ion-badge slot="end" v-else-if="item.quantity && item.statusId === 'INV_COUNT_ASSIGNED'">
      {{ item.quantity }} {{ translate("units") }}
    </ion-badge>
    <ion-note v-else-if="!item.quantity && item.statusId === 'INV_COUNT_ASSIGNED'">
      {{ translate("pending") }}
    </ion-note>
    <ion-note v-else-if="item.quantity > 0 && item.statusId === 'INV_COUNT_REVIEW'">
      {{ translate("pending review") }}
    </ion-note>
    <ion-note v-else-if="!item.quantity && item.statusId === 'INV_COUNT_REVIEW'" color="warning">
      {{ translate("not counted") }}
    </ion-note>
  </ion-item>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue';
import { IonBadge, IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue";
import { translate } from '@/i18n'
import { useStore } from 'vuex';
import Image from "@/components/Image.vue";
import { getProductIdentificationValue } from "@/utils"

const store = useStore();

defineProps(['item'])

const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])

async function selectedProduct(item: any) {
  // Making recount variable as false when clicking on the item so that the product details are displayed in the default state on initial load
  await store.dispatch('product/currentProduct', { ...item, isRecounting: false });
}
</script>

<style>
ion-thumbnail > img {
  object-fit: contain;
}

.atp-info {
  display: flex;
  align-items: center; 
  flex-direction: row; 
}

ion-note {
  align-self: center;
  padding: 0;
  font-size: 12px;
}

/* Using important as we have styling that overrides this, need to update the actual styling for this */
.overline {
  color: var(--ion-color-danger) !important;
}
</style>