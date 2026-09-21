<template>
  <ion-modal
    :is-open="isOpen"
    :breakpoints="[0, 1]"
    :initial-breakpoint="1"
    :handle="true"
    ref="sheetModal"
    @didPresent="setFullHeight"
    @didDismiss="close"
    data-testid="pending-item-count-sheet"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Count item") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="close" :aria-label="translate('Close')">{{ translate("Close") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-item lines="none">
        <ion-thumbnail slot="start" v-if="item?.imageUrl">
          <Image :src="item.imageUrl" :key="item.imageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ item?.primary }}</h2>
          <p v-if="item?.secondary">{{ item.secondary }}</p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">{{ translate("Counted quantity") }}</ion-label>
        <ion-input
          :value="quantity"
          ref="quantityInput"
          autofocus
          type="number"
          min="1"
          inputmode="numeric"
          @ionInput="quantity = $event.detail.value"
          data-testid="pending-item-count-sheet-input"
        />
      </ion-item>

      <ion-item
        v-if="canViewQuantityOnHand && item?.quantityOnHand !== undefined && item.quantityOnHand !== null"
        lines="none"
        data-testid="pending-item-count-sheet-qoh"
      >
        <ion-label>{{ translate("Current quantity on hand") }}</ion-label>
        <ion-note slot="end">{{ item.quantityOnHand }} {{ translate("Units") }}</ion-note>
      </ion-item>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button color="medium" @click="close">{{ translate("Cancel") }}</ion-button>
          <ion-button :disabled="!isQuantityValid || isSaving" @click="save" data-testid="pending-item-count-sheet-save-btn">
            {{ translate("Save") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonItem, IonLabel, IonInput, IonNote, IonThumbnail } from '@ionic/vue';
import { computed, nextTick, ref, watch } from 'vue';
import { translate } from '@common';
import Image from '@/components/Image.vue';

export interface PendingItemCountSheetItem {
  primary: string;
  secondary?: string;
  imageUrl?: string;
  productIdentifier: string;
  quantityOnHand?: number | null;
}

const props = withDefaults(defineProps<{
  isOpen: boolean;
  item: PendingItemCountSheetItem | null;
  canViewQuantityOnHand?: boolean;
  saveCount?: ((item: PendingItemCountSheetItem, quantity: number) => Promise<boolean>) | null;
}>(), {
  canViewQuantityOnHand: false,
  saveCount: null,
});

const emit = defineEmits<{ (e: 'close'): void }>();
const sheetModal = ref<any>(null);
const quantityInput = ref<any>(null);
const quantity = ref('1');
const isSaving = ref(false);
const isQuantityValid = computed(() => Number.isFinite(Number(quantity.value)) && Number(quantity.value) > 0);

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) quantity.value = '1';
});

function close() {
  if (isSaving.value) return;
  emit('close');
}

async function setFullHeight() {
  const modal = sheetModal.value?.$el || sheetModal.value;
  await modal?.setCurrentBreakpoint?.(1);
  await nextTick();
  const input = quantityInput.value?.$el || quantityInput.value;
  await input?.setFocus?.();
}

async function save() {
  if (!props.item || !props.saveCount || !isQuantityValid.value || isSaving.value) return;

  isSaving.value = true;
  try {
    const saved = await props.saveCount(props.item, Number(quantity.value));
    if (saved) emit('close');
  } finally {
    isSaving.value = false;
  }
}
</script>
