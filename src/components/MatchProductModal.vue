<template>
    <ion-header>
      <ion-toolbar>
        <ion-title>Match Product</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeModal">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="stacked">Enter Product ID</ion-label>
        <ion-input
          v-model="productId"
          placeholder="Enter Product ID to match"
          clear-input
        ></ion-input>
      </ion-item>

      <ion-button expand="block" class="ion-margin-top" @click="saveMatchProduct">
        Save
      </ion-button>
    </ion-content>
</template>

<script setup lang="ts">
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonLabel, modalController
} from "@ionic/vue";
import { ref, defineProps, toRaw } from "vue";
import { showToast } from "@/utils";
import { useStore } from "@/store";
import { inventorySyncWorker } from "@/workers/backgroundAggregation";

const props = defineProps<{workEffortId: string; inventoryCountImportId: string; item: any;}>();

const productId = ref("");
const store = useStore();

function closeModal(payload: any = {}) {
  modalController.dismiss(payload);
}

async function saveMatchProduct() {
  if (!productId.value.trim()) {
    showToast('Please enter a Product ID');
    return;
  }

  const omsInfo = store.getters['user/getOmsRedirectionInfo'];
  const context = {
    maargUrl: store.getters['user/getBaseUrl'],
    token: omsInfo?.token,
    omsUrl: omsInfo?.url,
    userLoginId: store.getters['user/getUserProfile']?.username,
  };

  const plainItem = JSON.parse(JSON.stringify(toRaw(props.item)));
  const plainContext = JSON.parse(JSON.stringify(context));

  try {
    const result = await inventorySyncWorker.matchProductLocallyAndSync(
      props.workEffortId,
      props.inventoryCountImportId,
      plainItem,
      productId.value.trim(),
      plainContext
    );

    if (result.success) {
      showToast('Product matched and synced successfully');
      closeModal({ success: true });
    } else {
      showToast('Failed to sync matched product');
    }
  } catch (err) {
    console.error('Modal match error:', err);
    showToast('An error occurred while matching product');
  }
}
</script>