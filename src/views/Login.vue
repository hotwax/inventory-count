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
import { IonButton, IonContent, IonIcon, IonItem, loadingController } from "@ionic/vue";
import { arrowBackOutline, warningOutline } from 'ionicons/icons'
import { ref, onUnmounted, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { translate } from "@/i18n";
import { createShopifyAppBridge, getSessionTokenFromShopify } from "@/services/utils";
import api from "@/services/RemoteAPI";

const router = useRouter();
const authStore = useAuthStore();
const error = ref({
  message: '',
  responseMessage: ''
})

const isLoggingIn = ref(false);
let loader: any = null;
const route = router.currentRoute.value;

onMounted(async () => {
  console.log("Login view mounted with query params: ", route.query);
  let isEmbedded = authStore.isEmbedded;
  // This will be false for when apps run in browser directly and when user first time comes from Shopify POS or Admin embedded app.
  console.log("Is Embedded from auth store: ", isEmbedded);
  // Cases Handled: 
  // If the app is not embedded and there are no query params, redirect to launchpad
  // If the app is embedded, it will have query params from Shopify, even if the app is not marked as embedded in the auth store, we will mark it as embedded here.
  // In case if the token expired and user is routed to login path, the app was already marked as embedded, so we should not redirect to launchpad in that case.
  if (!isEmbedded && !Object.keys(route.query).length) {
    window.location.replace(process.env.VUE_APP_LOGIN_URL || "");
    return
  }

  const { embedded, shop, host } = route.query
  isEmbedded = isEmbedded || embedded === '1'
  console.log("Is Embedded after checking query params: ", isEmbedded);

  if (isEmbedded) {
    console.log("This is an embedded app user, proceeding with Shopify App Bridge login flow.");
    await appBridgeLogin(shop as string, host as string);
  } else {
    login();
  }
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

async function appBridgeLogin(shop: string, host: string) {
  console.log("This is an embedded app user, proceeding with Shopify App Bridge login flow.");
  // In case where token expired and user is routed login path, the query params will not have shop and host,
  // So we get them from auth store before it is cleared.
  if (!shop) {
    shop = authStore.shop as any
  }
  if (!host) {
    host = authStore.host as any
  }
  if (!shop || !host) {
    console.error("Shop or host is missing, cannot proceed further.");
    error.value.message = "Please contact the administrator.";
    return;
  }
  const loginPayload = {} as any;
  let loginResponse;
  console.log("This is from env: ", JSON.parse(process.env.VUE_APP_SHOPIFY_SHOP_CONFIG as any));
  const maargUrl = JSON.parse(process.env.VUE_APP_SHOPIFY_SHOP_CONFIG || '{}')[shop].maarg;
  let shopifyAppBridge;
  try {
    shopifyAppBridge = await createShopifyAppBridge(shop, host);
    const shopifySessionToken = await getSessionTokenFromShopify(shopifyAppBridge);
    const appState: any = await shopifyAppBridge.getState();

    if (!appState) {
      throw new Error("Couldn't get Shopify App Bridge state, cannot proceed further.");
    }
    // Since the Shopify Admin doesn't provide location and user details,
    // we are using the app state to get the POS location and user details in case of POS Embedded Apps.
    loginPayload.sessionToken = shopifySessionToken;
    if (appState.pos?.location?.id) {
      loginPayload.locationId = appState.pos.location.id
    }
    if (appState.pos?.user?.firstName) {
      loginPayload.firstName = appState.pos.user.firstName;
    }
    if (appState.pos?.user?.lastName) {
      loginPayload.lastName = appState.pos.user.lastName;
    }

    // loginResponse = await loginShopifyAppUser(`${maargUrl}/rest/s1/`, loginPayload);
    loginResponse = await api({
        url: `${maargUrl}/rest/s1/app-bridge/login`,
        method: 'post',
        data: loginPayload
      }
    );

    if (!loginResponse?.data?.token) {
      throw new Error("Login response doesn't have token, cannot proceed further.");
    }

    await authStore.login({
      token: loginResponse?.data.token,
      oms: maargUrl,
      omsRedirectionUrl: loginResponse?.data.omsInstanceUrl,
      expirationTime: loginResponse?.data.expiresAt,
      isEmbedded: true,
      shop: shop,
      host: host,
      shopifyAppBridge: shopifyAppBridge
    });

    router.replace("/");
  } catch (e) {
    console.error("Error ", e);
    error.value.message = "Please contact the administrator.";
    return;
  }
}

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