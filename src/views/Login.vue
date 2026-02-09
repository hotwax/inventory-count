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


<script lang="ts">
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
  loadingController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { hasError } from '@common';
import { useAuth } from "@/composables/useAuth";
import Logo from '@/components/Logo.vue';
import { arrowForwardOutline, gridOutline } from 'ionicons/icons'
import { translate } from "@common";
import { showToast } from "@/services/uiUtils";

export default defineComponent({
  name: "Login",
  components: {
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
    Logo
  },
  data () {
    return {
      username: "",
      password: "",
      instanceUrl: "",
      baseURL: import.meta.env.VITE_VUE_APP_BASE_URL,
      alias: import.meta.env.VITE_VUE_APP_ALIAS ? JSON.parse(import.meta.env.VITE_VUE_APP_ALIAS) : {},
      defaultAlias: import.meta.env.VITE_VUE_APP_DEFAULT_ALIAS,
      showOmsInput: false,
      hideBackground: true,
      isConfirmingForActiveSession: false,
      loader: null as any,
      loginOption: {} as any,
      isCheckingOms: false,
      isLoggingIn: false
    };
  },
  computed: {
    omsInstance() {
      return useAuth().getOMS.value;
    }
  },
  ionViewWillEnter() {
    this.initialise()
  },
  methods: {
    async initialise() {
      const route = useRoute()
      this.hideBackground = true
      await this.presentLoader("Processing");

      if (route.query?.token) {
        // SAML login handling as only token will be returned in the query when login through SAML
        await this.samlLogin()
        this.dismissLoader();
        return
      }

      // fetch login options only if OMS is there as API calls require OMS
      if (useAuth().getOMS.value) {
        await this.fetchLoginOptions()
      }

      // show OMS input if SAML if configured or if query or state does not have OMS
      if (this.loginOption.loginAuthType !== 'BASIC' || route.query?.oms || !useAuth().getOMS.value) {
        this.showOmsInput = true
      }


      // Update OMS input if found in query
      if (route.query?.oms) {
        this.instanceUrl = route.query.oms as string
      }

      // if a session is already active, login directly in the app
      if (useAuth().isAuthenticated.value) {
        this.router.push('/')
      }

      this.instanceUrl = useAuth().oms.value;
      if (useAuth().oms.value) {
        // If the current URL is available in alias show it for consistency
        const currentInstanceUrlAlias = Object.keys(this.alias).find((key) => this.alias[key] === useAuth().oms.value);
        currentInstanceUrlAlias && (this.instanceUrl = currentInstanceUrlAlias);
      }
      // If there is no current preference set the default one
      if (!this.instanceUrl && this.defaultAlias) {
        this.instanceUrl = this.defaultAlias;
      }
      this.dismissLoader();
      this.hideBackground = false
    },
    async presentLoader(message: string) {
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: translate(message),
            translucent: true,
            backdropDismiss: false
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null as any;
      }
    },
    toggleOmsInput() {
      this.showOmsInput = !this.showOmsInput
      // clearing username and password if moved to OMS input
      if (this.showOmsInput) this.username = this.password = ''
    },
    // on pressing Enter after inputting OMS, the form is submitted through the login method
    // handleSubmit will handle the flow based on the input values for OMS, username and password  
    handleSubmit() {
      if (this.instanceUrl.trim() && this.showOmsInput && (!this.username && !this.password)) this.setOms()
      else if (this.instanceUrl) this.login()
    },
    async setOms() {
      if (!this.instanceUrl) {
        showToast(translate('Please fill in the OMS'));
        return
      }

      this.isCheckingOms = true

      const instanceURL = this.instanceUrl.trim().toLowerCase();
      if (!this.baseURL) useAuth().setOMS(this.alias[instanceURL] ? this.alias[instanceURL] : instanceURL);

      // run SAML login flow if login options are configured for the OMS
      await this.fetchLoginOptions()

      // checking loginOption.length to know if fetchLoginOptions API returned data
      // as toggleOmsInput is called twice without this check, from fetchLoginOptions and
      // through setOms (here) again
      if (Object.keys(this.loginOption).length && this.loginOption.loginAuthType !== 'BASIC') {
        window.location.href = `${this.loginOption.loginAuthUrl}?relaystate=${window.location.origin}/login` // passing local login URL
      } else {
        this.toggleOmsInput()
      }
      this.isCheckingOms = false
    },
    async fetchLoginOptions() {
      this.loginOption = {}
      try {
        const resp = await useAuth().checkLoginOptions()
        if (!hasError(resp)) {
          this.loginOption = resp.data
          if(resp.data.maargInstanceUrl) {
             await useAuth().setMaarg(resp.data.maargInstanceUrl)
          }
        }
      } catch (error) {
        console.error(error)
      }
    },
    async login() {
      const { username, password } = this;
      if (!username || !password) {
        showToast(translate('Please fill in the user details'));
        return
      }

      this.isLoggingIn = true;
      try {
        await useAuth().loginWithCredentials(username.trim(), password)
        // All the failure cases are handled in action, if then block is executing, login is successful
        this.username = ''
        this.password = ''
        this.router.push('/')
      } catch (error) {
        console.error(error)
      }
      this.isLoggingIn = false;
    },
    async samlLogin() {
      const route = useRoute()
      try {
        const { token, expirationTime } = route.query as any
        await useAuth().samlLogin(token, expirationTime)
        this.router.push('/')
      } catch (error) {
        this.router.push('/')
        console.error(error)
      }
    }
  },
  setup () {
    const router = useRouter();
    return {
      arrowForwardOutline,
      gridOutline,
      router,
      translate
    };
  }
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