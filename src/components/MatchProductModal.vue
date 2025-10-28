<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>Match Product</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <!-- Product search -->
    <ion-searchbar
      v-model="queryString"
      placeholder="Search product"
      @keyup.enter="handleSearch"
    />

    <div v-if="isLoading" class="empty-state ion-padding">
      <ion-spinner name="crescent" />
      <ion-label>Searching for "{{ queryString }}"</ion-label>
    </div>

    <template v-else-if="isSearching && products.length">
      <ion-radio-group v-model="selectedProductId">
        <ion-item v-for="product in products" :key="product.productId">
          <ion-thumbnail slot="start">
            <Image v-if="product.mainImageUrl" :src="product.mainImageUrl" />
          </ion-thumbnail>

          <ion-radio :value="product.productId">
            <ion-label>
              {{ getProductIdentificationValue(
                productIdentificationStore.getProductIdentificationPref.primaryId,
                product
              ) || product.productName }}
              <p>
                {{ getProductIdentificationValue(
                  productIdentificationStore.getProductIdentificationPref.secondaryId,
                  product
                ) }}
              </p>
            </ion-label>
          </ion-radio>
        </ion-item>
      </ion-radio-group>
    </template>

    <div v-else-if="queryString && isSearching && !products.length" class="empty-state ion-padding">
      <p>No results found for "{{ queryString }}"</p>
    </div>

    <div v-else class="empty-state ion-padding">
      <img src="../assets/images/empty-state-add-product-modal.png" alt="empty-state" />
      <p>Enter a SKU or product name to search a product</p>
    </div>
    <!-- Save button -->
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="!selectedProductId" @click="saveMatchProduct">
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
  IonList,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { ref, defineProps, toRaw } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { showToast, hasError } from "@/utils";
import Image from "@/components/Image.vue";
import { getProductIdentificationValue, useProductIdentificationStore } from "@hotwax/dxp-components";
import { inventorySyncWorker } from "@/workers/workerInitiator";
import { client } from "@/api";
import store from "@/store";

const props = defineProps<{
  workEffortId: string;
  inventoryCountImportId: string;
  item: any;
}>();

const products = ref<any[]>([]);
const queryString = ref("");
const isSearching = ref(false);
const selectedProductId = ref("");
const isLoading = ref(false);
const productIdentificationStore = useProductIdentificationStore();

/**
 * Fetch products directly from Solr via API
 */
const fetchProducts = async (query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters["user/getOmsRedirectionInfo"];
  const baseURL = omsRedirectionInfo.url.startsWith("http")
    ? omsRedirectionInfo.url.includes("/api")
      ? omsRedirectionInfo.url
      : `${omsRedirectionInfo.url}/api/`
    : `https://${omsRedirectionInfo.url}.hotwax.io/api/`;

  return await client({
    url: "searchProducts",
    method: "POST",
    baseURL,
    data: query,
    headers: {
      Authorization: "Bearer " + omsRedirectionInfo.token,
      "Content-Type": "application/json",
    },
  });
};

async function handleSearch() {
  if (!queryString.value.trim()) {
    isSearching.value = false;
    return;
  }
  await getProducts();
  isSearching.value = true;
}

async function getProducts() {
  isLoading.value = true;
  try {
    const resp = await fetchProducts({
      keyword: queryString.value.trim(),
      viewSize: 100,
      filters: ["isVirtual: false", "isVariant: true"],
    });

    if (!hasError(resp)) {
      products.value = resp.data.response.docs;
    }
  } catch (err) {
    console.error("Failed to fetch products", err);
  }
  isLoading.value = false;
}

function closeModal(payload: any = {}) {
  modalController.dismiss(payload);
}

/**
 * Replace the product in inventory count record and sync
 */
async function saveMatchProduct() {
  if (!selectedProductId.value) {
    showToast("Please select a product to match");
    return;
  }

  const omsInfo = store.getters["user/getOmsRedirectionInfo"];
  const context = {
    maargUrl: store.getters["user/getBaseUrl"],
    token: omsInfo?.token,
    omsUrl: omsInfo?.url,
    userLoginId: store.getters["user/getUserProfile"]?.username,
    isRequested: 'Y',
  };

  const plainItem = JSON.parse(JSON.stringify(toRaw(props.item)));
  const plainContext = JSON.parse(JSON.stringify(context));

  try {
    const result = await inventorySyncWorker.matchProductLocallyAndSync(
      props.workEffortId,
      props.inventoryCountImportId,
      plainItem,
      selectedProductId.value,
      plainContext
    );

    if (result.success) {
      showToast("Product matched successfully");
      closeModal({ success: true });
    } else {
      showToast("Failed to match product");
    }
  } catch (err) {
    console.error("Error while matching product:", err);
    showToast("An error occurred while matching product");
  }
}
</script>

<style scoped>
ion-list {
  margin-top: 12px;
}
ion-radio-group ion-item {
  --inner-padding-start: 0;
}
.empty-state {
  text-align: center;
}
</style>
