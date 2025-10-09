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
        <ion-item :disabled="query.noFacility">
          <ion-icon slot="start" :icon="businessOutline"/>
          <ion-select multiple interface="popover" :value="query.facilityIds" :selected-text="getSelectedValue()" :label="translate('Assigned to')" :placeholder="translate('Select facility')" @ionChange="updateQuery('facilityIds', $event.detail.value)">
            <ion-select-option v-for="facility in facilities" :key="facility.facilityId" :value="facility.facilityId">{{ facility.facilityName }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item button v-if="showAdditionalFilters().noFacility">
          <ion-icon slot="start" :icon="locateOutline"/>
          <ion-checkbox v-model="query.noFacility" :disabled="query.facilityIds?.length" @ionChange="updateQuery('noFacility', $event.detail.checked)">{{ translate("No facility") }}</ion-checkbox>
        </ion-item>

        <ion-item v-for="facilityId in query.facilityIds" :key="facilityId">
          <ion-label>{{ getFacilityName(facilityId) }}</ion-label>
          <ion-button size="default" color="danger" v-if="query.facilityIds.length" fill="clear" slot="end" @click="updateQuery('facilityIds', query.facilityIds.filter((id: string) => id !== facilityId))">
            <ion-icon slot="icon-only" :icon="closeCircleOutline"/>
          </ion-button>
        </ion-item>
        <ion-item v-show="!query.facilityIds.length">
          <ion-label>{{ translate("All facilities selected") }}</ion-label>
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
                <ion-label>{{ translate("After") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal('createdDate_from')">{{ query.createdDate_from ? formatDateTime(query.createdDate_from) : translate("Date") }}</ion-button>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Before") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal('createdDate_thru')">{{ query.createdDate_thru ? formatDateTime(query.createdDate_thru) : translate("Date") }}</ion-button>
              </ion-item>
            </div>
          </ion-accordion>

          <ion-accordion v-if="router.currentRoute.value.name === 'Closed'">
            <ion-item slot="header" lines="full">
              <ion-icon slot="start" :icon="gitPullRequestOutline"/>
              <ion-label class="ion-text-wrap">{{ translate("Closed") }}</ion-label>
            </ion-item>
            <div slot="content">
              <ion-item>
                <ion-label>{{ translate("After") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal('closedDate_from')">{{ query.closedDate_from ? formatDateTime(query.closedDate_from) : translate("Date") }}</ion-button>
              </ion-item>
              <ion-item>
                <ion-label>{{ translate("Before") }}</ion-label>
                <ion-button slot="end" size="small" class="date-time-button" @click="openDateTimeModal('closedDate_thru')">{{ query.closedDate_thru ? formatDateTime(query.closedDate_thru) : translate("Date") }}</ion-button>
              </ion-item>
            </div>
          </ion-accordion>  
        </ion-accordion-group>
        <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="closeDateTimeModal">
          <ion-content force-overscroll="false">
            <ion-datetime 
              :value="currentDateFilterValue"
              show-clear-button
              show-default-buttons
              presentation="date"
              :min="getMinDate()"
              :max="getMaxDate()" 
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
import { closeCircleOutline, businessOutline, gitBranchOutline, gitPullRequestOutline, locateOutline } from "ionicons/icons";
import { translate } from '@/i18n'
import store from "@/store";
import router from "@/router";
import { DateTime } from "luxon";
import { getDateWithOrdinalSuffix } from "@/utils";
import { useUserStore } from "@hotwax/dxp-components";

const userStore = useUserStore();

const dateTimeModalOpen = ref(false)
const currentDateFilter = ref("");
const currentDateFilterValue = ref("") as any;

const facilities = computed(() => userStore.getFacilites)
const query = computed(() => store.getters["count/getQuery"])

function openDateTimeModal(dateFilterKey: string) {
  currentDateFilter.value = dateFilterKey;
  currentDateFilterValue.value = query.value[dateFilterKey] ? query.value[dateFilterKey] : DateTime.now();
  dateTimeModalOpen.value = true;
}

// Returns the minimum allowed date for the current date filter, ensuring it is not before the "from" date for closed or created dates.
function getMinDate() {
  const dateFilterKey = currentDateFilter.value;

  if(dateFilterKey === 'closedDate_thru') {
    const afterDateClosed = query.value.closedDate_from;
    return afterDateClosed ? DateTime.fromISO(afterDateClosed).toISO() : undefined;
  } else if(dateFilterKey === 'createdDate_thru') {
    const afterDateCreated = query.value.createdDate_from;
    return afterDateCreated ? DateTime.fromISO(afterDateCreated).toISO() : undefined;
  }
  return undefined;
}

// Returns the maximum allowed date for the current filter, restricting "After" dates to today and allowing "Before" dates without restriction.
function getMaxDate() {
  const dateFilterKey = currentDateFilter.value;

  if(dateFilterKey === 'closedDate_from' || dateFilterKey === 'createdDate_from') {
    return DateTime.now().toISODate();
  } else if(dateFilterKey === 'closedDate_thru' || dateFilterKey === 'createdDate_thru') {
    return undefined;
  }
  return undefined;
}

function closeDateTimeModal() {
  currentDateFilter.value = "";
  dateTimeModalOpen.value = false;
}

async function updateDateTimeFilter(date: any) {
  if(!date) dateTimeModalOpen.value = false;

  const dateFilterKey = currentDateFilter.value;

  if(date === query.value[dateFilterKey]) {
    dateTimeModalOpen.value = false;
    return;
  }

  const payload = {
    key: dateFilterKey,
    value: date
  }
  await store.dispatch("count/updateQuery", payload)
}

function formatDateTime(date: any) {
  const dateTime = DateTime.fromISO(date);
  return getDateWithOrdinalSuffix(dateTime.toMillis());
}

function showAdditionalFilters() {
  return {
    noFacility: router.currentRoute.value.name === "Draft",
    date: router.currentRoute.value.name !== "Draft"
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