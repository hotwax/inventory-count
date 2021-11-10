<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/"></ion-back-button>
        <ion-title>{{ $t("Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="header">
        <div class="product-image">
          <Image :src="product.mainImageUrl" />
        </div>
        <div class="product-info">
          <ion-item lines="none">
            <ion-label>
              <p class="overline">{{ product.productName }}</p>
              <h2>{{ product.sku }}</h2>
            </ion-label>
          </ion-item>

          <div class="product-features">
            <ion-item lines="none">
              <ion-chip v-if="$filters.getFeature(product.featureHierarchy, '1/COLOR/')" >
                <ion-icon :icon="colorPaletteOutline" />
                <ion-label>{{ $filters.getFeature(product.featureHierarchy, '1/COLOR/') }}</ion-label>
              </ion-chip>
              <ion-chip v-if="$filters.getFeature(product.featureHierarchy, '1/SIZE/')">
                <ion-icon :icon="resize" />
                <ion-label>{{ $filters.getFeature(product.featureHierarchy, '1/SIZE/') }}</ion-label>
              </ion-chip>
            </ion-item>
          </div>
        </div>
      </div>
      <ion-item>
        <ion-label position="floating">{{ $t("Stock") }}</ion-label>
        <ion-input v-model="product.quantity"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-note id="stockCount">{{ $t("Enter the count of stock on the shelf.") }}</ion-note>
      </ion-item>

      <div class="action">
        <ion-button size="large" @click="updateProductInventoryCount()">
          <ion-icon :icon="saveOutline" slot="start" />
          {{ $t("Save") }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { colorPaletteOutline, resize, saveOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { showToast } from "@/utils";
import { translate } from "@/i18n";
import { useRouter } from "vue-router";
import Image from "@/components/Image.vue";
export default defineComponent({
  name: "Count",
  components: {
    IonBackButton,
    IonButton,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonPage,
    IonTitle,
    IonToolbar,
    Image
  },
  computed: {
    ...mapGetters({
      product: "product/getCurrent"
    })
  },
  methods: {
    updateProductInventoryCount() {
      if (this.product.quantity) {
        this.store.dispatch('product/updateInventoryCount', this.product);
        showToast(translate("Item added to upload list"), [{
          text: translate('View'),
          role: 'view',
          handler: () => {
            this.router.push('/upload')
          }
        }], 3000)
        this.router.push('/search')
      } else {
        showToast(translate("Enter the stock count for the product"), null, 3000)
      }
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
      saveOutline,
    };
  },
});
</script>

<style scoped>
.product-image > img {
  width: 100%;
  height: 50vh;
  object-fit: contain;
}
    
#stockCount {
  margin-top: 8px;
}
  
.action {
  text-align: center;
}
</style>
