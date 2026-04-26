<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleClose" @didPresent="initializeModal" data-testid="facility-filter-modal">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="handleClose" data-testid="facility-filter-close-btn">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title data-testid="facility-filter-title">{{ $t(title || 'Select Facilities') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="clearAll" :disabled="selectedIds.length === 0" data-testid="facility-filter-clear-all-btn">{{ $t("Clear all") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="$t('Search facilities')" v-model="queryString" @ionInput="findFacility()" data-testid="facility-filter-search-input"/>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list data-testid="facility-filter-list">
        <div class="empty-state" v-if="!filteredFacilities.length" data-testid="facility-filter-empty-state">
          <p>{{ $t("No facilities found") }}</p>
        </div>
        <div v-else>
          <ion-item v-for="facility in filteredFacilities" :key="facility.facilityId" :data-testid="'facility-filter-item-' + facility.facilityId">
            <ion-checkbox
              :checked="selectedIds.includes(facility.facilityId)"
              @ionChange="toggleSelection(facility.facilityId, $event.detail.checked)"
              :data-testid="'facility-filter-checkbox-' + facility.facilityId"
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
        <ion-fab-button @click="applySelection" data-testid="facility-filter-apply-btn">
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
import i18n from '@/i18n';

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
