<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-list>
        <!-- Select store -->
        <ion-item>
          <ion-icon :icon="storefrontOutline" slot="start" />
          <ion-label>{{$t("Store")}}</ion-label>
          <ion-select interface="popover" :value="currentFacility.facilityId" @ionChange="setFacility($event)">
            <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- OMS information -->
        <ion-item>
          <ion-icon :icon="codeWorkingOutline" slot="start"/>
          <ion-label>{{ $t("OMS") }}</ion-label>
          <ion-label slot="end">{{ instanceUrl }}</ion-label>
        </ion-item>

        <!-- User timezone -->
        <ion-item>
          <ion-icon :icon="timeOutline" slot="start"/>
          <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
          <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ $t("Change") }}</ion-button>
        </ion-item>

        <!-- Profile of user logged in -->
        <ion-item>
          <ion-icon :icon="personCircleOutline" slot="start" />
          <ion-label>{{ userProfile !== null ? userProfile.partyName : '' }}</ion-label>
         <ion-button slot="end" fill="outline" color="dark" @click="logout()">{{ $t("Logout") }}</ion-button>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { alertController, IonButton, IonContent, IonHeader,IonIcon, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, IonList, modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { codeWorkingOutline, ellipsisVertical, personCircleOutline, storefrontOutline, timeOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import TimeZoneModal from '@/views/TimezoneModal.vue';

export default defineComponent({
  name: 'Settings',
  components: {
    IonButton, 
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonLabel, 
    IonPage, 
    IonSelect,
    IonSelectOption,
    IonTitle, 
    IonToolbar,
    IonList
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      uploadProducts: 'product/getUploadProducts',
      instanceUrl: 'user/getInstanceUrl'
    })
  },
  methods: {
    setFacility (facility: any) {
      if (this.userProfile) {
        this.store.dispatch('user/setFacility', {
          'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == facility['detail'].value)
        });
      }
    },
    async presentAlert () {
      const alert = await alertController.create({
        header: this.$t('Logout'),
        message: this.$t('The products in the upload list will be removed.'),
        buttons: [{
          text: this.$t('Cancel')
        }, {
          text: this.$t('Ok'),
          handler: () => {
            this.store.dispatch('product/clearUploadProducts');
            this.store.dispatch('user/logout').then(() => {
              this.router.push('/login');
            })
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
        this.presentAlert();
      } else {
        this.store.dispatch('user/logout').then(() => {
          this.router.push('/login');
        })
      }
    }
  },
  setup(){
    const store = useStore();
    const router = useRouter();

    return {
      timeOutline,
      codeWorkingOutline,
      ellipsisVertical,
      personCircleOutline,
      storefrontOutline,
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
</style>
