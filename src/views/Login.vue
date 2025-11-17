<template>
  <ion-content>
    <div class="center-div">
      <ion-item lines="none" v-if='error.message.length'>
        <ion-icon slot="start" color="warning" :icon="warningOutline" />
        <h4>{{ $t('Login failed') }}</h4>
      </ion-item>
      <p v-if='error.responseMessage.length'>
        {{ $t('Reason:') }} {{ $t(error.responseMessage) }}
      </p>
      <p v-if='error.message.length'>
        {{ $t(error.message) }}
      </p>
      <ion-button v-if='error.message.length' class="ion-margin-top" @click="goToLaunchpad()">
        <ion-icon slot="start" :icon="arrowBackOutline" />
        {{ $t("Back to Launchpad") }}
      </ion-button>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, loadingController } from "@ionic/vue";
import { arrowBackOutline, warningOutline } from 'ionicons/icons'
import { ref, onUnmounted, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { translate } from "@/i18n";

const router = useRouter();
const authStore = useAuthStore();
const error = ref({
  message: '',
  responseMessage: ''
})

const isLoggingIn = ref(false);
let loader: any = null;

onMounted(() => {
  login();
})

const presentLoader = async (message: string) => {
  if (!loader) {
    loader = await loadingController.create({
      message: translate(message),
      translucent: true,
      backdropDismiss: false,
    });
  }
  await loader.present();
};

const dismissLoader = async () => {
  if (loader) {
    await loader.dismiss();
    loader = null;
  }
};

const login = async () => {
  const route = router.currentRoute.value;
  const { oms, omsRedirectionUrl, token, expirationTime } = route.query;

  try {
    isLoggingIn.value = true;
    await presentLoader("Logging in...");

    await authStore.login({
      token: token,
      oms: oms,
      omsRedirectionUrl: omsRedirectionUrl,
      expirationTime: expirationTime
    });

    router.replace("/");
  } catch (err) {
    console.error("[Login Error]", err);
    error.value.message = 'Please contact the administrator.'
    error.value.responseMessage = `${err}` || '';
  } finally {
    isLoggingIn.value = false;
    await dismissLoader();
  }
};

function goToLaunchpad() {
  window.location.replace(process.env.VUE_APP_LOGIN_URL || "");
}

onUnmounted(() => {
  dismissLoader();
});
</script>
<style>
.center-div {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>