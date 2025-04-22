<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Store permissions") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="permission-cards">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate('Quantity on hand') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ translate("Show the current physical quantity expected at locations while counting to help gauge inventory accuracy.") }}</p>
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle :checked="productStoreSettings['showQoh']" @click.prevent="updateProductStoreSetting($event, 'showQoh')">
              {{ translate("Show systemic inventory") }}
            </ion-toggle>
          </ion-item>
        </ion-card>
        <ForceScanCard />
      </div>
    </ion-content> 
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { translate } from '@/i18n'
import store from "@/store";
import { computed } from "vue";
import ForceScanCard from "@/components/ForceScanCard.vue";

const productStoreSettings = computed(() => store.getters["user/getProductStoreSettings"])

onIonViewWillEnter(async () => {
  await store.dispatch("user/getProductStoreSetting")
})

function updateProductStoreSetting(event: any, key: string) {
  event.stopImmediatePropagation();
  store.dispatch("user/setProductStoreSetting", { key, value: !productStoreSettings.value[key] })
}
</script>

<style scoped>
.permission-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(325px, 3fr));
  align-items: start;
}
</style>