<template>
  <ion-app v-if="showMenu">
    <IonSplitPane content-id="main-content" when="lg">
      <ion-menu content-id="main-content" type="overlay">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ translate("Cycle Count") }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list id="receiving-list">
            <ion-menu-toggle
              auto-hide="false"
              v-for="(page, index) in visibleMenuItems"
              :key="index"
            >
              <ion-item
                button
                router-direction="root"
                :router-link="page.path"
                :class="{ selected: selectedIndex === index }"
              >
                <ion-icon :ios="page.meta.iosIcon" :md="page.meta.mdIcon" slot="start" />
                <ion-label>{{ translate(page.meta.title || page.name) }}</ion-label>
              </ion-item>
            </ion-menu-toggle>
          </ion-list>
        </ion-content>
      </ion-menu>

      <ion-router-outlet id="main-content"></ion-router-outlet>
    </IonSplitPane>
  </ion-app>

  <ion-app v-else>
    <ion-router-outlet id="main-content"></ion-router-outlet>
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonRouterOutlet,
  IonSplitPane,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  IonMenu,
  IonMenuToggle,
  loadingController
} from '@ionic/vue';
import { computed, onBeforeMount, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import emitter from "@/event-bus";
import { initialise, resetConfig } from '@/services/RemoteAPI';
import store from "./store";
import { translate } from "@/i18n";
import { Actions, hasPermission } from '@/authorization';
import { getProductStoreId } from './utils';
import logger from './logger';
import { useProductIdentificationStore } from '@hotwax/dxp-components';
import { Settings } from 'luxon';

const router = useRouter();
const userProfile = computed(() => store.getters["user/getUserProfile"]);
const userToken = computed(() => store.getters["user/getUserToken"]);
const instanceUrl = computed(() => store.getters["user/getInstanceUrl"]);

const excludedPaths = ['/login', '/tabs/', '/session-count-detail/', '/add-pre-counted'];
const showMenu = computed(() => {
  const fullPath = router.currentRoute.value.fullPath;
  const isExcluded = excludedPaths.some(path => fullPath.includes(path));
  return !isExcluded && hasPermission(Actions.APP_DRAFT_VIEW);
});

const loader = ref(null) as any;

async function presentLoader(options = { message: "Click the backdrop to dismiss.", backdropDismiss: true }) {
  if (options.message && loader.value) dismissLoader();
  if (!loader.value) {
    loader.value = await loadingController.create({
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
});

onMounted(async () => {
  if (userProfile.value?.timeZone) {
    Settings.defaultZone = userProfile.value.timeZone;
  }

  if (userToken.value && getProductStoreId()) {
    await useProductIdentificationStore()
      .getIdentificationPref(getProductStoreId())
      .catch((error: any) => logger.error(error));
  }
});

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);
  resetConfig();
});

initialise({
  token: userToken.value,
  instanceUrl: instanceUrl.value.replace("inventory-cycle-count/", ""),
  events: {
    responseError: () => setTimeout(() => dismissLoader(), 100),
    queueTask: (payload: any) => emitter.emit("queueTask", payload)
  },
  systemType: "MOQUI"
});

const menuOrder = [
  "/bulkUpload",
  "/draft",
  "/assigned",
  "/pending-review",
  "/closed",
  "/store-permissions",
  "/settings",
];

const visibleMenuItems = computed(() => {
  const allVisible = router
    .getRoutes()
    .filter(
      (r) =>
        r.meta?.showInMenu &&
        (!r.meta.permissionId || hasPermission(r.meta.permissionId))
    );

  return allVisible.sort((a, b) => {
    const aIndex = menuOrder.indexOf(a.path);
    const bIndex = menuOrder.indexOf(b.path);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
});

const selectedIndex = computed(() => {
  const path = router.currentRoute.value.path;
  return visibleMenuItems.value.findIndex((r) => path.startsWith(r.path));
});
</script>

<style scoped>
ion-item.selected ion-icon {
  color: var(--ion-color-secondary);
}
ion-item.selected {
  --color: var(--ion-color-secondary);
}
</style>
