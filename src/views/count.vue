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
          <DxpShopifyImg :src="product.mainImageUrl"/>
        </div>
        
        <div class="product-info">
          <ion-item lines="none">
            <ion-label>
              <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, product) }}</p>
              <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, product) ? getProductIdentificationValue(productIdentificationPref.primaryId, product) : product.productName  }}</h2>
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

        <div class="segment" v-if="hasPermission(Actions.APP_INVNTRY_CNT_IMPORT) && hasPermission(Actions.APP_VARIANCE_LOG)">
          <ion-segment v-model="segmentSelected">
            <ion-segment-button v-if="hasPermission(Actions.APP_INVNTRY_CNT_IMPORT)" value="count">
              <ion-label>{{ $t("Count") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button v-if="hasPermission(Actions.APP_VARIANCE_LOG)" value="variance">
              <ion-label>{{ $t("Variance") }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>
        
        <div v-if="segmentSelected === 'count'" class="inventory-form">
          <ion-item>
            <ion-input :label="$t('Stock')" label-placement="floating" type="number" min="0" inputmode="numeric" :value="quantity" @ionChange="quantity = $event.detail.value" ></ion-input>
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
          <ion-item v-if="QOHConfig.viewQOH">
            <ion-label>{{ $t("In stock") }}</ion-label>
            <ion-label slot="end">{{ availableQOH }}</ion-label>
          </ion-item>
          <ion-item v-if="QOHConfig.viewQOH">
            <ion-label>{{ $t("Variance") }}</ion-label>
            <ion-label slot="end">{{ availableQOH && quantity ? quantity - availableQOH : "-" }}</ion-label>
          </ion-item>
    
          <div class="action">
            <ion-button size="large" :disabled="!hasPermission(Actions.APP_INVNTRY_CNT_IMPORT)" @click="updateProductInventoryCount()">
              <ion-icon :icon="saveOutline" slot="start" />
              {{$t("Save")}}
            </ion-button>
          </div>
        </div>  

        <div v-else class="inventory-form">
          <ion-item>
            <ion-input :label="$t('Quantity')" label-placement="floating" type="number" inputmode="numeric" :placeholder="$t('inventory variance')" v-model="product.varianceQuantity" />
          </ion-item>
          <ion-item lines="none">
            <ion-note id="stockCount">{{ $t("Enter the amount of stock that has changed.") }}</ion-note>
          </ion-item>

          <ion-item>
            <ion-select :label="$t('Variance reason')" interface="popover" :value="product.varianceReasonId" @ionChange="updateVarianceReason($event)" :placeholder="$t('Select reason')" >
              <ion-select-option v-for="reason in varianceReasons" :key="reason.enumId" :value="reason.enumId" >{{ reason.description }}</ion-select-option>
            </ion-select>
          </ion-item>

          <div class="action">
            <ion-button size="large" @click="confirmVarianceUpdate()">
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
  import { computed, defineComponent } from "vue";
  import { cloudUploadOutline, colorPaletteOutline, locationOutline, resize, saveOutline } from "ionicons/icons";
  import { mapGetters, useStore } from "vuex";
  import { hasError, showToast } from "@/utils";
  import { translate } from "@/i18n";
  import { useRouter } from "vue-router";
  import { getProductIdentificationValue, DxpShopifyImg, useProductIdentificationStore } from "@hotwax/dxp-components";
  import { UtilService } from "@/services/UtilService";
  import { ProductService } from '@/services/ProductService';
  import { StockService } from '@/services/StockService';
  import emitter from "@/event-bus"
  import { Actions, hasPermission } from '@/authorization'
  
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
      DxpShopifyImg
    },
    computed: {
      ...mapGetters({
        product: "product/getCurrent",
        facility: 'user/getCurrentFacility',
        QOHConfig: 'user/getViewQOHConfig',
        userProfile: 'user/getUserProfile',
      })
    },
    data(){
      return{
        segmentSelected: "count",
        facilityLocations: [] as any,
        location: "",
        varianceReasons: [],
        availableQOH: 0,
        quantity: 0 as any
      }
    },
    async mounted(){
      await this.fetchVarianceReasons();
      await this.store.dispatch("product/updateCurrentProduct", this.$route.params.sku);
      this.quantity = this.product.quantity
      await this.getFacilityLocations();
      if (this.QOHConfig.viewQOH) await this.getInventory()
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
                this.getInventory()
              },
            },
          ],
        });
        await picker.present();
      },
      async updateProductInventoryCount() {
        if (this.quantity) {
          this.product.quantity = this.quantity;
          this.product.availableQOH = this.availableQOH;
          //Create the ProductFacility record if it does not exist.
          await this.checkAndCreateProductFacilityAssoc();
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
      async checkAndCreateProductFacilityAssoc() {
        let resp;
        try {
          if (!await ProductService.isProductFacilityAssocExists(this.product.productId, this.facility.facilityId)) {
            resp = await ProductService.addProductToFacility({
              productId: this.product.productId, 
              facilityId: this.facility.facilityId
            });
            if (hasError(resp)) {
              throw resp.data;
            }

            const locationSeqId =  await ProductService.getCurrentFacilityLocation(this.facility.facilityId)

            resp = await ProductService.createProductFacilityLocation({
              productId: this.product.productId,
              facilityId: this.facility.facilityId,
              locationSeqId
            });

            if (!hasError(resp)) {
              await this.getFacilityLocations()
            } else {
              throw resp.data;
            }
          }
        } catch (err) {
          console.error(err);
        }
      },
      async getInventory() {
        if (!this.product.locationId) {
          console.warn("There are no facility locations, skipping fetching the inventory");
        }
        try {
          const resp = await StockService.getInventoryAvailableByLocation({
              facilityId: this.facility.facilityId,
              productId: this.product.productId,
              locationSeqId: this.product.locationId
          });
          if (!hasError(resp)) {
            this.availableQOH = resp.data.quantityOnHandTotal;
          }
        } catch(err) {
          console.error(err);
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
        this.product.varianceReasonId = event.detail.value
      },
      async confirmVarianceUpdate() {
        if (this.product.varianceQuantity && this.product.varianceReasonId) {
          const alert = await alertController.create({
            header: this.$t("Log variance"),
            message: this.$t("The inventory will be immediately updated and cannot be undone. Are you sure you want to update the inventory variance?"),
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
      async fetchVarianceReasons() {
        try {
          const payload = {
            "inputFields": {
              "enumTypeId": "IID_REASON"
            },
            "fieldList": ["enumId", "description"],
            "distinct": "Y",
            "entityName": "Enumeration",
            "viewSize": 20
          }

          const resp = await UtilService.fetchVarianceReasons(payload)
          if (!hasError(resp)) {
            this.varianceReasons = resp.data.docs
          }
        } catch (err) {
          console.error(err)
        }
      },
      async updateProductVarianceCount() {
        emitter.emit("presentLoader");

        await this.checkAndCreateProductFacilityAssoc();

        let resp;
        try {
          const params = {
            "payLoad": {
              "productId": this.product.productId,
              "quantity": parseInt(this.product.varianceQuantity),
              "facilityId": this.facility.facilityId,
              "locationSeqId": this.product.locationId,
              "varianceReasonId": this.product.varianceReasonId,
              "comments": this.userProfile.userLoginId
            }
          }

          resp = await ProductService.updateVariance(params)
          if (!hasError(resp)) {
            showToast(translate("Variance updated successfully"))
          } else {
            showToast(translate("Something went wrong"))
          }
          emitter.emit("dismissLoader");
        } catch (error) {
          console.error(error);
          showToast(translate("Something went wrong"));
        }

        // removing after updation
        delete this.product.varianceQuantity;
        delete this.product.varianceReasonId
        this.router.push('/search')
      },
    },
    setup() {
      const store = useStore();
      const router = useRouter();
      const productIdentificationStore = useProductIdentificationStore();
      let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
  
      return {
        Actions,
        cloudUploadOutline,
        colorPaletteOutline,
        getProductIdentificationValue,
        hasPermission,
        locationOutline,
        productIdentificationPref,
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
