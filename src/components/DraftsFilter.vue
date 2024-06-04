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
          <ion-select interface="popover" placeholder="All">
            <div slot="label">{{ translate("Assigned to") }}</div>
            <ion-select-option>Facility-1</ion-select-option>
            <ion-select-option>Facility-2</ion-select-option>
            <ion-select-option>Facility-3</ion-select-option>
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
  IonCheckbox,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonSelect,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { checkmarkDoneOutline, locateOutline } from "ionicons/icons";
import { translate } from "@/i18n";

export default defineComponent({
  name: "DraftFilters",
  components: {
    IonContent,
    IonCheckbox,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonSelect,
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