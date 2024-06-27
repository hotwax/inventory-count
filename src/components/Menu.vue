<template>
  <ion-menu content-id="main-content" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list id="receiving-list">
        <ion-menu-toggle auto-hide="false" v-for="(page, index) in appPages" :key="index">
          <ion-item button router-direction="root" :router-link="page.url" class="hydrated" :class="{ selected: selectedIndex === index }">
            <ion-icon :ios="page.iosIcon" :md="page.mdIcon" slot="start" />
            <ion-label>{{ translate(page.title) }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
import {
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
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { useRouter } from "vue-router";
import { createOutline, storefrontOutline, mailUnreadOutline, receiptOutline, shieldCheckmarkOutline , settingsOutline} from "ionicons/icons";
import { translate } from "@/i18n";

export default defineComponent({
  name: "Menu",
  components: {
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonTitle,
    IonLabel,
    IonList,
    IonToolbar,
    IonMenu,
    IonMenuToggle,
  },
  computed: {
    ...mapGetters({
      isUserAuthenticated: 'user/isUserAuthenticated',
      currentFacility: 'user/getCurrentFacility',
    })
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const appPages = [
      {
        title: "Draft",
        url: "/draft",
        iosIcon: createOutline,
        mdIcon: createOutline,
        childRoutes: ["/draft/"]
      },
      {
        title: "Assigned",
        url: "/assigned",
        iosIcon: storefrontOutline,
        mdIcon: storefrontOutline,
        childRoutes: ["/assigned/"]
      },
      {
        title: "Pending review",
        url: "/pending-review",
        iosIcon: mailUnreadOutline,
        mdIcon: mailUnreadOutline,
        childRoutes: ["/pending-review/"]
      },
      {
        title: "Closed",
        url: "/closed",
        iosIcon: receiptOutline,
        mdIcon: receiptOutline,
      },
      {
        title: "Store permissions",
        url: "/store-permissions",
        iosIcon: shieldCheckmarkOutline,
        mdIcon: shieldCheckmarkOutline
      },
      {
        title: "Settings",
        url: "/settings",
        iosIcon: settingsOutline,
        mdIcon: settingsOutline,
      }
    ] as Array<{
      title: string,
      url: string,
      iosIcon: any;
      mdIcon: any;
      childRoutes: Array<string>;
    }>;

    const selectedIndex = computed(() => {
      const path = router.currentRoute.value.path
      return appPages.findIndex((screen) => screen.url === path || screen.childRoutes?.includes(path) || screen.childRoutes?.some((route) => path.includes(route)))
    })

    return {
      appPages,
      createOutline,
      storefrontOutline,
      mailUnreadOutline,
      receiptOutline,
      shieldCheckmarkOutline,
      settingsOutline,
      store,
      router,
      translate,
      selectedIndex
    };
  }
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
