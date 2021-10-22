<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search')" v-on:keyup.enter="getProducts()"/>

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
          <ion-button class="Boxcolr" color="primary" expand="block">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            {{ $t("Scan") }}
          </ion-button>
        </ion-col>
      </ion-row>
    </ion-grid>

    <ion-footer :translucent="true">
      <ion-toolbar>
        <tab-bar />
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
import TabBar from '@/components/TabBar.vue'
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
  IonFooter,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonListHeader
} from '@ionic/vue'
import { barcodeOutline } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import ProductListItem from '@/components/ProductListItem.vue'

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
    IonFooter,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonList,
    IonListHeader,
    TabBar,
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

    return {
      store,
      barcodeOutline
    }
  },
})
</script>

<style scoped>
  #scan-button {
    position: fixed;
    bottom: 55px;
    width: 100%;
    /* background-color: black; */
    /* box-shadow: 2px 2px solid black; */
    
  }
  
   
   #scan-button .Boxcolr:hover{
    /* box-shadow: 2px 2px 2px 2px  #ebebeb */
    /* box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px; */
    box-shadow: rgba(0, 0, 0, 0.16) 3px 3px 6px, rgba(0, 0, 0, 0.23) 3px 3px 6px;

   }
   
  

</style>