<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start">{{ currentFacility?.facilityName || currentFacility?.facilityId }}</ion-title>
        <ion-segment :value="selectedSegment" @ionChange="segmentChanged($event.detail.value)">
          <ion-segment-button value="assigned" @click="selectedSegment = 'assigned'">
            <ion-label>{{ translate("Assigned") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <template v-if="isLoading">
        <p class="empty-state">{{ translate("Fetching cycle counts...") }}</p>
      </template>
      <template v-if="selectedSegment === 'assigned'">
        <!-- no sessions -->
        <ion-card>
          <ion-card-header>
            <div>
              <ion-label color="warning" class="overline">
                {{ translate("HARD COUNT") }}
              </ion-label>
              <ion-card-title>
                Count name
              </ion-card-title>
              <ion-card-subtitle>
                created date
              </ion-card-subtitle>
            </div>
          </ion-card-header>
          <ion-item lines="none">
            {{ translate("Due date") }}
            <ion-label slot="end">
              <p>work effort due date</p>
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>
              <ion-label>
                Sessions
              </ion-label>
            </ion-list-header>
            <ion-button expand="block" class="ion-margin-horizontal" @click="showAddNewSessionModal">
              <ion-label>
                Start new session
              </ion-label>
            </ion-button>
          </ion-list>
        </ion-card>

        <!-- new session on device -->
        <ion-card>
          <ion-card-header>
            <div>
              <ion-label color="warning" class="overline">
                {{ translate("HARD COUNT") }}
              </ion-label>
              <ion-card-title>
                Count name
              </ion-card-title>
              <ion-card-subtitle>
                created date
              </ion-card-subtitle>
            </div>
          </ion-card-header>
          <ion-item lines="none">
            {{ translate("Due date") }}
            <ion-label slot="end">
              <p>work effort due date</p>
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>
              <ion-label>
                Sessions
              </ion-label>
              <ion-button fill="clear" size="small" @click="showAddNewSessionModal">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                New
              </ion-button>
            </ion-list-header>
            <!-- unassigned session -->
            <ion-item detail="true" :router-link="'/session-count-detail/M100010/HARD_COUNT/M100008'">
              <ion-label>
                Count name + Area name
                <p>
                  created by userlogin
                </p>
              </ion-label>
              <ion-note slot="end">
                Open
              </ion-note>
            </ion-item>
            <ion-item-group>
              <ion-item-divider color="light">
                <ion-label>
                  Other sessions
                </ion-label>
              </ion-item-divider>
              <ion-item detail="true">
                <ion-label>
                  Count name + Area name
                  <p>
                    created by userlogin
                  </p>
                </ion-label>
                <ion-note slot="end">
                  Submitted
                </ion-note>
              </ion-item>
            </ion-item-group>
          </ion-list>
        </ion-card>

        <!-- session started -->
        <ion-card>
          <ion-card-header>
            <div>
              <ion-label color="warning" class="overline">
                {{ translate("HARD COUNT") }}
              </ion-label>
              <ion-card-title>
                Count name
              </ion-card-title>
              <ion-card-subtitle>
                created date
              </ion-card-subtitle>
            </div>
          </ion-card-header>
          <ion-item lines="none">
            {{ translate("Due date") }}
            <ion-label slot="end">
              <p>work effort due date</p>
            </ion-label>
          </ion-item>
          <ion-list>
            <ion-list-header>
              <ion-label>
                Sessions
              </ion-label>
            </ion-list-header>
            <ion-item-group>
              <ion-item-divider color="light">
                <ion-label>
                  On this device
                </ion-label>
              </ion-item-divider>
              <ion-item detail="true" href="tabs/count-details/1001" router-direction="forward">
                <ion-label>
                  Count name + Area name
                  <p>
                    created by userlogin
                  </p>
                </ion-label>
                <ion-note slot="end">
                  In progress
                </ion-note>
              </ion-item>
            </ion-item-group>
            <ion-item-group>
              <ion-item-divider color="light">
                <ion-label>
                  Other sessions
                </ion-label>
              </ion-item-divider>
              <ion-item detail="true">
                <ion-label>
                  Count name + Area name
                  <p>
                    created by userlogin
                  </p>
                </ion-label>
                <ion-note slot="end">
                  Submitted
                </ion-note>
              </ion-item>
            </ion-item-group>
          </ion-list>
        </ion-card>
        
        <ion-card v-for="count in cycleCount" :key="count.inventoryCountImportId">
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
          <ion-list>
            <ion-list-header>
              <ion-label>
                Sessions
              </ion-label>
              <ion-button v-if="count.sessions?.length" fill="clear" size="small" @click="showAddNewSessionModal(count.workEffortId)">
                  <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                  New
              </ion-button>
            </ion-list-header>
            <ion-button v-if="count.sessions?.length === 0" expand="block" class="ion-margin-horizontal" @click="showAddNewSessionModal(count.workEffortId)">
              <ion-label>
                Start new session
              </ion-label>
            </ion-button>
              <ion-item-group v-for="session in count.sessions" :key="session.inventoryCountImportId">
              <ion-item>
                <ion-label>
                  {{ session.countImportName }} + {{ session.facilityAreaId }}
                  <p>
                    created By {{ session.uploadedByUserLogin }}
                  </p>
                </ion-label>
                <ion-note slot="end">
                  {{ getSessionStatusDescription(session.statusId) }}
                </ion-note>
              </ion-item>
            </ion-item-group>
          </ion-list>
        </ion-card>
        <AddNewSessionModal v-model:isOpen="isAddSessionModalOpen" :work-effort-id="selectedWorkEffortId"/>
      </template>
      <!-- <template v-else>
        <p class="empty-state">{{ translate("No cycle counts found") }}</p>
      </template> -->

      <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCount($event)">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter
} from '@ionic/vue';
import { addCircleOutline } from "ionicons/icons";
import { translate } from '@/i18n';
import { computed, ref } from "vue";
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'
import { getDateWithOrdinalSuffix, showToast } from "@/utils"
import { useUserStore } from '@hotwax/dxp-components';
import AddNewSessionModal from '@/components/AddNewSessionModal.vue';
// import { useInventoryCountImport } from '@/composables/useInventoryCountImportItem';

const store = useStore();
const router = useRouter()
const userStore = useUserStore();

const cycleCount = computed(() => store.getters["count/getAssignedWorkEfforts"]);
const isScrollable = computed(() => store.getters["count/isCycleCountScrollable"])
const currentFacility = computed(() => userStore.getCurrentFacility)
// const cycleCountStats = computed(() => (id) => store.getters["count/getCycleCountStats"](id))
const userProfile = store.getters["user/getUserProfile"];

const selectedSegment = ref("assigned");
const isScrollingEnabled = ref(false);
const contentRef = ref({});
const infiniteScrollRef = ref({});
let isLoading = ref(false);
const isAddSessionModalOpen = ref(false);
const selectedWorkEffortId = ref(null);
onIonViewDidEnter(async() => {
  isLoading.value = true;
  await fetchCycleCounts();
  isLoading.value = false;
  // useInventoryCountImport();
})

// TODO: Fetch the status description when the app loads.
function getSessionStatusDescription(statusId) {
  if (!statusId) {
    return "";
  }
  if (statusId === "CYCLE_CNT_CREATED") {
    return "Created";
  } else if (statusId === "CYCLE_CNT_IN_PRGS") {
    return "In Progress";
  } else if (statusId === "CYCLE_CNT_IN_CMPLTD") {
    return "Completed";
  } else {
    return "Cancelled"
  }
}

function showAddNewSessionModal(workEffortId) {
  isAddSessionModalOpen.value = true;
  selectedWorkEffortId.value = workEffortId;
}

function enableScrolling() {
  // Make sure refs exist and DOM is ready
  const parentElement = contentRef.value?.$el
  if (!parentElement) return

  // Get the internal scrollable element inside ion-content
  const scrollEl = parentElement.shadowRoot?.querySelector("div[part='scroll']")
  if (!scrollEl || !infiniteScrollRef.value?.$el) return

  const scrollHeight = scrollEl.scrollHeight
  const infiniteHeight = infiniteScrollRef.value.$el.offsetHeight
  const scrollTop = scrollEl.scrollTop
  const threshold = 100
  const height = scrollEl.offsetHeight

  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height

  // Enable or disable scroll based on distance
  isScrollingEnabled.value = distanceFromInfinite >= 0
}

async function loadMoreCycleCount(event) {
  // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  fetchCycleCounts(
    undefined,
    Math.ceil(
      cycleCount.value?.length / (process.env.VUE_APP_VIEW_SIZE)
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
  console.log("This is store: ", store);
  await store.dispatch("count/getAssignedWorkEfforts", payload);
}

async function segmentChanged(value) {
  isLoading.value = true;
  selectedSegment.value = value
  await fetchCycleCounts()
  isLoading.value = false;
}

function navigateToStoreView(count) {
  router.push((count.countTypeEnumId === "HARD_COUNT" && count.statusId === "INV_COUNT_ASSIGNED") ? `/count-detail/hard/${count.inventoryCountImportId}` : `/count-detail/${count.inventoryCountImportId}`);
}

function getStatusIdForCountsToBeFetched() {
  if(selectedSegment.value === "assigned") {
    return "CYCLE_CNT_IN_PRGS"
  } else if(selectedSegment.value === "pendingReview") {
    return "INV_COUNT_REVIEW"
  } else {
    return "INV_COUNT_COMPLETED"
  }
}

// function getSubmissionDate(count) {
//   const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory
//   if(!history) {
//     return "-";
//   }

//   const submissionStatus = history.toReversed().find((status) => status.statusId === "INV_COUNT_REVIEW")
//   return getDateWithOrdinalSuffix(submissionStatus?.statusDate)
// }

// function getClosedDate(count) {
//   const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory
//   if(!history) {
//     return "-";
//   }

//   const submissionStatus = history.toReversed().find((status) => status.statusId === "INV_COUNT_COMPLETED")
//   return getDateWithOrdinalSuffix(submissionStatus?.statusDate)
// }
</script> 

<style scoped>

ion-card {
  max-width: 450px;
  margin-inline: auto;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacer-sm);
}
</style>


