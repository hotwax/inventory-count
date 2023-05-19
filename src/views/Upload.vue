<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Upload") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card v-for="product in uploadProducts" :key="product.productId">
        <ion-item lines="none">
          <ion-thumbnail slot="start">
            <Image :src="product.mainImageUrl"/>
          </ion-thumbnail>
          <ion-label @click="viewProduct(product)">
            <p class="overline">{{ product.productName }}</p>
            <h2>{{ product.sku }}</h2>
          </ion-label>
          <ion-badge slot="end" color="dark">{{ product.quantity }}</ion-badge>
        </ion-item>
        <ion-item lines="full">
          <ion-chip>
            <ion-icon :icon="colorPaletteOutline" />
            <ion-label>{{ $filters.getFeature(product.featureHierarchy, '1/COLOR/') }}</ion-label>
          </ion-chip>
          <ion-chip>
            <ion-icon :icon="resize" />
            <ion-label>{{ $filters.getFeature(product.featureHierarchy, '1/SIZE/') }}</ion-label>
          </ion-chip>
        </ion-item>
        <ion-item v-if="viewQOH && product.availableQOH">
            <ion-label>{{ $t("In stock") }}</ion-label>
            <ion-label slot="end">{{  product.availableQOH }}</ion-label>
          </ion-item>
          <ion-item v-if="viewQOH && product.availableQOH">
            <ion-label>{{ $t("Variance") }}</ion-label>
            <ion-label slot="end">{{ product.quantity - product.availableQOH }}</ion-label>
          </ion-item>
        <ion-button fill="clear" @click="removeItem(product.sku)">{{ $t( "Remove" ) }}</ion-button>
      </ion-card>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="presentAlertOnUpload()" :disabled="!hasPermission(Actions.APP_INVNTRY_CNT_IMPORT) || Object.keys(uploadProducts).length === 0">
          <ion-icon :icon="cloudUploadOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
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
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { colorPaletteOutline, resize, cloudUploadOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import Image from "@/components/Image.vue";
  import { Actions, hasPermission } from '@/authorization'

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
    Image
  },
  computed: {
    ...mapGetters({
      uploadProducts: 'product/getUploadProducts',
      currentFacility: 'user/getCurrentFacility',
      viewQOH: 'user/getViewQOHConfig'
    })
  },
  methods: {
    removeItem (sku: any) {
      this.store.dispatch('product/removeItemFromUploadProducts', sku)
    },
    async presentAlertOnUpload() {
      const alert = await alertController.create({
        header: this.$t("Upload inventory count"),
        message: this.$t("Make sure you've reviewed the products and their counts before uploading them for review"),
        buttons: [{
          text: this.$t('Cancel'),
          role: 'cancel',
        },
        {
          text: this.$t('Upload'),
          handler: () => {
            this.upload()
          }
        }]
      });
      await alert.present();
    },
    upload () {
      const inventoryCountRegister = Object.entries(this.uploadProducts).map((product: any) => {
        return {"locationId": product[1].locationId, "productId": product[1].productId, "quantity": product[1].quantity};
      })
      // TODO handle the case if there is no facilities available
      this.store.dispatch('product/uploadInventoryCount', {inventoryCountRegister: inventoryCountRegister, facilityId: this.currentFacility.facilityId});
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
      Actions,
      hasPermission,
      store,
      router,
      colorPaletteOutline,
      resize,
      cloudUploadOutline
    };
  },
});
</script>
