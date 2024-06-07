<template>
  <ion-menu side="end" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-list-header lines="full">
          <ion-label>{{ translate("Facility") }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-icon slot="start" :icon="checkmarkDoneOutline"/>
          <ion-select interface="popover" placeholder="All" :label="translate('Assigned to')">
            <ion-select-option>Facility-1</ion-select-option>
            <ion-select-option>Facility-2</ion-select-option>
            <ion-select-option>Facility-3</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-icon slot="start" :icon="locateOutline"/>
          <ion-checkbox>
            {{ translate("No facility") }}
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
  IonListHeader,
  IonMenu,
  IonSelect,
  IonSelectOption,
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
    IonListHeader,
    IonMenu,
    IonSelect,
    IonSelectOption,
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