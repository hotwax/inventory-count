<template>
  <ion-menu side="end" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item lines="full">
          <ion-label class="ion-text-wrap">
            <p>{{ translate("Facility") }}</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-icon slot="start" :icon="checkmarkDoneOutline"/>
          <ion-select placeholder="All">
            <div slot="label">Assigned to</div>
          </ion-select>
        </ion-item>
        <ion-item button>
          <ion-icon slot="start" :icon="locateOutline"/>
          <ion-checkbox>
            <ion-label>{{ translate("No facility") }}</ion-label>
          </ion-checkbox>
        </ion-item>
      </ion-list>
    </ion-content> 
  </ion-menu>
</template>

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { checkmarkDoneOutline, locateOutline } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "TransferOrderFilters",
  components: {
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonTitle,
    IonToolbar
  },

  setup() {    
    return {
      checkmarkDoneOutline,
      locateOutline,
      translate
    };
  },
});
</script>