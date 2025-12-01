<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start">{{ currentFacility?.facilityName || currentFacility?.facilityId }}</ion-title>
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
                {{ getDateTimeWithOrdinalSuffix(count.createdDate) }}
              </ion-card-subtitle>
            </div>
          </ion-card-header>
          <ion-item lines="none">
            {{ translate("Due date") }}
            <ion-label slot="end">
              <p>{{ getDateTimeWithOrdinalSuffix(count.estimatedCompletionDate) }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="count.estimatedStartDate" lines="none">
            {{ translate("Start date") }}
            <ion-label slot="end">
              <p>{{ getDateTimeWithOrdinalSuffix(count.estimatedStartDate) }}</p>
            </ion-label>
          </ion-item>
          <ion-button v-if="count.currentStatusId === 'CYCLE_CNT_CREATED'" expand="block" size="default" class="ion-margin" @click="markInProgress(count.workEffortId)" :disabled="isPlannedForFuture(count)">
            {{ translate("Start counting") }}
          </ion-button>
          <ion-button v-if="count.currentStatusId === 'CYCLE_CNT_CREATED'" expand="block" size="default" fill="outline" class="ion-margin" @click="goToCountProgressReview(count.workEffortId, $event)" :disabled="!count.sessions?.length">
            {{ translate("Preview count") }}
          </ion-button>
          <ion-button v-if="count.currentStatusId === 'CYCLE_CNT_IN_PRGS'" expand="block" size="default" fill="outline" class="ion-margin" @click="goToCountProgressReview(count.workEffortId, $event)" :disabled="!count.sessions?.length">
            {{ translate("Review progress") }}
          </ion-button>
          <!-- <ion-button v-if="count.currentStatusId === 'CYCLE_CNT_IN_PRGS'" expand="block" size="default" fill="clear" @click.stop="markAsCompleted(count.workEffortId)" :disabled="!count.sessions?.length || count.sessions.some(session => session.statusId === 'SESSION_CREATED' || session.statusId === 'SESSION_ASSIGNED')">
            {{ translate("Ready for review") }}
          </ion-button> -->

          <ion-list>
            <ion-list-header>
              <ion-label>
                {{ translate("Sessions") }}
              </ion-label>

              <ion-button v-if="count.sessions?.length" :disabled="count.currentStatusId !== 'CYCLE_CNT_IN_PRGS' || isPlannedForFuture(count)" fill="clear" size="small" @click="showAddNewSessionModal(count.workEffortId)">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                {{ translate("New") }}
              </ion-button>
            </ion-list-header>
            <ion-button v-if="count.sessions?.length === 0" :disabled="count.currentStatusId !== 'CYCLE_CNT_IN_PRGS' || isPlannedForFuture(count)" expand="block" class="ion-margin-horizontal" @click="showAddNewSessionModal(count.workEffortId)">
              <ion-label>
                {{ translate("Start new session") }}
              </ion-label>
            </ion-button>
            <!-- TODO: Need to show the session on this device seperately from the other sessions -->
              <ion-item-group v-for="session in count.sessions" :key="session.inventoryCountImportId">
                <ion-item v-if="Object.keys(session.lock || {}).length === 0" :detail="true" :button="true" :disabled="count.currentStatusId !== 'CYCLE_CNT_IN_PRGS' || isPlannedForFuture(count)" @click="checkAndNavigateToSession(session, count.workEffortPurposeTypeId)">
                  <ion-label>
                    {{ session.countImportName }} {{ session.facilityAreaId }}
                    <p>{{ translate("created by") }} {{ session.uploadedByUserLogin }}</p>
                  </ion-label>
                  <ion-note slot="end">
                    {{ getSessionStatusDescription(session.statusId) }}
                  </ion-note>
                </ion-item>

                <!-- Locked by another user -->
                <ion-item v-else-if="session.lock?.userId && session.lock?.userId !== useUserProfile().getUserProfile.username">
                  <ion-label>
                    {{ session.countImportName }} {{ session.facilityAreaId }}
                    <p>{{ translate("Session already active for") }} {{ session.lock?.userId }}</p>
                  </ion-label>
                  <ion-button v-if="hasPermission('APP_PWA_STANDALONE_ACCESS')" color="danger" fill="outline" slot="end" size="small" @click.stop="forceRelease(session)">
                    {{ translate("Force Release") }}
                  </ion-button>
                  <ion-note v-else color="warning" slot="end">{{ translate("Locked") }}</ion-note>
                </ion-item>

              <!-- Locked by same user, same device -->
              <ion-item v-else-if="session.lock?.userId && session.lock?.userId === useUserProfile().getUserProfile.username && session.lock?.deviceId === currentDeviceId" :detail="true" button :router-link="`/session-count-detail/${session.workEffortId}/${count.workEffortPurposeTypeId}/${session.inventoryCountImportId}`">
                <ion-label>
                  {{ session.countImportName }} {{ session.facilityAreaId }}
                  <p>{{ translate("Session already active for this device") }}</p>
                </ion-label>
                <ion-note slot="end">{{ getSessionStatusDescription(session.statusId) }}</ion-note>
              </ion-item>

                <!-- Locked by same user, different device -->
                <ion-item v-else-if="session.lock?.userId && session.lock?.userId === useUserProfile().getUserProfile.username && session.lock?.deviceId !== currentDeviceId">
                  <ion-label>
                    {{ session.countImportName }} {{ session.facilityAreaId }}
                    <p>{{ translate("Session already active on another device") }}</p>
                  </ion-label>
                  <ion-button color="danger" fill="outline" slot="end" size="small" @click.stop="forceRelease(session)">
                    {{ translate("Force Release") }}
                  </ion-button>
                </ion-item>
              </ion-item-group>


          </ion-list>
        </ion-card>
      </template>
      <ion-modal :is-open="isAddSessionModalOpen" @did-dismiss="isAddSessionModalOpen = false" :presenting-element="pageRef?.$el" :keep-contents-mounted="true" :backdrop-dismiss="false">
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
import { IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonItemGroup, IonLabel, IonList, IonNote, IonPage, IonTitle, IonToolbar, onIonViewDidEnter, IonButtons, IonModal, IonFab, IonFabButton, IonListHeader, IonRadioGroup, IonRadio, IonInput, alertController } from '@ionic/vue';
import { addCircleOutline, closeOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { translate } from '@/i18n';
import { computed, ref } from "vue";
import router from '@/router';
import { loader, showToast } from "@/services/uiUtils";
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { hasPermission } from '@/authorization';
import { DateTime } from 'luxon';
import { useUserProfile } from '@/stores/userProfileStore';
import { useProductStore } from '@/stores/productStore';
import { getDateTimeWithOrdinalSuffix } from '@/services/utils';


const cycleCounts = ref([]);
const isScrollable = ref(true);
let isLoading = ref(false);
const pageIndex = ref(0);
const pageSize = ref(Number(process.env.VUE_APP_VIEW_SIZE) || 20);

const currentFacility = computed(() => useProductStore().getCurrentFacility);
const isScrollingEnabled = ref(false);
const infiniteScrollRef = ref({});
const isAddSessionModalOpen = ref(false);
const selectedWorkEffortId = ref(null);
const pageRef = ref(null);
const currentDeviceId = useUserProfile().getDeviceId;

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
    showToast(translate('No facility is associated with this user'));
    return;
  }

  if (reset) {
    pageIndex.value = 0;
    cycleCounts.value.splice(0);
  }

  const params = {
    pageSize: pageSize.value,
    pageIndex: pageIndex.value,
    facilityId: currentFacility.value.facilityId,
    currentStatusId: "CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS",
    currentStatusId_op: 'in',
    thruDate_op: 'empty'
  };

  try {
    const { workEfforts, isScrollable: scrollable } = await useInventoryCountRun().getCreatedAndAssignedWorkEfforts(params);

    if (pageIndex.value === 0) {
      cycleCounts.value.splice(0, cycleCounts.value.length, ...workEfforts);
    } else {
      cycleCounts.value.push(...workEfforts);
    }

    isScrollable.value = scrollable;
  } catch (err) {
    console.error('Error loading cycle counts:', err);
    showToast(translate('Failed to load cycle counts.'));
  } finally {
    isLoading.value = false;
  }
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
      showToast("Unable to find selected count.")
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
      showToast("Something Went Wrong!")
      console.error(resp)
      return
    }

    // --- Update UI ---
    showToast("Session added Successfully")
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
    showToast("Something Went Wrong!")
  }
}

function goToCountProgressReview(workEffortId, event) {
  event.stopPropagation();
  router.push(`/count-progress-review/${workEffortId}`);
}

async function markInProgress(workEffortId) {
  const response = await useInventoryCountRun().updateWorkEffort({
    workEffortId,
    currentStatusId: 'CYCLE_CNT_IN_PRGS',
    actualStartDate: DateTime.now().toMillis()
  });
  if (response?.status === 200) {
    showToast(translate('Cycle Count is Active'));
    await getCycleCounts(true);
  } else showToast(translate('Failed to activate cycle count'));
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
            await loader.present();
            const payload = {
              inventoryCountImportId: session.inventoryCountImportId,
              fromDate: session.lock?.fromDate,
              thruDate: Date.now(),
              overrideByUserId: useUserProfile().getUserProfile.username
            }

            const resp = await useInventoryCountImport().releaseSession(payload)
            if (resp?.status === 200) {
              showToast(translate('Session lock released successfully.'))

              // Remove lock locally so UI refreshes
              session.lock = {}
            } else {
              showToast(translate('Failed to release session lock.'))
            }
          } catch (err) {
            console.error('Error releasing session lock:', err)
            showToast(translate('Something went wrong while releasing session.'))
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
      showToast(`This session is already active for ${activeLock.userId}.`);
      return;
    }

    //If same user but different device
    if (activeLock && activeLock.userId === userId && activeLock.deviceId !== deviceId) {
      showToast("This session is already active on another device.");
      return;
    }
    //Safe to navigate
    router.push(`/session-count-detail/${session.workEffortId}/${workEffortPurposeTypeId}/${session.inventoryCountImportId}`);
  } catch (err) {
    console.error('Error checking session lock before navigation:', err);
    showToast("Failed to check session lock. Please try again.");
  }
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
</style>
