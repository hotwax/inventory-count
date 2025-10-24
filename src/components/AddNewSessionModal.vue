<template>
  <ion-modal :is-open="isOpen" @did-dismiss="closeModal">
        <ion-header>
            <ion-toolbar>
                <ion-title>New Session</ion-title>
            </ion-toolbar>
        </ion-header>
    <ion-content>
        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
            <ion-fab-button @click="addNewSession">
                <ion-icon :icon="saveOutline"/>
            </ion-fab-button>
        </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IonModal, IonIcon, IonFab, IonFabButton, IonContent } from '@ionic/vue';
import { saveOutline } from "ionicons/icons";
import { CountService } from '@/services/CountService';

export default defineComponent({
  name: 'AddNewSessionModal',
  components: { IonContent, IonModal, IonIcon, IonFab, IonFabButton },
  props: {
    isOpen: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update:isOpen'],
  setup(props, { emit }) {
    const closeModal = () => emit('update:isOpen', false);

    function addNewSession() {
        CountService.addSessionInCount({
            countImportName: "Test Count From Modal",
            statusId: "CYCLE_CNT_CREATED",
            uploadedByUserLogin: "hotwax.user",
            facilityAreaId: "Basement Vault 786",
            createdDate: Date.now(),
            dueDate: Date.now(),
            workEffortId: "M100877"
        });
    }

    return { closeModal, saveOutline, addNewSession };
  }
});
</script>
