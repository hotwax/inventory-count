<template>
  <ion-page>
    <ion-content>
      <div class="center-div" v-if="!errorMessage">
        <p>{{ translate("Logging in...") }}</p>
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
import router from "@/router";
import { emitter, translate, useShopify, useEmbeddedAppStore } from "@common";
import { useAuth } from "@/composables/useAuth";
import { warningOutline } from "ionicons/icons";

const { appBridgeLogin } = useShopify();
const { login } = useAuth();
const embeddedAppStore = useEmbeddedAppStore();

const errorMessage = ref('');

onIonViewDidEnter(async () => {
  try {
    errorMessage.value = '';
    emitter.emit("presentLoader");

    let { shop, host } = router.currentRoute.value.query;

    const success = await appBridgeLogin(shop as string, host as string);
    
    if (success) {
      await login({
        token: embeddedAppStore.token.value,
        oms: embeddedAppStore.oms,
        expirationTime: embeddedAppStore.token.expiration
      });

      router.push("/");
    } else {
      throw new Error("App Bridge Login failed.");
    }
  } catch (error: any) {
    console.error("Error during Shopify view initialization:", error);
    errorMessage.value = "Something went wrong, please contact administrator";
    embeddedAppStore.$reset();
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
