<template>
  <ion-app>
    <ion-page>
      <ion-content :fullscreen="true">
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
      this.loader = await loadingController
        .create({
          message: this.$t("Click the backdrop to dismiss."),
          translucent: true,
          backdropDismiss: true
        });
      await this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
      }
    }
  },
  mounted() {
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
  computed: {
    showFooter () {
      if (['/settings', '/count', '/search', '/upload'].includes(this.$route.path)) return true
      return false
    }
  }
});
</script>