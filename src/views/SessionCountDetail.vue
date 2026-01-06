<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" :default-href="'/count-detail/' + workEffortId" />
        <ion-title>{{ translate("Session") }}</ion-title>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button value="scan">
          <ion-label>{{ translate("SCAN") }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="review">
          <ion-label>{{ translate("REVIEW & SUBMIT") }}</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-header>

    <ion-content>
      <div v-if="activeSegment === 'scan'" key="scan">
        <ion-item lines="none" class="scan-input">
          <ion-label>
            {{ translate("UPCA") }}
            <p>{{ translate("Scan a barcode") }}</p>
          </ion-label>
        </ion-item>

        <ion-button expand="block" color="success" class="scan-button ion-margin">
          <ion-icon slot="start" :icon="barcodeOutline" />
          {{ translate("READY TO SCAN") }}
        </ion-button>

        <ion-list>
          <ion-item>
            <ion-thumbnail slot="start">
              <ion-icon :icon="imageOutline" size="large" />
            </ion-thumbnail>
            <ion-label>
              scanned identifier
              <p>matching...</p>
              <p>5 scans</p>
            </ion-label>
            <ion-note slot="end">30 seconds ago</ion-note>
          </ion-item>

          <ion-item>
            <ion-thumbnail slot="start">
              <img src="https://picsum.photos/40" />
            </ion-thumbnail>
            <ion-label>
              Primary Identifier
              <p>Secondary Identifier</p>
            </ion-label>
            <ion-note slot="end">35 seconds ago</ion-note>
          </ion-item>

          <ion-item>
            <ion-thumbnail slot="start">
              <ion-icon :icon="imageOutline" size="large" />
            </ion-thumbnail>
            <ion-label>
              scanned value
              <p>no match found</p>
              <p>4 scans</p>
            </ion-label>
            <div slot="end" class="ion-text-end">
              <ion-note>2 minutes ago</ion-note>
              <ion-button fill="outline" size="small">{{ translate("MATCH") }}</ion-button>
            </div>
          </ion-item>
        </ion-list>
      </div>

      <div v-else key="review">
        <!-- Review & Submit Content -->
        <ion-list>
          <ion-item>
            <ion-label>{{ translate("Review content goes here") }}</ion-label>
          </ion-item>
        </ion-list>
      </div>

      <ion-modal :is-open="true" :breakpoints="[0.12, 0.5, 1]" :initial-breakpoint="0.12" :backdrop-breakpoint="0.5" handle="true">
        <ion-content>
          <ion-item lines="none">
            <ion-label>
              <p class="overline">{{ translate("SCAN COUNT") }}</p>
            3
            </ion-label>
            <ion-label slot="end" class="ion-text-end">
              <p class="overline">{{ translate("CONFIRMED COUNT") }}</p>
            2
            </ion-label>
          </ion-item>

          <ion-item lines="full" button detail>
            <ion-icon slot="start" :icon="warningOutline" color="danger" />
            <ion-label>3 {{ translate("unmatched") }}</ion-label>
          </ion-item>

          <ion-item-divider color="light">
            <ion-label>{{ translate("Current") }}</ion-label>
          </ion-item-divider>

          <ion-list>
            <ion-item lines="full">
              <ion-label>Location seq id</ion-label>
            </ion-item>
          </ion-list>

          <ion-item-divider color="light">
            <ion-label>{{ translate("Pending") }}</ion-label>
          </ion-item-divider>

          <ion-list>
            <ion-item v-for="n in 3" :key="n" lines="full">
              <ion-label>Location seq id {{ n + 1 }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>

    </ion-content>
    <ion-footer v-if="activeSegment === 'scan'">
      <ion-toolbar>
        <ion-button expand="block" fill="outline" class="ion-margin">
          {{ translate("SCAN NEXT LOCATION") }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonBackButton, 
  IonButton, 
  IonContent, 
  IonFooter, 
  IonHeader, 
  IonIcon, 
  IonItem, 
  IonItemDivider,
  IonLabel, 
  IonList, 
  IonModal,
  IonNote, 
  IonPage, 
  IonSegment, 
  IonSegmentButton, 
  IonThumbnail, 
  IonTitle, 
  IonToolbar,
  onIonViewDidEnter,
  onIonViewDidLeave
} from '@ionic/vue';
import { barcodeOutline, chevronForwardOutline, imageOutline, warningOutline } from 'ionicons/icons';
/* global defineProps */
import { ref } from 'vue';
import { translate } from '@/i18n';

const props = defineProps<{
  workEffortId: string;
  inventoryCountTypeId: string;
  inventoryCountImportId: string;
}>();

const activeSegment = ref('scan');
const isModalOpen = ref(false);

onIonViewDidEnter(() => {
  isModalOpen.value = true;
});

onIonViewDidLeave(() => {
  isModalOpen.value = false;
});
</script>

<style scoped>
.scan-input {
  --inner-padding-top: var(--spacer-base);
  --inner-padding-bottom: var(--spacer-base);
}

ion-item [slot="end"] ion-button {
  display: block;
}

</style>
