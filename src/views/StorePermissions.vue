<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Store permissions") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section class="permission-cards">
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                {{ translate('Quantity on hand') }}
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ translate("Show the current physical quantity expected at locations while counting to help gauge inventory accuracy.") }}</p>
            </ion-card-content>
            <ion-item lines="none">
              <ion-toggle>
                {{ translate("Show systemic inventory") }}
              </ion-toggle>
            </ion-item>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                {{ translate('Force scan') }}
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ translate("Require inventory to be scanned when counting instead of manually entering values.") }}</p>
            </ion-card-content>
            <ion-item lines="none">
              <ion-toggle>
                {{ translate("Require barcode scanning") }}
              </ion-toggle>
            </ion-item>
          </ion-card>
        </section>
      </main>
    </ion-content> 
  </ion-page>
</template>

<script lang="ts">
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { translate } from '@/i18n'

export default defineComponent({
  name: "StorePermissions",
  components: {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonItem,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar
  },

  setup() {    
    return {
      translate
    };
  },
});
</script>

<style scoped>
.permission-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(325px, 3fr));
  align-items: start;
}

</style>