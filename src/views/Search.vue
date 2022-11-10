<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search')" v-on:keyup.enter="queryString = $event.target.value; getProducts()"/>

      <ion-list v-if="products.length > 0">
        <ion-list-header>{{ $t("Results") }}</ion-list-header>

        <product-list-item v-for="product in products" :key="product.productId" :product="product"/>

        <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable">
          <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-list>
    </ion-content>

    <ion-grid id="scan-button">
      <ion-row>
        <ion-col>
          <ion-button color="primary" expand="block" @click="scanProduct">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            {{ $t("Scan") }}
          </ion-button>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-page>
</template>

<script lang="ts">
import {
  IonPage,
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonSearchbar,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonListHeader,
  modalController
} from '@ionic/vue'
import { barcodeOutline } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import ProductListItem from '@/components/ProductListItem.vue'
import Scanner from "@/components/Scanner.vue"
import { useRouter } from 'vue-router'

export default defineComponent({
  name: "Search",
  components: {
    IonPage,
    IonHeader,
    IonContent,
    IonToolbar,
    IonTitle,
    IonSearchbar,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonList,
    IonListHeader,
    ProductListItem
  },
  data (){
    return {
      queryString: ''
    }
  },
  computed: {
    ...mapGetters({
      products: 'product/getSearchProducts',
      isScrollable: 'product/isScrollable'
    })
  },
  methods: {
    async scanProduct(){
      const modal = await modalController
        .create({
          component: Scanner,
        });
        modal.onDidDismiss()
        .then(async (result) => {
          //result : value of the scanned barcode/QRcode
          if(result.role && result.role !== 'backdrop'){
            this.queryString = result.role
            await this.getProducts(process.env.VUE_APP_VIEW_SIZE, 0);
            this.router.push({ path: `/count/${this.products[0].sku}` });
            // We are using the value in getProducts function above, and hence
            // are emptying it after usage only.
            this.queryString = '';
            // After scanning the SKU, the search product list gets populated 
            // with the product, hence, clearing it.
            this.store.dispatch('product/clearSearchProducts');
          }
        });
      return modal.present();
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async loadMoreProducts (event: any) {
      this.getProducts(
        undefined,
        Math.ceil(this.products.length / process.env.VUE_APP_VIEW_SIZE).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    async getProducts(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
        queryString: '*' + this.queryString + '*'
      }
      if (this.queryString) {
        await this.store.dispatch("product/findProduct", payload);
      } else {
        showToast(translate("Enter product sku to search"))
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      router,
      store,
      barcodeOutline
    }
  },
})
</script>

<style scoped>
ion-content {
  --padding-bottom : 50px;
}

#scan-button {
  position: absolute;
  bottom: 0;
  width: 100%;
}
</style>