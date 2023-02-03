<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="end" @click="closeScanner()" >
        <ion-button>
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <div class="scanner">
      <StreamBarcodeReader
        @decode="onDecode"
      />
    </div>
  </ion-content>
</template>

<script>
import { StreamBarcodeReader } from "vue-barcode-reader";
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonToolbar, modalController } from '@ionic/vue';
import {
  closeOutline
} from 'ionicons/icons';
import { showToast } from "@/utils";
import { translate } from '@/i18n'

export default {
  name: 'Scanner',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon, 
    IonToolbar,
    StreamBarcodeReader,
  },
  async mounted() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
      showToast(translate("Camera permission denied."));
    }
  },
  methods: {
    onDecode(result) {
      modalController.dismiss({dismissed: true}, result);
    },
    closeScanner() {
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