<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="orders" href="/tabs/count">
          <ion-icon :icon="infiniteOutline" />
          <ion-label>{{ translate("Counts") }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="more" href="/tabs/settings">
          <ion-icon :icon="settingsOutline" />
          <ion-label>{{ translate("Settings") }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonIcon, IonLabel, IonPage, IonTabBar, IonTabButton, IonTabs, IonRouterOutlet } from "@ionic/vue";
import {
  infiniteOutline,
  settingsOutline,
} from "ionicons/icons";
import { translate } from '@/i18n'
</script>

<style scoped>
ion-tab-bar { 
  bottom: 0px;
  width: 100%;
  transition: width .5s ease-in-out, bottom 1s ease-in-out;
}

@media (min-width: 991px) {
  ion-tab-bar {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: var(--spacer-base);
    width: 375px;
    box-shadow: rgb(0 0 0 / 20%) 0px 3px 1px -2px, rgb(0 0 0 / 14%) 0px 2px 2px 0px, rgb(0 0 0 / 12%) 0px 1px 5px 0px; 
    border-radius: 15px;
  }
}
</style>
