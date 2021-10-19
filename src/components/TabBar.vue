<template>
  <ion-page>
    <ion-tabs>
      <ion-tab-bar slot="bottom" ref="tabs">
        <ion-tab-button tab="search" href="/search">
          <ion-icon :icon="search" />
          <ion-label>{{ $t("Search") }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="upload" href="/upload">
          <ion-icon :icon="cloudUpload" />
          <ion-label>{{ $t("Upload") }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/settings">
          <ion-icon :icon="settings" />
          <ion-label>{{ $t("Settings") }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script>
import { defineComponent } from 'vue'
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonPage
} from '@ionic/vue'
import { search, cloudUpload, list, settings } from 'ionicons/icons'

export default defineComponent({
  name: "TabBar",
  components: {
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonPage
  },
  setup() {
    return {
      search,
      cloudUpload,
      list,
      settings
    }
  },
})
</script>
