<template>
    <ion-page>
      <ion-header :translucent="true">
        <ion-toolbar>
          <ion-back-button slot="start" default-href="/"></ion-back-button>
          <ion-title>{{ $t("Count") }}</ion-title>
        </ion-toolbar>
      </ion-header>
  
      <ion-content>
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

        <div class="segment">
          <ion-segment v-model="segmentSelected">
            <ion-segment-button value="count">
              <ion-label>{{ $t("Count") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="variance">
              <ion-label>{{ $t("Variance") }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>
        
        <div v-if="segmentSelected === 'count'" class="inventory-form">
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
              <ion-icon :icon="saveOutline" slot="start" />
              {{$t("Save")}}
            </ion-button>
          </div>
        </div>  

        <div v-else class="inventory-form">
          <ion-item>
            <ion-label position="floating">{{ $t("Quantity") }}</ion-label>
            <ion-input type="number" inputmode="numeric" placeholder="inventory variance" v-model="product.variance" />
          </ion-item>
          <ion-item lines="none">
            <ion-note id="stockCount">{{ $t("Enter the amount of stock that has changed.") }}</ion-note>
          </ion-item>

          <ion-item>
            <ion-label>{{ $t("Variance reason") }}</ion-label>
            <ion-select interface="popover" :value="product.reason" @ionChange="updateVarianceReason($event)" placeholder="Select reason">
              <ion-select-option v-for="reason in varianceReasons" :key="reason.enumId" :value="reason.enumId" >{{ reason.description }}</ion-select-option>
            </ion-select>
          </ion-item>

          <div class="action">
            <ion-button size="large" @click="presentAlertOnVarianceUpdate()">
              <ion-icon :icon="cloudUploadOutline" slot="start" />
              {{$t("Log variance")}}
            </ion-button>
          </div>
        </div>

      </ion-content>
    </ion-page>
  </template>
  
  <script lang="ts">
  import {
    alertController,
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
    IonSegment,
    IonSelect,
    IonSelectOption,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    pickerController
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import { cloudUploadOutline, colorPaletteOutline, locationOutline, resize, saveOutline } from "ionicons/icons";
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
      IonSegment,
      IonSegmentButton,
      IonSelect,
      IonSelectOption,
      IonTitle,
      IonToolbar,
      Image
    },
    computed: {
      ...mapGetters({
        product: "product/getCurrent",
        facility: 'user/getCurrentFacility',
        varianceReasons: 'util/getVarianceReasons'
      })
    },
    data(){
      return{
        segmentSelected: "count",
        facilityLocations: [] as any,
        location: ""
      }
    },
    async mounted(){
      await this.store.dispatch('util/fetchVarianceReasons');
      await this.store.dispatch("product/updateCurrentProduct", this.$route.params.sku);
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
      },
      updateVarianceReason(event: any) {
        this.product.reason = event.detail.value
      },
      async presentAlertOnVarianceUpdate() {
        if (this.product.variance && this.product.reason) {
          const alert = await alertController.create({
            header: this.$t("Log variance"),
            message: this.$t("Are you sure you want to update the inventory variance?"),
            buttons: [{
              text: this.$t('Cancel'),
              role: 'cancel',
            },
            {
              text: this.$t('Update'),
              handler: () => {
                this.updateProductVarianceCount()
              }
            }]
          });
          await alert.present();
        } else {
          showToast(translate("Enter the variance count and the reason"))
        }
      },
      updateProductVarianceCount() {
        this.store.dispatch('product/updateVarianceCount', {
          productId: this.product.productId,
          quantity: parseInt(this.product.variance),
          facilityId: this.facility.facilityId,
          locationSeqId: this.product.locationId,
          varianceReasonId: this.product.reason
        });
        this.router.push('/search')
        // removing after updation
        delete this.product.variance;
        delete this.product.reason
      },
    },
    setup() {
      const store = useStore();
      const router = useRouter();
  
      return {
        cloudUploadOutline,
        colorPaletteOutline,
        locationOutline,
        resize,
        router,
        saveOutline,
        store,
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

  @media (max-height: 750px) {
    .product-image {
      position: sticky;
      top: 0px;
      z-index: -1;
    }
    
    .inventory-form {
      background-color: var(--ion-background-color, #fff);
      height: 80vh;
    }

    .segment {
      background-color: var(--ion-background-color, #fff);
    }
  }
  </style>
