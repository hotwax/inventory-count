<template>
  <ion-list>
    <ion-item @click="selectedProduct(item)" button>
      <ion-thumbnail slot="start">
        <DxpShopifyImg/>
      </ion-thumbnail>
      <ion-label class="ion-text-wrap">
        <h2>{{ item.productId }}</h2>
        <p>{{ item.productId }}</p>
      </ion-label>
      <ion-badge slot="end" v-if="item.quantity && item.statusId === 'INV_COUNT_CREATED'">
        {{ item.quantity }} units
      </ion-badge>
      <ion-note v-if="!item.quantity">
        {{ translate("pending") }}
      </ion-note>
      <ion-note v-else-if="item.quantity > 0 && item.statusId === 'INV_COUNT_REVIEW'">
        {{ translate("pending review") }}
      </ion-note>
      <ion-note v-else-if="item.quantity === 0 && item.statusId === 'INV_COUNT_REVIEW'" color="warning">
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
import { computed, defineProps, ref } from 'vue';
import { IonItem, IonLabel, IonList, IonThumbnail, IonBadge } from "@ionic/vue";
import { translate } from '@/i18n'
import { useStore } from 'vuex';

const store = useStore();

const props = defineProps(['item'])

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