<template>
  <ion-modal :is-open="isOpen" @did-dismiss="closeModal">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal" fill="clear" aria-label="Close">
            <ion-icon :icon="closeOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>New session</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
        <ion-item>
          <ion-label position="stacked">Name</ion-label>
          <ion-input v-model="countName" placeholder="category, section, or person"></ion-input>
          <ion-note slot="helper">Add a name to help identify what inventory is counted in this session</ion-note>
        </ion-item>

      <ion-list>
        <ion-list-header>Area</ion-list-header>

        <ion-radio-group v-model="selectedArea">
          <ion-item v-for="area in areas" :key="area.value">
            <ion-radio label-placement="start" :value="area.value">{{ area.label }}</ion-radio>
          </ion-item>
        </ion-radio-group>
      </ion-list>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="addNewSession">
              <ion-icon :icon="checkmarkDoneOutline" />
          </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">

import { defineProps, defineEmits, ref } from 'vue';
import { IonButtons, IonModal, IonIcon, IonFab, IonFabButton, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonList, IonListHeader, IonItem, IonLabel, IonRadioGroup, IonRadio, IonInput, IonNote } from '@ionic/vue';
import { closeOutline, checkmarkDoneOutline } from "ionicons/icons";
import { showToast } from '@/utils';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import store from '@/store';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  workEffortId: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:isOpen']);

const closeModal = () => emit('update:isOpen', false);

async function addNewSession() {
    const resp = await useInventoryCountImport().createSessionOnServer({
        countImportName: countName.value,
        statusId: "SESSION_ASSIGNED",
        uploadedByUserLogin: store.getters["user/getUserProfile"].username,
        facilityAreaId: selectedArea.value,
        createdDate: Date.now(),
        dueDate: Date.now(),
        workEffortId: props.workEffortId
    });

    if (resp?.status !== 200) {
        showToast("Something Went Wrong!");
        console.error(resp);
    } else {
        showToast("Session added Successfully");
    }
    closeModal();
}

// new reactive state for the radio group
const areas = [
  { value: 'back_stock', label: 'Back stock' },
  { value: 'display', label: 'Display' },
  { value: 'floor_wall', label: 'Floor - wall' },
  { value: 'floor_shelf', label: 'Floor - shelf' },
  { value: 'overflow', label: 'Overflow' },
  { value: 'register', label: 'Register' },
];

const selectedArea = ref(areas[0].value);
const countName = ref(''); // <-- store user input

function handleAreaChange(event: any) {
  selectedArea.value = event.detail?.value;
  // you can use selectedArea.value when creating the session
}
</script>