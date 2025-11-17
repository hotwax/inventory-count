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
            <img :src="searchedProduct.mainImageUrl"/>
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
                <ion-input @ionInput="onManualInputChange($event, product)" label="Qty" label-placement="stacked" type="number" min="0" inputmode="numeric" placeholder="0" v-model.number="product.countedQuantity"></ion-input>
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
import { translate } from '@/i18n'
import {
  IonPage, IonToolbar, IonContent, IonSearchbar, IonList, IonItem,
  IonInput, IonLabel, IonButton, IonCard, IonCardHeader, IonCardTitle,
  IonTitle, IonThumbnail, IonIcon, IonProgressBar, alertController
} from '@ionic/vue'
import { addCircleOutline, closeCircleOutline, removeCircleOutline, arrowBackOutline } from 'ionicons/icons'
import { ref, defineProps, computed, onMounted } from 'vue'
import router from '@/router'
import { client } from '@/services/RemoteAPI'
import { useInventoryCountImport } from '@/composables/useInventoryCountImport'
import { loader, showToast } from '@/services/uiUtils'
import { useInventoryCountRun } from '@/composables/useInventoryCountRun'
import { useAuthStore } from '@/stores/authStore'
import { useProductMaster } from '@/composables/useProductMaster'
import { useProductStore } from '@/stores/productStore'

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
const searchedProduct = ref()
const products = ref<any[]>([])

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
  if (!term) return
  await getProductBySearch(term)
}

async function getProductBySearch(term: string) {
  const query = useProductMaster().buildProductQuery({
    filter: `isVirtual: false,isVariant: true,(sku: ${term} OR internalName: ${term} OR upc: ${term})` as string,
  })
  await loader.present('Searching Product...')
  try {
    const resp = await getProducts(query);

    const product = resp?.data?.response?.docs?.[0]
    searchedProduct.value = product || null
    if (!product) showToast(`Product not found by ${term}`)
  } catch (err) {
    console.error('Failed to fetch products', err)
    showToast('Something went wrong')
  }
  loader.dismiss()
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
    searchedProduct.value = null

    const existing = products.value.find(existingProduct => existingProduct.productId === product.productId)
    if (existing) {
      showToast(translate('Product already exists in Counted Items'))
      return
    }

    product.countedQuantity = 0
    product.saved = false
    await setProductQoh(product)
    products.value.push(product)
  } catch (err) {
    console.error('Error adding product:', err)
  }
  loader.dismiss()
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