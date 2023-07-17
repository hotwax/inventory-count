<template>
  <ion-item button @click="viewProduct()" detail="true" lines="none">
    <ion-thumbnail slot="start">
      <Image :src="product.mainImageUrl"/>
    </ion-thumbnail>
    <ion-label>
      <p>{{ productHelpers.getProductIdentificationValue(productIdentificationPref.secondaryId, product) }}</p>
      <h3>{{ productHelpers.getProductIdentificationValue(productIdentificationPref.primaryId, product) }}</h3>

      <p>{{$filters.getFeature(product.featureHierarchy, '1/COLOR/')}} {{$filters.getFeature(product.featureHierarchy, '1/COLOR/') && $filters.getFeature(product.featureHierarchy, '1/SIZE/')? "|" : ""}} {{$filters.getFeature(product.featureHierarchy, '1/SIZE/')}}</p>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import {
  IonItem,
  IonThumbnail,
  IonLabel
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';
import Image from "@/components/Image.vue";
import { productHelpers } from '@/utils';
import { useProductIdentificationStore } from '@hotwax/dxp-components';

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
      this.router.push({ path: `/count/${this.product.sku}` })
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();

    // reactive state for productIdentificationPref
    let productIdentificationPref = ref(useProductIdentificationStore().$state.productIdentificationPref);

    // subscribing to useProductIdentificationStore and changing the value of productIdentificationPref when state changes
    useProductIdentificationStore().$subscribe((watch, state) => {      
      productIdentificationPref.value = state.productIdentificationPref;
    });
    
    return {
      router,
      store,
      productHelpers,
      productIdentificationPref
    }
  },
})
</script>
