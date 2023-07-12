<template>
  <ion-item button @click="viewProduct()" detail="true" lines="none">
    <ion-thumbnail slot="start">
      <ShopifyImg :src="product.mainImageUrl" size="small" />
    </ion-thumbnail>
    <ion-label>
      <p>{{ product.productName }}</p>
      <h3>{{ product.sku }}</h3>
      <p>{{$filters.getFeature(product.featureHierarchy, '1/COLOR/')}} {{$filters.getFeature(product.featureHierarchy, '1/COLOR/') && $filters.getFeature(product.featureHierarchy, '1/SIZE/')? "|" : ""}} {{$filters.getFeature(product.featureHierarchy, '1/SIZE/')}}</p>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  IonItem,
  IonThumbnail,
  IonLabel
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';
import { ShopifyImg } from '@hotwax/dxp-components';

export default defineComponent({
  name: "ProductListItem",
  components: {
    IonItem,
    IonThumbnail,
    IonLabel,
    ShopifyImg
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
    
    return {
      router,
      store
    }
  },
})
</script>
