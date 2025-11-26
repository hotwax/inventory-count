<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="confirmGoBack">
            <ion-icon slot="icon-only" :icon="arrowBackOutline" />
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
        <ion-searchbar ref="searchBar" v-model="searchedProductString" @ionInput="handleLiveSearch" @keyup.enter="handleEnterKey"></ion-searchbar>
        <ion-item lines="none">
          <ion-label>
            {{ translate("Search for products by parent name, SKU or UPC") }}
          </ion-label>
        </ion-item>
        <!-- Skeleton loader during search -->
        <ion-item v-if="isSearching" lines="none">
          <ion-thumbnail slot="start">
            <ion-skeleton-text :animated="true"></ion-skeleton-text>
          </ion-thumbnail>
          <ion-label>
            <h2><ion-skeleton-text :animated="true" style="width: 60%"></ion-skeleton-text></h2>
            <p><ion-skeleton-text :animated="true" style="width: 40%"></ion-skeleton-text></p>
          </ion-label>
        </ion-item>
        <!-- Search result -->
        <ion-item v-else-if="searchedProducts.length > 0" lines="none">
          <ion-thumbnail slot="start">  
            <Image :src="searchedProducts[0].mainImageUrl"/>
          </ion-thumbnail>
          <ion-label>
            {{ useProductMaster().primaryId(searchedProducts[0]) }}
            <p>{{ useProductMaster().secondaryId(searchedProducts[0]) }}</p>
          </ion-label>
          <ion-button slot="end" fill="outline" @click="addProductInPreCountedItems(searchedProducts[0])">
            <ion-icon :icon="addCircleOutline" slot="start"></ion-icon>
            Add to count
          </ion-button>
        </ion-item>
        <ion-item v-if="searchedProducts.length > 1" lines="none" button detail @click="openSearchResultsModal">
          <ion-label>
            {{ translate("View more results") }} ({{ searchedProducts.length - 1 }} more)
          </ion-label>
        </ion-item>
      </ion-card>
      <h2>
        {{ translate("Counted Items") }}
      </h2>

      <ion-list v-if="products.length > 0" class="pre-counted-items">
        <ion-card v-for="(product, index) in products" :key="product.productId + '-' + index">
          <div class="item ion-padding-end">
            <ion-item class="product" lines="none">
              <ion-thumbnail slot="start">
                <img :src="product.mainImageUrl"/>
              </ion-thumbnail>
              <ion-label>
                {{ useProductMaster().primaryId(product) }}
                <p>{{ useProductMaster().secondaryId(product) }}</p>
                <ion-text color="danger">
                  Undirected
                </ion-text>
              </ion-label>
            </ion-item>
            <div class="quantity">
              <ion-button fill="clear" color="medium" aria-label="decrease" @click="decrementProductQuantity(product)">
                <ion-icon :icon="removeCircleOutline" slot="icon-only"></ion-icon>
              </ion-button>
              <ion-item lines="full">
                <ion-input 
                  :ref="el => setQuantityInputRef(product.productId, el)"
                  @ionInput="onManualInputChange($event, product)" 
                  @keyup.enter="focusSearchBar"
                  label="Qty" 
                  label-placement="stacked" 
                  type="number" 
                  min="0" 
                  inputmode="numeric" 
                  placeholder="0" 
                  v-model.number="product.countedQuantity"
                ></ion-input>
              </ion-item>
              <ion-button fill="clear" color="medium" aria-label="increase" @click="incrementProductQuantity(product)">
                <ion-icon :icon="addCircleOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </div>
          <div class="progress ion-padding">
            <ion-progress-bar :value="product.countedQuantity && product.quantityOnHand > 0 ? (product.countedQuantity || 0) / product.quantityOnHand : 0"></ion-progress-bar>
            <ion-label>
              {{ product.quantityOnHand }}
            </ion-label>
            <ion-button fill="clear" color="danger" aria-label="remove-item" :disabled="product.saved" @click="removeProduct(product)">
              <ion-icon :icon="closeCircleOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </ion-card>
      </ion-list>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-button slot="end" :disabled="products?.length === 0 || !hasUnsavedProducts" fill="outline" color="success" size="small" @click="addAllProductsToScanEvents">
          {{ translate("Save") }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>

    <!-- Search Results Modal -->
    <ion-modal :is-open="isSearchResultsModalOpen" @didDismiss="closeSearchResultsModal">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="closeSearchResultsModal">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ translate("Search Results") }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-radio-group v-model="selectedProductFromModal">
          <ion-item v-for="product in searchedProducts" :key="product.productId">
            <ion-thumbnail slot="start">
              <Image :src="product.mainImageUrl" />
            </ion-thumbnail>
            <ion-radio :value="product.productId">
              <ion-label>
                {{ useProductMaster().primaryId(product) }}
                <p>{{ useProductMaster().secondaryId(product) }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-radio-group>
      </ion-content>
      <ion-footer>
        <ion-toolbar>
          <ion-button slot="end" :disabled="!selectedProductFromModal" fill="outline" color="success" @click="addSelectedProductFromModal">
            <ion-icon :icon="addCircleOutline" slot="start"></ion-icon>
            {{ translate("Add to count") }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from '@/i18n'
import {
  IonPage, IonToolbar, IonContent, IonSearchbar, IonList, IonItem,
  IonInput, IonLabel, IonButton, IonCard, IonCardHeader, IonCardTitle,
  IonTitle, IonThumbnail, IonIcon, IonProgressBar, IonModal, IonHeader,
  IonButtons, IonRadioGroup, IonRadio, IonSkeletonText, alertController
} from '@ionic/vue'
import { addCircleOutline, closeCircleOutline, removeCircleOutline, arrowBackOutline, closeOutline } from 'ionicons/icons'
import { ref, defineProps, computed, onMounted, nextTick } from 'vue'
import router from '@/router'
import { client } from '@/services/RemoteAPI'
import { useInventoryCountImport } from '@/composables/useInventoryCountImport'
import { loader, showToast } from '@/services/uiUtils'
import { useInventoryCountRun } from '@/composables/useInventoryCountRun'
import { useAuthStore } from '@/stores/authStore'
import { useProductMaster } from '@/composables/useProductMaster'
import { useProductStore } from '@/stores/productStore'
import Image from '@/components/Image.vue'
import { debounce } from 'lodash-es'

const { getInventoryCountImportSession, recordScan } = useInventoryCountImport()
const { getWorkEffort } = useInventoryCountRun();

const props = defineProps({
  workEffortId: {
    type: String,
    required: true
  },
  inventoryCountImportId: {
    type: String,
    required: true
  }
})

const workEffort = ref()
const inventoryCountImport = ref()
const searchedProductString = ref('')
const searchedProducts = ref<any[]>([])
const products = ref<any[]>([])
const isSearchResultsModalOpen = ref(false)
const selectedProductFromModal = ref('')
const isSearching = ref(false)
const searchBar = ref()
const quantityInputRefs = ref<Record<string, any>>({})

const hasUnsavedProducts = computed(() =>
  products.value.some(product => !product.saved && product.countedQuantity > 0)
)

onMounted(async () => {
  await loader.present('Loading...')
  await getInventoryCycleCount()
  loader.dismiss()
})

function incrementProductQuantity(product: any) {
  product.countedQuantity++
  product.saved = false
}

function decrementProductQuantity(product: any) {
  product.countedQuantity = Math.max(0, product.countedQuantity - 1)
  product.saved = product.countedQuantity === 0
}

function onManualInputChange(event: CustomEvent, product: any) {
  const value = Number(event.detail.value)
  product.countedQuantity = isNaN(value) ? 0 : value
  product.saved = value === 0
}

function setQuantityInputRef(productId: string, el: any) {
  if (el) {
    quantityInputRefs.value[productId] = el
  }
}

async function focusQuantityInput(productId: string) {
  // Use nextTick to ensure DOM is updated
  await nextTick()
  const inputRef = quantityInputRefs.value[productId]
  if (inputRef?.$el) {
    inputRef.$el.setFocus()
  }
}

function focusSearchBar() {
  searchBar.value?.$el?.setFocus()
}

function removeProduct(productToRemove: any) {
  products.value = products.value.filter(existingProduct => existingProduct.productId !== productToRemove.productId)
}

async function getInventoryCycleCount() {
  try {
    const resp = await getInventoryCountImportSession({ inventoryCountImportId: props.inventoryCountImportId })
    if (resp?.status !== 200 || !resp.data) throw resp

    workEffort.value = resp.data
    const sessionResp = await getWorkEffort({ workEffortId: props.workEffortId })
    if (sessionResp?.status !== 200 || !sessionResp.data) throw sessionResp

    inventoryCountImport.value = sessionResp.data
  } catch (error) {
    console.error(error)
    showToast('Failed to fetch Count and Session details')
  }
}

async function handleSearch() {
  const term = searchedProductString.value.trim()
  if (!term) {
    searchedProducts.value = []
    return
  }
  await getProductBySearch(term)
}

async function handleEnterKey() {
  const term = searchedProductString.value.trim()
  if (!term) return

  if (searchedProducts.value.length === 0) {
    await getProductBySearch(term)
  }
  
  if (searchedProducts.value.length > 0) {
    await addProductInPreCountedItems(searchedProducts.value[0])
  }
}

const handleLiveSearch = debounce(async () => {
  await handleSearch()
}, 300)

async function getProductBySearch(term: string) {
  const query = useProductMaster().buildProductQuery({
    keyword: term,
    viewSize: 20,
    filter: 'isVirtual:false,isVariant:true'
  })
  isSearching.value = true
  try {
    const resp = await getProducts(query);

    const products = resp?.data?.response?.docs || []
    searchedProducts.value = products
    if (products.length === 0) showToast(`No products found for "${term}"`)
  } catch (err) {
    console.error('Failed to fetch products', err)
    showToast('Something went wrong')
  } finally {
    isSearching.value = false
  }
}

async function getProducts(query: any) {
  const baseURL = useAuthStore().getBaseUrl;

  return client({
    url: 'inventory-cycle-count/runSolrQuery',
    method: 'POST',
    baseURL,
    data: query,
    headers: {
      Authorization: `Bearer ${useAuthStore().token.value}`,
      'Content-Type': 'application/json',
    },
  })
}

async function addProductInPreCountedItems(product: any) {
  await loader.present('Loading...')
  try {
    searchedProductString.value = ''
    searchedProducts.value = []
    isSearchResultsModalOpen.value = false

    product.countedQuantity = 0
    product.saved = false
    await setProductQoh(product)
    products.value.unshift(product)
    
    // Focus the quantity input for the newly added product
    focusQuantityInput(product.productId)
  } catch (err) {
    console.error('Error adding product:', err)
  }
  loader.dismiss()
}

function openSearchResultsModal() {
  isSearchResultsModalOpen.value = true
  selectedProductFromModal.value = ''
}

function closeSearchResultsModal() {
  isSearchResultsModalOpen.value = false
  selectedProductFromModal.value = ''
}

async function addSelectedProductFromModal() {
  const product = searchedProducts.value.find(p => p.productId === selectedProductFromModal.value)
  if (product) {
    await addProductInPreCountedItems(product)
  }
}

async function setProductQoh(product: any) {
  try {
    const facility: any = useProductStore().getCurrentFacility
    const resp = await useProductMaster().getProductStock({
      productId: product.productId,
      facilityId: facility.facilityId,
    })

    product.quantityOnHand = resp?.data?.qoh || 0
  } catch (err) {
    console.error('Failed to fetch QOH:', err)
  }
}

async function addPreCountedItemInScanEvents(product: any) {
  await recordScan({
    inventoryCountImportId: props.inventoryCountImportId,
    productId: product.productId,
    productIdentifier: await useProductStore().getProductIdentificationValue(product.productId, useProductStore().getProductIdentificationPref.primaryId),
    quantity: product.countedQuantity,
  })
  product.saved = true
}

async function addAllProductsToScanEvents() {
  try {
    const unsaved = products.value.filter(product => product.countedQuantity > 0 && !product.saved)
    for (const product of unsaved) {
      await addPreCountedItemInScanEvents(product)
    }
    showToast(translate('Items Saved'))
  } catch (err) {
    console.error('Error saving products:', err)
  }
}

async function confirmGoBack() {
  if (products.value.length === 0 || !hasUnsavedProducts.value) {
    router.back()
    return
  }

  const alert = await alertController.create({
    header: 'Leave this page?',
    message: 'Any unsaved changes will be lost.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Save and Go back',
        handler: async () => {
          await addAllProductsToScanEvents()
          router.back()
        },
      },
    ],
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