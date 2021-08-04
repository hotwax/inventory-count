<template>
  <ion-item button @click="viewProduct()" detail="true" lines="none">
    <ion-thumbnail slot="start">
      <Image :src="product.mainImageUrl"/>
    </ion-thumbnail>
    <ion-label>
      <p>{{ product.productName }}</p>
      <h3>{{ product.sku }}</h3>
      <p>{{$filters.getFeature(product.featureHierarchy, '1/COLOR/')}} | {{$filters.getFeature(product.featureHierarchy, '1/SIZE/')}}</p>
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
import Image from "@/components/Image.vue";

export default defineComponent({
  name: "ProductListItem",
  components: {
    IonItem,
    IonThumbnail,
    IonLabel,
    Image
  },
  props: ["product"],
  methods: {
    async viewProduct () {
      await this.store.dispatch('product/setCurrent', {product: this.product});
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
