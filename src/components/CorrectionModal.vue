<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Correct Count") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <div class="product-info ion-margin-bottom">
      <ion-item lines="none">
        <ion-thumbnail slot="start">
          <Image :src="product.mainImageUrl || defaultImage" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ useProductMaster().primaryId(product) }}</h2>
          <p>{{ useProductMaster().secondaryId(product) }}</p>
        </ion-label>
      </ion-item>
    </div>

    <ion-item>
      <ion-label position="stacked">{{ translate("Adjustment Quantity") }}</ion-label>
      <ion-input
        type="number"
        v-model.number="adjustment"
        placeholder="0"
        @ionInput="validateAdjustment"
      ></ion-input>
      <ion-note slot="helper">{{ translate("Enter a positive or negative number to adjust the count.") }}</ion-note>
    </ion-item>

    <div class="summary ion-margin-top">
      <ion-item lines="none">
        <ion-label>{{ translate("Current Total") }}</ion-label>
        <ion-note slot="end">{{ currentTotal }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label>{{ translate("Resulting Total") }}</ion-label>
        <ion-note slot="end" :color="resultingTotal < 0 ? 'danger' : 'success'">{{ resultingTotal }}</ion-note>
      </ion-item>
    </div>

    <ion-button expand="block" class="ion-margin-top" @click="confirmAdjustment" :disabled="adjustment === 0">
      {{ translate("Confirm Adjustment") }}
    </ion-button>
  </ion-content>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonNote,
  IonThumbnail,
  modalController
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { translate } from '@/i18n';
import Image from '@/components/Image.vue';
import defaultImage from '@/assets/images/defaultImage.png';
import { useProductMaster } from '@/composables/useProductMaster';

const props = defineProps<{
  product: any;
  currentTotal: number;
}>();

const emit = defineEmits(['confirm']);

const adjustment = ref(0);

const resultingTotal = computed(() => {
  return (props.currentTotal || 0) + (adjustment.value || 0);
});

function validateAdjustment(event: any) {
  // Optional: Add validation logic if needed
}

function closeModal() {
  modalController.dismiss();
}

function confirmAdjustment() {
  modalController.dismiss({
    adjustment: adjustment.value,
    resultingTotal: resultingTotal.value
  });
}
</script>

<style scoped>
.product-info {
  border-bottom: 1px solid var(--ion-color-light);
}
</style>
