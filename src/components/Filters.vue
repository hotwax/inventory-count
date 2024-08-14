<template>
  <ion-menu side="end" type="overlay">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Filters") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item-divider>
          <ion-label>{{ translate("Facility") }}</ion-label>
        </ion-item-divider>
        <ion-item>
          <ion-icon slot="start" :icon="businessOutline"/>
          <ion-select multiple interface="popover" :value="query.facilityIds" :selected-text="getSelectedValue()" :label="translate('Assigned to')" :placeholder="translate('Select facility')" @ionChange="updateQuery('facilityIds', $event.detail.value)">
            <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item button v-if="showAdditionalFilters().noFacility">
          <ion-icon slot="start" :icon="locateOutline"/>
          <ion-checkbox :value="query.noFacility" @ionChange="updateQuery('noFacility', $event.detail.checked)">{{ translate("No facility") }}</ion-checkbox>
        </ion-item>

        <ion-item button v-if="showAdditionalFilters().selectedFacilities">
          <ion-icon slot="start" :icon="removeCircleOutline"/>
          <ion-label>{{ getSelectedFacilities() }}</ion-label>
          <ion-button color="danger" v-if="query.facilityIds.length" fill="clear" slot="end" @click="updateQuery('facilityIds', [])">
            <ion-icon slot="icon-only" :icon="closeOutline"/>
          </ion-button>
        </ion-item>

        <ion-item-divider v-if="showAdditionalFilters().date">
          <ion-label>{{ translate("Date") }}</ion-label>
        </ion-item-divider>
        <ion-accordion-group v-if="showAdditionalFilters().date">
          <ion-accordion>
            <ion-item slot="header">
              <ion-icon slot="start" :icon="gitBranchOutline"/>
              <ion-label class="ion-text-wrap">{{ translate("Created") }}</ion-label>
            </ion-item>
            <div slot="content">
              <ion-item>
                <ion-label>{{ translate("Before") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal">Date</ion-button>
                <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
                  <ion-content force-overscroll="false">
                    <ion-datetime    
                      id="schedule-datetime"
                      show-default-buttons
                      value="3rd March 2024"
                    />
                  </ion-content>
                </ion-modal> 
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("After") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal">Date</ion-button>
                <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
                  <ion-content force-overscroll="false">
                    <ion-datetime    
                      id="schedule-datetime"
                      show-default-buttons
                      value="3rd March 2024"
                    />
                  </ion-content>
                </ion-modal>               
              </ion-item>
            </div>
          </ion-accordion>

          <ion-accordion>
            <ion-item slot="header" lines="full">
              <ion-icon slot="start" :icon="gitPullRequestOutline"/>
              <ion-label class="ion-text-wrap">{{ translate("Closed") }}</ion-label>
            </ion-item>
            <div slot="content">
              <ion-item>
                <ion-label>{{ translate("Before") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal">Date</ion-button>
                <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
                  <ion-content force-overscroll="false">
                    <ion-datetime    
                      id="schedule-datetime"        
                      show-default-buttons 
                      hour-cycle="h23"
                      value="3rd March 2024"
                    />
                  </ion-content>
                </ion-modal>       
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("After") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal">Date</ion-button>
                <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
                  <ion-content force-overscroll="false">
                    <ion-datetime    
                      id="schedule-datetime"        
                      show-default-buttons 
                      hour-cycle="h23"
                      value="3rd March 2024"
                    />
                  </ion-content>
                </ion-modal>               
              </ion-item>
            </div>
          </ion-accordion>  
        </ion-accordion-group>
      </ion-list>
    </ion-content> 
  </ion-menu>
</template>

<script setup lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonCheckbox,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonMenu,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { computed, ref } from "vue";
import { closeOutline, removeCircleOutline, businessOutline, gitBranchOutline, gitPullRequestOutline, locateOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import store from "@/store";
import router from "@/router";

const dateTimeModalOpen = ref(false)

const facilities = computed(() => store.getters["user/getFacilities"])
const query = computed(() => store.getters["count/getQuery"])

function openDateTimeModal() {
  dateTimeModalOpen.value = true;
}

function showAdditionalFilters() {
  return {
    noFacility: router.currentRoute.value.name === "Draft",
    selectedFacilities: router.currentRoute.value.name === "Closed"
    // date: router.currentRoute.value.name === "Closed"
  }
}

async function updateQuery(key: string, value: any) {
  await store.dispatch("count/updateQuery", { key, value })
}

function getSelectedFacilities() {
  let value = query.value.facilityIds

  // Initially when adding a filter no value is selected thus returning "All facilities selected" as default value
  if(!value.length) {
    return "All facilities selected";
  }
  return facilities.value.map((facility: any) => {
    if(value?.includes(facility.facilityId)) {
      return facility.facilityName || facility.facilityId
    }
  }).filter((facility: any) => facility).join(", ")
}

function getSelectedValue() {
  let value = query.value.facilityIds

  // Initially when adding a filter no value is selected thus returning "All" as default value
  if(!value.length) {
    return "All";
  }

  // If having more than 1 value selected then displaying the count of selected value otherwise returning the facilityName of the selected facility
  if(value?.length > 1) {
    return `${value.length} ${translate("selected")}`
  } else {
    return facilities.value.find((facility: any) => facility.facilityId === value[0])?.facilityName || value[0]
  }
}
</script>