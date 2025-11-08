<template>
  <ion-card>
    <ion-card-header>
      <ion-card-subtitle>
        {{ translate("Product Store") }}
      </ion-card-subtitle>
      <ion-card-title>
        {{ translate("Store") }}
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      {{ translate('A store represents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores selling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.') }}
    </ion-card-content>

    <ion-item lines="none">
      <ion-select :label="translate('Select store')" interface="popover" :placeholder="translate('store name')" :value="currentEComStore?.productStoreId" @ionChange="updateEComStore($event.target.value)">
        <ion-select-option v-for="store in (eComStores ? eComStores : [])" :key="store.productStoreId" :value="store.productStoreId">{{ store.storeName }}</ion-select-option>
      </ion-select>
    </ion-item>
  </ion-card>
</template>
    
<script setup lang="ts">
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/vue';
import { useUserStore } from '@/stores/user'
import { computed } from 'vue';
import { translate } from '../i18n'
import { defineProps } from "vue";

const userStore = useUserStore();
const props = defineProps<{
  onUpdateEComStore?: (store: any) => void
}>()

const eComStores = computed(() => userStore.getProductStores) as any;
const currentEComStore = computed(() => userStore.getCurrentEComStore);

async function updateEComStore(eComStoreId: any) {
  const selectedProductStore = eComStores.value.find((store: any) => store.productStoreId == eComStoreId)
  await userStore.setEComStorePreference(selectedProductStore)
  props.onUpdateEComStore?.(selectedProductStore)
}
</script>