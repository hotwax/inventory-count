<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/closed"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ translate("Export history") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <div class="list-item">
          <ion-item lines="none">
            <ion-icon :icon="documentOutline" slot="start"></ion-icon>
            <ion-label>
              file name
              <p>export log id</p>
            </ion-label>
          </ion-item>

          <ion-label>
            Created date
            <p> {{ translate("Created Date") }} </p>
          </ion-label>
          <ion-label>
            Exported date
            <p> {{ translate("Exported Date") }} </p>
          </ion-label>
          <ion-label>
            User login
            <p> {{ translate("User Login") }} </p>
          </ion-label>

          <ion-button fill="clear" color="medium">
            <ion-icon slot="icon-only" :icon="downloadOutline"></ion-icon>
          </ion-button>
        </div>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton } from '@ionic/vue';
import { translate } from '@/i18n';
import { documentOutline, downloadOutline } from 'ionicons/icons';
</script>

<style scoped>

.list-item {
  --columns-desktop: 5;
  border-bottom : 1px solid var(--ion-color-medium);
}

</style>
