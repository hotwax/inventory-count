<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Settings") }}</ion-title>
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
          <ion-button color="danger" @click="logout()">{{ $t("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ $t("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ $t("Reset password") }}</ion-button> -->
        </ion-card>
      </div>
      <div class="section-header">
        <h1>{{ $t('OMS') }}</h1>
      </div>
      <section>
        <OmsInstanceNavigator />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Facility") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Select facility") }}</ion-label>
            <ion-select interface="popover" v-model="currentFacilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
      </section>
      <hr />
      <AppVersionInfo />
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t('Timezone') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
            <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ $t("Change") }}</ion-button>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t('Quantity on hand') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Show the current physical quantity expected at locations while counting to help gauge inventory accuracy.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label> {{ $t('Show systemic inventory') }} </ion-label>
            <ion-toggle :disabled="!hasPermission(Actions.APP_QOH_STNG_UPDATE) || Object.keys(currentQOHViewConfig).length == 0" :checked="currentQOHViewConfig.settingValue" @ionChange="updateViewQOHConfig(currentQOHViewConfig, $event.detail.checked)" slot="end" />
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { alertController, IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader,IonIcon, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption, IonTitle, IonToggle, IonToolbar, modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVertical, personCircleOutline, storefrontOutline, openOutline} from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import Image from '@/components/Image.vue'
import TimeZoneModal from '@/views/TimezoneModal.vue';
import { Actions, hasPermission } from '@/authorization'
import { UserService } from '@/services/UserService'
import { hasError, showToast } from '@/utils';
import { translate } from "@/i18n";

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
    IonLabel, 
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
    })
  },
  methods: {
    async getViewQOHConfig() {
      this.currentQOHViewConfig = await UserService.getQOHViewConfig(undefined, this.currentEComStore?.productStoreId) as any;
      if (Object.keys(this.currentQOHViewConfig).length > 0) {
        this.store.dispatch('user/updateViewQOHConfig', this.currentQOHViewConfig.settingValue == "true");
      }  
    },
    async updateViewQOHConfig(config: any, value: any) {
      // Handled initial programmatical update
      // When storing boolean values, it is stored as string. Further comparison needs conversion
      if (config.settingValue === value || (typeof value === 'boolean' && (config.settingValue == 'true') === value)) {
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
    setFacility (event: any) {
      // adding check for this.currentFacility.facilityId as it gets set to undefined on logout
      // but setFacility is called again due to :value="currentFacility.facilityId" in ion-select
      if (this.userProfile && this.currentFacility.facilityId && event.detail.value != this.currentFacility.facilityId ) {
        if (Object.keys(this.uploadProducts).length > 0) {
          this.presentAlertOnFacilityChange(event.detail.value);
        } else {
          this.store.dispatch('user/setFacility', {
            'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == event.detail.value)
          });
          this.currentFacilityId = this.currentFacility.facilityId;
        }
      }
    },
    async presentAlertOnLogout() {
      const alert = await alertController.create({
        header: this.$t('Logout'),
        message: this.$t('The products in the upload list will be removed.'),
        buttons: [{
          text: this.$t('Cancel')
        },
        {
          text: this.$t('Ok'),
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
        header: this.$t('Set facility'),
        message: this.$t('The products in the upload list will be removed.'),
        buttons: [{
          text: this.$t('Cancel'),
          handler: () => {
            this.currentFacilityId = this.currentFacility.facilityId
          }
        },
        {
          text: this.$t('Ok'),
          handler: () => {
            this.store.dispatch('product/clearUploadProducts');
            this.store.dispatch('user/setFacility', {
              'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == facilityId)
            });
            this.currentFacilityId = this.currentFacility.facilityId
          }
        }]
      });
      await alert.present();
    },
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
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
    },
    updateSortBy(event: any) {
      this.store.dispatch('user/updateSortBy', event.detail.value)
    }
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
      router
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
