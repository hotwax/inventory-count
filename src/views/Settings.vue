<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile.userLoginId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile.partyName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ translate("Reset password") }}</ion-button> -->
        </ion-card>
      </div>
      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>
      <section>
        <DxpOmsInstanceNavigator />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Facility") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-select :label="translate('Select facility')" interface="popover" v-model="currentFacilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.facilityName }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </section>
      <hr />

      <DxpAppVersionInfo />

      <section>
        <DxpProductIdentifier />
        <DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated"/>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Quantity on hand') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Show the current physical quantity expected at locations while counting to help gauge inventory accuracy.') }}
            <p>{{ translate('Facility needs to be associated with a product store to change this configuration.') }}</p>
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle justify="space-between" :disabled="!hasPermission(Actions.APP_QOH_STNG_UPDATE) || !currentEComStore?.productStoreId || Object.keys(currentQOHViewConfig).length == 0" :checked="currentQOHViewConfig.settingValue" @ionChange="updateViewQOHConfig(currentQOHViewConfig, $event.detail.checked)">{{ translate('Show systemic inventory') }}</ion-toggle>
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { alertController, IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,IonIcon, IonItem, IonPage, IonSelect, IonSelectOption, IonTitle, IonToggle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVertical, personCircleOutline, storefrontOutline, openOutline} from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import Image from '@/components/Image.vue'
import { Actions, hasPermission } from '@/authorization'
import { UserService } from '@/services/UserService'
import { hasError, showToast } from '@/utils';
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: 'Settings',
  components: {
    IonAvatar,
    IonButton, 
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonPage, 
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToggle,
    IonToolbar,
    Image
  },
  data() {
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      currentFacilityId: "",
      currentQOHViewConfig: {} as any
    };
  },
  ionViewWillEnter() {
    this.currentFacilityId = this.currentFacility.facilityId;
    this.getViewQOHConfig();
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      uploadProducts: 'product/getUploadProducts',
      currentEComStore: 'user/getCurrentEComStore',
      QOHConfig: 'user/getViewQOHConfig'
    })
  },
  methods: {
    async getViewQOHConfig() {
      this.currentQOHViewConfig = await UserService.getQOHViewConfig(undefined, this.currentEComStore?.productStoreId) as any;
      this.store.dispatch('user/updateViewQOHConfig', { currentQOHViewConfig: this.currentQOHViewConfig, viewQOH: this.currentQOHViewConfig.settingValue == "true" });
    },
    async updateViewQOHConfig(config: any, value: any) {
      // When storing boolean values, it is stored as string. Further comparison needs conversion
      if (typeof value === 'boolean' && (config.settingValue == 'true') === value) {
        return;
      } 
      const params = {
        "fromDate": config.fromDate,
        "productStoreId": this.currentEComStore?.productStoreId,
        "settingTypeEnumId": config.settingTypeEnumId,
        "settingValue": value
      }
      try {
        const resp = await UserService.updateQOHViewConfig(params) as any
        if(!hasError(resp)) {
          showToast(translate('Configuration updated'))
        } else {
          showToast(translate('Failed to update configuration'))
        }
      } catch(err) {
        showToast(translate('Failed to update configuration'))
        console.error(err)
      }
      // Fetch the updated configuration
      await this.getViewQOHConfig();
    },
    async setFacility (event: any) {
      // adding check for this.currentFacility.facilityId as it gets set to undefined on logout
      // but setFacility is called again due to :value="currentFacility.facilityId" in ion-select
      if (this.userProfile && this.currentFacility.facilityId) {
        if (Object.keys(this.uploadProducts).length > 0) {
          this.presentAlertOnFacilityChange(event.detail.value);
        } else {
          await this.store.dispatch('user/setFacility', {
            'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == event.detail.value)
          });
          this.currentFacilityId = this.currentFacility.facilityId;
          this.currentQOHViewConfig = this.QOHConfig.currentQOHViewConfig
        }
      }
    },
    async presentAlertOnLogout() {
      const alert = await alertController.create({
        header: translate('Logout'),
        message: translate('The products in the upload list will be removed.'),
        buttons: [{
          text: translate('Cancel')
        },
        {
          text: translate('Ok'),
          handler: () => {
            this.store.dispatch('user/logout', { isUserUnauthorised: false }).then((redirectionUrl) => {
              // if not having redirection url then redirect the user to launchpad
              if (!redirectionUrl) {
                const redirectUrl = window.location.origin + '/login'
                window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
              }
            })
          }
        }]
      });
      await alert.present();
    },
    async presentAlertOnFacilityChange(facilityId: string) {
      const alert = await alertController.create({
        header: translate('Set facility'),
        message: translate('The products in the upload list will be removed.'),
        buttons: [{
          text: translate('Cancel'),
          handler: () => {
            this.currentFacilityId = this.currentFacility.facilityId
          }
        },
        {
          text: translate('Ok'),
          handler: async () => {
            this.store.dispatch('product/clearUploadProducts');
            await this.store.dispatch('user/setFacility', {
              'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == facilityId)
            });
            this.currentFacilityId = this.currentFacility.facilityId
            this.currentQOHViewConfig = this.QOHConfig.currentQOHViewConfig
          }
        }]
      });
      await alert.present();
    },
    
    async timeZoneUpdated(tzId: string) {
      await this.store.dispatch("user/setUserTimeZone", tzId)
    },
    logout () {
      if (Object.keys(this.uploadProducts).length > 0) {
        this.presentAlertOnLogout();
      } else {
        this.store.dispatch('user/logout', { isUserUnauthorised: false }).then((redirectionUrl) => {
          // if not having redirection url then redirect the user to launchpad
          if (!redirectionUrl) {
            const redirectUrl = window.location.origin + '/login'
            window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
          }
        })
      }
    },
    goToLaunchpad() {
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
    }
  },
  setup(){
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      codeWorkingOutline,
      ellipsisVertical,
      hasPermission,
      personCircleOutline,
      storefrontOutline,
      openOutline,
      store,
      router,
      translate
    }
  }
});
</script>

<style scoped>
ion-label[slot="end"] {
  text-align: end;
}

ion-card > ion-button {
  margin: var(--spacer-xs);
}
section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-items: start;
}
.user-profile {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacer-xs) 10px 0px;
}
</style>
