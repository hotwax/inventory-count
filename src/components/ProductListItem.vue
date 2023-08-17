<template>
  <ion-item button detail="true" lines="none">
    <ion-thumbnail slot="start">
      <Image :src="product.mainImageUrl"/>
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
  setup() {
    const store = useStore();
    
    return {
      store
    }
  },
})
</script>
