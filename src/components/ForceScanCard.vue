<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ translate("settings.forceScan.title") }}</ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <p>{{ translate("settings.forceScan.description1") }}</p>
      <p class="ion-padding-top">{{ translate("settings.forceScan.description2") }}</p>
    </ion-card-content>

    <div v-if="areSettingsLoaded">
      <ion-item lines="none">
        <ion-toggle 
          v-model="forceScan" 
          :disabled="!hasPermission('APP_DRAFT_VIEW')"
        >
          {{ translate("settings.forceScan.requireScanningToggle") }}
        </ion-toggle>
      </ion-item>

      <div v-if="forceScan">
        <ion-item lines="none">
          <ion-toggle 
            v-model="firstScanCount" 
            :disabled="!hasPermission('APP_DRAFT_VIEW')"
          >
            {{ translate("settings.forceScan.countOnFirstScanToggle") }}
          </ion-toggle>
        </ion-item>

        <ion-item lines="none">
          <ion-select
            :label="translate('settings.forceScan.barcodeIdentifierLabel')"
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
    </div>

    <div v-else class="ion-padding-start ion-padding-bottom">
        <ion-text color="medium">
            <p>{{ translate("settings.forceScan.loading") }}</p>
        </ion-text>
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
  IonText,
  IonToggle,
} from "@ionic/vue";
import { computed } from "vue";
import { useStore } from "vuex";
import { translate } from "@/i18n";
import { hasPermission } from "@/authorization";

const store = useStore();

const userSettings = computed(() => store.getters['user/getSetting']);
const areSettingsLoaded = computed(() => !!userSettings.value);

const forceScan = computed({
  get: () => userSettings.value?.['inventory.forceScan'] ?? false,
  set: (value) => store.dispatch('user/updateSetting', { key: 'inventory.forceScan', value }),
});

const firstScanCount = computed({
  get: () => userSettings.value?.['inventory.countOnFirstScan'] ?? false,
  set: (value) => store.dispatch('user/updateSetting', { key: 'inventory.countOnFirstScan', value }),
});

const barcodeIdentifier = computed({
  get: () => userSettings.value?.['inventory.barcodeIdentifier'] ?? 'SKU',
  set: (value) => store.dispatch('user/updateSetting', { key: 'inventory.barcodeIdentifier', value }),
});

const barcodeIdentificationOptions = computed(() => {
  return store.getters['product/getProductIdentificationPref'] ?? [];
});
</script>