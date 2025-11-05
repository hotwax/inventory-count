<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start">{{ currentFacility?.facilityName || currentFacility?.facilityId }}</ion-title>
        <ion-segment :value="selectedSegment" @ionChange="segmentChanged($event.detail.value)">
          <ion-segment-button value="assigned" @click="selectedSegment = 'assigned'">
            <ion-label>{{ translate("Assigned") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="pendingReview" @click="selectedSegment = 'pendingReview'">
            <ion-label>{{ translate("Pending review") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="closed" @click="selectedSegment = 'closed'">
            <ion-label>{{ translate("Closed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" ref="pageRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <template v-if="isLoading">
        <p class="empty-state">{{ translate("Fetching cycle counts...") }}</p>
      </template>
      <template v-else>
        <ion-card v-for="count in cycleCounts" :key="count.workEffortId">
          <ion-card-header>
            <div>
              <ion-label v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'" color="warning" class="overline">
                {{ translate("HARD COUNT") }}
              </ion-label>
              <ion-card-title>
                {{ count.workEffortName }}
              </ion-card-title>
              <ion-card-subtitle>
                {{ getDateWithOrdinalSuffix(count.createdDate) }}
              </ion-card-subtitle>
            </div>
          </ion-card-header>
          <ion-item lines="none">
            {{ translate("Due date") }}
            <ion-label slot="end">
              <p>{{ getDateWithOrdinalSuffix(count.dueDate) }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="count.estimatedStartDate" lines="none">
            {{ translate("Start date") }}
            <ion-label slot="end">
              <p>{{ getDateWithOrdinalSuffix(count.estimatedStartDate) }}</p>
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>
              <ion-label>
                {{ translate("Sessions") }}
              </ion-label>

              <ion-button v-if="selectedSegment === 'assigned' && count.sessions?.length" :disabled="count.currentStatusId !== 'CYCLE_CNT_IN_PRGS'" fill="clear" size="small" @click="showAddNewSessionModal(count.workEffortId)">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                {{ translate("New") }}
              </ion-button>
            </ion-list-header>
            <ion-button v-if="selectedSegment === 'assigned' && count.sessions?.length === 0" :disabled="count.currentStatusId !== 'CYCLE_CNT_IN_PRGS'" expand="block" class="ion-margin-horizontal" @click="showAddNewSessionModal(count.workEffortId)">
              <ion-label>
                {{ translate("Start new session") }}
              </ion-label>
            </ion-button>
            <!-- TODO: Need to show the session on this device seperately from the other sessions -->
              <ion-item-group v-for="session in count.sessions" :key="session.inventoryCountImportId">
                <ion-item v-if="Object.keys(session.lock || {}).length === 0" :detail="selectedSegment === 'assigned'" :button="selectedSegment === 'assigned'" :disabled="selectedSegment !== 'assigned' || count.currentStatusId !== 'CYCLE_CNT_IN_PRGS'" :router-link="selectedSegment === 'assigned' ? `/session-count-detail/${session.workEffortId}/${count.workEffortPurposeTypeId}/${session.inventoryCountImportId}` : undefined">
                  <ion-label>
                    {{ session.countImportName }} {{ session.facilityAreaId }}
                    <p>{{ translate("created by") }} {{ session.uploadedByUserLogin }}</p>
                  </ion-label>
                  <ion-note slot="end">
                    {{ getSessionStatusDescription(session.statusId) }}
                  </ion-note>
                </ion-item>

                <!-- Locked by another user -->
                <ion-item v-else-if="session.lock?.userId && session.lock?.userId !== store.getters['user/getUserProfile']?.username">
                  <ion-label>
                    {{ session.countImportName }} {{ session.facilityAreaId }}
                    <p>{{ translate("Session already active for") }} {{ session.lock?.userId }}</p>
                  </ion-label>
                  <ion-note color="warning" slot="end">{{ translate("Locked") }}</ion-note>
                </ion-item>

                <!-- Locked by same user, same device -->
                <ion-item v-else-if="session.lock?.userId && session.lock?.userId === store.getters['user/getUserProfile']?.username && session.lock?.deviceId === currentDeviceId" :detail="true" button :router-link="`/session-count-detail/${session.workEffortId}/${count.workEffortPurposeTypeId}/${session.inventoryCountImportId}`">
                  <ion-label>
                    {{ session.countImportName }} {{ session.facilityAreaId }}
                    <p>{{ translate("Session already active for this device") }}</p>
                  </ion-label>
                  <ion-note slot="end">{{ getSessionStatusDescription(session.statusId) }}</ion-note>
                </ion-item>

                <!-- Locked by same user, different device -->
                <ion-item v-else-if="session.lock?.userId && session.lock?.userId === store.getters['user/getUserProfile']?.username && session.lock?.deviceId !== currentDeviceId">
                  <ion-label>
                    {{ session.lock }}
                    {{ session.countImportName }} {{ session.facilityAreaId }}
                    <p>{{ translate("Session already active on another device") }}</p>
                  </ion-label>
                  <ion-button v-if="selectedSegment === 'assigned'" color="danger" fill="outline" slot="end" size="small" @click.stop="forceRelease(session)" :show="hasPermission(Actions.APP_PWA_STANDALONE_ACCESS)">
                    {{ translate("Force Release") }}
                  </ion-button>
                </ion-item>
              </ion-item-group>

            <ion-item v-if="selectedSegment === 'assigned'" lines="none">
              <ion-button v-if="count.currentStatusId === 'CYCLE_CNT_IN_PRGS'" expand="block" size="default" fill="clear" slot="end" @click.stop="markAsCompleted(count.workEffortId)" :disabled="!count.sessions?.length || count.sessions.some(s => s.statusId === 'SESSION_CREATED' || s.statusId === 'SESSION_ASSIGNED')">
                {{ translate("Ready for review") }}
              </ion-button>
              <ion-button
                v-if="count.currentStatusId === 'CYCLE_CNT_CREATED'" expand="block" size="default" fill="clear" slot="end" @click="markInProgress(count.workEffortId)" :disabled="count.estimatedStartDate && DateTime.fromMillis(count.estimatedStartDate) >= DateTime.now()">
                {{ translate("Move to In Progress") }}
              </ion-button>
            </ion-item>
          </ion-list>
        </ion-card>
      </template>
      <ion-modal :is-open="isAddSessionModalOpen" @did-dismiss="isAddSessionModalOpen = false" :presenting-element="pageRef?.$el" :keep-contents-mounted="true">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="isAddSessionModalOpen = false" fill="clear" aria-label="Close">
                  <ion-icon :icon="closeOutline" slot="icon-only" />
                </ion-button>
              </ion-buttons>
              <ion-title>{{ translate("New session") }}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-item>
              <ion-label position="stacked">{{ translate("Name") }}</ion-label>
              <ion-input v-model="countName" placeholder="category, section, or person"></ion-input>
              <ion-note slot="helper">{{ translate("Add a name to help identify what inventory is counted in this session") }}</ion-note>
            </ion-item>

            <ion-list>
              <ion-list-header>{{ translate("Area") }}</ion-list-header>

              <ion-radio-group v-model="selectedArea">
                <ion-item v-for="area in areas" :key="area.value">
                  <ion-radio label-placement="start" :value="area.value">{{ area.label }}</ion-radio>
                </ion-item>
              </ion-radio-group>
            </ion-list>

            <ion-fab vertical="bottom" horizontal="end" slot="fixed">
              <ion-fab-button @click="addNewSession">
                <ion-icon :icon="checkmarkDoneOutline" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-modal>

      <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCount($event)">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter,
  IonButtons,
  IonModal,
  IonFab,
  IonFabButton,
  IonListHeader,
  IonRadioGroup,
  IonRadio,
  IonInput
} from '@ionic/vue';
import { addCircleOutline, closeOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { translate } from '@/i18n';
import { computed, ref } from "vue";
import { useStore } from 'vuex';
import { getDateWithOrdinalSuffix, showToast } from "@/utils";
import { useUserStore } from '@hotwax/dxp-components';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { Actions, hasPermission } from '@/authorization';
import { DateTime } from 'luxon';

const store = useStore();
const userStore = useUserStore();

const cycleCounts = computed(() => store.getters["count/getAssignedWorkEfforts"]);
const isScrollable = computed(() => store.getters["count/isScrollable"]);
const currentFacility = computed(() => userStore.getCurrentFacility);
const selectedSegment = ref("assigned");
const isScrollingEnabled = ref(false);
const infiniteScrollRef = ref({});
let isLoading = ref(false);
const isAddSessionModalOpen = ref(false);
const selectedWorkEffortId = ref(null);
const pageRef = ref(null);
const pageIndex = ref(0);
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20);
const currentDeviceId = store.getters["user/getDeviceId"];

onIonViewDidEnter(async () => {
  isLoading.value = true;
  pageIndex.value = 0;
  await getCycleCounts(true);
  isLoading.value = false;
});

function getSessionStatusDescription(statusId) {
  if (!statusId) return "";
  if (statusId === "SESSION_CREATED") return "Created";
  if (statusId === "SESSION_ASSIGNED") return "In Progress";
  if (statusId === "SESSION_SUBMITTED") return "Submitted";
  if (statusId === "SESSION_VOIDED") return "Voided";
}

function showAddNewSessionModal(workEffortId) {
  isAddSessionModalOpen.value = true;
  selectedWorkEffortId.value = workEffortId;
}

function enableScrolling() {
  const parentElement = pageRef.value?.$el;
  if (!parentElement) return;

  const scrollEl = parentElement.shadowRoot?.querySelector("div[part='scroll']");
  const infiniteEl = infiniteScrollRef.value?.$el;
  if (!scrollEl || !infiniteEl) return;

  const { scrollHeight, scrollTop, offsetHeight: height } = scrollEl;
  const infiniteHeight = infiniteEl.offsetHeight;
  const threshold = 100;

  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height;
  isScrollingEnabled.value = distanceFromInfinite >= 0;
}

async function loadMoreCycleCount(event) {
  if (!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
    return;
  }

  pageIndex.value += 1;
  await getCycleCounts(false);
  await event.target.complete();
}

async function getCycleCounts(reset = false) {
  if (!currentFacility.value?.facilityId) {
    showToast(translate("No facility is associated with this user"));
    return;
  }

  if (reset) {
    pageIndex.value = 0;
  }

  const params = {
    pageSize: pageSize.value,
    pageIndex: pageIndex.value,
    facilityId: currentFacility.value.facilityId,
    currentStatusId: getStatusIdForCountsToBeFetched(),
    currentStatusId_op: "in",
    thruDate_op: "empty"
    // userId: store.getters["user/getUserProfile"].username,
    // deviceId: store.getters["user/getDeviceId"]
  };
  await store.dispatch("count/getCreatedAndAssignedWorkEfforts", params);
}

async function segmentChanged(value) {
  isLoading.value = true;
  selectedSegment.value = value;
  pageIndex.value = 0;
  await getCycleCounts(true);
  isLoading.value = false;
}

function getStatusIdForCountsToBeFetched() {
  if (selectedSegment.value === "assigned") return "CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS";
  if (selectedSegment.value === "pendingReview") return "CYCLE_CNT_CMPLTD";
  return "CYCLE_CNT_CLOSED";
}

const areas = [
  { value: 'back_stock', label: 'Back stock' },
  { value: 'display', label: 'Display' },
  { value: 'floor_wall', label: 'Floor - wall' },
  { value: 'floor_shelf', label: 'Floor - shelf' },
  { value: 'overflow', label: 'Overflow' },
  { value: 'register', label: 'Register' },
];
const selectedArea = ref(areas[0].value);
const countName = ref('');

async function addNewSession() {
  try {
    const selectedCount = cycleCounts.value.find(c => c.workEffortId === selectedWorkEffortId.value)
    if (!selectedCount) {
      showToast("Unable to find selected count.")
      return
    }

    // Check the type of count
    const isHardCount = selectedCount.workEffortPurposeTypeId === "HARD_COUNT"
    let resp = null

    if (isHardCount) {
      // --- Create a new HARD COUNT session directly ---
      resp = await useInventoryCountImport().createSessionOnServer({
        countImportName: countName.value,
        statusId: "SESSION_CREATED",
        uploadedByUserLogin: store.getters["user/getUserProfile"].username,
        facilityAreaId: selectedArea.value,
        createdDate: Date.now(),
        dueDate: Date.now(),
        workEffortId: selectedWorkEffortId.value
      })
    } else {
      // --- DIRECTED COUNT: clone from oldest session ---
      const sessions = selectedCount.sessions || []
      if (sessions.length > 0) {
        // Sort by createdDate ascending
        const oldest = [...sessions].sort((a, b) => a.createdDate - b.createdDate)[0]
        if (oldest?.inventoryCountImportId) {
          resp = await useInventoryCountImport().cloneSession({
            inventoryCountImportId: oldest.inventoryCountImportId,
            facilityAreaId: selectedArea.value,
            countImportName: countName.value,
          })
        } else {
          // Fallback: no valid oldest found
          resp = await useInventoryCountImport().createSessionOnServer({
            countImportName: countName.value,
            statusId: "SESSION_CREATED",
            uploadedByUserLogin: store.getters["user/getUserProfile"].username,
            facilityAreaId: selectedArea.value,
            createdDate: Date.now(),
            dueDate: Date.now(),
            workEffortId: selectedWorkEffortId.value
          })
        }
      } else {
        // No sessions → create new one (same as HARD COUNT)
        resp = await useInventoryCountImport().createSessionOnServer({
          countImportName: countName.value,
          statusId: "SESSION_CREATED",
          uploadedByUserLogin: store.getters["user/getUserProfile"].username,
          facilityAreaId: selectedArea.value,
          createdDate: Date.now(),
          dueDate: Date.now(),
          workEffortId: selectedWorkEffortId.value
        })
      }
    }

    if (resp?.status !== 200) {
      showToast("Something Went Wrong!")
      console.error(resp)
      return
    }

    // --- Update UI ---
    showToast("Session added Successfully")
    const index = cycleCounts.value.findIndex(w => w.workEffortId === selectedWorkEffortId.value)
    if (index !== -1) {
      if (!cycleCounts.value[index].sessions) cycleCounts.value[index].sessions = []

      const newSession = {
        inventoryCountImportId: resp.data.inventoryCountImportId,
        countImportName: countName.value,
        statusId: "SESSION_CREATED",
        uploadedByUserLogin: store.getters["user/getUserProfile"].username,
        facilityAreaId: selectedArea.value,
        createdDate: Date.now(),
        dueDate: Date.now(),
        workEffortId: selectedWorkEffortId.value
      }
      cycleCounts.value[index].sessions.push(newSession)
    }

    countName.value = ''
    selectedArea.value = areas[0].value
    isAddSessionModalOpen.value = false
  } catch (err) {
    console.error("Error creating session:", err)
    showToast("Something Went Wrong!")
  }
}

async function markAsCompleted(workEffortId) {
  try {
    const response = await useInventoryCountImport().updateWorkEffort({ workEffortId, currentStatusId: 'CYCLE_CNT_CMPLTD' });
    if (response && response.status === 200) {
      showToast(translate("Session sent for review successfully"));
      pageIndex.value = 0;
      await getCycleCounts(true);
    } else {
      showToast(translate("Failed to send session for review"));
    }
  } catch (err) {
    console.error("Error updating status:", err);
  }
}

async function markInProgress(workEffortId) {
  try {
    const response = await useInventoryCountImport().updateWorkEffort({ workEffortId, currentStatusId: 'CYCLE_CNT_IN_PRGS' });
    if (response && response.status === 200) {
      showToast(translate("Cycle Count is Active"));
      pageIndex.value = 0;
      await getCycleCounts(true);
    } else {
      showToast(translate("Failed to send session for review"));
    }
  } catch (err) {
    console.error("Error updating status:", err);
  }
}

async function forceRelease(session) {
  try {
    const payload = {
      inventoryCountImportId: session.inventoryCountImportId,
      fromDate: session.lock?.fromDate,
      thruDate: Date.now(),
      overrideByUserId: store.getters['user/getUserProfile']?.username
    }

    const resp = await useInventoryCountImport().releaseSession(payload)
    if (resp?.status === 200) {
      showToast('Session lock released successfully.')

      // Remove lock locally so UI refreshes
      session.lock = {}
    } else {
      showToast('Failed to release session lock.')
    }
  } catch (err) {
    console.error('Error releasing session lock:', err)
    showToast('Something went wrong while releasing session.')
  }
}
</script>

<style scoped>
section {
  padding-bottom: 100px;
}

ion-card {
  max-width: 450px;
  margin-inline: auto;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0px;
}

main {
  margin: var(--spacer-base) auto 0;
  display: flex;
}

.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}
.search {
  grid-area: search;
  border-right: 1px solid #ccc;
}
.filters {
  grid-area: filters;
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
