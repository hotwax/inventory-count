<template>
  <ion-toolbar>
    <ion-buttons slot="end" @click="closeScanner()" >
      <ion-button >
        <ion-icon :icon="closeOutline" />
      </ion-button>
    </ion-buttons>  
  </ion-toolbar>   
  <div class="scanner">
    <StreamBarcodeReader
      @decode="onDecode"
      @loaded="onLoaded"
    />
  </div> 
</template>

<script>
import { StreamBarcodeReader } from "vue-barcode-reader";
import { IonButton,IonButtons, IonIcon, IonToolbar, modalController } from '@ionic/vue';
import { 
  closeOutline
} from 'ionicons/icons';
export default {
  name: 'Scanner',
  components: {
    IonButton,
    IonButtons,
    IonIcon, 
    IonToolbar,
    StreamBarcodeReader,
  },   
  methods: {
    onDecode (result) {
      modalController.dismiss({dismissed: true}, result);
    },
    closeScanner(){
      modalController.dismiss({dismissed: true});
    }
  },
  setup() {
    return {
      closeOutline
    }
  }
}
</script> 