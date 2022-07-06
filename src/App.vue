<template>
  <ion-app>
    <ion-page>
      <ion-content>
        <ion-router-outlet />
      </ion-content>
      <ion-footer v-if="showFooter">
        <ion-toolbar>
          <tab-bar />
        </ion-toolbar>
      </ion-footer>
    </ion-page>
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet, IonPage, IonFooter, IonToolbar, IonContent } from '@ionic/vue';
import { defineComponent } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import TabBar from "./components/TabBar.vue"
import { mapGetters } from 'vuex';
import { Settings } from 'luxon';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet,
    IonPage,
    IonFooter,
    IonToolbar,
    TabBar,
    IonContent
  },
  data() {
    return {
      loader: null as any
    }
  },
  methods: {
    async presentLoader() {
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: this.$t("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: true
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null as any;
      }
    }
  },
  async mounted() {
    this.loader = await loadingController
      .create({
        message: this.$t("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
    // Handles case when user resumes or reloads the app
    // Luxon timezzone should be set with the user's selected timezone
    if (this.userProfile && this.userProfile.userTimeZone) {
      Settings.defaultZone = this.userProfile.userTimeZone;
    }
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
  computed: {
    showFooter () {
      if (['/settings', '/search', '/upload'].includes(this.$route.path)) return true
      return false
    },
    ...mapGetters({
      userProfile: 'user/getUserProfile',
    })
  }
});
</script>