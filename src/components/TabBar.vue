<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom" ref="tabs">
        <ion-tab-button v-if="hasPermission(Actions.APP_SEARCH_VIEW)" tab="search" href="/tabs/search">
          <ion-icon :icon="search" />
          <ion-label>{{ $t("Search") }}</ion-label>
        </ion-tab-button>
        <ion-tab-button v-if="hasPermission(Actions.APP_UPLOAD_VIEW)" tab="upload" href="/tabs/upload">
          <ion-icon :icon="cloudUpload" />
          <ion-label>{{ $t("Upload") }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/tabs/settings">
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
  IonPage,
  IonRouterOutlet
} from '@ionic/vue'
import { search, cloudUpload, list, settings } from 'ionicons/icons'
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: "TabBar",
  components: {
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonPage, IonRouterOutlet
  },
  setup() {
    return {
      Actions,
      hasPermission,
      search,
      cloudUpload,
      list,
      settings
    }
  },
})
</script>
