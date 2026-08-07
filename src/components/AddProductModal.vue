<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal" data-testid="add-product-modal-close-btn">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title data-testid="add-product-modal-title">{{ translate("Add a product") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content data-testid="add-product-modal-content">
    <ion-searchbar :value="queryString" :placeholder="translate('Search products')"
      @keyup.enter="queryString = $event.target.value; getProducts()" data-testid="add-product-modal-search-input" />

    <!-- Loading state -->
    <div v-if="isLoading && !products.length" class="empty-state" data-testid="add-product-modal-loading">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Loading...") }}</ion-label>
    </div>

    <!-- Product list -->
    <template v-if="products.length">
      <ion-item v-for="product in products" :key="product.productId" :data-testid="'add-product-modal-item-' + product.productId">
        <ion-thumbnail slot="start">
          <Image :src="product.mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ useProductMaster().primaryId(product) || product.internalName }}</h2>
          <p>{{ useProductMaster().secondaryId(product) }}</p>
        </ion-label>

        <ion-button v-if="!addedIds.has(product.productId)" slot="end" fill="outline" :disabled="pendingProductId === product.productId"
          @click="addProduct(product)" :data-testid="'add-product-modal-add-btn-' + product.productId">
          {{ pendingProductId === product.productId ? translate("Adding...") : translate("Add to count") }}
        </ion-button>
        <ion-icon v-else slot="end" :icon="checkmarkCircle" color="success" :data-testid="'add-product-modal-added-icon-' + product.productId" />
      </ion-item>

      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable()" data-testid="add-product-modal-infinite-scroll">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </template>

    <!-- Empty state -->
    <div class="empty-state" v-else-if="!isLoading && queryString" data-testid="add-product-modal-empty-state">
      <ion-text>{{ translate("No products found") }}</ion-text>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonSearchbar, IonSpinner, IonText, IonThumbnail, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { checkmarkCircle, closeOutline } from "ionicons/icons";
import { computed, defineProps, onMounted, ref } from "vue";
import { translate, commonUtil, useSolrSearch } from "@common";
import { useProductMaster } from "@/composables/useProductMaster";
import Image from "@/components/Image.vue";

/**
 * `addedProductIds` is the set already added by the opener, so rows stay in sync with the page
 * behind the modal. `onAddProduct` performs the actual add and resolves true on success.
 */
const props = defineProps(["query", "addedProductIds", "onAddProduct"]);

const queryString = ref(props.query || "");
const products = ref<any[]>([]);
const total = ref(0);
const isLoading = ref(false);
const pendingProductId = ref("");
const locallyAddedIds = ref(new Set<string>());

const pageSize = Number(import.meta.env.VITE_VIEW_SIZE) || 20;

const addedIds = computed(() => {
  const ids = new Set<string>(props.addedProductIds ? Array.from(props.addedProductIds) : []);
  locallyAddedIds.value.forEach((id: string) => ids.add(id));
  return ids;
});

onMounted(() => {
  if (queryString.value) getProducts();
});

function closeModal() {
  modalController.dismiss();
}

async function addProduct(product: any) {
  if (pendingProductId.value) return;
  pendingProductId.value = product.productId;
  try {
    const added = await props.onAddProduct?.(product);
    if (added) locallyAddedIds.value = new Set(locallyAddedIds.value).add(product.productId);
  } finally {
    pendingProductId.value = "";
  }
}

function isScrollable() {
  return products.value.length < total.value;
}

async function loadMoreProducts(event: any) {
  await getProducts(Math.ceil(products.value.length / pageSize));
  event.target.complete();
}

async function getProducts(viewIndex = 0) {
  const term = queryString.value?.trim();
  if (!term) {
    products.value = [];
    total.value = 0;
    return;
  }

  isLoading.value = true;
  try {
    const query = useProductMaster().buildProductQuery({
      keyword: term,
      viewSize: pageSize,
      viewIndex,
      filter: "isVirtual:false,productTypeId:FINISHED_GOOD,-prodCatalogCategoryTypeIds:PCCT_DISCONTINUED"
    });
    const resp = await useSolrSearch().runSolrQuery(query);
    const docs = resp?.data?.response?.docs || [];

    if (viewIndex) {
      products.value = products.value.concat(docs);
    } else {
      products.value = docs;
      total.value = resp?.data?.response?.numFound || docs.length;
    }
  } catch (error) {
    console.error("Failed to fetch products: ", error);
    commonUtil.showToast(translate("Something went wrong"));
    if (!viewIndex) products.value = [];
  }
  isLoading.value = false;
}
</script>
