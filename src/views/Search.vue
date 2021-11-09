<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" :style="{'--background': scannerActive ? 'transparent' : '#fff'}">
      <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search')" v-on:keyup.enter="getProducts()" v-if="!scannerActive"/>

      <ion-list v-if="products.length > 0 && !scannerActive">
        <ion-list-header>{{ $t("Results") }}</ion-list-header>

        <product-list-item v-for="product in products" :key="product.productId" :product="product"/>

        <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable">
          <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-list>
    </ion-content>

    <ion-grid id="scan-button" v-if="!scannerActive">
      <ion-row>
        <ion-col>
          <ion-button color="primary" expand="block" @click="scan()">
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
  alertController,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonListHeader
} from '@ionic/vue'
import { barcodeOutline } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import { Plugins } from '@capacitor/core';
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import ProductListItem from '@/components/ProductListItem.vue'

const { BarcodeScanner } = Plugins;

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
      queryString: '',
      scanResult: '',
      scannerActive: false
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
        showToast(translate("Enter product sku to search"), [{
        duration: 3000
      }])
      }
    },
    async presentAlertConfirm(header: string, message: string) {
      const alert = await alertController
      .create({
        header: this.$t(header),
        message: this.$t(message),
        buttons: [
          {
            text: this.$t('Okay')
          },
        ],
      });
      return alert.present();
    },
    async checkCameraPermission() {

      const status = await BarcodeScanner.checkPermission({ force: true });

      if (status.granted) {
        // the user granted permission
        return true;
      } else if (status.denied) {
        // the user has not given permission, showing alert message to enable camera permission in settings
        this.presentAlertConfirm(translate('No permission'), translate('Please allow camera access in your settings'));
      } else {
        // showing alert if there is any other error
        this.presentAlertConfirm(translate('Error'), translate('Unable to start camera, please try again'));
      }

      return false;
    },
    async startScan() {
      const result = await BarcodeScanner.startScan(); // start scanning and wait for a result
      // if the result has content
      if (result.hasContent) {
        BarcodeScanner.startScan({ targetedFormats: ['UPC_A'] })
        this.scannerActive = false;
        this.scanResult = result.content;
        await this.store.dispatch('product/setCurrent', { upc: this.scanResult }).then((resp) => {
          if (resp.upc) {
            this.$router.push(`/count/${this.scanResult}`);
          }
        })
      }
    },
    async stopScan() {
      this.scannerActive = false;
      await BarcodeScanner.stopScan();
    },
    async scan() {
      const permissionGranted = await this.checkCameraPermission();

      if(permissionGranted) {
        this.scannerActive = true;
        this.startScan();
      } else {
        this.stopScan();
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
  ionViewDidLeave() {
    // added condition to call stopScan method only when the scanner is active and not always
    if (this.scannerActive) {
      this.stopScan();
    }
  }
})
</script>

<style scoped>
  #scan-button {
    position: fixed;
    bottom: 55px;
    width: 100%;
  }
</style>