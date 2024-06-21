<template>
  <ion-app>
    <IonSplitPane content-id="main-content" when="lg">
      <!-- <Menu/> -->
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </IonSplitPane>
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { initialise, resetConfig } from '@/adapter'
import store from "./store";
import { translate } from "@/i18n"
import { Settings } from 'luxon'
import Menu from '@/components/Menu.vue';

const userProfile = computed(() => store.getters["user/getUserProfile"])
const userToken = computed(() => store.getters["user/getUserToken"])
const instanceUrl = computed(() => store.getters["user/getInstanceUrl"])

const loader = ref(null) as any
const maxAge = process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0

initialise({
  token: userToken.value,
  instanceUrl: instanceUrl.value,
  cacheMaxAge: maxAge,
  events: {
    responseError: () => {
      setTimeout(() => dismissLoader(), 100);
    },
    queueTask: (payload: any) => {
      emitter.emit("queueTask", payload);
    }
  }
})

async function presentLoader(options = { message: "Click the backdrop to dismiss.", backdropDismiss: true }) {
  // When having a custom message remove already existing loader, if not removed it takes into account the already existing loader
  if(options.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: translate(options.message),
        translucent: true,
        backdropDismiss: options.backdropDismiss
      });
  }
  loader.value.present();
}

function dismissLoader() {
  if (loader.value) {
    loader.value.dismiss();
    loader.value = null as any;
  }
}

onMounted(async () => {
  loader.value = await loadingController
    .create({
      message: translate("Click the backdrop to dismiss."),
      translucent: true,
      backdropDismiss: true
    });
  emitter.on("presentLoader", presentLoader);
  emitter.on("dismissLoader", dismissLoader);

  if (userProfile.value) {
    // Luxon timezone should be set with the user's selected timezone
    userProfile.value.timeZone && (Settings.defaultZone = userProfile.value.timeZone);
  }
})


onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);

  resetConfig()
})
</script>