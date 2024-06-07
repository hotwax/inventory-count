<template>
  <ion-menu content-id="main-content" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Cycle Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list id="receiving-list">
        <ion-menu-toggle auto-hide="false" v-for="(p, i) in appPages" :key="i">
          <ion-item button router-direction="root" :router-link="p.url" class="hydrated">
            <ion-icon :ios="p.iosIcon" :md="p.mdIcon" slot="start" />
            <ion-label>{{ p.title }}</ion-label>
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
import { defineComponent } from "vue";
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
        title: "Drafts",
        url: "/drafts",
        iosIcon: createOutline,
        mdIcon: createOutline,
      },
      {
        title: "Assigned",
        url: "/assigned",
        iosIcon: storefrontOutline,
        mdIcon: storefrontOutline,
      },
      {
        title: "Pending review",
        url: "/pending-review",
        iosIcon: mailUnreadOutline,
        mdIcon: mailUnreadOutline
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
    ];

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
      translate
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
