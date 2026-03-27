<template>
  <ion-page>
    <ion-content>
      <div class="flex" v-if="!hideBackground && !isConfirmingForActiveSession">
        <form class="login-container" @keyup.enter="handleSubmit()" @submit.prevent>
          <Logo />
          <section v-if="showOmsInput">
            <ion-item lines="full">
              <ion-input :label="translate('OMS')" label-placement="fixed" name="instanceUrl" v-model="instanceUrl" id="instanceUrl" type="text" required />
            </ion-item>

            <div class="ion-padding">
              <!-- @keyup.enter.stop to stop the form from submitting on enter press as keyup.enter is already bound
              through the form above, causing both the form and the button to submit. -->
              <ion-button color="primary" expand="block" @click.prevent="isCheckingOms ? '' : setOms()" @keyup.enter.stop>
                {{ translate("Next") }}
                <ion-spinner v-if="isCheckingOms" name="crescent" slot="end" />
                <ion-icon v-else slot="end" :icon="arrowForwardOutline" />
              </ion-button>
            </div>
          </section>

          <section v-else>
            <div class="ion-text-center ion-margin-bottom">
              <ion-chip :outline="true" @click="toggleOmsInput()">
                {{ omsInstance }}
              </ion-chip>
            </div>

            <ion-item lines="full">
              <ion-input :label="translate('Username')" label-placement="fixed" name="username" v-model="username" id="username"  type="text" required />
            </ion-item>
            <ion-item lines="none">
              <ion-input :label="translate('Password')" label-placement="fixed" name="password" v-model="password" id="password" type="password" required />
            </ion-item>

            <div class="ion-padding">
              <ion-button color="primary" expand="block" @click="isLoggingIn ? '' : login()">
                {{ translate("Login") }}
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
  onIonViewWillEnter
} from "@ionic/vue";
import { ref, computed } from "vue";
import { commonUtil } from '@common';
import { useAuth } from "@/composables/useAuth";
import Logo from '@/components/Logo.vue';
import { arrowForwardOutline, gridOutline } from 'ionicons/icons'
import { translate } from "@common";
import { showToast } from "@/services/uiUtils";
import router from "@/router";

const route = router.currentRoute.value
const username = ref("");
const password = ref("");
const instanceUrl = ref("");
const baseURL = import.meta.env.VITE_VUE_APP_BASE_URL;
const alias = import.meta.env.VITE_VUE_APP_ALIAS ? JSON.parse(import.meta.env.VITE_VUE_APP_ALIAS) : {};
const defaultAlias = import.meta.env.VITE_VUE_APP_DEFAULT_ALIAS;
const showOmsInput = ref(false);
const hideBackground = ref(true);
const isConfirmingForActiveSession = ref(false);
const loader = ref<any>(null);
const loginOption = ref<any>({});
const isCheckingOms = ref(false);
const isLoggingIn = ref(false);

const omsInstance = computed(() => useAuth().getOMS.value);

const presentLoader = async (message: string) => {
  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: translate(message),
        translucent: true,
        backdropDismiss: false
      });
  }
  loader.value.present();
};

const dismissLoader = () => {
  if (loader.value) {
    loader.value.dismiss();
    loader.value = null;
  }
};

const toggleOmsInput = () => {
  showOmsInput.value = !showOmsInput.value;
  if (showOmsInput.value) {
    username.value = '';
    password.value = '';
  }
};

const fetchLoginOptions = async () => {
  loginOption.value = {};
  try {
    const resp = await useAuth().checkLoginOptions();
    if (!commonUtil.hasError(resp)) {
      loginOption.value = resp.data;
      if (resp.data.maargInstanceUrl) {
        await useAuth().setMaarg(resp.data.maargInstanceUrl);
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const setOms = async () => {
  if (!instanceUrl.value) {
    showToast(translate('Please fill in the OMS'));
    return;
  }

  isCheckingOms.value = true;

  const inputURL = instanceUrl.value.trim().toLowerCase();
  if (!baseURL) {
    useAuth().setOMS(alias[inputURL] ? alias[inputURL] : inputURL);
  }

  await fetchLoginOptions();

  if (Object.keys(loginOption.value).length && loginOption.value.loginAuthType !== 'BASIC') {
    window.location.href = `${loginOption.value.loginAuthUrl}?relaystate=${window.location.origin}/login`;
  } else {
    toggleOmsInput();
  }
  isCheckingOms.value = false;
};

const samlLogin = async () => {
  try {
    const { token, expirationTime } = route.query as any;
    await useAuth().samlLogin(token, expirationTime);
    router.push('/');
  } catch (error) {
    router.push('/');
    console.error(error);
  }
};

const login = async () => {
  if (!username.value || !password.value) {
    showToast(translate('Please fill in the user details'));
    return;
  }

  isLoggingIn.value = true;
  try {
    await useAuth().loginWithCredentials(username.value.trim(), password.value);
    username.value = '';
    password.value = '';
    router.push('/');
  } catch (error) {
    console.error(error);
  }
  isLoggingIn.value = false;
};

const handleSubmit = () => {
  if (instanceUrl.value.trim() && showOmsInput.value && (!username.value && !password.value)) {
    setOms();
  } else if (instanceUrl.value) {
    login();
  }
};

const initialise = async () => {
  hideBackground.value = true;
  await presentLoader("Processing");

  if (route.query?.token) {
    await samlLogin();
    dismissLoader();
    return;
  }

  if (useAuth().getOMS.value) {
    await fetchLoginOptions();
  }

  if (loginOption.value.loginAuthType !== 'BASIC' || route.query?.oms || !useAuth().getOMS.value) {
    showOmsInput.value = true;
  }

  if (route.query?.oms) {
    instanceUrl.value = route.query.oms as string;
  }

  if (useAuth().isAuthenticated.value) {
    router.push('/');
  }

  instanceUrl.value = useAuth().oms.value;
  if (useAuth().oms.value) {
    const currentInstanceUrlAlias = Object.keys(alias).find((key) => alias[key] === useAuth().oms.value);
    currentInstanceUrlAlias && (instanceUrl.value = currentInstanceUrlAlias);
  }

  if (!instanceUrl.value && defaultAlias) {
    instanceUrl.value = defaultAlias;
  }
  dismissLoader();
  hideBackground.value = false;
};

onIonViewWillEnter(() => {
  initialise();
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