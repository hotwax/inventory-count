<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleClose" @didPresent="initializeModal">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="handleClose">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate(title || 'Select Facilities') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="clearAll" :disabled="selectedIds.length === 0">{{ translate("Clear all") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-searchbar
        @ionFocus="selectSearchBarText($event)"
        :placeholder="translate('Search facilities')"
        v-model="queryString"
        @ionInput="findFacility()"
      />
      <ion-list>
        <div class="empty-state" v-if="!filteredFacilities.length">
          <p>{{ translate("No facilities found") }}</p>
        </div>
        <div v-else>
          <ion-item v-for="facility in filteredFacilities" :key="facility.facilityId">
            <ion-checkbox
              :checked="selectedIds.includes(facility.facilityId)"
              @ionChange="toggleSelection(facility.facilityId, $event.detail.checked)"
            >
              <ion-label>
                {{ facility.facilityName }}
                <p>{{ facility.facilityId }}</p>
              </ion-label>
            </ion-checkbox>
          </ion-item>
        </div>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="applySelection">
          <ion-icon :icon="checkmarkOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import { IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { checkmarkOutline, closeOutline } from 'ionicons/icons';
import { translate } from '@common';

interface Facility {
  facilityId: string;
  facilityName: string;
}

const props = defineProps<{ 
  isOpen: boolean; 
  selectedFacilityIds: string[]; 
  facilities: Facility[]; 
  title?: string;
}>();

const emit = defineEmits<{
  'update:isOpen': [value: boolean];
  'update:selectedFacilityIds': [value: string[]];
  'apply': [value: string[]];
}>();

const queryString = ref('');
const filteredFacilities = ref<Facility[]>([]);
const selectedIds = ref<string[]>([]);

function initializeModal() {
  queryString.value = '';
  filteredFacilities.value = props.facilities || [];
  selectedIds.value = [...props.selectedFacilityIds];
}

function handleClose() {
  emit('update:isOpen', false);
  queryString.value = '';
  filteredFacilities.value = [];
  selectedIds.value = [];
}

function findFacility() {
  const searchedString = (queryString.value || '').trim().toLowerCase();
  if (searchedString) {
    filteredFacilities.value = (props.facilities || []).filter((facility: Facility) =>
      facility.facilityName?.toLowerCase().includes(searchedString) ||
      facility.facilityId?.toLowerCase().includes(searchedString)
    );
  } else {
    filteredFacilities.value = props.facilities || [];
  }
}

async function selectSearchBarText(event: any) {
  const element = await event.target.getInputElement();
  element.select();
}

function toggleSelection(facilityId: string, checked: boolean) {
  if (checked) {
    if (!selectedIds.value.includes(facilityId)) {
      selectedIds.value.push(facilityId);
    }
  } else {
    selectedIds.value = selectedIds.value.filter(id => id !== facilityId);
  }
}

function applySelection() {
  emit('apply', [...selectedIds.value]);
  handleClose();
}

function clearAll() {
  selectedIds.value = [];
}
</script>

<style scoped>
ion-searchbar {
  margin-inline: var(--spacer-md);
}
</style>
