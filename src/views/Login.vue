<template>
  <ion-page>
    <ion-content>
      <div class="flex">
        <form class="login-container" @submit.prevent="handleSubmit">
          <section>
            <ion-item lines="full">
              <ion-input
                :label="$t('Username')"
                label-placement="fixed"
                v-model="username"
                id="username"
                type="text"
                required
              />
            </ion-item>

            <ion-item lines="none">
              <ion-input
                :label="$t('Password')"
                label-placement="fixed"
                v-model="password"
                id="password"
                type="password"
                required
              />
            </ion-item>

            <div class="ion-padding">
              <ion-button
                color="primary"
                expand="block"
                :disabled="isLoggingIn"
                @click="login"
              >
                {{ $t('Login') }}
                <ion-spinner v-if="isLoggingIn" slot="end" name="crescent" />
                <ion-icon v-else slot="end" :icon="arrowForwardOutline" />
              </ion-button>
            </div>
          </section>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonSpinner,
  loadingController,
} from "@ionic/vue";
import { ref, onUnmounted, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { arrowForwardOutline, gridOutline } from "ionicons/icons";
import { translate } from "@/i18n";
import { showToast } from "@/services/uiUtils";

const router = useRouter();
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
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

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    showToast(translate("Please fill in the user details"));
    return;
  }
  await login();
};

const login = async () => {
  const route = router.currentRoute.value;
  const { oms, omsRedirectionUrl, token } = route.query;

  try {
    isLoggingIn.value = true;
    await presentLoader("Logging in...");

    await authStore.login({
      username: username.value.trim() || null,
      password: password.value || null,
      token: token as string | null,
      oms: (oms as string) || "",
      omsRedirectionUrl:
        (omsRedirectionUrl as string) || "",
    });

    router.replace("/");
  } catch (error) {
    console.error("[Login Error]", error);
    showToast(translate("Login failed. Please try again."));
    window.location.href = process.env.VUE_APP_LOGIN_URL || "";
  } finally {
    isLoggingIn.value = false;
    await dismissLoader();
  }
};

onUnmounted(() => {
  dismissLoader();
});
</script>

<style scoped>
.login-container {
  width: 375px;
}

.flex {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>