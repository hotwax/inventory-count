<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start" data-testid="variance-facility-title">{{ currentFacility?.facilityName || currentFacility?.facilityId }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
      <!-- Variance content goes here -->
       <ion-card data-testid="variance-search-card">
          <ion-card-header data-testid="variance-search-header">
            <ion-card-title data-testid="variance-search-title">
              {{ translate("Search and Log Variance for a Product") }}
            </ion-card-title>
          </ion-card-header>
          <ion-searchbar ref="searchBar" v-model="searchedProductString" @ionInput="handleLiveSearch" @keyup.enter="handleEnterKey" data-testid="variance-search-bar"></ion-searchbar>
          <ion-item lines="none" data-testid="variance-search-info">
            <ion-label data-testid="variance-search-label">
              {{ translate("Search for products by parent name, SKU or UPC") }}
            </ion-label>
          </ion-item>
          <!-- Skeleton loader during search -->
          <ion-item v-if="isSearching" lines="none" data-testid="variance-search-skeleton">
            <ion-thumbnail slot="start" data-testid="variance-search-skeleton-thumbnail">
              <ion-skeleton-text :animated="true" data-testid="variance-search-skeleton-img"></ion-skeleton-text>
            </ion-thumbnail>
            <ion-label data-testid="variance-search-skeleton-label">
              <h2><ion-skeleton-text :animated="true" style="width: 60%" data-testid="variance-search-skeleton-title"></ion-skeleton-text></h2>
              <p><ion-skeleton-text :animated="true" style="width: 40%" data-testid="variance-search-skeleton-subtitle"></ion-skeleton-text></p>
            </ion-label>
          </ion-item>
          <!-- Search result -->
          <ion-item v-else-if="searchedProducts.length > 0" lines="none" data-testid="variance-search-result">
            <ion-thumbnail slot="start" data-testid="variance-search-result-thumbnail">
              <Image :src="searchedProducts[0].mainImageUrl" data-testid="variance-search-result-img"/>
            </ion-thumbnail>
            <ion-label data-testid="variance-search-result-label">
              <span data-testid="variance-search-result-primary-id">{{ useProductMaster().primaryId(searchedProducts[0]) }}</span>
              <p data-testid="variance-search-result-secondary-id">{{ useProductMaster().secondaryId(searchedProducts[0]) }}</p>
            </ion-label>
            <ion-button slot="end" fill="outline" @click="selectProduct(searchedProducts[0])" data-testid="variance-search-result-select-btn">
              <ion-icon :icon="addCircleOutline" slot="start"></ion-icon>
              {{ translate("Select") }}
            </ion-button>
          </ion-item>
          <ion-item v-if="searchedProducts.length > 1" lines="none" button detail @click="openSearchResultsModal" data-testid="variance-view-more-btn">
            <ion-label data-testid="variance-view-more-label">
              {{ translate("View more results") }} ({{ searchedProducts.length - 1 }} more)
            </ion-label>
          </ion-item>
        </ion-card>

        <ion-card v-if="selectedProduct" class="variance-product-card" :disabled="selectedProduct.saved" data-testid="variance-selected-product-card">
          <ion-item lines="full" data-testid="variance-selected-product-info">
            <ion-thumbnail slot="start" data-testid="variance-selected-product-thumbnail">
              <Image :src="selectedProduct.mainImageUrl" data-testid="variance-selected-product-img"/>
            </ion-thumbnail>
            <ion-label data-testid="variance-selected-product-label">
              <span data-testid="variance-selected-product-primary-id">{{ useProductMaster().primaryId(selectedProduct) }}</span>
              <p data-testid="variance-selected-product-secondary-id">{{ useProductMaster().secondaryId(selectedProduct) }}</p>
            </ion-label>
            <ion-text slot="end" data-testid="variance-selected-product-qoh">
              {{ translate("Current Stock:") }} {{ selectedProduct.quantityOnHand || 0 }}
            </ion-text>
          </ion-item>
          <div class="impact" data-testid="variance-impact-container">
            <ion-radio-group v-model="selectedProduct.negate" data-testid="variance-impact-radio-group">
              <ion-radio value="false" data-testid="variance-impact-add-radio">
                {{ translate("Add") }}
              </ion-radio>
              <ion-radio value="true" data-testid="variance-impact-remove-radio">
                {{ translate("Remove") }}
              </ion-radio>
            </ion-radio-group>
          </div>
          <ion-item lines="full" data-testid="variance-reason-item">
            <ion-select v-model="selectedProduct.varianceReason" label="Reason" label-placement="fixed" placeholder="Select" interface="popover" data-testid="variance-reason-select">
              <ion-select-option v-for="reason in varianceReasons" :key="reason.value" :value="reason.value" :data-testid="'variance-reason-option-' + reason.value">
                {{ reason.label }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <div class="quantity" data-testid="variance-quantity-controls">
            <ion-button fill="clear" color="medium" aria-label="decrease" @click="selectedProduct.varianceQuantity = Math.max(0, (selectedProduct.varianceQuantity || 0) - 1)" data-testid="variance-quantity-remove-btn">
              <ion-icon :icon="removeCircleOutline" slot="icon-only"></ion-icon>
            </ion-button>
              <ion-input
                @ionInput="onManualInputChange($event, selectedProduct)"
                label="Qty"
                fill="outline"
                label-placement="stacked" 
                type="number" 
                min="0" 
                inputmode="numeric" 
                placeholder="0" 
                v-model.number="selectedProduct.varianceQuantity"
                :disabled="selectedProduct.saved"
                data-testid="variance-quantity-input"
              ></ion-input>
            <ion-button fill="clear" color="medium" aria-label="increase" @click="selectedProduct.varianceQuantity = (selectedProduct.varianceQuantity || 0) + 1" data-testid="variance-quantity-add-btn">
              <ion-icon :icon="addCircleOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
          <ion-item v-if="!selectedProduct.saved" data-testid="variance-new-quantity-item">
            <ion-text data-testid="variance-new-quantity-label">
              {{ translate("New Quantity:") }}
            </ion-text>
            <ion-text slot="end" data-testid="variance-new-quantity-val">
              {{ newQuantityOnHand }}
            </ion-text>
          </ion-item>
        </ion-card>
        <div class="ion-text-center" data-testid="variance-log-btn-container">
          <ion-button :disabled="!selectedProduct.varianceReason || selectedProduct.varianceQuantity === 0 || selectedProduct.saved" v-if="selectedProduct" @click="logVariance(selectedProduct)" data-testid="variance-log-btn">
            {{ translate("Log Variance") }}
          </ion-button>
        </div>
      </main>
    </ion-content>
    <ion-modal :is-open="isSearchResultsModalOpen" @didDismiss="closeSearchResultsModal" data-testid="variance-search-results-modal">
      <ion-header data-testid="variance-search-results-modal-header">
        <ion-toolbar data-testid="variance-search-results-modal-toolbar">
          <ion-buttons slot="start">
            <ion-button @click="closeSearchResultsModal" data-testid="variance-search-results-modal-close-btn">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title data-testid="variance-search-results-modal-title">{{ translate("Search Results") }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content data-testid="variance-search-results-modal-content">
        <ion-radio-group v-model="selectedProductFromModal" data-testid="variance-search-results-modal-radio-group">
          <ion-item v-for="product in searchedProducts" :key="product.productId" :data-testid="'variance-search-results-modal-item-' + product.productId">
            <ion-thumbnail slot="start" data-testid="variance-search-results-modal-thumbnail">
              <Image :src="product.mainImageUrl" data-testid="variance-search-results-modal-img" />
            </ion-thumbnail>
            <ion-radio :value="product.productId" :disabled="product.isUndirected" data-testid="variance-search-results-modal-radio">
              <ion-label data-testid="variance-search-results-modal-label">
                <span data-testid="variance-search-results-modal-primary-id">{{ useProductMaster().primaryId(product) }}</span>
                <p data-testid="variance-search-results-modal-secondary-id">{{ useProductMaster().secondaryId(product) }}</p>
                <ion-text color="danger" v-if="product.isUndirected" data-testid="variance-search-results-modal-undirected-badge">{{ translate("Undirected") }}</ion-text>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-radio-group>
      </ion-content>
      <ion-footer data-testid="variance-search-results-modal-footer">
        <ion-toolbar data-testid="variance-search-results-modal-footer-toolbar">
          <ion-button slot="end" :disabled="!selectedProductFromModal" fill="outline" color="success" @click="addSelectedProductFromModal" data-testid="variance-search-results-modal-select-btn">
            <ion-icon :icon="addCircleOutline" slot="start"></ion-icon>
            {{ translate("Select") }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">

import { translate } from '@/i18n';
import { useProductStore } from '@/stores/productStore';
import { IonContent, IonHeader, IonInput, IonItem, IonPage, IonTitle, IonToolbar, IonLabel, IonButton, IonRadioGroup, IonRadio, IonThumbnail, IonSearchbar, IonCard, IonCardHeader, IonCardTitle, IonSelect, IonSelectOption, IonSkeletonText, IonText, onIonViewDidEnter, IonIcon, IonModal, IonButtons, IonFooter } from '@ionic/vue';
import { addCircleOutline, closeOutline, removeCircleOutline } from 'ionicons/icons';
import { useProductMaster } from '@/composables/useProductMaster';
import { computed, ref } from 'vue';
import Image from '@/components/Image.vue';
import { useUserProfile } from '@/stores/userProfileStore';
import { showToast } from '@/services/uiUtils';
import api from '@/services/RemoteAPI';

const currentFacility = computed(() => useProductStore().getCurrentFacility);
const isSearching = ref(false);
const searchedProductString = ref('');
const searchedProducts = ref<Array<any>>([]);

const selectedProduct = ref<any>();
const isSearchResultsModalOpen = ref(false);
const selectedProductFromModal = ref<string>('');

const addSelectedProductFromModal = async () => {
  const product = searchedProducts.value.find(p => p.productId === selectedProductFromModal.value);
  if (product) {
    await selectProduct(product);
    closeSearchResultsModal();
  }
};

const newQuantityOnHand = computed(() => {
  if (!selectedProduct.value) return 0;

  const currentQty = selectedProduct.value.quantityOnHand || 0;
  const varianceQty = selectedProduct.value.varianceQuantity || 0;

  if (varianceQty === 0) return currentQty;

  const adjustment = selectedProduct.value.negate === 'true' ? -varianceQty : varianceQty;
  return currentQty + adjustment;
});

onIonViewDidEnter(async () => {
  await getVarianceReasonEnums();
});

const varianceReasons = ref<Array<any>>([]);

const getVarianceReasonEnums = async () => {
  const resp = await api({
    url: 'admin/enums',
    method: 'GET',
    params: {
      enumTypeId: 'IID_REASON',
      pageNoLimit: true
    }
  });
  varianceReasons.value = resp?.data?.map((enumItem: any) => ({
    label: enumItem.description,
    value: enumItem.enumId
  })) || [];

};

let searchTimeoutId: any;

const handleLiveSearch = async () => {
  if (searchedProductString.value.trim().length === 0) {
    searchedProducts.value = [];
    return;
  }
  isSearching.value = true;
  clearTimeout(searchTimeoutId);
  searchTimeoutId = setTimeout(async() => {
    searchedProducts.value = await searchProducts(searchedProductString.value);
    isSearching.value = false;
  }, 300);
};

async function searchProducts(queryString: string): Promise<any> {
  try {
    const query = useProductMaster().buildProductQuery({
      keyword: queryString,
      viewSize: 20,
      filter: 'isVirtual:false,productTypeId:FINISHED_GOOD,-prodCatalogCategoryTypeIds:PCCT_DISCONTINUED'
    })

    const resp = await api({
      url: 'inventory-cycle-count/runSolrQuery',
      method: 'POST',
      data: query
    })
    const products = resp?.data?.response?.docs || []
    return products;
  } catch (error) {
    console.error("Error searching products:", error);
    showToast(translate("Failed to search products. Please try again."));
  }
  isSearching.value = false;
  return [];
}

async function onManualInputChange(event: any, item: any) {
  const inputValue = event.target.value;
  const numericValue = parseInt(inputValue, 10);
  if (!isNaN(numericValue) && numericValue >= 0) {
    item.varianceQuantity = numericValue;
  } else {
    item.varianceQuantity = 0;
  }
}

const handleEnterKey = async () => {
  if (searchedProducts.value.length > 0) {
    await selectProduct(searchedProducts.value[0]);
  }
};

async function getProductInventory(productId: any) {

  try {
    const resp = await api({
      url: 'oms/dataDocumentView',
      method: 'POST',
      data: {
        dataDocumentId: 'ProductFacilityAndInventoryItem',
        pageSize: 1,
        customParametersMap: { productId: productId, facilityId: currentFacility.value.facilityId }
      }
    });

    return resp?.data?.entityValueList?.[0];
  } catch (error) {
    console.error("Error fetching product inventory:", error);
    return null;
  }
}

function openSearchResultsModal() {
  isSearchResultsModalOpen.value = true
  selectedProductFromModal.value = ''
}

function closeSearchResultsModal() {
  isSearchResultsModalOpen.value = false
  selectedProductFromModal.value = ''
}

const selectProduct = async (product: any) => {
  try {
    selectedProduct.value = null;
    if (product) {
      const productInventory = await getProductInventory(product.productId);

      selectedProduct.value = {
        ...product,
        inventoryItemId: productInventory?.inventoryItemId,
        quantityOnHand: productInventory?.quantityOnHandTotal || 0,
        negate: 'true',
        varianceQuantity: 0,
        saved: false
      };
    }
  } catch (error) {
    console.error("Error selecting product:", error);
  }
  searchedProductString.value = '';
  searchedProducts.value = [];
}

async function logVariance(product: any) {
  if (product.varianceQuantity == 0) {
    showToast(translate("Variance quantity cannot be zero."));
    return;
  }
  if (!product.varianceReason) {
    showToast(translate("Please select a variance reason."));
    return;
  }
  try {

    const reasonEnumId = product.varianceReason || 'VAR_MANUAL';

    const varianceQuantity = product.negate === 'true' ? product.varianceQuantity * (-1) : product.varianceQuantity;

    const newQuantityOnHand = (product.quantityOnHand || 0) + varianceQuantity;

    const inventoryItemVarianceMap = {
      inventoryItemId: product.inventoryItemId,
      reasonEnumId,
      quantity: varianceQuantity,
      comments: "Variance Logged from Cycle Count App"
    };
    

    const resp = await api({
      url: 'inventory-cycle-count/recordVariance',
      method: 'POST',
      data: {
        partyId: useUserProfile().getUserProfile?.partyId || '',
        productId: product.productId,
        facilityId: currentFacility.value.facilityId,
        inventoryItemVarianceMap
      }
    })
    
    if (resp?.status === 200) {
      product.quantityOnHand = newQuantityOnHand;
      product.saved = true;
      showToast(translate("Variance logged successfully."));
    } else {
      throw resp;
    }
  } catch (error) {
    showToast(translate("Failed to log variance. Please try again."));
    console.error("Error logging variance:", error);
  }
}
</script>
<style scoped>

main {
  max-width: 720px;
  margin-inline: auto;
}

.quantity {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--spacer-base);
}
.quantity ion-input {
  width: 30ch;
  text-align: center;
}

.impact ion-radio-group {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.impact ion-radio {
  padding: var(--spacer-base);
  flex: 1;
  border: 1px solid var(--ion-color-medium);
}


</style>
