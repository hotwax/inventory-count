<template>
  <ion-page>
    <Filters menu-id="draft-filter" content-id="draft-filter"/>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" menu="start"/>
        <ion-title>{{ translate("Drafts") }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="draft-filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="draft-filter">
      <main>
        <ion-list class="list">
          <ion-item button detail>
            <ion-label>
              count name
              <p>count id</p>
            </ion-label>
            <ion-note slot="end" color="medium">items</ion-note>
          </ion-item>
          <ion-item button detail>
            <ion-label>
              count name
              <p>count id</p>
            </ion-label>
            <ion-note slot="end" color="medium">items</ion-note>
          </ion-item>
          <ion-item button detail>
            <ion-label>
              count name
              <p>count id</p>
            </ion-label>
            <ion-note slot="end" color="medium">items</ion-note>
          </ion-item>
        </ion-list>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { filterOutline } from 'ionicons/icons';
import { defineComponent } from 'vue'
import { translate } from "@/i18n";
import Filters from "@/components/Filters.vue"

export default defineComponent({
  name: "Draft",
  components: {
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonNote,
    IonPage,
    IonTitle,
    IonToolbar,
    Filters
  },

  setup() {
    return {
      translate,
      filterOutline
    }
  }
})
</script>

<style scoped>
.list {
  padding: 6px 70px 0 70px;
}
ion-note {
  align-self: center;
  padding: 0;
}
</style>