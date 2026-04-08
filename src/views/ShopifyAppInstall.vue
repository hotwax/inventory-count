<template>
  <ion-page>
    <ion-content>
      <div class="center-div" v-if="!errorMessage">
        <p>{{ translate("Installing...") }}</p>
      </div>
      <div class="center-div">
        <ion-item lines="none" v-if='errorMessage'>
          <ion-icon slot="start" color="warning" :icon="warningOutline" />
          <h4>{{ translate('Login failed') }}</h4>
        </ion-item>
        <p>{{ translate(errorMessage) }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonItem, IonPage, onIonViewDidEnter, onIonViewDidLeave } from "@ionic/vue";
import { ref } from "vue";
import { emitter, useShopify, translate } from "@common";
import router from "@/router";
import { warningOutline } from "ionicons/icons";

const { authorise } = useShopify();
const route = router.currentRoute.value;

const shop = route.query['shop'] as string;
const host = route.query['host'] as string;

const errorMessage = ref('');

onIonViewDidEnter(async () => {
  try {
    errorMessage.value = '';
    emitter.emit("presentLoader");

    if (!shop || !host) {
      throw new Error("Missing shop or host parameters.");
    }

    await authorise(shop, host);
  } catch (error: any) {
    console.error("Error during installation:", error);
    errorMessage.value = "Something went wrong, please contact administrator";
  }
  emitter.emit("dismissLoader");
});

onIonViewDidLeave(() => {
  emitter.emit("dismissLoader");
});

</script>

<style scoped>
.center-div {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
</style>
