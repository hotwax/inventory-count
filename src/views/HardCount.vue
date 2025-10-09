<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/draft" />
        <ion-title>{{ translate("Hard Count")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="main-content" ref="contentRef" :scroll-events="true" @ionScroll="selectedSegment === 'individual' ? enableScrolling() : ''">
      <div class="header">
        <div class="search">
          <ion-item lines="none" class="ion-padding">
            <ion-label slot="start">
              <h1 v-show="!isCountNameUpdating">{{ countName }}</h1>
              <!-- Added class as we can't change the background of ion-input with css property, and we need to change the background to show the user that now this value is editable -->
              <ion-input ref="countNameRef" :class="isCountNameUpdating ? 'name' : ''" v-show="isCountNameUpdating" aria-label="group name" v-model="countName"></ion-input>
            </ion-label>

            <ion-button slot="end" color="medium" fill="outline" size="small" @click="toggleCountNameUpdation()">
              {{ translate(isCountNameUpdating ? "Save" : "Rename") }}
            </ion-button>
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ translate("Hard counts are used when conducting large scale full counts at facilities. Products are not added to hard counts before they’re assigned. Facilities will count everything they have in stock. Anything they don’t count will be defaulted to 0 on hand.") }}</ion-label>
          </ion-item>

          
        </div>
        <div class="filters">
          <ion-list class="ion-padding">
            <ion-item>
              <ion-icon slot="start" :icon="calendarNumberOutline" />
              <ion-label>{{ translate("Due date") }}</ion-label>
              <ion-button slot="end" size="small" class="date-time-button" @click="dateTimeModalOpen = true">{{ dueDate ? getDateWithOrdinalSuffix(dueDate) : translate("Select date") }}</ion-button>
              <ion-modal class="date-time-modal" :is-open="dateTimeModalOpen" @didDismiss="() => dateTimeModalOpen = false">
                <ion-content force-overscroll="false">
                  <ion-datetime
                    id="schedule-datetime"
                    :value="dueDate ? getDateTime(dueDate) : getDateTime(DateTime.now().toMillis())"
                    @ionChange="updateCustomTime($event)"
                    :min="DateTime.now().toISO()"
                    :max="DateTime.now().plus({ years: 10 }).toISO()"
                    presentation="date"
                    showDefaultButtons
                  />
                </ion-content>
              </ion-modal>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="storefrontOutline"/>
              <ion-toggle v-model="isAutoAssignEnabled">{{ translate("Auto assign to stores") }}</ion-toggle>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <div class="header">
        <div class="search">
          <ion-segment v-model="selectedSegment" @ionChange="handleSegmentChange()">
            <ion-segment-button value="group">
              <ion-label>{{ translate("Group") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="individual">
              <ion-label>{{ translate("Individual") }}</ion-label>
            </ion-segment-button>
          </ion-segment>

          <ion-list v-if="selectedSegment === 'group'">
            <template v-if="facilityGroups?.length">
              <ion-list-header>{{ translate("Select a facility group to hard count") }}</ion-list-header>

              <ion-radio-group v-model="selectedFacilityGroupId">
                <ion-item v-for="group in facilityGroups" :key="group.facilityGroupId">
                  <ion-radio :value="group.facilityGroupId">{{ group.facilityGroupName }}</ion-radio>
                </ion-item>
              </ion-radio-group>
            </template>
            <div v-else class="empty-state">
              <p>{{ translate("No facility group found.") }}</p>
            </div>
          </ion-list>
          <div v-else>
            <ion-searchbar v-model="queryString" :placeholder="translate('Search facilities')" @keyup.enter="fetchFacilities()" />

            <ion-list>
              <template v-if="facilities?.length">
                <ion-list-header>{{ translate("Select facilities to hard count") }}</ion-list-header>

                <ion-item v-for="facility in facilities" :key="facility.facilityId">
                  <ion-checkbox :checked="selectedFacilityIds.includes(facility.facilityId)" @ionChange="toggleFacilitySelection(facility.facilityId)">
                    <ion-label>
                      {{ facility.facilityName ? facility.facilityName : facility.facilityId }}
                      <p>{{ facility.facilityId }}</p>
                    </ion-label>
                  </ion-checkbox>
                </ion-item>
              </template>
              <div v-else class="empty-state">
                <p>{{ translate("No facility found.") }}</p>
              </div>
            </ion-list>

            <ion-infinite-scroll
              @ionInfinite="loadMoreFacilities($event)"
              threshold="100px"
              v-show="selectedSegment === 'individual' && isScrollable"
              ref="infiniteScrollRef"
            >
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
            </ion-infinite-scroll> 
          </div>
        </div>
      </div>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="saveCount()">
        <ion-icon :icon="checkmarkDoneOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from "@/i18n";
import { calendarNumberOutline, checkmarkDoneOutline, storefrontOutline } from "ionicons/icons";
import { IonBackButton, IonButton, IonCheckbox, IonContent, IonDatetime, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonModal, IonPage, IonRadio, IonRadioGroup, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToggle, IonToolbar, onIonViewWillEnter, onIonViewWillLeave} from "@ionic/vue";
import { ref, nextTick, computed, Ref } from "vue"
import { hasError, getDateTime, getDateWithOrdinalSuffix, handleDateTimeInput, showToast } from "@/utils";
import logger from "@/logger"
import { DateTime } from "luxon"
import store from "@/store";
import router from "@/router"
import { UtilService } from "@/services/UtilService";

const countName = ref("");
const selectedSegment = ref("group");
const dueDate = ref("") as Ref<number | string>;
const queryString = ref("");
const selectedFacilityGroupId = ref("");
const facilities = ref([]) as any;
const selectedFacilityIds = ref([]) as Ref<string[]>;
const isCountNameUpdating = ref(false);
const dateTimeModalOpen = ref(false);
const isAutoAssignEnabled = ref(false);
const isScrollingEnabled = ref(false);
const isScrollable = ref(true);
const contentRef = ref("") as Ref<any>;
const countNameRef = ref("") as Ref<any>;
const infiniteScrollRef = ref("");

const facilityGroups = computed(() => store.getters["util/getFacilityGroups"])
const userProfile = computed(() => store.getters["user/getUserProfile"])

onIonViewWillEnter(async () => {
  countName.value = `Hard count - ${DateTime.now().toFormat('dd-MM-yyyy hh:mm:ss')}`;
  await Promise.allSettled([store.dispatch("util/fetchFacilityGroups"), fetchFacilities()]);
})

onIonViewWillLeave(() => {
  selectedFacilityGroupId.value = "";
  selectedFacilityIds.value = [];
  selectedSegment.value = "group";
  dueDate.value = "";
  isAutoAssignEnabled.value = false;
})

async function saveCount() {
  if(!countName.value.trim()) {
    showToast(translate("Enter a valid cycle count name"))
    return;
  }

  if(selectedSegment.value === "group" && !selectedFacilityGroupId.value) {
    showToast(translate("Please select a facility group."))
    return;
  } else if(selectedSegment.value === "individual" && !selectedFacilityIds.value.length) {
    showToast(translate("Please select atleast one facility."))
    return;
  }

  let resp = {} as any, facilityIds = [], cycleCounts = [] as any;
  let count = {
    countImportName: countName.value.trim(),
    statusId: isAutoAssignEnabled.value ? "INV_COUNT_ASSIGNED" : "INV_COUNT_CREATED",
    countTypeEnumId: "HARD_COUNT",
    uploadedByUserLogin: userProfile.value.username,
    createdDate: DateTime.now().toMillis()
  } as any;

  if(dueDate.value) count["dueDate"] = dueDate.value;

  if(selectedSegment.value === "group") {
    try {
      resp = await UtilService.fetchGroupFacilities({
        facilityGroupId: selectedFacilityGroupId.value,
        parentFacilityTypeId: "VIRTUAL_FACILITY",
        parentFacilityTypeId_not: "Y",
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y",
        pageSize: 200
      });

      if(!hasError(resp)) {
        facilityIds = resp.data.map((facility: any) => facility.facilityId);
      } else {
        throw resp;
      }
    } catch(error) {
      logger.error(error);
      showToast(translate("Failed to create cycle counts due to missing association of facilities."))
      return;
    }
  } else {
    facilityIds = selectedFacilityIds.value
  }

  facilityIds.map((facilityId: any) => cycleCounts.push({ ...count, facilityId }))
  try {
    resp = await UtilService.createBulkCycleCounts({ inventoryCountImports: cycleCounts })
    if(!hasError(resp)) {
      showToast(translate("Cycle counts created successfully."))
      router.push("/draft");
    } else {
      throw resp;
    }
  } catch(error) {
    showToast(translate("Failed to create cycle counts."))
    logger.error(error)
  }
}

async function fetchFacilities(vSize?: any, vIndex?: any) {
  let payload = {
    pageSize: vSize ? vSize : process.env.VUE_APP_VIEW_SIZE,
    pageIndex: vIndex ? vIndex : 0,
    facilityTypeId: "VIRTUAL_FACILITY",
    facilityTypeId_not: "Y",
    parentTypeId: "VIRTUAL_FACILITY",
    parentTypeId_not: "Y",
    orderByField: "facilityName"
  } as any;

  if(queryString.value.trim()) {
    payload = {
      ...payload,
      facilityName: queryString.value.trim(),
      facilityName_op: "contains"
    }
  }

  try {
    const resp = await UtilService.fetchFacilities(payload)
    if(!hasError(resp)) {
      if(payload.pageIndex && payload.pageIndex > 0) facilities.value = facilities.value.concat(resp.data);
      else facilities.value = resp.data;

      if(resp.data?.length >= payload.pageSize) isScrollable.value = true
      else isScrollable.value = false
    } else {
      throw resp;
    }
  } catch(error: any) {
    logger.error(error);
  }
}

async function loadMoreFacilities(event: any) {
  // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }

  fetchFacilities(
    undefined,
    Math.ceil(
      facilities.value?.length / (process.env.VUE_APP_VIEW_SIZE as any)
    ).toString()
  ).then(async () => {
    await event.target.complete();
  });
}

function toggleFacilitySelection(currentFacilityId: string) {
  if(selectedFacilityIds.value.includes(currentFacilityId)) selectedFacilityIds.value = selectedFacilityIds.value.filter((facilityId: string) => facilityId !== currentFacilityId)
  else selectedFacilityIds.value.push(currentFacilityId)
}

async function toggleCountNameUpdation() {
  isCountNameUpdating.value = !isCountNameUpdating.value;
  if(isCountNameUpdating.value) {
    // Waiting for DOM updations before focus inside the text-area, as it is conditionally rendered in the DOM
    await nextTick()
    countNameRef.value.$el.setFocus();
  } 
}

function handleSegmentChange() {
  selectedFacilityIds.value = [];
  selectedFacilityGroupId.value = "";
  queryString.value = "";
  if(selectedSegment.value === "group") {
    facilities.value = []
  } else {
    fetchFacilities()
  }
}

function enableScrolling() {
  const parentElement = contentRef.value.$el
  const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']")

  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
}

function updateCustomTime(event: any) {
  dueDate.value = handleDateTimeInput(event.detail.value)
}
</script>

<style scoped>
.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}
.search {
  grid-area: search;
}
.filters {
  grid-area: filters;
}
.main-content {
  --padding-bottom: 80px;
}
@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style>