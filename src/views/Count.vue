<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start" data-testid="count-page-title">{{ currentFacility?.facilityName || currentFacility?.facilityId }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" ref="pageRef" :scroll-events="true" @ionScroll="enableScrolling()" data-testid="count-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)" data-testid="count-refresher">
        <ion-refresher-content refreshing-spinner="circular" data-testid="count-refresher-content"></ion-refresher-content>
      </ion-refresher>
      <template v-if="isLoading">
        <p class="empty-state" data-testid="count-loading">{{ translate("Fetching cycle counts...") }}</p>
      </template>
      <template v-else-if="cycleCounts.length > 0">
        <ion-card v-for="count in cycleCounts" :key="count.workEffortId" :data-testid="'count-card-' + count.workEffortId">
          <ion-card-header>
            <div>
              <ion-label v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'" color="warning" class="overline" data-testid="count-badge-hard-count">
                {{ translate("HARD COUNT") }}
              </ion-label>
              <ion-card-title data-testid="count-card-title">
                {{ count.workEffortName }}
              </ion-card-title>
              <ion-card-subtitle data-testid="count-card-subtitle">
                {{ commonUtil.getDateTimeWithOrdinalSuffix(count.createdDate) }}
              </ion-card-subtitle>
            </div>
          </ion-card-header>
          <ion-item lines="none" data-testid="count-due-date-item">
            <ion-label data-testid="count-due-date-label">{{ translate("Due date") }}</ion-label>
            <ion-label slot="end" data-testid="count-due-date-value">
              <p v-if="count.estimatedCompletionDate">{{ commonUtil.getDateTimeWithOrdinalSuffix(count.estimatedCompletionDate) }}</p>
              <p v-else>{{ translate("Not set") }}</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none" data-testid="count-start-date-item">
            <ion-label data-testid="count-start-date-label">{{ translate("Start date") }}</ion-label>
            <ion-label slot="end" data-testid="count-start-date-value">
              <p v-if="count.estimatedStartDate">{{ commonUtil.getDateTimeWithOrdinalSuffix(count.estimatedStartDate) }}</p>
              <p v-else>{{ translate("Not set") }}</p>
            </ion-label>
          </ion-item>
          <ion-button v-if="count.statusId === 'CYCLE_CNT_CREATED'" expand="block" size="default" class="ion-margin" @click="markInProgress(count.workEffortId)" :loading="loadingWorkEffortId === count.workEffortId" :disabled="loadingWorkEffortId === count.workEffortId || (isPlannedForFuture(count) && !useUserProfile().hasPermission('COMMON_ADMIN OR INV_COUNT_ADMIN OR INV_COUNT_PRE_START'))" data-testid="count-start-counting-btn">
            {{ translate("Start counting") }}
          </ion-button>
          <div class="ion-text-center" v-if="count.statusId === 'CYCLE_CNT_CREATED' && isPlannedForFuture(count)" data-testid="count-future-start-warning">
            <ion-note color="warning">
              {{ translate("This count is scheduled to start") }} {{ getTimeUntil(count.estimatedStartDate) }}
            </ion-note>
          </div>
          <ion-button v-if="count.statusId === 'CYCLE_CNT_CREATED'" expand="block" size="default" fill="outline" class="ion-margin" @click="goToCountProgressReview(count.workEffortId, $event)" :disabled="!count.sessions?.length" data-testid="count-preview-btn">
            {{ translate("Preview count") }}
          </ion-button>
          <ion-button v-if="count.statusId === 'CYCLE_CNT_IN_PRGS'" expand="block" size="default" fill="outline" class="ion-margin" @click="goToCountProgressReview(count.workEffortId, $event)" :disabled="!count.sessions?.length" data-testid="count-review-btn">
            {{ translate("Review progress") }}
          </ion-button>
          
          <ion-list data-testid="count-session-list">
            <ion-list-header data-testid="count-session-header">
              <ion-label data-testid="count-session-header-label">
                {{ translate("Sessions") }}
              </ion-label>

              <ion-button v-if="count.sessions?.length" :disabled="count.statusId !== 'CYCLE_CNT_IN_PRGS'" fill="clear" size="small" @click="showAddNewSessionModal(count.workEffortId)" data-testid="count-new-session-header-btn">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                {{ translate("New session") }}
              </ion-button>
            </ion-list-header>
            <ion-button v-if="count.sessions?.length === 0" :disabled="count.statusId !== 'CYCLE_CNT_IN_PRGS'" expand="block" class="ion-margin-horizontal" @click="showAddNewSessionModal(count.workEffortId)" data-testid="count-start-new-session-btn">
              <ion-label>
                {{ translate("Start new session") }}
              </ion-label>
            </ion-button>
            <!-- TODO: Need to show the session on this device seperately from the other sessions -->
              <ion-item-group v-for="session in count.sessions" :key="session.inventoryCountImportId" :data-testid="'count-session-group-' + session.inventoryCountImportId">
                <ion-item v-if="Object.keys(session.lock || {}).length === 0" :detail="true" :button="true" :disabled="count.statusId !== 'CYCLE_CNT_IN_PRGS'" @click="checkAndNavigateToSession(session, count.workEffortPurposeTypeId)" :data-testid="'count-session-item-' + session.inventoryCountImportId">
                  <ion-label data-testid="count-session-item-label">
                    <span data-testid="count-session-name-text">{{ session.countImportName }} {{ session.facilityAreaId }}</span>
                    <p data-testid="count-session-user-text">{{ translate("created by") }} {{ session.uploadedByUserLogin }}</p>
                  </ion-label>
                  <ion-note slot="end" data-testid="count-session-status-note">
                    {{ getSessionStatusDescription(session.statusId) }}
                  </ion-note>
                </ion-item>

                <!-- Locked by another user -->
                <ion-item v-else-if="session.lock?.userId && session.lock?.userId !== useUserProfile().getUserProfile.username" :data-testid="'count-session-item-locked-' + session.inventoryCountImportId">
                  <ion-label data-testid="count-session-locked-label">
                    <span data-testid="count-session-locked-name">{{ session.countImportName }} {{ session.facilityAreaId }}</span>
                    <p data-testid="count-session-locked-msg">{{ translate("Session already active for") }} {{ session.lock?.userId }}</p>
                  </ion-label>
                  <ion-button v-if="useUserProfile().hasPermission('COMMON_ADMIN OR INV_COUNT_ADMIN OR INV_COUNT_LOCK_RLS')" color="danger" fill="outline" slot="end" size="small" @click.stop="forceRelease(session)" :data-testid="'count-force-release-btn-' + session.inventoryCountImportId">
                    {{ translate("Force Release") }}
                  </ion-button>
                  <ion-note v-else color="warning" slot="end" data-testid="count-session-locked-note">{{ translate("Locked") }}</ion-note>
                </ion-item>

              <!-- Locked by same user, same device -->
              <ion-item v-else-if="session.lock?.userId && session.lock?.userId === useUserProfile().getUserProfile.username && session.lock?.deviceId === currentDeviceId" :detail="true" button :router-link="`/session-count-detail/${session.workEffortId}/${count.workEffortPurposeTypeId}/${session.inventoryCountImportId}`" :data-testid="'count-session-item-active-' + session.inventoryCountImportId">
                <ion-label data-testid="count-session-active-label">
                  <span data-testid="count-session-active-name">{{ session.countImportName }} {{ session.facilityAreaId }}</span>
                  <p data-testid="count-session-active-msg">{{ translate("Session already active for this device") }}</p>
                </ion-label>
                <ion-note slot="end" data-testid="count-session-active-status-note">{{ getSessionStatusDescription(session.statusId) }}</ion-note>
              </ion-item>

                <!-- Locked by same user, different device -->
                <ion-item v-else-if="session.lock?.userId && session.lock?.userId === useUserProfile().getUserProfile.username && session.lock?.deviceId !== currentDeviceId" :data-testid="'count-session-item-active-other-device-' + session.inventoryCountImportId">
                  <ion-label data-testid="count-session-active-other-device-label">
                    <span data-testid="count-session-active-other-device-name">{{ session.countImportName }} {{ session.facilityAreaId }}</span>
                    <p data-testid="count-session-active-other-device-msg">{{ translate("Session already active on another device") }}</p>
                  </ion-label>
                  <ion-button color="danger" fill="outline" slot="end" size="small" @click.stop="forceRelease(session)" :data-testid="'count-force-release-other-device-btn-' + session.inventoryCountImportId">
                    {{ translate("Force Release") }}
                  </ion-button>
                </ion-item>
              </ion-item-group>


          </ion-list>
        </ion-card>
      </template>
      <div v-else class="empty-state" data-testid="count-empty-state">
        <img src="/img/empty-state/perform-cycle-count.png" alt="Performed cycle count"/>
        <h2 data-testid="count-empty-state-header">{{ translate("All caught up!") }}</h2>
        <p data-testid="count-empty-state-msg">{{ translate("You have no cycle counts assigned to you right now.") }}</p>
      </div>
      <ion-modal :is-open="isAddSessionModalOpen" @did-dismiss="isAddSessionModalOpen = false" :presenting-element="pageRef?.$el" :keep-contents-mounted="true" :backdrop-dismiss="false" data-testid="count-new-session-modal">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="isAddSessionModalOpen = false" fill="clear" aria-label="Close" data-testid="count-new-session-close-btn">
                  <ion-icon :icon="closeOutline" slot="icon-only" />
                </ion-button>
              </ion-buttons>
              <ion-title data-testid="count-new-session-title">{{ translate("New session") }}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-item data-testid="count-new-session-name-item">
              <ion-label position="stacked" data-testid="count-new-session-name-label">{{ translate("Name") }}</ion-label>
              <ion-input v-model="countName" placeholder="category, section, or person" data-testid="count-new-session-name-input"></ion-input>
              <ion-note slot="helper" data-testid="count-new-session-name-helper">{{ translate("Add a name to help identify what inventory is counted in this session") }}</ion-note>
            </ion-item>

            <ion-list data-testid="count-new-session-area-list">
              <ion-list-header data-testid="count-new-session-area-header">{{ translate("Area") }}</ion-list-header>

              <ion-radio-group v-model="selectedArea" data-testid="count-new-session-area-radio-group">
                <ion-item v-for="area in areas" :key="area.value" :data-testid="'count-new-session-area-item-' + area.value">
                  <ion-radio label-placement="start" :value="area.label" :data-testid="'count-new-session-area-radio-' + area.value">{{ area.label }}</ion-radio>
                </ion-item>
              </ion-radio-group>
            </ion-list>

            <ion-fab vertical="bottom" horizontal="end" slot="fixed" data-testid="count-new-session-fab">
              <ion-fab-button @click="addNewSession" data-testid="count-new-session-save-btn">
                <ion-icon :icon="checkmarkDoneOutline" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-modal>

      <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCount($event)" data-testid="count-infinite-scroll">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonItemGroup, IonLabel, IonList, IonNote, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, IonButtons, IonModal, IonFab, IonFabButton, IonListHeader, IonRadioGroup, IonRadio, IonRefresher, IonRefresherContent, IonInput, alertController } from '@ionic/vue';
import { addCircleOutline, closeOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { translate, commonUtil } from '@common';
import { computed, ref } from "vue";
import router from '@/router';
import { loader } from "@/services/uiUtils";
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';

import { DateTime } from 'luxon';
import { useUserProfile } from '@/stores/userProfileStore';
import { useProductStore } from '@/stores/productStore';


const cycleCounts = ref([]);
const isScrollable = ref(true);
let isLoading = ref(false);
const pageIndex = ref(0);
const pageSize = 250;

const currentFacility = computed(() => useProductStore().getCurrentFacility);
const isScrollingEnabled = ref(false);
const infiniteScrollRef = ref({});
const isAddSessionModalOpen = ref(false);
const selectedWorkEffortId = ref(null);
const pageRef = ref(null);
const currentDeviceId = useUserProfile().getDeviceId;
const loadingWorkEffortId = ref(null);

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

const isPlannedForFuture = (count) => {
  return count.estimatedStartDate && DateTime.fromMillis(count.estimatedStartDate) >= DateTime.now();
};

function getTimeUntil(time) {
  return DateTime.fromMillis(time).toRelative();
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
    commonUtil.showToast(translate('No facility is associated with this user'));
    return;
  }

  if (reset) {
    pageIndex.value = 0;
    cycleCounts.value.splice(0);
  }

  const params = {
    pageSize: pageSize,
    pageIndex: pageIndex.value,
    facilityId: currentFacility.value.facilityId,
    statusId: "CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS",
    statusId_op: 'in',
    thruDate_op: 'empty'
  };

  try {
    const { workEfforts, isScrollable: scrollable } = await useInventoryCountRun().getCreatedAndAssignedWorkEfforts(params);

    let combined = [];
    if (pageIndex.value === 0) {
      combined = [...workEfforts];
    } else {
      combined = [...cycleCounts.value, ...workEfforts];
    }
    cycleCounts.value = sortCycleCounts(combined);

    isScrollable.value = scrollable;
  } catch (err) {
    console.error('Error loading cycle counts:', err);
    commonUtil.showToast(translate('Failed to load cycle counts.'));
  } finally {
    isLoading.value = false;
  }
}

function sortCycleCounts(list) {
  return [...list].sort((predecessor, successor) => {
    const predecessorEstimatedStartDate = predecessor.estimatedStartDate;
    const successorEstimatedStartDate = successor.estimatedStartDate;

    if (!predecessorEstimatedStartDate && successorEstimatedStartDate) return -1;
    if (!successorEstimatedStartDate && predecessorEstimatedStartDate) return 1;
    if (!predecessorEstimatedStartDate && !successorEstimatedStartDate) return 0;

    return predecessorEstimatedStartDate - successorEstimatedStartDate;
  });
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
    const selectedCount = cycleCounts.value.find(cycleCount => cycleCount.workEffortId === selectedWorkEffortId.value)
    if (!selectedCount) {
      commonUtil.showToast("Unable to find selected count.")
      return
    }

    // Check the type of count
    const isHardCount = selectedCount.workEffortPurposeTypeId === "HARD_COUNT"
    let resp = null

    if (isHardCount) {
      // --- Create a new HARD COUNT session directly ---
      resp = await useInventoryCountRun().createSessionOnServer({
        countImportName: countName.value,
        statusId: "SESSION_CREATED",
        uploadedByUserLogin: useUserProfile().getUserProfile.username,
        facilityAreaId: selectedArea.value,
        createdDate: Date.now(),
        workEffortId: selectedWorkEffortId.value
      })
    } else {
      // --- DIRECTED COUNT: clone from oldest session ---
      const sessions = selectedCount.sessions || []
      if (sessions.length > 0) {
        // Sort by createdDate ascending
        const oldest = [...sessions].sort((predecessor, successor) => predecessor.createdDate - successor.createdDate)[0]
        if (oldest?.inventoryCountImportId) {
          resp = await useInventoryCountImport().cloneSession({
            inventoryCountImportId: oldest.inventoryCountImportId,
            facilityAreaId: selectedArea.value,
            countImportName: countName.value,
          })
        } else {
          // Fallback: no valid oldest found
          resp = await useInventoryCountRun().createSessionOnServer({
            countImportName: countName.value,
            statusId: "SESSION_CREATED",
            uploadedByUserLogin: useUserProfile().getUserProfile.username,
            facilityAreaId: selectedArea.value,
            createdDate: Date.now(),
            workEffortId: selectedWorkEffortId.value
          })
        }
      } else {
        // No sessions → create new one (same as HARD COUNT)
        resp = await useInventoryCountRun().createSessionOnServer({
          countImportName: countName.value,
          statusId: "SESSION_CREATED",
          uploadedByUserLogin: useUserProfile().getUserProfile.username,
          facilityAreaId: selectedArea.value,
          createdDate: Date.now(),
          workEffortId: selectedWorkEffortId.value
        })
      }
    }

    if (resp?.status !== 200) {
      commonUtil.showToast("Something Went Wrong!")
      console.error(resp)
      return
    }

    // --- Update UI ---
    commonUtil.showToast("Session added Successfully")
    const index = cycleCounts.value.findIndex(cycleCount => cycleCount.workEffortId === selectedWorkEffortId.value)
    if (index !== -1) {
      if (!cycleCounts.value[index].sessions) cycleCounts.value[index].sessions = []

      const newSession = {
        inventoryCountImportId: resp.data.inventoryCountImportId,
        countImportName: countName.value,
        statusId: "SESSION_CREATED",
        uploadedByUserLogin: useUserProfile().getUserProfile.username,
        facilityAreaId: selectedArea.value,
        createdDate: Date.now(),
        workEffortId: selectedWorkEffortId.value
      }
      cycleCounts.value[index].sessions.push(newSession)
    }

    countName.value = ''
    selectedArea.value = areas[0].value
    isAddSessionModalOpen.value = false
  } catch (err) {
    console.error("Error creating session:", err)
    commonUtil.showToast("Something Went Wrong!")
  }
}

function goToCountProgressReview(workEffortId, event) {
  event.stopPropagation();
  router.push(`/count-progress-review/${workEffortId}`);
}

async function markInProgress(workEffortId) {
  // Show loading spinner on the specific button
  loadingWorkEffortId.value = workEffortId;
  try {
    const response = await useInventoryCountRun().updateWorkEffort({
      workEffortId,
      statusId: 'CYCLE_CNT_IN_PRGS',
      actualStartDate: DateTime.now().toMillis()
    });
    if (response?.status === 200) {
      commonUtil.showToast(translate('Cycle Count is Active'));
      // Find the updated count and navigate to its first session if available
      const updatedCount = cycleCounts.value.find(c => c.workEffortId === workEffortId);
      if (updatedCount && updatedCount.sessions && updatedCount.sessions.length > 0) {
        const firstSession = updatedCount.sessions[0];
        router.push(`/session-count-detail/${workEffortId}/${updatedCount.workEffortPurposeTypeId}/${firstSession.inventoryCountImportId}`);
      }
    } else {
      commonUtil.showToast(translate('Failed to activate cycle count'));
    }
  } catch (err) {
    console.error('Error starting count:', err);
    commonUtil.showToast(translate('Failed to activate cycle count'));
  } finally {
    // Reset loading state
    loadingWorkEffortId.value = null;
  }
}

async function forceRelease(session) {
  const alert = await alertController.create({
    header: translate("Force release session"),
    message: translate("Make sure that this session is closed on all other devices before force releasing to avoid discrepancies in counts."),
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel",
      },
      {
        text: translate("Force release"),
        handler: async () => {
          try {
            await loader.present("Releasing Session...");
            const payload = {
              inventoryCountImportId: session.inventoryCountImportId,
              fromDate: session.lock?.fromDate,
              thruDate: Date.now(),
              overrideByUserId: useUserProfile().getUserProfile.username
            }

            const resp = await useInventoryCountImport().releaseSession(payload)
            if (resp?.status === 200) {
              commonUtil.showToast(translate('Session lock released successfully.'))

              // Remove lock locally so UI refreshes
              session.lock = {}
            } else {
              commonUtil.showToast(translate('Failed to release session lock.'))
            }
          } catch (err) {
            console.error('Error releasing session lock:', err)
            commonUtil.showToast(translate('Something went wrong while releasing session.'))
          } finally {
            loader.dismiss();
          }
        }
      }
    ]
  });
  await alert.present();
}

async function checkAndNavigateToSession(session, workEffortPurposeTypeId) {
  try {
    const userId = useUserProfile().getUserProfile.username;
    const deviceId = useUserProfile().getDeviceId;

    // Fetch the active lock for this session
    const resp = await useInventoryCountImport().getSessionLock({
      inventoryCountImportId: session.inventoryCountImportId,
    });

    const activeLock = resp?.data?.entityValueList?.[0];

    // If another user is already working, block navigation
    if (activeLock && activeLock.userId && activeLock.userId !== userId) {
      commonUtil.showToast(`This session is already active for ${activeLock.userId}.`);
      return;
    }

    //If same user but different device
    if (activeLock && activeLock.userId === userId && activeLock.deviceId !== deviceId) {
      commonUtil.showToast("This session is already active on another device.");
      return;
    }
    //Safe to navigate
    router.push(`/session-count-detail/${session.workEffortId}/${workEffortPurposeTypeId}/${session.inventoryCountImportId}`);
  } catch (err) {
    console.error('Error checking session lock before navigation:', err);
    commonUtil.showToast("Failed to check session lock. Please try again.");
  }
}

async function handleRefresh(event) {
  await getCycleCounts(true);
  await event.target.complete();
}
</script>

<style scoped>

ion-content {
 --padding-bottom: var(--spacer-2xl) 
}

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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-top: var(--spacer-2xl);
}

.empty-state img {
  max-width: 300px;
  margin-bottom: var(--spacer-lg);
}
</style>
