<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ item.productId }}</ion-list-header>
      <ion-item :lines="item.quantity ? 'none' : 'full'">
        <ion-label>{{ translate("Last counted")}}</ion-label>
        <ion-note slot="end">{{ timeFromNow(item.lastCountedDate) }}</ion-note>
      </ion-item>
      <ion-item v-if="!item.quantity" lines="none" button @click="updateItem('remove')">
        <ion-label>{{ translate("Remove from count")}}</ion-label>
        <ion-icon slot="end" :icon="removeCircleOutline"/>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  popoverController
} from "@ionic/vue"
import { removeCircleOutline } from "ionicons/icons";
import { defineProps } from "vue";
import { translate } from "@/i18n"
import { timeFromNow } from "@/utils"

defineProps(["item"])

function updateItem(action: string) {
  popoverController.dismiss({ itemAction: action })
}
</script>