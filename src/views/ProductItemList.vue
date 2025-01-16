<template>
  <ion-item v-if="currentProduct" :color="isCurrentProduct() ? 'light' : ''" button @click="navigateToDetail(item)">
    <ion-thumbnail slot="start">
      <Image :src="getProduct(item.productId).mainImageUrl"/>
    </ion-thumbnail>
    <ion-label class="ion-text-wrap" v-if="item.productId">
      <p class="overline">{{ item.itemStatusId === 'INV_COUNT_REJECTED' ? "rejected" : "" }}</p>
      <h2>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, getProduct(item.productId)) || getProduct(item.productId).productName }}</h2>
      <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, getProduct(item.productId)) }}</p>
    </ion-label>
    <ion-label class="ion-text-wrap" v-else>
      <h2>{{ item.scannedId }}</h2>
      <p>{{ translate(item.isMatching ? "matching..." : "no match found") }}</p>
    </ion-label>
    <ion-badge slot="end" color="danger" v-if="item.itemStatusId === 'INV_COUNT_REJECTED'">
      {{ (!item.quantity && item.quantity !== 0) ? translate("not counted") : translate("units", { count: item.quantity }) }}
    </ion-badge>
    <ion-note v-else-if="item.itemStatusId === 'INV_COUNT_COMPLETED'" color="success">
      {{ translate("accepted") }}
    </ion-note>
    <ion-badge slot="end" v-else-if="item.statusId === 'INV_COUNT_ASSIGNED' && ((item.quantity !== undefined && item.quantity !== null) || (item.scannedCount !== undefined && item.scannedCount !== null && item.scannedCount !== ''))">
      {{ translate("units", { count: isItemAlreadyAdded(item) ? item.quantity : item.scannedCount }) }}
    </ion-badge>
    <ion-note v-else-if="(item.quantity === undefined || item.quantity === null || item.scannedCount === '') && item.statusId === 'INV_COUNT_ASSIGNED'">
      {{ translate("pending") }}
    </ion-note>
    <ion-note v-else-if="item.quantity >= 0 && item.statusId === 'INV_COUNT_REVIEW'">
      {{ translate("pending review") }}
    </ion-note>
    <ion-note v-else-if="!item.quantity && item.statusId === 'INV_COUNT_REVIEW'" color="warning">
      {{ translate("not counted") }}
    </ion-note>
  </ion-item>
</template>

<script setup lang="ts">
import { computed, defineProps, onMounted } from 'vue';
import { IonBadge, IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue";
import { translate } from '@/i18n'
import { useStore } from 'vuex';
import Image from "@/components/Image.vue";
import { getProductIdentificationValue } from "@/utils"
import { useRouter } from 'vue-router';
import emitter from '@/event-bus';

const router = useRouter();
const store = useStore();
const props = defineProps(['item']);

const isScrollingAnimationEnabled = process.env.VUE_APP_SCROLLING_ANIMATION_ENABLED ? JSON.parse(process.env.VUE_APP_SCROLLING_ANIMATION_ENABLED) : false;

const getProduct = computed(() => (id: string) => store.getters["product/getProduct"](id))
const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])
const currentProduct = computed(() => store.getters["product/getCurrentProduct"])

onMounted(() => {
  if (Object.keys(currentProduct.value).length) {
    navigateToDetail(currentProduct.value);
  }
})

/**
 * Navigates to a detail page and smoothly scrolls to a specific element.

 * This function addresses a common issue where CSS scroll-behavior: smooth conflicts with scroll-snap-align, preventing smooth scrolling to work properly.
 * It also handles the challenge of scrolling to an element on a page that is being navigated to and scroll smoothly.
 **/
async function navigateToDetail(item: any) {
  router.replace({ hash: isItemAlreadyAdded(item) ? `#${item.productId}-${item.importItemSeqId}` : `#${item.scannedId}` }); 
  if(props.item.countTypeEnumId === "HARD_COUNT" && !isScrollingAnimationEnabled) {
    emitter.emit("handleProductClick", item)
  } else {
    setTimeout(() => {
      const element = document.getElementById(isItemAlreadyAdded(item) ? `${item.productId}-${item.importItemSeqId}` : item.scannedId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        store.dispatch("product/currentProduct", item);
      }
    }, 0);
  }
}

// Method to display the item as selected by changing the ion-item color to light
function isCurrentProduct() {
  // Added check for itemStatusId as we may have the same product added multiple times in different status(like in case when request recount an item)
  return isItemAlreadyAdded(currentProduct.value) ? (currentProduct.value.productId == props.item.productId && currentProduct.value.itemStatusId === props.item.itemStatusId && currentProduct.value.importItemSeqId === props.item.importItemSeqId) : currentProduct.value.scannedId === props.item.scannedId
}

function isItemAlreadyAdded(product: any) {
  return product.productId && product.importItemSeqId;
}
</script>

<style scoped>
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