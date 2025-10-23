<template>
  <!-- last matched item -->
  <template v-if="getMatchedProduct('last')">
    <ion-item lines="none">
      <ion-thumbnail slot="start">
        <Image :src="getProduct(getMatchedProduct('last')?.productId)?.mainImageUrl" :key="getMatchedProduct('last')?.importItemSeqId"/>
      </ion-thumbnail>
      <ion-label>
        {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(getMatchedProduct('last')?.productId)) }}
        <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(getMatchedProduct('last')?.productId)) }}</p>
        <p>{{ translate("items ago", { lastIndex: lastItemIndexDist }) }}</p>
      </ion-label>
      <div class="last-next-match">
        <ion-note class="ion-margin-end">{{ translate("last match") }}</ion-note>
        <ion-button size="default" fill="outline" shape="round" color="medium" class="ion-no-padding" @click="$emit('change-product', 'last', lastItemIndexDist, currentIndex)">
          <ion-icon slot="icon-only" :icon="chevronUpOutline"></ion-icon>
        </ion-button>
      </div>
    </ion-item>
  </template>
  <!-- next matched item -->
  <template v-if="getMatchedProduct('next')">
    <ion-item lines="none">
      <ion-thumbnail slot="start">
        <Image :src="getProduct(getMatchedProduct('next')?.productId)?.mainImageUrl" :key="getMatchedProduct('next')?.importItemSeqId"/>
      </ion-thumbnail>
      <ion-label>
        {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, getProduct(getMatchedProduct('next')?.productId)) }}
        <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, getProduct(getMatchedProduct('next')?.productId)) }}</p>
        <p>{{ translate('items later', { nextIndex: nextItemIndexDist }) }}</p>
      </ion-label>
      <div class="last-next-match">
        <ion-note class="ion-margin-end">{{ translate('next match') }}</ion-note>
        <ion-button size="default" fill="outline" shape="round" color="medium" class="ion-no-padding" @click="$emit('change-product', 'next', nextItemIndexDist, currentIndex)">
          <ion-icon slot="icon-only" :icon="chevronDownOutline"></ion-icon>
        </ion-button>
      </div>
    </ion-item>
  </template>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineProps, ref } from 'vue'
import Image from "@/components/Image.vue";
import { useStore } from "@/store";
import { IonItem, IonThumbnail, IonLabel, IonNote, IonButton, IonIcon } from "@ionic/vue";
import { chevronUpOutline, chevronDownOutline } from "ionicons/icons";
import { getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import { translate } from "@/i18n";

const store = useStore();
const productIdentificationStore = useProductIdentificationStore();

const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id));

const props = defineProps(["scannedId", "itemList"])
const emit = defineEmits(["change-product"])

const lastItemIndexDist = ref(0)
const nextItemIndexDist = ref(0)
const currentIndex = ref(0)

function getMatchedProduct(direction: string) {
  const allItems = props.itemList
  currentIndex.value = allItems.findIndex((item: any) => item?.scannedId === props.scannedId)
  if(currentIndex.value === -1) return null

  const slicedItems = (direction === "last") ? allItems.slice(0, currentIndex.value).reverse() : allItems.slice(currentIndex.value + 1)
  const matchedItem = slicedItems.find((item: any) => !item.isMatchNotFound)

  if(matchedItem) {
    const matchedIndex = allItems.findIndex((item: any) => item.productId === matchedItem.productId)
    const distance = Math.abs(matchedIndex - currentIndex.value)
    if(direction === "last") {
      lastItemIndexDist.value = distance
    } else {
      nextItemIndexDist.value = distance
    }
    return matchedItem
  }
  return null
}
</script>

<style scoped>
.last-next-match {
  display: flex;
  align-items: center;
}
</style>