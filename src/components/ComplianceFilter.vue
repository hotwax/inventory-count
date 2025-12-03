<template>
  <ion-item>
    <ion-select
      v-model="complianceValue"
      :label="complianceLabel"
      placeholder="All"
      interface="popover"
      @ionChange="emitComplianceChange"
    >
      <ion-select-option value="all">{{ translate("All") }}</ion-select-option>
      <ion-select-option value="acceptable">{{ translate("Acceptable") }}</ion-select-option>
      <ion-select-option value="rejectable">{{ translate("Rejectable") }}</ion-select-option>
      <ion-select-option value="configure">{{ translate("Configure threshold") }}</ion-select-option>
    </ion-select>
  </ion-item>

  <ion-modal
    :is-open="isConfigureThresholdModalOpen"
    @did-dismiss="closeConfigureThresholdModal"
    :backdrop-dismiss="false"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeConfigureThresholdModal">
            <ion-icon :icon="closeOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Configure Threshold") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item>
          <ion-select v-model="thresholdUnit" label="Unit of Measurement" interface="popover">
            <ion-select-option value="units">{{ translate("Units") }}</ion-select-option>
            <ion-select-option value="percent">{{ translate("Percent") }}</ion-select-option>
            <ion-select-option value="cost">{{ translate("Cost") }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-input
            v-model.number="thresholdValue"
            type="number"
            inputmode="decimal"
            min="0"
            :label="translate('Threshold Value')"
            label-placement="floating"
          ></ion-input>
        </ion-item>
      </ion-list>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="saveThresholdConfig">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineProps } from 'vue';
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonList, IonModal, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/vue';
import { checkmarkDoneOutline, closeOutline } from 'ionicons/icons';
import { translate } from '@/i18n';
import type { ComplianceFilterOption, ComplianceThresholdConfig, ComplianceThresholdUnit } from '@/composables/useComplianceThreshold';

const props = defineProps<{
  modelValue: ComplianceFilterOption;
  complianceLabel: string;
  thresholdConfig: ComplianceThresholdConfig;
  isConfigureThresholdModalOpen: boolean;
  closeConfigureThresholdModal: () => void;
  saveThresholdConfig: () => void;
}>();

const emit = defineEmits(['update:modelValue', 'update:thresholdConfig', 'compliance-change']);

const complianceValue = computed({
  get: () => props.modelValue,
  set: (value: ComplianceFilterOption) => emit('update:modelValue', value)
});

const thresholdUnit = computed({
  get: () => props.thresholdConfig.unit,
  set: (value: ComplianceThresholdUnit) => emit('update:thresholdConfig', { ...props.thresholdConfig, unit: value })
});

const thresholdValue = computed({
  get: () => props.thresholdConfig.value,
  set: (value: number) => emit('update:thresholdConfig', { ...props.thresholdConfig, value })
});

function emitComplianceChange(event: CustomEvent) {
  emit('compliance-change', event);
}
</script>
