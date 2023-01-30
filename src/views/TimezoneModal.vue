<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Select time zone") }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="$t('Search time zones')"  v-model="queryString" @keyup.enter="queryString = $event.target.value; findTimeZone()" @keydown="preventSpecialCharacters($event)" />
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <!-- Empty state -->
    <div class="empty-state" v-if="filteredTimeZones.length === 0">
      <p>{{ $t("No time zone found")}}</p>
    </div>

    <!-- Timezones -->
    <div v-else>
      <ion-list>
        <ion-radio-group value="rd" v-model="timeZoneId">
          <ion-item :key="timeZone.id" v-for="timeZone in filteredTimeZones">
            <ion-label>{{ timeZone.label }} ({{ timeZone.id }})</ion-label>
            <ion-radio :value="timeZone.id" slot="start" />
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </div>
    
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="!timeZoneId" @click="saveAlert">
        <ion-icon :icon="save" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonItem,
  IonIcon,
  IonLabel,
  IonList,
  IonRadioGroup,
  IonRadio,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController,
  alertController } from "@ionic/vue";
import { defineComponent } from "vue";
import { close, save } from "ionicons/icons";
import { useStore } from "@/store";
import { UserService } from "@/services/UserService";
import { hasError } from '@/utils'
import { DateTime } from 'luxon';

export default defineComponent({
  name: "TimeZoneModal",
  components: { 
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRadioGroup,
    IonRadio,
    IonSearchbar,
    IonTitle,
    IonToolbar 
  },
  data() {
    return {
      queryString: '',
      filteredTimeZones: [],
      timeZones: [],
      timeZoneId: ''
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async saveAlert() {
      const message = this.$t("Are you sure you want to change the time zone to?", { timeZoneId: this.timeZoneId });
      const alert = await alertController.create({
        header: this.$t("Update time zone"),
        message,
        buttons: [
          {
            text: this.$t("Cancel"),
          },
          {
            text: this.$t("Confirm"),
            handler: () => {
              this.setUserTimeZone();
            }
          }
        ],
      });
      return alert.present();
    },
    preventSpecialCharacters($event: any) {
      // Searching special characters fails the API, hence, they must be omitted
      if(/[`!@#$%^&*()_+\-=\\|,.<>?~]/.test($event.key)) $event.preventDefault();
    },
    findTimeZone() { 
      const queryString = this.queryString.toLowerCase();
      this.filteredTimeZones = this.timeZones.filter((timeZone: any) => {
        return timeZone.id.toLowerCase().match(queryString) || timeZone.label.toLowerCase().match(queryString);
      });
    },
    async getAvailableTimeZones() {
      const resp = await UserService.getAvailableTimeZones()
      if(resp.status === 200 && !hasError(resp)) {
        // We are filtering valid the timeZones coming with response here
        this.timeZones = resp.data.filter((timeZone: any) => {
          return DateTime.local().setZone(timeZone.id).isValid;
        });
        this.findTimeZone();
      }
    },
    async selectSearchBarText(event: any) {
      const element = await event.target.getInputElement()
      element.select();
    },
    async setUserTimeZone() {
      await this.store.dispatch("user/setUserTimeZone", {
        "timeZoneId": this.timeZoneId
      })
      this.closeModal()
    }
  },
  beforeMount () {
    this.getAvailableTimeZones();
  },
  setup() {
    const store = useStore();
    return {
      close,
      save,
      store
    };
  }
});
</script>