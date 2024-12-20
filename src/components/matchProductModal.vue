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
    <ion-searchbar v-model="queryString" :placeholder="translate('Search SKU or product name')" @keyup.enter="handleSearch" @ionInput="handleInput"/>

    <template v-if="products.length">
      <ion-radio-group v-model="selectedProductId">
        <ion-item v-for="product in products" :key="product.productId">
          <ion-thumbnail slot="start">
            <Image :src="product.mainImageUrl" />
          </ion-thumbnail>

          <ion-radio :value="product.productId" :disabled="isProductAvailableInCycleCount(product.productId)">
            <ion-label>
              <h2>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, product) || getProduct(product.productId).productName }}</h2>
              <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, product) }}</p>
            </ion-label>
          </ion-radio>
        </ion-item>
      </ion-radio-group>
    </template>

    <div v-else-if="queryString && isSearching && !products.length" class="empty-state">
      <p>{{ translate("No product found") }}</p>
    </div>
    <div v-else class="empty-state">
      <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
      <p>{{ translate("Enter a SKU, or product name to search a product") }}</p>
    </div>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="!selectedProductId" @click="save()">
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { computed, defineProps, ref } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import store from "@/store";
import { translate } from "@hotwax/dxp-components";
import { getProductIdentificationValue, hasError } from "@/utils"
import Image from "@/components/Image.vue"
import { ProductService } from "@/services/ProductService";
import logger from "@/logger";

const props = defineProps(["items"])

const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])
const getProduct = computed(() => (id: any) => store.getters["product/getProduct"](id))
const products = ref([]) as any;

let queryString = ref('');
const isSearching = ref(false);
const selectedProductId = ref("") as any;

async function handleSearch() {
  if(!queryString.value) {
    isSearching.value = false; 
    return;
  }
  await getProducts();
  isSearching.value = true;
}

async function getProducts() {
  let productsList = [] as any;
  try {
    const resp = await ProductService.fetchProducts({
      "keyword": queryString.value,
      "viewSize": 100
    })
    if(!hasError(resp)) {
      productsList = resp.data.response.docs;
    }
  } catch(err) {
    logger.error("Failed to fetch products", err)
  }

  products.value = productsList
}

function closeModal(payload = {}) {
  modalController.dismiss({ dismissed: true, ...payload });
}

function save() {
  closeModal({ selectedProduct: products.value.find((product: any) => product.productId === selectedProductId) })
}

function handleInput() {
  if(!queryString.value) {
    isSearching.value = false;
  }
}

function isProductAvailableInCycleCount(id: string) {
  return props.items.some((item: any) => item.productId === id && item.itemStatusId !== "INV_COUNT_REJECTED")
}
</script>
