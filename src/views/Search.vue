<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" :style="{'--background': scannerActive ? 'transparent' : '#fff'}">
      <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search')" v-on:keyup.enter="getProduct()" v-if="!scannerActive"/>

      <ion-list v-if="products.length > 0">
        <ion-list-header>{{ $t("Results") }}</ion-list-header>

        <product-list-item v-for="product in products" :key="product.productId" :product="product"/>

        <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="!isScrollable">
          <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-list>
    
      <ion-grid id="scan-button" v-if="!scannerActive">
        <ion-row>
          <ion-col>
            <!-- button to start the scanning functionality -->
            <ion-button color="primary" expand="block" @click="scan()">
              <ion-icon slot="start" :icon="barcodeOutline"></ion-icon>
                {{ $t("Scan") }}
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <ion-grid id="scan-button">
      <ion-row>
        <ion-col>
          <ion-button color="primary" expand="block">
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
  IonFooter,
  alertController,
} from '@ionic/vue'
import { barcodeOutline } from 'ionicons/icons'
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import ProductListItem from '@/components/ProductListItem.vue'
import { Plugins } from '@capacitor/core';
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
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonList,
    IonListHeader,
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
        showToast(translate("Enter product sku to search"))
      }
    },
    async presentAlertConfirm(header: string, message: string) {
      const alert = await alertController
      .create({
        header: this.$t(header),
        message: this.$t(message),
        buttons: [
          {
            text: this.$t('Okay'),
            handler: () => {
              console.log('Alert accepted')
            },
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
        this.presentAlertConfirm('No permission', 'Please allow camera access in your settings');
      } else {
        // showing alert if there is any other error
        this.presentAlertConfirm('Error', 'Unable to start camera, please try again');
      }

      return false;
    },
    async startScan() {
      console.log('scanning');
      const result = await BarcodeScanner.startScan(); // start scanning and wait for a result
      // if the result has content

      if (result.hasContent) {
        console.log(result.content); // log the raw scanned content
        this.scannerActive = false;
        this.scanResult = result.content;
        await this.store.dispatch('product/findScannedProduct', { sku: this.scanResult }).then((resp) => {
          this.$router.push(`/count/${this.scanResult}`)
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
    this.stopScan();
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
