<template>
  <ion-card data-testid="timezone-switcher-card">
    <ion-card-header data-testid="timezone-switcher-header">
      <ion-card-title data-testid="timezone-switcher-title">
        {{ translate('Timezone') }}
      </ion-card-title>
    </ion-card-header>
    <ion-card-content data-testid="timezone-switcher-content">
      {{ translate('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
    </ion-card-content>
    <ion-item v-if="showBrowserTimeZone" data-testid="timezone-browser-item">
      <ion-label data-testid="timezone-browser-label">
        <p class="overline" data-testid="timezone-browser-overline">{{ translate("Browser TimeZone") }}</p>
        <span data-testid="timezone-browser-id">{{ browserTimeZone.id }}</span>
        <p v-if="showDateTime" data-testid="timezone-browser-time">{{ getCurrentTime(browserTimeZone.id, dateTimeFormat) }}</p>
      </ion-label>
    </ion-item>
    <ion-item lines="none" data-testid="timezone-selected-item">
      <ion-label data-testid="timezone-selected-label">
        <p class="overline" data-testid="timezone-selected-overline">{{ translate("Selected TimeZone") }}</p>
        <span data-testid="timezone-selected-id">{{ currentTimeZoneId }}</span>
        <p v-if="showDateTime" data-testid="timezone-selected-time">{{ getCurrentTime(currentTimeZoneId, dateTimeFormat) }}</p>
      </ion-label>
      <ion-button id="time-zone-modal" slot="end" fill="outline" color="dark" data-testid="timezone-change-btn">{{ translate("Change") }}</ion-button>
    </ion-item>
  </ion-card>
  <!-- Using inline modal(as recommended by ionic), also using it inline as the component inside modal is not getting mounted when using modalController -->
  <ion-modal ref="timeZoneModal" trigger="time-zone-modal" @didPresent="search()" @didDismiss="clearSearch()" data-testid="timezone-modal">
    <ion-header data-testid="timezone-modal-header">
      <ion-toolbar data-testid="timezone-modal-toolbar">
        <ion-buttons slot="start">
          <ion-button @click="closeModal" data-testid="timezone-modal-close-btn">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title data-testid="timezone-modal-title">{{ translate("Select time zone") }}</ion-title>
      </ion-toolbar>
      <ion-toolbar data-testid="timezone-modal-search-toolbar">
        <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="translate('Search time zones')"  v-model="queryString" @keyup.enter="queryString = $event.target.value; findTimeZone()" @keydown="preventSpecialCharacters($event)" data-testid="timezone-search-input" />
      </ion-toolbar>
    </ion-header>

    <ion-content data-testid="timezone-modal-content">
      <div>
        <ion-radio-group value="rd" v-model="timeZoneId" data-testid="timezone-radio-group">
          <ion-list v-if="showBrowserTimeZone" data-testid="timezone-browser-list">
            <ion-list-header data-testid="timezone-browser-list-header">{{ translate("Browser time zone") }}</ion-list-header>
            <ion-item data-testid="timezone-browser-list-item">
              <ion-radio label-placement="end" justify="start" :value="browserTimeZone.id" data-testid="timezone-browser-radio">
                <ion-label data-testid="timezone-browser-list-label">
                  {{ browserTimeZone.label }} ({{ browserTimeZone.id }})
                  <p v-if="showDateTime" data-testid="timezone-browser-list-time">{{ getCurrentTime(browserTimeZone.id, dateTimeFormat) }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </ion-list>
          <ion-list data-testid="timezone-all-list">
            <ion-list-header v-if="showBrowserTimeZone" data-testid="timezone-all-list-header">{{ translate("Select a different time zone") }}</ion-list-header>
            <!-- Loading state -->
            <div class="empty-state" v-if="isLoading" data-testid="timezone-loading">
              <ion-item lines="none" data-testid="timezone-loading-item">
                <ion-spinner color="secondary" name="crescent" slot="start" />
                {{ translate("Fetching time zones") }}
              </ion-item>
            </div>
            <!-- Empty state -->
            <div class="empty-state" v-else-if="filteredTimeZones.length === 0" data-testid="timezone-empty-state">
              <p>{{ translate("No time zone found") }}</p>
            </div>
            <div v-else data-testid="timezone-list-items">
              <ion-item :key="timeZone.id" v-for="timeZone in filteredTimeZones" :data-testid="'timezone-item-' + timeZone.id">
                <ion-radio label-placement="end" justify="start" :value="timeZone.id" :data-testid="'timezone-radio-' + timeZone.id">
                  <ion-label :data-testid="'timezone-label-' + timeZone.id">
                    {{ timeZone.label }} ({{ timeZone.id }})
                    <p v-if="showDateTime" :data-testid="'timezone-time-' + timeZone.id">{{ getCurrentTime(timeZone.id, dateTimeFormat) }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </div>
          </ion-list>
        </ion-radio-group>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed" data-testid="timezone-fab">
        <ion-fab-button :disabled="!timeZoneId || timeZoneId === currentTimeZoneId" @click="setUserTimeZone" data-testid="timezone-save-btn">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard, 
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { closeOutline, saveOutline } from "ionicons/icons";
import { computed, onBeforeMount, ref, defineProps } from "vue";
import { translate} from '@common'
import { DateTime } from 'luxon' 
import { useUserProfile } from '@/stores/userProfileStore';

const userProfile: any = computed(() => useUserProfile().getUserProfile);
const timeZones = computed(() => useUserProfile().getTimeZones)
const currentTimeZoneId = computed(() => userProfile.value?.timeZone)

const isLoading = ref(true);
const timeZoneModal = ref();
const queryString = ref('');
const filteredTimeZones = ref([]) as any
const timeZoneId = ref(currentTimeZoneId.value)
// Fetching timeZone of the browser
const browserTimeZone = ref({
  label: '',
  id: Intl.DateTimeFormat().resolvedOptions().timeZone
})

const props = defineProps({
  showBrowserTimeZone: {
    type: Boolean,
    default: true
  },
  showDateTime: {
    type: Boolean,
    default: true
  },
  dateTimeFormat: {
    type: String,
    default: 't ZZZZ'
  }
})

const closeModal = () => {
  timeZoneId.value = currentTimeZoneId.value;
  timeZoneModal.value.$el.dismiss(null, 'cancel');
}

onBeforeMount(async () => {
  isLoading.value = true;
  await useUserProfile().getDxpAvailableTimeZones();
    timeZoneId.value = userProfile.value.timeZone
  if(props.showBrowserTimeZone) {
    browserTimeZone.value.label = ((timeZones.value as any[])?.find((timeZone: any) => (timeZone?.id || '').toLowerCase().includes(browserTimeZone.value.id.toLowerCase()))?.label) || ''
  }

  findTimeZone();
  isLoading.value = false;
})

async function setUserTimeZone() {
  try {
    await useUserProfile().setDxpUserTimeZone(timeZoneId.value);
  } catch (error) {
    console.error("Error Updating Time Zone: ", error);
  }
  closeModal();
}

function findTimeZone() {
  const searchedString = queryString.value.toLowerCase();
  filteredTimeZones.value = timeZones.value.filter((timeZone: any) => timeZone.id.toLowerCase().match(searchedString) || timeZone.label.toLowerCase().match(searchedString));

  if(props.showBrowserTimeZone) {
    filteredTimeZones.value = filteredTimeZones.value.filter((timeZone: any) => !timeZone.id.toLowerCase().match(browserTimeZone.value.id.toLowerCase()));
  }
}

async function selectSearchBarText(event: any) {
  const element = await event.target.getInputElement()
  element.select();
}

function preventSpecialCharacters($event: any) {
  // Searching special characters fails the API, hence, they must be omitted
  if(/[`!@#$%^&*()_+\-=\\|,.<>?~]/.test($event.key)) $event.preventDefault();
}

function search() {
  isLoading.value = true;
  findTimeZone();
  isLoading.value = false;
}

// clearing the data explicitely as the modal is mounted due to the component being mounted always
function clearSearch() {
  queryString.value = ''
  filteredTimeZones.value = []
  isLoading.value = true
}

const getCurrentTime = (zone: string, format = 't ZZZZ') => {
  return DateTime.now().setZone(zone).toFormat(format)
}
</script>
