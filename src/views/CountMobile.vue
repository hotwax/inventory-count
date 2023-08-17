
<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/"></ion-back-button>
        <ion-title>{{ $t("Count") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <count :sku="$route.params.sku"></count>
    </ion-content>
  </ion-page>
</template>
  
<script lang="ts">
  import {
    IonBackButton,
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar
  } from "@ionic/vue";
  import { defineComponent } from "vue";
  import Count from "@/views/count.vue"
  
  export default defineComponent({
    name: "CountMobileView",
    components: {
      IonBackButton,
      IonContent,
      IonHeader,
      IonPage,
      IonTitle,
      IonToolbar,
      Count
    },
  });
</script>