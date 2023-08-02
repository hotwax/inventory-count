<template>
  <ion-app>
    <ion-page>
      <ion-content>
        <ion-router-outlet />
      </ion-content>
      <ion-footer v-if="showFooter">
        <ion-toolbar>
          <tab-bar />
        </ion-toolbar>
      </ion-footer>
    </ion-page>
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet, IonPage, IonFooter, IonToolbar, IonContent } from '@ionic/vue';
import { defineComponent, provide, ref } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import TabBar from "./components/TabBar.vue"
import { mapGetters, useStore } from 'vuex';
import { initialise, resetConfig } from '@/adapter'
import { useRouter } from 'vue-router';
import { useProductIdentificationStore } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet,
    IonPage,
    IonFooter,
    IonToolbar,
    TabBar,
    IonContent
  },
  data() {
    return {
      loader: null as any,
      maxAge: process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0
    }
  },
  methods: {
    async presentLoader() {
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: this.$t("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: true
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
    async unauthorised() {
      this.store.dispatch("user/logout");
      this.router.push("/login")
    }
  },
  async mounted() {
    this.loader = await loadingController
      .create({
        message: this.$t("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);

    // Get product identification from api using dxp-component and set the state if eComStore is defined
    if (this.currentEComStore.productStoreId) {
      await useProductIdentificationStore().getIdentificationPref(this.currentEComStore.productStoreId)
        .catch((error) => console.error(error));
    }
  },
  created() {
    initialise({
      token: this.userToken,
      instanceUrl: this.instanceUrl,
      cacheMaxAge: this.maxAge,
      events: {
        unauthorised: this.unauthorised,
        responseError: () => {
          setTimeout(() => this.dismissLoader(), 100);
        },
        queueTask: (payload: any) => {
          emitter.emit("queueTask", payload);
        }
      }
    })
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);

    resetConfig()
  },
  computed: {
    showFooter () {
      if (['/settings', '/search', '/upload'].includes(this.$route.path)) return true
      return false
    },
    ...mapGetters({
      userToken: 'user/getUserToken',
      instanceUrl: 'user/getInstanceUrl',
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    /* Start Product Identifier */

    const productIdentificationStore = useProductIdentificationStore();

    // Reactive state for productIdentificationPref
    let productIdentificationPref = ref(
      productIdentificationStore.$state.productIdentificationPref
    );

    // Providing productIdentificationPref to child components
    provide('productIdentificationPref', productIdentificationPref);

    // Subscribing to productIdentificationStore state change and changing value productIdentificationPref 
    productIdentificationStore.$subscribe((mutation: any, state) => {
        productIdentificationPref.value = state.productIdentificationPref;
    });

    /* End Product Identifier */

    return {
      router,
      store
    }
  }
});
</script>