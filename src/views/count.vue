<template>
    <ion-page>
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-back-button slot="start" default-href="/"></ion-back-button>
          <ion-title>{{ $t("Count") }}</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content>
        <div class="header">
          <div class="product-image">
             <Image :src="product.mainImageUrl"/>
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
                <ion-chip v-if="$filters.getFeature(product.featureHierarchy, '1/COLOR/')">
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
          <ion-input type="number" min="0" inputmode="numeric" v-model="product.quantity"></ion-input>
        </ion-item>
        <ion-item lines="none">
          <ion-note id="stockCount">{{ $t("Enter the count of stock on the shelf.") }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>{{ $t("Location") }}</ion-label>
          <ion-chip @click="selectLocation">
            <ion-label>{{ location }}</ion-label>
            <ion-icon :icon="locationOutline" />
          </ion-chip>
        </ion-item>
  
        <div class="action">
          <ion-button size="large" @click="updateProductInventoryCount()">
            <ion-icon :icon="saveOutline" slot="start" />{{
              $t("Save")
            }}</ion-button
          >
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
    pickerController
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import { colorPaletteOutline, resize, saveOutline, locationOutline } from "ionicons/icons";
  import { mapGetters, useStore } from "vuex";
  import { hasError, showToast } from "@/utils";
  import { translate } from "@/i18n";
  import { useRouter } from "vue-router";
  import Image from "@/components/Image.vue";
  import { ProductService } from '@/services/ProductService';
  
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
        product: "product/getCurrent",
        facility: 'user/getCurrentFacility',
      })
    },
    data(){
      return{
        facilityLocations: [] as any,
        location: ""
      }
    },
    ionViewWillEnter() {
      this.fetchProduct(this.$route.params.sku)
    },
    async mounted(){
      await this.getFacilityLocations();
    },
    methods: {
      async selectLocation() {
        const pickerOptions = await this.facilityLocations.map((location: any) => {
          return { text:location.locationPath, value: location.locationSeqId };
        })
        const picker = await pickerController.create({
          columns: [
            {
              name: 'Location',
              options: pickerOptions
            }
          ],
          buttons: [
            {
              text: translate('Cancel'),
              role: "cancel",
            },
            {
              text: translate('Confirm'),
              handler: (data) => {
                this.location = data.Location.text;
                this.product.locationId = data.Location.value;
              },
            },
          ],
        });
        await picker.present();
      },
      updateProductInventoryCount() {
        if (this.product.quantity) {
          this.store.dispatch('product/updateInventoryCount', { ...this.product, locationId: this.product.locationId });
          showToast(translate("Item added to upload list"), [{
          text: translate('View'),
          role: 'view',
          handler: () => {
            this.router.push('/upload')
          }
        }])
        this.router.push('/search')
        } else {
          showToast(translate("Enter the stock count for the product"))
        }
      },
      fetchProduct(sku: any) {
        this.store.dispatch("product/updateCurrentProduct", sku)
      },
      async getFacilityLocations() {
        let resp;
        try {
          const params = {
            "inputFields": {
              facilityId: this.facility.facilityId,
              productId: this.product.productId,
            },
            "viewSize": 20,
            "entityName": "ProductAndFacilityLocation",
            "fieldList": ["areaId", "aisleId", "sectionId", "levelId", "positionId", "locationSeqId"]
          }
          resp = await ProductService.getFacilityLocations(params);
          if(resp.status === 200 && resp.data.count && resp.data.count > 0 && !hasError(resp)) {

            this.facilityLocations = resp.data.docs.map((location: any) => {
              return {
                locationSeqId: location.locationSeqId,
                locationPath: location.areaId + location.aisleId + location.sectionId + location.levelId + location.positionId
              }
            })
            this.location = this.facilityLocations[0].locationPath;
            this.product.locationId = this.facilityLocations[0].locationSeqId;
          }
        } catch(err) {
          console.error(err);
        }
        return resp;
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
        locationOutline
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