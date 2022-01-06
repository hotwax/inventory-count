<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="flex">
        <form class="login-container" @keyup.enter="login(form)" @submit.prevent="login(form)">
          <img src="../assets/images/hc.png"/>

          <ion-item lines="full">
            <ion-label>{{ $t("OMS") }}</ion-label>
            <ion-input name="instanceUrl" v-model="instanceUrl" id="instanceUrl" type="text" required />
          </ion-item>
          <ion-item lines="full">
            <ion-label>{{ $t("Username") }}</ion-label>
            <ion-input name="username" v-model="username" id="username"  type="text" required />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ $t("Password") }}</ion-label>
            <ion-input name="password" v-model="password" id="password" type="password" required />
          </ion-item>

          <div class="ion-padding">
            <ion-button type="submit" color="primary" fill="outline" expand="block">{{ $t("Login") }}</ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonPage } from "@ionic/vue";
import { defineComponent } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "@/store";
import { mapGetters } from 'vuex';

export default defineComponent({
  name: "Login",
  components: {
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonPage
  },
  data() {
    return {
      username: "",
      password: "",
      instanceUrl: ""
    };
  },
  computed: {
    ...mapGetters({
      currentInstanceUrl: 'user/getInstanceUrl'
    })
  },
  mounted() {
    this.instanceUrl= this.currentInstanceUrl;
  },
  methods: {
    login: function () {
      this.store.dispatch("user/setUserInstanceUrl", this.instanceUrl)
      const { username, password } = this;
      this.store.dispatch("user/login", { username, password }).then((data: any) => {
        if (data.token) {
          this.username = ''
          this.password = ''
          this.$router.push('/')
        }
      })
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    return { router, store };
  }
});
</script>
<style scoped>

.login-container {
  width: 375px;
}

img {
  margin-bottom: 25px;
  padding: 16px;
}

.flex {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

</style>
