<template>
  <ion-content>
    <ion-fab vertical="start" horizontal="end">
     <ion-fab-button @click="closeScanner()" size="small" color="medium">
       <ion-icon :icon="closeOutline" />
     </ion-fab-button>
    </ion-fab> 
    <div class="scanner">
      <StreamBarcodeReader
        @decode="onDecode"
        @loaded="onLoaded"
      />
    </div>
  </ion-content>
</template>

<script>
import { StreamBarcodeReader } from "vue-barcode-reader";
import { IonContent, IonFab, IonFabButton, IonIcon, modalController } from '@ionic/vue';
import emitter from "@/event-bus"

import {
  closeOutline
} from 'ionicons/icons';
export default {
  name: 'Scanner',
  components: {
    IonContent,
    IonFab,
    IonFabButton,
    
    IonIcon,
    StreamBarcodeReader,
  },
  methods: {
    onDecode(result) {
      modalController.dismiss({dismissed: true}, result);
    },
    closeScanner() {
      modalController.dismiss({dismissed: true});
      emitter.emit("closeScan");
    }
  },
  setup() {
    return {
      closeOutline
    }
  }
}
</script>