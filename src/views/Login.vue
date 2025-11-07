<template>
  <ion-page>
    <ion-content>
      <div class="flex">
        <form class="login-container" @keyup.enter="handleSubmit" @submit.prevent>
          <section>
            <ion-item lines="full">
              <ion-input
                :label="$t('Username')"
                label-placement="fixed"
                name="username"
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
                name="password"
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

      <ion-fab @click="router.push('/')" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="medium">
          <ion-icon :icon="gridOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonChip,
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
import { showToast } from "@/utils";

const router = useRouter();
const authStore = useAuthStore();

const username = ref("");
const password = ref("");

const isLoggingIn = ref(false);
let loader: any = null;

onMounted(() => {
  login();
})

// Utility functions
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

const handleSubmit = () => {
  if (!username.value && !password.value) {
    login();
  }
};

const login = async () => {
  const route = router.currentRoute.value;
  console.log("This is current route", route.query);

  if (!route.query && (!username.value || !password.value)) {
    showToast(translate("Please fill in the user details"));
    return;
  }

  isLoggingIn.value = true;
  await presentLoader("Logging in...");
  const { oms, omsRedirectionUrl, token } = route.query;
  try {
    await authStore.login({
      username: username.value.trim() || null,
      password: password.value || null,
      token: token as any || null,
      oms: oms as any || 'https://dev-maarg.hotwax.io',
      omsRedirectionUrl: omsRedirectionUrl as any || 'https://dev-oms.hotwax.io'
    });
    // Successful login
    router.push("/");
  } catch (error) {
    console.error(error);
    showToast(translate("Login failed. Please try again."));
  } finally {
    isLoggingIn.value = false;
    await dismissLoader();
  }
};

// cleanup any active loader when leaving the page
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
