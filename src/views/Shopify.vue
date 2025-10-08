<template>
  <ion-page>
    <ion-content>
      <div class="center-div">
        <p>{{ $t("Installing...") }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import {
  IonContent,
  IonPage,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";
import { showToast } from "@/utils";
import { useRouter } from "vue-router";
import emitter from "@/event-bus"

export default defineComponent({
  name: "Shopify",
  components: {
    IonContent,
    IonPage,
  },
  data() {
    return {
      apiKey: process.env.VUE_APP_SHOPIFY_API_KEY,
      shopConfigs: JSON.parse(process.env.VUE_APP_SHOPIFY_SHOP_CONFIG),
      shopOrigin: '',
      session: this.$route.query['session'],
      shop: this.$route.query['shop'],
      host: this.$route.query['host'],
      locale: this.$route.query['locale'] || process.env.VUE_APP_I18N_LOCALE || process.env.VUE_APP_I18N_FALLBACK_LOCALE,
    };
  },
  async mounted () {
    const shop = this.shop || this.shopOrigin
    const shopConfig = this.shopConfigs[shop];
    const apiKey = shopConfig ? shopConfig.apiKey : '';
    if (this.shop || this.host) {
      this.authorise(shop, this.host, apiKey);
      this.$router.push("/home");
    } else {
      this.$router.push("/error");
    }
  },
  methods: {
    authorise(shop, host, apiKey) {
      const scopes = process.env.VUE_APP_SHOPIFY_SCOPES
      emitter.emit("presentLoader");
      const shopConfig = this.shopConfigs[shop];
      if (!apiKey) apiKey = shopConfig ? shopConfig.apiKey : '';
      const redirectUri = process.env.VUE_APP_SHOPIFY_REDIRECT_URI;
      const permissionUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`;

      if (window.top == window.self) {
        window.location.assign(permissionUrl);
      } else {
        const app = createApp({
          apiKey,
          host,
        });
        Redirect.create(app).dispatch(Redirect.Action.REMOTE, permissionUrl);
      }
      emitter.emit("dismissLoader");
    }
  },
  beforeUnmount () {
    emitter.emit("dismissLoader")
  },
  setup() {
    const router = useRouter();
    return {
      router,
      showToast,
    };
  },
});
</script>

<style scoped>
.center-div {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
