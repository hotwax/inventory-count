<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" @click="router.push(`/session-count-detail/${props.workEffortId}/${workEffort?.workEffortPurposeTypeId}/${props.inventoryCountImportId}`)"/>
        <ion-title>{{ translate("Add Pre Counted Items")}}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-card>
        <ion-item lines="inset">
          <ion-title>
            {{ translate("Add Items") }}
          </ion-title>
        </ion-item>
        <ion-item lines="none">
          <ion-searchbar v-model="searchedProductString" @keyup.enter="handleSearch"></ion-searchbar>
        </ion-item>
        <ion-item>
          <ion-thumbnail>
            <img alt="Silhouette of mountains" src="https://ionicframework.com/docs/img/demos/thumbnail.svg" />
          </ion-thumbnail>
          <ion-label>
            {{ translate("Search for Products by Parent Name, SKU or UPC") }}
          </ion-label>
        </ion-item>
        <ion-card v-if="searchedProduct">
          <ion-item lines="none">
            <ion-thumbnail>
              <img :src="searchedProduct.mainImageUrl">
            </ion-thumbnail>
            <ion-label color="dark">
                {{ translate(searchedProduct.sku) }}
            </ion-label>
            <ion-input min=1 slot="end" size="small" type="number" placeholder="0" v-model.number="searchedProduct.selectedQuantity"></ion-input>
            <ion-button @click="addProductInPreCountedItems(searchedProduct)">
              {{ translate("Save") }}
            </ion-button>
          </ion-item>
        </ion-card>
      </ion-card>
      <ion-title>
        <strong>{{ translate("Counted Items") }}</strong>
      </ion-title>
      <ion-card>
        <ion-list v-if="products?.length">
          <div v-for="product in products" :key="product.productId" class="ion-margin-vertical">
            <ion-item lines="full">
              <ion-thumbnail>
                <img :src="product.mainImageUrl" />
              </ion-thumbnail>
              <ion-label color="dark">
                {{ translate(product.sku) }}
              </ion-label>
              <ion-input
                :disabled="true"
                slot="end"
                size="small"
                type="number"
                placeholder="0"
                v-model.number="product.selectedQuantity"
              ></ion-input>
            </ion-item>
            <ion-item v-if="product.quantityOnHand">
              <ion-progress-bar
                :color="product.selectedQuantity === product.quantityOnHand
                  ? 'success'
                  : product.selectedQuantity > product.quantityOnHand
                  ? 'danger'
                  : 'primary'"
                :value="product.selectedQuantity / product.quantityOnHand"
                class="ion-margin-horizontal"
              ></ion-progress-bar>
              <p slot="end">{{ product.quantityOnHand }}</p>
            </ion-item>
          </div>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from '@/i18n';
import { IonPage, IonToolbar, IonContent, IonBackButton, onIonViewDidEnter, IonSearchbar, IonList, IonItem, IonInput, IonLabel, IonButton, IonCard, IonTitle, IonThumbnail } from '@ionic/vue';

import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { ref, defineProps } from 'vue';
import router from '@/router';
import { hasError, showToast } from '@/utils';
import { loader } from '@/user-utils';
import store from '@/store';
import { client } from '@/services/RemoteAPI';
import { useProductIdentificationStore, getProductIdentificationValue, useUserStore } from '@hotwax/dxp-components';
import { ProductService } from '@/services/ProductService';
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';

const productIdentificationStore = useProductIdentificationStore();

const workEffort = ref();
const inventoryCountImport = ref();
const searchedProductString = ref();
const products = ref<any[]>([]);
const searchedProduct = ref();

const props = defineProps({
  workEffortId: String,
  inventoryCountImportId: String,
});

onIonViewDidEnter(async () => {
  await loader.present("Loading...");
  await getInventoryCycleCount();
  loader.dismiss();
})

async function getInventoryCycleCount() {
  try {
    const resp = await useInventoryCountImport().getInventoryCountImportSession({ inventoryCountImportId: props.inventoryCountImportId as string });
    if (resp?.status === 200 && resp.data) {
      workEffort.value = resp.data;
      const sessionResp = await useInventoryCountRun().getWorkEffort({ workEffortId: props.workEffortId });
      if (sessionResp?.status && sessionResp.data) {
        inventoryCountImport.value = sessionResp.data;
      } else {
        throw sessionResp;
      }
    } else {
      throw resp;
    }
  } catch (error) {
    console.error(error);
    showToast("Failed to fetch Count and Sessions Details");
  }
}

async function handleSearch() {
  if (!searchedProductString.value.trim()) {
    return;
  }
  await getProducts();
}

async function getProducts() {
  await loader.present("Searching Product...");
  try {
    const resp = await loadProducts({
      docType: "PRODUCT",
      viewSize: 100,
      filters: ["isVirtual: false", "isVariant: true", `internalName: ${searchedProductString.value.trim()}`],
    });

    if (resp && !hasError(resp) && resp.data) {
      searchedProduct.value = resp.data.response.docs?.[0];
      if (!searchedProduct.value) {
        showToast(`Product Not Found by ${searchedProductString.value}`);
      }
    }
  } catch (err) {
    console.error("Failed to fetch products", err);
    showToast("Something Went Wrong");
  }
  loader.dismiss();
}

const loadProducts = async (query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters["user/getOmsRedirectionInfo"];
  const baseURL = omsRedirectionInfo.url.startsWith("http") ? omsRedirectionInfo.url.includes("/api") ? omsRedirectionInfo.url : `${omsRedirectionInfo.url}/api/` : `https://${omsRedirectionInfo.url}.hotwax.io/api/`;
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

async function addProductInPreCountedItems(product: any) {
  await loader.present("Loading...");
  try {
    if (searchedProductString.value) searchedProductString.value = null;
    const productIdentifierPref = productIdentificationStore.getProductIdentificationPref;
    await useInventoryCountImport().recordScan({
      inventoryCountImportId: props.inventoryCountImportId as string,
      productIdentifier: getProductIdentificationValue(productIdentifierPref.primaryId, product),
      quantity: product.selectedQuantity,
    });
    if (products.value?.length > 0) {
      const existingProduct = products.value.find(p => p.productId === product.productId);
      if (existingProduct) {
        existingProduct.selectedQuantity += product.selectedQuantity;
      } else {
        products.value.push(product);
      }
    } else {
      products.value = [product];
    }
    searchedProduct.value = null;
    const currentFacility: any = useUserStore().getCurrentFacility;
    const qohResp = await ProductService.getProductStock({
      productId: product.productId,
      facilityId: currentFacility.facilityId
    } as any);

    if (qohResp?.status === 200 && qohResp.data?.qoh) {
      product.quantityOnHand = qohResp.data?.qoh;
    }
  } catch (error) {
    console.error("Error Adding Product to Scan Event: ", error);
  }
  showToast(translate("Item Count Saved"));
  loader.dismiss();
}

</script>