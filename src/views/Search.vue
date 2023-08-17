<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-row>
        <ion-col>
          <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search')" @keyup.enter="queryString = $event.target.value; searchProducts()"/>
          
          <!-- Empty state -->
          <div class="empty-state" v-if="!products.length">
            <p>{{ $t("Search for a product and it will show up here")}}</p>
          </div>

          <ion-list v-if="products.length > 0">
            <ion-list-header>{{ $t("Results") }}</ion-list-header>
    
            <product-list-item @click="viewProduct(product.sku)" v-for="product in products" :key="product.productId" :product="product"/>
    
            <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          </ion-list>
        </ion-col>
        <ion-col v-if="isDesktop">
          <div class="count">
            <count v-if="selectedProductSku" :sku="selectedProductSku"></count>
          </div>
        </ion-col>
      </ion-row>
    </ion-content>

    <ion-grid :class="{'scan-button-mobile': isDesktop, 'scan-button': !isDesktop,}">
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
  isPlatform,
  modalController
} from '@ionic/vue'
import { barcodeOutline } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import ProductListItem from '@/components/ProductListItem.vue'
import Scanner from "@/components/Scanner.vue"
import Count from "@/views/count.vue"
import { useRouter } from 'vue-router'

export default defineComponent({
  name: "Search",
  components: {
    Count,
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
      queryString: '',
      isDesktop: isPlatform('desktop'),
      selectedProductSku: ''
    }
  },
  computed: {
    ...mapGetters({
      products: 'product/getSearchProducts',
      isScrollable: 'product/isScrollable'
    })
  },
  ionViewWillEnter(){
    if(this.$route.redirectedFrom) this.queryString = '';
  },
  methods: {
    async scanProduct(){
      try {
        // checking camera permission before opening the scanner
        await navigator.mediaDevices.getUserMedia({ video: true });
        const modal = await modalController
        .create({
          component: Scanner,
          backdropDismiss: false
        });
        modal.onDidDismiss()
        .then((result) => {
          //result : value of the scanned barcode/QRcode
          if (result.role) {
            this.queryString = result.role;
            this.getProducts(process.env.VUE_APP_VIEW_SIZE, 0);
          }
        });
        return modal.present();
      } catch (err) {
        showToast(translate("Camera permission denied."));
      }
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async loadMoreProducts (event: any) {
      this.searchProducts(
        undefined,
        Math.ceil(this.products.length / process.env.VUE_APP_VIEW_SIZE).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    async searchProducts(vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const queryString = '*' + this.queryString + '*';
      this.getProducts(viewSize, viewIndex, queryString);
    },
    async getProducts(vSize?: any, vIndex?: any, queryString?: string) {
      const payload = {
        viewSize: vSize,
        viewIndex: vIndex,
        queryString: queryString ? queryString : this.queryString,
      }
      if (this.queryString) {
        await this.store.dispatch("product/findProduct", payload);
      } else {
        showToast(translate("Enter product sku to search"))
      }
    },
    async viewProduct(sku: string) {
      if(this.isDesktop){
        !this.selectedProductSku ? this.selectedProductSku = sku : await this.store.dispatch("product/updateCurrentProduct", sku);
      }
      else{
        this.router.push({ path: `/count/${sku}` });
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      store,
      barcodeOutline,
      router
    }
  },
})
</script>

<style scoped>
ion-content {
  --padding-bottom : 50px;
}

.scan-button {
  position: absolute;
  bottom: 0;
  width: 100%;
}
.scan-button-mobile {
  position: absolute;
  bottom: 0;
  width: 50%;
}
.count{
  position: fixed;
  width: 50%;
  height: 100%;
  overflow-y:auto;
}

</style>