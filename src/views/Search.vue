<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="translate('Search')" @keyup.enter="queryString = $event.target.value; searchProducts()"/>
      
      <!-- Empty state -->
      <div class="empty-state" v-if="!products.length && !fetchingProducts">
        <p v-if="showErrorMessage">{{ translate("No results found")}}</p>
        <img src="../assets/images/empty-state.png" alt="No results found"/>
        <p>{{ translate("Enter a SKU, or use the barcode scanner to search a product")}}</p>
      </div>

      <ion-list v-if="products.length > 0">
        <ion-list-header>{{ translate("Results") }}</ion-list-header>

        <product-list-item v-for="product in products" :key="product.productId" :product="product"/>
        <!--
          When searching for a keyword, and if the user moves to the last item, then the didFire value inside infinite scroll becomes true and thus the infinite scroll does not trigger again on the same page(https://github.com/hotwax/users/issues/84).
          Also if we are at the section that has been loaded by infinite-scroll and then move to the details page then the list infinite scroll does not work after coming back to the page
          In ionic v7.6.0, an issue related to infinite scroll has been fixed that when more items can be added to the DOM, but infinite scroll does not fire as the window is not completely filled with the content(https://github.com/ionic-team/ionic-framework/issues/18071).
          The above fix in ionic 7.6.0 is resulting in the issue of infinite scroll not being called again.
          To fix this we have maintained another variable `isScrollingEnabled` to check whether the scrolling can be performed or not.
          If we do not define an extra variable and just use v-show to check for `isScrollable` then when coming back to the page infinite-scroll is called programatically.
          We have added an ionScroll event on ionContent to check whether the infiniteScroll can be enabled or not by toggling the value of isScrollingEnabled whenever the height < 0.
        -->
        <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" v-show="isScrollable" ref="infiniteScrollRef">
          <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-list>
    </ion-content>

    <ion-grid id="scan-button">
      <ion-row>
        <ion-col>
          <ion-button color="primary" expand="block" @click="scanProduct">
            <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
            {{ translate("Scan") }}
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
import { translate } from '@hotwax/dxp-components'
import ProductListItem from '@/components/ProductListItem.vue'
import Scanner from "@/components/Scanner.vue"

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
      queryString: '',
      showErrorMessage: false,
      fetchingProducts: false,
      isScrollingEnabled: false
    }
  },
  computed: {
    ...mapGetters({
      products: 'product/getSearchProducts',
      isScrollable: 'product/isScrollable'
    })
  },
  ionViewWillEnter(){
    this.isScrollingEnabled = false;
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
    enableScrolling() {
      const parentElement = (this as any).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this as any).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
    async loadMoreProducts (event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if(!(this.isScrollingEnabled && this.isScrollable)) {
        await event.target.complete();
      }  
      this.searchProducts(
        undefined,
        Math.ceil(this.products.length / process.env.VUE_APP_VIEW_SIZE).toString()
      ).then(async () => {
        await event.target.complete();
      });
    },
    async searchProducts(vSize?: any, vIndex?: any) {
      this.queryString ? this.showErrorMessage = true : this.showErrorMessage = false;
      this.fetchingProducts = true;
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      await this.getProducts(viewSize, viewIndex, this.queryString);
      this.fetchingProducts = false;
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
        showToast(translate("Enter the product sku, upc, product name, etc. to search."))
      }
    }
  },
  setup() {
    const store = useStore();
    return {
      store,
      barcodeOutline,
      translate
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