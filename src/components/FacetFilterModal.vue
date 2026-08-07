<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleClose" @didPresent="initializeModal" data-testid="facet-filter-modal">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="handleClose" data-testid="facet-filter-close-btn">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title data-testid="facet-filter-title">{{ translate(title) }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="clearAll" :disabled="!selectedIds.length" data-testid="facet-filter-clear-all-btn">{{ translate("Clear all") }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="translate(searchPlaceholder)" v-model="queryString" @ionInput="findOption()" data-testid="facet-filter-search-input"/>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list data-testid="facet-filter-list">
        <div class="empty-state" v-if="isLoading" data-testid="facet-filter-loading">
          <ion-item lines="none">
            <ion-spinner color="secondary" name="crescent" slot="start" />
            {{ translate("Fetching options") }}
          </ion-item>
        </div>
        <div class="empty-state" v-else-if="!filteredOptions.length" data-testid="facet-filter-empty-state">
          <p>{{ translate("No options found") }}</p>
        </div>
        <div v-else>
          <ion-item v-for="option in filteredOptions" :key="option.value" :data-testid="'facet-filter-item-' + option.value">
            <ion-checkbox
              :checked="selectedIds.includes(option.value)"
              @ionChange="toggleSelection(option.value, $event.detail.checked)"
              :data-testid="'facet-filter-checkbox-' + option.value"
            >
              <ion-label class="ion-text-wrap">
                {{ option.label }}
                <p v-if="option.groupLabel">{{ option.groupLabel }}</p>
              </ion-label>
            </ion-checkbox>
          </ion-item>
        </div>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="applySelection" data-testid="facet-filter-apply-btn">
          <ion-icon :icon="checkmarkOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonSearchbar, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import { checkmarkOutline, closeOutline } from 'ionicons/icons';
import { translate } from '@common';
import { FacetOption } from '@/composables/useProductFacets';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  selectedValues: string[];
  options: FacetOption[];
  title?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
}>(), {
  title: 'Select options',
  searchPlaceholder: 'Search options',
  isLoading: false
});

const emit = defineEmits<{
  'update:isOpen': [value: boolean];
  'apply': [value: string[]];
}>();

const queryString = ref('');
const filteredOptions = ref<FacetOption[]>([]);
const selectedIds = ref<string[]>([]);

function initializeModal() {
  queryString.value = '';
  filteredOptions.value = props.options || [];
  selectedIds.value = [...props.selectedValues];
}

function handleClose() {
  emit('update:isOpen', false);
  queryString.value = '';
  filteredOptions.value = [];
  selectedIds.value = [];
}

// The options are fetched after the modal is presented, so re-apply the search on every update
watch(() => props.options, () => {
  if (props.isOpen) findOption();
});

function findOption() {
  const searchedString = (queryString.value || '').trim().toLowerCase();
  if (searchedString) {
    filteredOptions.value = (props.options || []).filter((option: FacetOption) =>
      option.label?.toLowerCase().includes(searchedString) ||
      option.groupLabel?.toLowerCase().includes(searchedString)
    );
  } else {
    filteredOptions.value = props.options || [];
  }
}

async function selectSearchBarText(event: any) {
  const element = await event.target.getInputElement();
  element.select();
}

function toggleSelection(value: string, checked: boolean) {
  if (checked) {
    if (!selectedIds.value.includes(value)) {
      selectedIds.value.push(value);
    }
  } else {
    selectedIds.value = selectedIds.value.filter((selected: string) => selected !== value);
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
