<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Select facility") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar/>
    <ion-list>
      <ion-radio-group>
        <ion-item>
          <ion-radio label-placement="end" justify="start">
            <ion-label>
              Facility name
              <p>Facility ID</p>
            </ion-label>
          </ion-radio>
        </ion-item>
        <ion-item>
          <ion-radio label-placement="end" justify="start">
            <ion-label>
              Facility name
              <p>Facility ID</p>
            </ion-label>
          </ion-radio>
        </ion-item>
      </ion-radio-group>
    </ion-list>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button>
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close, saveOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { translate } from '@hotwax/dxp-components'

export default defineComponent({
  name: "DraftSearchFacilityModal",
  components: {
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRadio,
    IonRadioGroup,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  },
  methods: {
    closeModal() {
      modalController.dismiss()
    },
  },  

  setup() {
    const store = useStore();
    return {
      close,
      saveOutline,
      store,
      translate
    };
  }
});
</script>

