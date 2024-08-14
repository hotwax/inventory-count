<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start">{{ translate("Count name") }}</ion-title>
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

    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <main>
        <template v-if="isLoading">
          <p class="empty-state">{{ translate("Fetching cycle counts...") }}</p>
        </template>
        <section v-else-if="cycleCount.length">
          <template v-if="selectedSegment === 'assigned'">
            <ion-card v-for="count in cycleCount" :key="count.inventoryCountImportId" @click="navigateToStoreView(count.inventoryCountImportId)" button>
              <ion-card-header>
                <ion-card-title>
                  {{ count.countImportName }}
                  <ion-label>
                    <p>{{ getDateWithOrdinalSuffix(count.createdDate) }}</p>
                  </ion-label>
                </ion-card-title>
                <ion-note>{{ cycleCountStats(count.inventoryCountImportId)?.totalItems }} {{ translate("items") }}</ion-note>
              </ion-card-header>
              <ion-item lines="none">
                {{ translate("Due date") }}
                <ion-label slot="end">
                  <p>{{ getDateWithOrdinalSuffix(count.dueDate) }}</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </template> 
          <template v-else-if="selectedSegment === 'pendingReview'">
            <ion-card button v-for="count in cycleCount" :key="count.inventoryCountImportId" @click="navigateToStoreView(count.inventoryCountImportId)">
              <ion-card-header>
                <ion-card-title>
                  {{ count.countImportName }}
                  <ion-label>
                    <p>{{ getDateWithOrdinalSuffix(count.createdDate) }}</p>
                  </ion-label>
                </ion-card-title>
                <ion-note>{{ getCycleCountStats(count.inventoryCountImportId) }} {{ translate("items counted") }}</ion-note>
              </ion-card-header>
              <ion-item>
                {{ translate("Due date") }}
                <ion-label slot="end">
                  <p>{{ getDateWithOrdinalSuffix(count.dueDate) }}</p>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                {{ translate("Submission date") }}
                <ion-label slot="end">
                  <p>{{ getSubmissionDate(count) }}</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </template>
          <template v-else>
            <ion-card v-for="count in cycleCount" :key="count.inventoryCountImportId" @click="navigateToStoreView(count.inventoryCountImportId)" button>
              <ion-card-header>
                <ion-card-title>
                  {{ count.countImportName }}
                  <ion-label>
                    <p>{{ getDateWithOrdinalSuffix(count.createdDate) }}</p>
                  </ion-label>
                </ion-card-title>
                <ion-note>{{ getCycleCountStats(count.inventoryCountImportId) }} {{ translate("items counted") }}</ion-note>
              </ion-card-header>
              <div class="header">
                <div class="search">
                  <ion-item>
                    {{ translate("Due date") }}
                    <ion-label slot="end">
                      <p>{{ getDateWithOrdinalSuffix(count.dueDate) }}</p>
                    </ion-label>
                  </ion-item>
                  <ion-item>
                    {{ translate("Submission date") }}
                    <ion-label slot="end">
                      <p>{{ getSubmissionDate(count) }}</p>
                    </ion-label>
                  </ion-item>
                  <ion-item lines="none">
                    {{ translate("Closed date") }}
                    <ion-label slot="end">
                      <p>{{ getClosedDate(count) }}</p>
                    </ion-label>
                  </ion-item>
                </div>
                <div class="filters">
                  <ion-item>
                    {{ translate("Rejected") }}
                    <ion-label slot="end">
                      <p>{{ cycleCountStats(count.inventoryCountImportId)?.totalItems }}</p>
                    </ion-label>
                  </ion-item>
                  <ion-item>
                    {{ translate("Total variance") }}
                    <ion-label slot="end">
                      <p>{{ cycleCountStats(count.inventoryCountImportId)?.totalVariance }}</p>
                    </ion-label>
                  </ion-item>
                </div>
              </div>
            </ion-card>
          </template> 
        </section>
        <template v-else>
          <p class="empty-state">{{ translate("No cycle counts found") }}</p>
        </template>
      </main>
      <ion-infinite-scroll
        @ionInfinite="loadMoreCycleCount($event)"
        threshold="100px"
        v-show="isScrollable"
        ref="infiniteScrollRef"
      >
        <ion-infinite-scroll-content
          loading-spinner="crescent"
          :loading-text="translate('Loading')"
        />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup>
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter
} from '@ionic/vue';
import { translate } from '@/i18n';
import { computed, ref } from "vue";
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'
import { getCycleCountStats, getDateWithOrdinalSuffix } from "@/utils"

const store = useStore();
const router = useRouter()

const cycleCount = computed(() => store.getters["count/getCycleCountsList"]);
const isScrollable = computed(() => store.getters["count/isCycleCountScrollable"])
const currentFacility = computed(() => store.getters["user/getCurrentFacility"])
const cycleCountStats = computed(() => (id) => store.getters["count/getCycleCountStats"](id))

const selectedSegment = ref("assigned");
const isScrollingEnabled = ref(false);
const contentRef = ref({});
const infiniteScrollRef = ref({});
let isLoading = ref(false);

onIonViewDidEnter(async() => {
  isLoading.value = true;
  await fetchCycleCounts();
  isLoading.value = false;
})

function enableScrolling() {
  const parentElement = contentRef.value.$el
  const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
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
  const pageSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const pageIndex = vIndex ? vIndex : 0;
  const facilityId = currentFacility.value?.facilityId
  const payload = {
    pageSize,
    pageIndex,
    facilityId,
    statusId: getStatusIdForCountsToBeFetched()
  };
  await store.dispatch("count/fetchCycleCountsLists", payload);
}

async function segmentChanged(value) {
  isLoading.value = true;
  selectedSegment.value = value
  await fetchCycleCounts()
  isLoading.value = false;
}

function navigateToStoreView(countId) {
  router.push(`/tabs/count-detail/${countId}`)
}

function getStatusIdForCountsToBeFetched() {
  if(selectedSegment.value === "assigned") {
    return "INV_COUNT_ASSIGNED"
  } else if(selectedSegment.value === "pendingReview") {
    return "INV_COUNT_REVIEW"
  } else {
    return "INV_COUNT_COMPLETED"
  }
}

function getSubmissionDate(count) {
  const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory
  if(!history) {
    return "-";
  }

  const submissionStatus = history.toReversed().find((status) => status.statusId === "INV_COUNT_REVIEW")
  return getDateWithOrdinalSuffix(submissionStatus?.statusDate)
}

function getClosedDate(count) {
  const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory
  if(!history) {
    return "-";
  }

  const submissionStatus = history.toReversed().find((status) => status.statusId === "INV_COUNT_COMPLETED")
  return getDateWithOrdinalSuffix(submissionStatus?.statusDate)
}
</script> 

<style scoped>
section {
  padding-bottom: 100px
}

ion-card {
  min-width: 400px;
  max-width: 650px;
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


