<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search')" v-on:keyup.enter="getProducts()"/>

      <div class="list-scan-container">
        <div class="list">
          <ion-list v-if="products.length > 0" :class="{list: isOpen}">
            <ion-list-header>{{ $t("Results") }}</ion-list-header>

            <product-list-item v-for="product in products" :key="product.productId" :product="product"/>

            <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          </ion-list>
        </div>
        <div class="scanner" v-if="isOpen">
          <Scanner />    
        </div>
      </div>
    </ion-content>

    <ion-grid id="scan-button" v-if="!isOpen">
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
  IonListHeader
} from '@ionic/vue'
import { barcodeOutline } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import ProductListItem from '@/components/ProductListItem.vue'
import Scanner from "@/components/Scanner.vue"
import emitter from "@/event-bus"

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
    ProductListItem,
    Scanner
  },
  data (){
    return {
      isOpen: false,
      queryString: ''
    }
  },
  computed: {
    ...mapGetters({
      products: 'product/getSearchProducts',
      isScrollable: 'product/isScrollable'
    })
  },
  created () {
    emitter.on("closeScan", this.closeScan);
  },
  methods: {
    async scanProduct(){
      this.isOpen = true;
    },
    closeScan(){
      this.isOpen = false;
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

    return {
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

.list-scan-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list {
  flex: 1;
  overflow-y: scroll;
}

.scanner {
  min-height: 50%;
}
</style>