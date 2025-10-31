<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" @click="router.push(`/session-count-detail/${props.workEffortId}/${workEffort?.workEffortPurposeTypeId}/${props.inventoryCountImportId}`)"/>
        <ion-title>{{ translate("Add Pre Counted Items")}}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
        <ion-searchbar v-model="searchedProductString" @keyup.enter="handleSearch"></ion-searchbar>
        {{ workEffort?.workEfforName }}
        <ion-list>
          <ion-item lines="full" v-for="product in products" :key="product.productId">
            <ion-label>
              {{ translate(product.sku) }}
              {{ translate(product.upc) }}              
            </ion-label>
            <ion-input slot="end" size="small" type="number" placeholder="0"></ion-input>
          </ion-item>
        </ion-list>
      </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from '@/i18n';
import { IonPage, IonToolbar, IonContent, IonBackButton, onIonViewDidEnter, IonSearchbar, IonList, IonItem, IonInput, IonLabel } from '@ionic/vue';

import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { ref, defineProps } from 'vue';
import router from '@/router';
import { hasError, showToast } from '@/utils';
import { loader } from '@/user-utils';
import store from '@/store';
import { client } from '@/api';

const { fetchWorkEffort, getInventoryCountImportSession } = useInventoryCountImport();

const workEffort = ref();
const inventoryCountImport = ref();
const searchedProductString = ref();
const products = ref<any[]>([]);

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
    const resp = await getInventoryCountImportSession({ inventoryCountImportId: props.inventoryCountImportId as string });
    if (resp?.status === 200 && resp.data) {
      workEffort.value = resp.data;
      const sessionResp = await fetchWorkEffort({ workEffortId: props.workEffortId });
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
    const resp = await fetchProducts({
      keyword: searchedProductString.value.trim(),
      viewSize: 100,
      filters: ["isVirtual: false", "isVariant: true"],
    });

    if (!hasError(resp)) {
      products.value.push(resp.data.response.docs?.[0]);
    }
  } catch (err) {
    console.error("Failed to fetch products", err);
  }
  loader.dismiss();
}

const fetchProducts = async (query: any): Promise<any> => {
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

</script>