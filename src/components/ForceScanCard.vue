<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>Force scan</ion-card-title>
    </ion-card-header>

    <ion-card-content>
      Require inventory to be scanned when counting instead of manually entering values.
    </ion-card-content>

    <ion-item lines="none">
      <ion-toggle v-model="forceScan">
        Require barcode scanning
      </ion-toggle>
    </ion-item>

    <div v-if="forceScan">
      <ion-item lines="none">
        <ion-toggle v-model="firstScanCount">
          Count on first scan
        </ion-toggle>
      </ion-item>

      <ion-item lines="none">
        <ion-select
          label="Barcode Identifier"
          v-model="barcodeIdentifier"
          interface="popover"
        >
          <ion-select-option value="SKU">SKU</ion-select-option>
          <ion-select-option value="UPCA">UPCA</ion-select-option>
          <ion-select-option value="EAN">EAN</ion-select-option>
        </ion-select>
      </ion-item>
    </div>
  </ion-card>
</template>

<script setup lang="ts">
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from "@ionic/vue";
import { ref } from "vue";

// local reactive state
const forceScan = ref(true); // Set to true to show the inner controls by default
const firstScanCount = ref(true);
const barcodeIdentifier = ref("SKU"); // Added state for the dropdown
</script>