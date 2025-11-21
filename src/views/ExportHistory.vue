<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/closed"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ translate("Export History") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/vue';
import { translate } from '@/i18n';
</script>
