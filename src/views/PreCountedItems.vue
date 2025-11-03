<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="confirmGoBack">
            <ion-icon :icon="arrowBackOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Add Pre Counted Items")}}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            {{ translate("Add Items") }}
          </ion-card-title>
        </ion-card-header>
        <ion-searchbar v-model="searchedProductString" @keyup.enter="handleSearch"></ion-searchbar>
        <ion-item lines="none">
          <ion-label>
            {{ translate("Search for products by parent name, SKU or UPC") }}
          </ion-label>
        </ion-item>
        <ion-item v-if="searchedProduct" lines="none">
          <ion-thumbnail slot="start">  
            <dxp-image :src="searchedProduct.mainImageUrl"/>
          </ion-thumbnail>
          <ion-label>
            {{ searchedProduct.sku }}
          </ion-label>
          <ion-button slot="end" fill="outline" @click="addProductInPreCountedItems(searchedProduct)">
            <ion-icon :icon="addCircleOutline" slot="start"></ion-icon>
            Add to count
          </ion-button>
        </ion-item>
        <ion-item lines="none" button detail>
          <ion-label>
            {{ translate("View more results") }}
          </ion-label>
        </ion-item>
      </ion-card>
      <h2>
        {{ translate("Counted Items") }}
      </h2>

      <ion-list v-if="products.length > 0" class="pre-counted-items">
        <ion-card v-for="product in products" :key="product.productId">
          <div class="item ion-padding-end">
            <ion-item class="product" lines="none">
              <ion-thumbnail slot="start">
                <dxp-image :src="product.mainImageUrl"/>
              </ion-thumbnail>
              <ion-label>
                {{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.primaryId, product) }}
                <p>{{ getProductIdentificationValue(productIdentificationStore.getProductIdentificationPref.secondaryId, product) }}</p>
                <ion-text color="danger">
                  Undirected
                </ion-text>
              </ion-label>
            </ion-item>
            <div class="quantity">
              <ion-button fill="clear" color="medium" aria-label="decrease" @click="product.countedQuantity = Math.max(0, product.countedQuantity - 1)">
                <ion-icon :icon="removeCircleOutline" slot="icon-only"></ion-icon>
              </ion-button>
              <ion-item lines="full">
                <ion-input @keyup.enter="addPreCountedItemInScanEvents(product)" label="Qty" label-placement="stacked" type="number" min="0" inputmode="numeric" placeholder="0" v-model.number="product.countedQuantity"></ion-input>
              </ion-item>
              <ion-button fill="clear" color="medium" aria-label="increase" @click="product.countedQuantity++">
                <ion-icon :icon="addCircleOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </div>
          <div class="progress ion-padding">
            <ion-progress-bar :value="product.quantityOnHand > 0 ? (product.countedQuantity || 0) / product.quantityOnHand : 0"></ion-progress-bar>
            <ion-label>
              {{ product.quantityOnHand }}
            </ion-label>
            <ion-button fill="clear" color="danger" aria-label="remove-item">
              <ion-icon :icon="closeCircleOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </ion-card>
      </ion-list>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-button slot="end" :disabled="products?.length === 0 || !hasUnsavedProducts" fill="outline" color="success" size="small" @click="addAllProductsToScanEvents">
          Save
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from '@/i18n';
import { IonText, IonPage, IonToolbar, IonContent, onIonViewDidEnter, IonSearchbar, IonList, IonItem, IonInput, IonLabel, IonButton, IonCard, IonCardHeader, IonCardTitle, IonNote, IonTitle, IonThumbnail, IonIcon, IonProgressBar, alertController } from '@ionic/vue';
import { addCircleOutline, closeCircleOutline, removeCircleOutline, arrowBackOutline } from 'ionicons/icons';
import { DxpImage } from '@hotwax/dxp-components';

import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { ref, defineProps, useSlots, watch, computed } from 'vue';
import router from '@/router';
import { hasError, showToast } from '@/utils';
import { loader } from '@/user-utils';
import store from '@/store';
import { client } from '@/api';
import { useProductIdentificationStore, getProductIdentificationValue, useUserStore } from '@hotwax/dxp-components';
import { ProductService } from '@/services/ProductService';

const { fetchWorkEffort, getInventoryCountImportSession, recordScan } = useInventoryCountImport();

const productIdentificationStore = useProductIdentificationStore();
const userStore = useUserStore();

const workEffort = ref();
const inventoryCountImport = ref();
const searchedProductString = ref();
const products = ref<any[]>([]);
const hasUnsavedProducts = computed(() => products.value.some(p => p.saved !== true))
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
      docType: "PRODUCT",
      viewSize: 100,
      filters: ["isVirtual: false", "isVariant: true", `(sku: ${searchedProductString.value.trim()} OR internalName: ${searchedProductString.value.trim()} OR upc: ${searchedProductString.value.trim()})`],
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

async function addProductInPreCountedItems(product: any) {
  await loader.present("Loading...");
  try {
    if (searchedProductString.value) searchedProductString.value = null;
    searchedProduct.value = null;
    const existingProduct = products.value.find(p => p.productId === product.productId);
    if (!existingProduct) {
      products.value.push(product);
    }
    product.countedQuantity = 0;
    product.saved = false;
    await setProductQoh(product);
  } catch (error) {
    console.error("Error Adding Product to Scan Event: ", error);
  }
  loader.dismiss();
}

async function addPreCountedItemInScanEvents (product: any) {
  const productIdentifierPref = productIdentificationStore.getProductIdentificationPref;
  await recordScan({
    inventoryCountImportId: props.inventoryCountImportId as string,
    productIdentifier: getProductIdentificationValue(productIdentifierPref.primaryId, product),
    quantity: product.countedQuantity,
  });
  product.saved = true;
}

async function setProductQoh (product: any) {
  const currentFacility: any = userStore.getCurrentFacility;
  const qohResp = await ProductService.fetchProductStock({
      productId: product.productId,
      facilityId: currentFacility.facilityId
    } as any);

    if (qohResp?.status === 200 && qohResp.data?.qoh) {
      product.quantityOnHand = qohResp.data?.qoh;
    }
}

async function addAllProductsToScanEvents() {
  try {
    for (const product of products.value) {
      if (product.countedQuantity > 0) {
        await addPreCountedItemInScanEvents(product);
      }
    }
  } catch (error) {
    console.error("Something Went Wrong");
  }
}

async function confirmGoBack() {
  if (products.value.length === 0 || !hasUnsavedProducts.value) {
    router.back();
    return;
  }
  const alert = await alertController.create({
    header: 'Leave this page?',
    message: 'Any unsaved changes will be lost.',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Save and Go back',
        handler: async () => {
          await addAllProductsToScanEvents();
          router.back();
        }
      }
    ]
  })
  await alert.present()
}

</script>

<style>

.pre-counted-items { 
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .quantity {
      display: flex;
    }
  }

  .progress {
    display: flex;
    gap: var(--spacer-sm);
    align-items: center;
    border-top: 1px solid var(--ion-color-medium);

    ion-label {
      flex: 1 0 max-content;
    }
  }
}

</style>