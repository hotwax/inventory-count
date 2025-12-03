<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>
        {{ translate('Facility') }}
      </ion-card-title>
    </ion-card-header>
    <ion-card-content>
      {{ translate('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
    </ion-card-content>
    <ion-item lines="none">
      <ion-label>
        {{ currentFacility.facilityName }}
        <p>{{ currentFacility.facilityId }}</p>
      </ion-label>
      <ion-button v-if="facilities?.length > 1" id="open-facility-modal" slot="end" fill="outline" color="dark">{{
        translate('Change')}}</ion-button>
    </ion-item>
  </ion-card>
  <!-- Using inline modal(as recommended by ionic), also using it inline as the component inside modal is not getting mounted when using modalController -->
  <ion-modal ref="facilityModal" trigger="open-facility-modal" @didPresent="loadFacilities()"
    @didDismiss="clearSearch()">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeModal">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Select Facility") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-searchbar @ionFocus="selectSearchBarText($event)" :placeholder="translate('Search facilities')"
        v-model="queryString" @ionInput="findFacility($event)"
        @keydown="preventSpecialCharacters($event)" />
      <ion-radio-group v-model="selectedFacilityId">
        <ion-list>
          <!-- Loading state -->
          <div class="empty-state" v-if="isLoading">
            <ion-item lines="none">
              <ion-spinner color="secondary" name="crescent" slot="start" />
              {{ translate("Fetching facilities") }}
            </ion-item>
          </div>
          <!-- Empty state -->
          <div class="empty-state" v-else-if="!filteredFacilities.length">
            <p>{{ translate("No facilities found") }}</p>
          </div>
          <div v-else>
            <ion-item v-for="facility in filteredFacilities" :key="facility.facilityId">
              <ion-radio label-placement="end" justify="start" :value="facility.facilityId">
                <ion-label>
                  {{ facility.facilityName }}
                  <p>{{ facility.facilityId }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </div>
        </ion-list>
      </ion-radio-group>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :disabled="selectedFacilityId === currentFacility.facilityId" @click="updateFacility">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonRadio, IonRadioGroup, IonSearchbar, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import { closeOutline, saveOutline } from "ionicons/icons";
import { useProductStore } from '@/stores/productStore';
import { computed, ref } from 'vue';
import { translate } from '@/i18n';
import { defineProps } from "vue";

const productStore = useProductStore();

const facilities = computed(() => productStore.getFacilities)
const currentFacility = computed(() => productStore.getCurrentFacility)

const facilityModal = ref()
const queryString = ref('')
const isLoading = ref(true);
const filteredFacilities = ref([]) as any
const selectedFacilityId = ref('')

const props = defineProps<{
  onUpdateFacility?: (facility: any) => void
}>()

const closeModal = () => {
  facilityModal.value.$el.dismiss(null, 'cancel');
}

function loadFacilities() {
  filteredFacilities.value = facilities.value;
  selectedFacilityId.value = currentFacility.value.facilityId
  isLoading.value = false;
}

const findFacility = (event?: any) => {
  isLoading.value = true
  const query = event ? event.target.value : queryString.value;
  const searchedString = (query || '').trim().toLowerCase();
  if (searchedString) {
    filteredFacilities.value = facilities.value.filter((facility: any) =>
      facility.facilityName?.toLowerCase().includes(searchedString) ||
      facility.facilityId?.toLowerCase().includes(searchedString)
    );
  } else {
    filteredFacilities.value = facilities.value;
  }
  isLoading.value = false
}

async function selectSearchBarText(event: any) {
  const element = await event.target.getInputElement()
  element.select();
}

function preventSpecialCharacters($event: any) {
  // Searching special characters fails the API, hence, they must be omitted
  if (/[`!@#$%^&*()_+\-=\\|,.<>?~]/.test($event.key)) $event.preventDefault();
}

async function updateFacility() {
  const selectedFacility = facilities.value.find((facility: any) => facility.facilityId === selectedFacilityId.value)
  await productStore.setFacilityPreference(selectedFacility)
  props.onUpdateFacility?.(selectedFacility)
  closeModal();
}

function clearSearch() {
  queryString.value = ''
  filteredFacilities.value = []
  selectedFacilityId.value = ''
  isLoading.value = true
}
</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}
</style>