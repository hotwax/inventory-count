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
          <ion-select interface="popover" :value="query.facilityId" :label="translate('Facility')" :placeholder="translate('Select facility')" @ionChange="updateQuery('facilityId', $event.detail.value)">
            <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item button>
          <ion-icon slot="start" :icon="removeCircleOutline"/>
          <ion-checkbox :value="query.noFacility" @ionChange="updateQuery('noFacility', $event.detail.checked)">{{ translate("No facility") }}</ion-checkbox>
        </ion-item>

        <ion-item-divider v-if="showAdditionalFilters()">
          <ion-label>{{ translate("Date") }}</ion-label>
        </ion-item-divider>
        <ion-accordion-group v-if="showAdditionalFilters()">
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
import { removeCircleOutline, businessOutline, gitBranchOutline, gitPullRequestOutline } from "ionicons/icons";
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
  return router.currentRoute.value.name !== "Draft"
}

async function updateQuery(key: string, value: any) {
  await store.dispatch("count/updateQuery", { key, value })
}
</script>