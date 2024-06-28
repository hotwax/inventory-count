<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Add product") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="translate('Search SKU or product name')" v-on:keyup.enter="queryString = $event.target.value; getProducts()" />
    
    <template v-if="products.length">
      <ion-list v-for="product in products" :key="product.productId">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <DxpShopifyImg :src="product.mainImageUrl" />
          </ion-thumbnail>
          <ion-label>
            <!-- Honouring the identifications set by the user on the settings page -->
            <!-- <h2>{{ product[productIdentificationPref.primaryId] }}</h2>
            <p>{{ product[productIdentificationPref.secondaryId] }}</p> -->
            {{ product.productId }}
          </ion-label>
          <ion-icon v-if="isProductAvailableInCycleCount(product.productId)" color="success" :icon="checkmarkCircle" />
          <ion-button v-else fill="outline" @click="addToCycleCount(product)">{{ translate("Add to count") }}</ion-button>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </template>
    <div v-else class="empty-state">
      <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
      <p>{{ translate("Enter a SKU, or product name to search a product") }}</p>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { computed, defineProps, onMounted, onUnmounted, ref } from "vue";
import { closeOutline, checkmarkCircle } from "ionicons/icons";
import store from "@/store";
import { DxpShopifyImg, translate } from "@hotwax/dxp-components";
import { showToast } from "@/utils"
import emitter from "@/event-bus";

const props = defineProps(["cycleCount"])

const products = computed(() => store.getters["product/getProducts"])
const isScrollable = computed(() => store.getters["product/isScrollable"])

let queryString = ref('')

onUnmounted(() => {
  products
})

async function getProducts( vSize?: any, vIndex?: any) {
  const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  const payload = {
    viewSize,
    viewIndex,
    queryString: queryString.value
  }
  if (queryString.value) {
    await store.dispatch("product/findProduct", payload);
  }
  else {
    showToast(translate("Enter product sku to search"))
  }
}

async function loadMoreProducts(event: any) {
  getProducts(
    undefined,
    Math.ceil(products.value.length / process.env.VUE_APP_VIEW_SIZE).toString()
  ).then(() => {
    event.target.complete();
  })
}

async function addToCycleCount(product: any) {
  emitter.emit("addProductToCount", product.productId)
}

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

function selectSearchBarText(event: any) {
  event.target.getInputElement().then((element: any) => {
    element.select();
  })
}

function isProductAvailableInCycleCount(id: string) {
  return props.cycleCount.items.some((item: any) => item.productId === id && item.itemStatusId !== "INV_COUNT_REJECTED")
}
</script>
