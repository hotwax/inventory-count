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
                {{ count.workEfforName }}
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
          <ion-list>
            <ion-list-header>
              <ion-label>
                Sessions
              </ion-label>

              <ion-button v-if="selectedSegment === 'assigned' && count.sessions?.length" fill="clear" size="small" @click="showAddNewSessionModal(count.workEffortId)">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                New
              </ion-button>
            </ion-list-header>
            <ion-button v-if="count.sessions?.length === 0" expand="block" class="ion-margin-horizontal" @click="showAddNewSessionModal(count.workEffortId)">
              <ion-label>
                Start new session
              </ion-label>
            </ion-button>
            <!-- TODO: Need to show the session on this device seperately from the other sessions -->
              <ion-item-group v-for="session in count.sessions" :key="session.inventoryCountImportId">
              <ion-item :detail="selectedSegment === 'assigned'" :button="selectedSegment === 'assigned'" :router-link="selectedSegment === 'assigned' ? `/session-count-detail/${session.workEffortId}/${count.workEffortPurposeTypeId}/${session.inventoryCountImportId}` : undefined">
                <ion-label>
                  {{ session.countImportName }} {{ session.facilityAreaId }}
                  <p>
                    created by {{ session.uploadedByUserLogin }}
                  </p>
                </ion-label>
                <ion-note slot="end">
                  {{ getSessionStatusDescription(session.statusId) }}
                </ion-note>
              </ion-item>
            </ion-item-group>

            <ion-item v-if="selectedSegment === 'assigned'" lines="none">
              <ion-button expand="block" size="default" fill="clear" slot="end" @click.stop="markAsCompleted(count.workEffortId)" :disabled="!count.sessions?.length || count.sessions.some(s => s.statusId !== 'SESSION_SUBMITTED')">
                {{ translate("READY FOR REVIEW") }}
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
              <ion-title>New session</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-item>
              <ion-label position="stacked">Name</ion-label>
              <ion-input v-model="countName" placeholder="category, section, or person"></ion-input>
              <ion-note slot="helper">Add a name to help identify what inventory is counted in this session</ion-note>
            </ion-item>

            <ion-list>
              <ion-list-header>Area</ion-list-header>

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
import { useRouter } from 'vue-router';
import { getDateWithOrdinalSuffix, showToast } from "@/utils";
import { useUserStore } from '@hotwax/dxp-components';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';


const { updateWorkEffort } = useInventoryCountImport();
const store = useStore();
const router = useRouter();
const userStore = useUserStore();

const cycleCounts = computed(() => store.getters["count/getAssignedWorkEfforts"]);
const isScrollable = computed(() => store.getters["count/isCycleCountScrollable"]);
const currentFacility = computed(() => userStore.getCurrentFacility);
const selectedSegment = ref("assigned");
const isScrollingEnabled = ref(false);
const infiniteScrollRef = ref({});
let isLoading = ref(false);
const isAddSessionModalOpen = ref(false);
const selectedWorkEffortId = ref(null);
const pageRef = ref(null);

onIonViewDidEnter(async () => {
  isLoading.value = true;
  await fetchCycleCounts();
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
  if (!scrollEl || !infiniteScrollRef.value?.$el) return;

  const scrollHeight = scrollEl.scrollHeight;
  const infiniteHeight = infiniteScrollRef.value.$el.offsetHeight;
  const scrollTop = scrollEl.scrollTop;
  const threshold = 100;
  const height = scrollEl.offsetHeight;

  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height;
  isScrollingEnabled.value = distanceFromInfinite >= 0;
}

async function loadMoreCycleCount(event) {
  if (!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  fetchCycleCounts(
    undefined,
    Math.ceil(
      cycleCounts.value?.length / (process.env.VUE_APP_VIEW_SIZE)
    ).toString()
  ).then(async () => {
    await event.target.complete();
  });
}

async function fetchCycleCounts(vSize, vIndex) {
  if(!currentFacility.value?.facilityId) {
    showToast(translate("No facility is associated with this user"));
    return;
  }
  const pageSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const pageIndex = vIndex ? vIndex : 0;
  const facilityId = currentFacility.value?.facilityId
  const payload = {
    pageSize,
    pageIndex,
    facilityId,
    currentStatusId: getStatusIdForCountsToBeFetched()
  };
  await store.dispatch("count/getAssignedWorkEfforts", payload);
}

async function segmentChanged(value) {
  isLoading.value = true;
  selectedSegment.value = value
  await fetchCycleCounts()
  isLoading.value = false;
}

function getStatusIdForCountsToBeFetched() {
  if (selectedSegment.value === "assigned") return "CYCLE_CNT_IN_PRGS";
  if (selectedSegment.value === "pendingReview") return "CYCLE_CNT_IN_CMPLTD";
  return "CYCLE_CNT_IN_CLOSED";
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
  const resp = await useInventoryCountImport().createSessionOnServer({
    countImportName: countName.value,
    statusId: "SESSION_ASSIGNED",
    uploadedByUserLogin: store.getters["user/getUserProfile"].username,
    facilityAreaId: selectedArea.value,
    createdDate: Date.now(),
    dueDate: Date.now(),
    workEffortId: selectedWorkEffortId.value
  });

  if (resp?.status !== 200) {
    showToast("Something Went Wrong!");
    console.error(resp);
  } else {
    showToast("Session added Successfully");
  }
  isAddSessionModalOpen.value = false;
}
async function markAsCompleted(workEffortId) {

  try {
    const response = await updateWorkEffort({workEffortId, currentStatusId: 'CYCLE_CNT_IN_CMPLTD'});

    if (response && response.status === 200) {
      // const index = cycleCounts.value.findIndex(c => c.workEffortId === workEffortId);
      // console.log("Index of updated work effort:", index);
      // if (index !== -1) {
      //   cycleCounts.value.splice(index, 1);
      // }

      showToast(translate("Session sent for review successfully"));
      await fetchCycleCounts();
    } else {
      showToast(translate("Failed to send session for review"));
    }
  } catch (err) {
    console.error("Error updating status:", err);
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
