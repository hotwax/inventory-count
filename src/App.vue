<template>
  <ion-app v-if="showMenu" data-testid="app-root">
    <IonSplitPane content-id="main-content" when="lg">
      <ion-menu content-id="main-content" type="overlay" data-testid="app-side-menu">
        <ion-header>
          <ion-toolbar>
            <ion-title data-testid="app-title">{{ translate("Cycle Count") }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list id="receiving-list" data-testid="app-menu-list">
            <ion-menu-toggle
              :auto-hide="false"
              v-for="(page, index) in visibleMenuItems"
              :key="index"
            >
              <ion-item
                button
                router-direction="root"
                :router-link="page.path"
                :class="{ selected: selectedIndex === index }"
                :data-testid="'app-menu-item-' + page.path.substring(1)"
              >
                <ion-icon :ios="page.meta.iosIcon" :md="page.meta.mdIcon" slot="start" />
                <ion-label>{{ translate(page.meta.title || page.name) }}</ion-label>
              </ion-item>
            </ion-menu-toggle>
          </ion-list>
        </ion-content>
      </ion-menu>

      <ion-router-outlet id="main-content" data-testid="app-router-outlet"></ion-router-outlet>
    </IonSplitPane>
  </ion-app>

  <ion-app v-else data-testid="app-root-no-menu">
    <ion-router-outlet id="main-content" data-testid="app-router-outlet"></ion-router-outlet>
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
import { commonUtil, translate, logger, emitter } from "@common";
import { useProductStore } from '@/stores/productStore';
import { Settings } from 'luxon';
import { useUserProfile } from './stores/userProfileStore';
import router from './router';

const userProfile = computed(() => useUserProfile().getUserProfile);
const userToken = commonUtil.getToken();

const excludedPaths = ['/login', '/tabs/', '/session-count-detail/', '/add-hand-counted', '/count-progress-review/'];
const showMenu = computed(() => {
  const fullPath = router.currentRoute.value.fullPath;
  const isExcluded = excludedPaths.some(path => fullPath.includes(path));
  return !isExcluded && useUserProfile().hasPermission('COMMON_ADMIN OR INV_COUNT_ADMIN');
});

const loader = ref(null) as any;

async function presentLoader(options: any = { message: "Click the backdrop to dismiss.", backdropDismiss: true }) {
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
  if (userProfile?.value?.timeZone) {
    Settings.defaultZone = userProfile.value.timeZone;
  }

  if (!!userToken && useProductStore()?.getCurrentProductStore?.productStoreId) {
    await useProductStore()
      .getDxpIdentificationPref(useProductStore().getCurrentProductStore.productStoreId)
      .catch((error: any) => logger.error(error));
  }
});

onUnmounted(() => {
  emitter.off("presentLoader", presentLoader);
  emitter.off("dismissLoader", dismissLoader);
  // resetConfig();
});

const menuOrder = [
  "/bulkUpload",
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
      (route) =>
        route.meta?.showInMenu &&
        (!route.meta.permissionId || useUserProfile().hasPermission(route.meta.permissionId))
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
  return visibleMenuItems.value.findIndex((route) => path.startsWith(route.path));
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
