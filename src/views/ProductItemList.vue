<template>
  <ion-list>
    <ion-item @click="selectedProduct(item)" button>
      <ion-thumbnail slot="start">
        <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl"/>
      </ion-thumbnail>
      <ion-label class="ion-text-wrap">
        <h2>{{ item.productId }}</h2>
        <p>{{ item.productId }}</p>
      </ion-label>
      <ion-badge slot="end" v-if="item.quantity && item.statusId === 'INV_COUNT_ASSIGNED'">
        {{ item.quantity }} {{ translate("units") }}
      </ion-badge>
      <ion-note v-if="!item.quantity && item.statusId === 'INV_COUNT_ASSIGNED'">
        {{ translate("pending") }}
      </ion-note>
      <ion-note v-else-if="item.quantity > 0 && item.statusId === 'INV_COUNT_REVIEW'">
        {{ translate("pending review") }}
      </ion-note>
      <ion-note v-else-if="!item.quantity && item.statusId === 'INV_COUNT_REVIEW'" color="warning">
        {{ translate("not counted") }}
      </ion-note>
      <ion-note v-else-if="item.statusId === 'INV_COUNT_COMPLETED'" color="success">
        {{ translate("accepted") }}
      </ion-note>
      <ion-note v-else-if="item.statusId === 'INV_COUNT_REJECTED'" color="danger">
        {{ translate("rejected") }}
      </ion-note>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue';
import {  IonBadge, IonItem, IonLabel, IonList, IonNote, IonThumbnail } from "@ionic/vue";
import { translate } from '@/i18n'
import { useStore } from 'vuex';

const store = useStore();

defineProps(['item'])

const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))

async function selectedProduct(item: any) { 
  store.dispatch('product/currentProduct', item);
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
</style>