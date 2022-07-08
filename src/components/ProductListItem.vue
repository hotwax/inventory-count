<template>
  <ion-item button @click="viewProduct()" detail="true" lines="none">
    <ion-thumbnail slot="start">
      <Image :src="product.contents ? getContent(product.contents, 'PcntImageUrlOriginal') : ''"/>
    </ion-thumbnail>
    <ion-label>
      <p>{{ product.productName }}</p>
      <h3>{{ product.identifications ? getIdentification(product.identifications, 'PidtSku') : '' }}</h3>
      <p>{{ getFeature(product.features, 'Color')}} {{ getFeature(product.features, 'Color') && getFeature(product.features, 'Size')? "|" : ""}} {{ getFeature(product.features, 'Size')}}</p>
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
import { getContent, getFeature, getIdentification } from '@/utils'

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
      await this.store.dispatch('product/updateCurrentProduct', {product: this.product});
      this.router.push({ path: `/count/${this.product.identifications[0].idValue}` })
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    
    return {
      getContent,
      getFeature,
      getIdentification,
      router,
      store
    }
  },
})
</script>
