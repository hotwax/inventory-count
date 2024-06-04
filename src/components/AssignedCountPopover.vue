<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("Primary identifier")}}</ion-list-header>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Variance")}}</ion-label>
        <ion-note slot="end">count pending</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Last counted")}}</ion-label>
        <ion-note slot="end">1 week ago</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">{{ translate("Remove from count")}}</ion-label>
        <ion-icon slot="end" :icon="removeCircleOutline"/>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote
} from '@ionic/vue'
import { removeCircleOutline } from "ionicons/icons";
import { defineComponent } from 'vue';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({  
  name: 'AssignedCountPopover',
  components:{
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
  },

  setup () {
    return {
      translate,
      removeCircleOutline
    }
  }
})
</script>