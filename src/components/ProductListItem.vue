<template>
  <ion-item button @click="viewProduct()" detail="true" lines="none">
    <ion-thumbnail slot="start">
      <DxpShopifyImg :src="product.mainImageUrl" size="small" />
    </ion-thumbnail>

    <ion-label>
      <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, product) }}</p>
      <h3>{{ getProductIdentificationValue(productIdentificationPref.primaryId, product) ? getProductIdentificationValue(productIdentificationPref.primaryId, product) : product.productName }}</h3>
      <p>{{$filters.getFeature(product.featureHierarchy, '1/COLOR/')}} {{$filters.getFeature(product.featureHierarchy, '1/COLOR/') && $filters.getFeature(product.featureHierarchy, '1/SIZE/')? "|" : ""}} {{$filters.getFeature(product.featureHierarchy, '1/SIZE/')}}</p>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import {
  IonItem,
  IonThumbnail,
  IonLabel
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';
import { getProductIdentificationValue, DxpShopifyImg, useProductIdentificationStore } from '@hotwax/dxp-components';

export default defineComponent({
  name: "ProductListItem",
  components: {
    IonItem,
    IonThumbnail,
    IonLabel,
    DxpShopifyImg
  },
  props: ["product"],
  methods: {
    async viewProduct () {
      this.router.push({ path: `/count/${this.product.sku}` })
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    
    return {
      getProductIdentificationValue,
      productIdentificationPref,
      router,
      store
    }
  },
})
</script>
