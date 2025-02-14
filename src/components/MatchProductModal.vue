<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Match product") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-searchbar :value="queryString" :placeholder="translate('Search product')" @keyup.enter="queryString = $event.target.value; handleSearch()" />

    <div v-if="isLoading" class="empty-state">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Searching for", { queryString }) }}</ion-label>
    </div>

    <template v-else-if="isSearching && products.length">
      <ion-radio-group v-model="selectedProductId">
        <ion-item v-for="product in products" :key="product.productId">
          <ion-thumbnail slot="start">
            <Image :src="product.mainImageUrl" />
          </ion-thumbnail>
          <template v-if="isProductAvailableInCycleCount(product.productId)">
            <ion-label>
              <h2>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, product) || getProduct(product.productId).productName }}</h2>
              <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, product) }}</p>
            </ion-label>
            <ion-icon  color="success" :icon="checkmarkCircle" />
          </template>

          <ion-radio :value="product.productId" v-else>
            <ion-label>
              <h2>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].primaryId, product) || getProduct(product.productId).productName }}</h2>
              <p>{{ getProductIdentificationValue(productStoreSettings["productIdentificationPref"].secondaryId, product) }}</p>
            </ion-label>
          </ion-radio>
        </ion-item>
      </ion-radio-group>
    </template>

    <div v-else-if="queryString && isSearching && !products.length" class="empty-state">
      <p>{{ translate("No results found for", { queryString }) }}</p>
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
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { computed, defineProps, Ref, ref } from "vue";
import { checkmarkCircle, closeOutline, saveOutline } from "ionicons/icons";
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
const selectedProductId = ref("") as Ref<string>;
const isLoading = ref(false);

async function handleSearch() {
  if(!queryString.value.trim()) {
    isSearching.value = false; 
    return;
  }
  await getProducts();
  isSearching.value = true;
}
async function getProducts() {
  isLoading.value = true;
  let productsList = [] as any;
  try {
    const resp = await ProductService.fetchProducts({
      "keyword": queryString.value.trim(),
      "viewSize": 100,
      "filters": ['isVirtual: false', 'isVariant: true'],
    })
    if(!hasError(resp)) {
      productsList = resp.data.response.docs;
    }
  } catch(err) {
    logger.error("Failed to fetch products", err)
  }
  products.value = productsList
  isLoading.value = false;
}
function closeModal(payload = {}) {
  modalController.dismiss({ dismissed: true, ...payload });
}
function save() {
  const selectedProduct = products.value.find((product: any) => product.productId === selectedProductId.value)
  store.dispatch("product/addProductToCached", selectedProduct);
  closeModal({ selectedProduct })
}
function isProductAvailableInCycleCount(id: string) {
  return props.items.some((item: any) => item.productId === id && item.itemStatusId !== "INV_COUNT_REJECTED")
}
</script>