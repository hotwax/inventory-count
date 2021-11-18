<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Upload") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-card v-for="product in uploadProducts" :key="product.productId">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <Image :src="product.mainImageUrl" />
          </ion-thumbnail>
          <ion-label @click="viewProduct(product)">
            <p class="overline">{{ product.productName }}</p>
            <h2>{{ product.sku }}</h2>
          </ion-label>
          <ion-badge slot="end" color="dark">{{ product.quantity }}</ion-badge>
        </ion-item>
        <ion-item lines="full">
          <ion-chip v-if="$filters.getFeature(product.featureHierarchy, '1/COLOR/')">
            <ion-icon :icon="colorPaletteOutline" />
            <ion-label>{{ $filters.getFeature(product.featureHierarchy, '1/COLOR/') }}</ion-label>
          </ion-chip>
          <ion-chip v-if="$filters.getFeature(product.featureHierarchy, '1/SIZE/')">
            <ion-icon :icon="resize" />
            <ion-label>{{ $filters.getFeature(product.featureHierarchy, '1/SIZE/') }}</ion-label>
          </ion-chip>
        </ion-item>
        <ion-button fill="clear" @click="removeItem(product.sku)">{{ $t( "Remove" ) }}</ion-button>
      </ion-card>
      
      <ion-fab vertical="bottom"  horizontal="end" slot="fixed">
        <ion-fab-button @click="upload()">
          <ion-icon :icon="cloudUploadOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <ion-footer :translucent="true">
      <ion-toolbar>
        <tab-bar />
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBadge,
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonFab,
  IonFabButton,
  IonLabel,
  IonPage,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  IonFooter,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { colorPaletteOutline, resize, cloudUploadOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import Image from "@/components/Image.vue";
import TabBar from '@/components/TabBar.vue'

export default defineComponent({
  name: "Upload",
  components: {
    IonBadge,
    IonButton,
    IonCard,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonFab,
    IonFabButton,
    IonLabel,
    IonPage,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    IonFooter,
    TabBar,
    Image
  },
  computed: {
    ...mapGetters({
      uploadProducts: 'product/getUploadProducts',
      currentFacility: 'user/getCurrentFacility'
    })
  },
  methods: {
    removeItem (sku: any) {
      this.store.dispatch('product/removeItemFromUploadProducts', sku)
    },
    upload () {
      if (Object.keys(this.uploadProducts).length > 0) {
        const inventoryCountRegister = Object.entries(this.uploadProducts).map((product: any) => {
          return {"locationId": "", "productId": product[1].productId, "quantity": product[1].quantity};
        })
        // TODO handle the case if there is no facilities available
        this.store.dispatch('product/uploadInventoryCount', {inventoryCountRegister: inventoryCountRegister, facilityId: this.currentFacility.facilityId});
      }
    },
    viewProduct (product: any) {
      this.store.commit('product/product/CURRENT_UPDATED', { product: product });
      this.$router.push(`/count/${product.sku}`)
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      store,
      router,
      colorPaletteOutline,
      resize,
      cloudUploadOutline
    };
  },
});
</script>

<style scoped>
  #upload-button {
    bottom: 70px;
  }

  ion-thumbnail > img {
    object-fit: contain;
  }
</style>