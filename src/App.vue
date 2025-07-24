<template>
  <ion-app v-if="!$router.currentRoute.value.fullPath.includes('/login') && !$router.currentRoute.value.fullPath.includes('/tabs/') && hasPermission(Actions.APP_DRAFT_VIEW)">
    <IonSplitPane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </IonSplitPane>
  </ion-app>
  <ion-app v-else>
    <ion-router-outlet id="main-content"></ion-router-outlet>
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { initialise, resetConfig } from '@/adapter'
import store from "./store";
import { translate } from "@/i18n"
import { Settings } from 'luxon'
import Menu from '@/components/Menu.vue';
import { Actions, hasPermission } from '@/authorization'
import { getProductStoreId } from './utils';
import logger from './logger';
import { useProductIdentificationStore } from '@hotwax/dxp-components';

const userProfile = computed(() => store.getters["user/getUserProfile"])
const userToken = computed(() => store.getters["user/getUserToken"])
const instanceUrl = computed(() => store.getters["user/getInstanceUrl"])
const isEmbedded = computed(() => store.getters["user/isEmbedded"])

const loader = ref(null) as any

initialise({
  token: userToken.value,
  instanceUrl: instanceUrl.value.replace("inventory-cycle-count/", ""), // TODO: remove component replace logic once we start storing the oms url in state without component name
  events: {
    responseError: () => {
      setTimeout(() => dismissLoader(), 100);
    },
    queueTask: (payload: any) => {
      emitter.emit("queueTask", payload);
    }
  },
  systemType: "MOQUI"
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

onBeforeMount(() => {
  emitter.on("presentLoader", presentLoader);
  emitter.on("dismissLoader", dismissLoader);
})

onMounted(async () => {
  if (userProfile.value) {
    // Luxon timezone should be set with the user's selected timezone
    userProfile.value.timeZone && (Settings.defaultZone = userProfile.value.timeZone);
  }

  if(userToken.value && getProductStoreId()) {
    // Get product identification from api using dxp-component
    await useProductIdentificationStore().getIdentificationPref(getProductStoreId())
      .catch((error: any) => logger.error(error));
  }
})


onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);

  resetConfig()
})
</script>