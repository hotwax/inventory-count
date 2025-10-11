<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ translate("Force scan") }}</ion-card-title>
    </ion-card-header>

    <ion-card-content>
      {{ translate("Require inventory to be scanned when counting instead of manually entering values.") }}
    </ion-card-content>

    <ion-item lines="none">
      <ion-toggle 
        v-model="forceScan" 
        :disabled="!hasPermission('APP_DRAFT_VIEW')"
      >
        {{ translate("Require barcode scanning") }}
      </ion-toggle>
    </ion-item>

    <div v-if="forceScan">
      <ion-item lines="none">
        <ion-toggle 
          v-model="firstScanCount" 
          :disabled="!hasPermission('APP_DRAFT_VIEW')"
        >
          {{ translate("Count on first scan") }}
        </ion-toggle>
      </ion-item>

      <ion-item lines="none">
        <ion-select
          :label="translate('Barcode Identifier')"
          v-model="barcodeIdentifier"
          interface="popover"
          :disabled="!hasPermission('APP_DRAFT_VIEW')"
        >
          <ion-select-option 
            v-for="option in barcodeIdentificationOptions" 
            :key="option.id" 
            :value="option.id"
          >
            {{ option.description }}
          </ion-select-option>
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
import { computed } from "vue";
import { useStore } from "vuex";
import { translate } from "@/i18n"; // Re-import for internationalization
import { hasPermission } from "@/authorization"; // Re-import for permission checks

const store = useStore();

// Vuex Integration: Use computed properties with get/set for two-way binding with the store
const forceScan = computed({
  get: () => store.getters['user/getSetting']('inventory.forceScan'),
  set: (value) => store.dispatch('user/updateSetting', { key: 'inventory.forceScan', value }),
});

const firstScanCount = computed({
  get: () => store.getters['user/getSetting']('inventory.countOnFirstScan'),
  set: (value) => store.dispatch('user/updateSetting', { key: 'inventory.countOnFirstScan', value }),
});

const barcodeIdentifier = computed({
  get: () => store.getters['user/getSetting']('inventory.barcodeIdentifier'),
  set: (value) => store.dispatch('user/updateSetting', { key: 'inventory.barcodeIdentifier', value }),
});

// Dynamic Options: Fetch barcode identification options from the product store
const barcodeIdentificationOptions = computed(() => store.getters['product/getProductIdentificationPref']);
</script>