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
          <ion-checkbox v-model="query.noFacility" @ionChange="updateQuery('noFacility', $event.detail.checked)">{{ translate("No facility") }}</ion-checkbox>
        </ion-item>

        <ion-item lines="none">
          <ion-icon slot="start" :icon="swapVerticalOutline" />
          <ion-select :label="translate('Sort by')" :value="query.sortBy" @ionChange="updateQuery('sortBy', $event.detail.value)" interface="popover">
            <ion-select-option value="dueDate desc">{{ translate("Farthest due") }}</ion-select-option>
            <ion-select-option value="dueDate asc">{{ translate("Nearest due") }}</ion-select-option>
            <ion-select-option value="countImportName asc">{{ translate("Name - A to Z") }}</ion-select-option>
            <ion-select-option value="countImportName desc">{{ translate("Name - Z to A") }}</ion-select-option>
          </ion-select>
        </ion-item>

        <template v-if="showAdditionalFilters().selectedFacilities">
          <ion-item v-for="facilityId in query.facilityIds" :key="facilityId">
            <ion-label>{{ getFacilityName(facilityId) }}</ion-label>
            <ion-button color="danger" v-if="query.facilityIds.length" fill="clear" slot="end" @click="updateQuery('facilityIds', query.facilityIds.filter((id: string) => id !== facilityId))">
              <ion-icon slot="icon-only" :icon="closeCircleOutline"/>
            </ion-button>
          </ion-item>
          <ion-item v-show="!query.facilityIds.length">
            <ion-label>{{ translate("All facilities selected") }}</ion-label>
          </ion-item>
        </template>

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
                <ion-label>{{ translate("After") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal('createdDate', 'from')">{{ query["createdDate"]["from"] ? formatDateTime(query["createdDate"]["from"]) : translate("Date") }}</ion-button>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Before") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal('createdDate', 'thru')">{{ query["createdDate"]["thru"] ? formatDateTime(query["createdDate"]["thru"]) : translate("Date") }}</ion-button>
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
                <ion-label>{{ translate("After") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal('closedDate', 'from')">{{ query["closedDate"]["from"] ? formatDateTime(query["closedDate"]["from"]) : translate("Date") }}</ion-button>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Before") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal('closedDate', 'thru')">{{ query["closedDate"]["thru"] ? formatDateTime(query["closedDate"]["thru"]) : translate("Date") }}</ion-button>
              </ion-item>
            </div>
          </ion-accordion>  
        </ion-accordion-group>
        <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="closeDateTimeModal">
          <ion-content force-overscroll="false">
            <ion-datetime 
              :value="currentDateTimeValue"
              show-clear-button
              show-default-buttons
              presentation="date"
              @ionChange="updateDateTimeFilter($event.detail.value)"
            />
          </ion-content>
        </ion-modal>
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
import { closeCircleOutline, businessOutline, gitBranchOutline, gitPullRequestOutline, locateOutline, swapVerticalOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import store from "@/store";
import router from "@/router";
import { DateTime } from "luxon";

const dateTimeModalOpen = ref(false)
const currentFilter = ref("");
const currentDateTimeValue = ref("") as any;

const facilities = computed(() => store.getters["user/getFacilities"])
const query = computed(() => store.getters["count/getQuery"])

function openDateTimeModal(dateType: any, dateRange: any) {
  currentFilter.value = `${dateType}_${dateRange}`;
  currentDateTimeValue.value = query.value[dateType][dateRange] ? DateTime.fromMillis(query.value[dateType][dateRange]).toISO() : DateTime.now()
  dateTimeModalOpen.value = true;
}

function closeDateTimeModal() {
  currentFilter.value = "";
  dateTimeModalOpen.value = false;
}

async function updateDateTimeFilter(date: any) {
  if (!date) dateTimeModalOpen.value = false;

  const dateType = currentFilter.value.split("_")[0]
  const dateRange = currentFilter.value.split("_")[1]
  const payload = {
    key: dateType,
    value: {
      ...query.value[dateType],
      [dateRange]: DateTime.fromISO(date).toMillis()
    }
  }
  await store.dispatch("count/updateQuery", payload)
}

function formatDateTime(date: number) {
  const dateTime = DateTime.fromMillis(date);
  return dateTime.toFormat("dd'th' MMM yyyy");
}

function showAdditionalFilters() {
  return {
    noFacility: router.currentRoute.value.name === "Draft",
    selectedFacilities: router.currentRoute.value.name === "Closed",
    date: router.currentRoute.value.name === "Closed"
  }
}

async function updateQuery(key: string, value: any) {
  await store.dispatch("count/updateQuery", { key, value })
}

function getFacilityName(facilityId: string) {
  return facilities.value.find((facility: any) => facility.facilityId === facilityId)?.facilityName || facilityId
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