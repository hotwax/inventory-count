<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title slot="start">{{ translate("Count name") }}</ion-title>
        <ion-segment :value="selectedSegment">
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
        <section> 
          <template v-for="count in cycleCount" :key="count.inventoryCountImportId" >
            <ion-card v-if="selectedSegment === 'assigned' && count.statusId === 'INV_COUNT_CREATED'" @click="navigateToStoreView(count.inventoryCountImportId)">
              <ion-card-header>
                <ion-card-title>
                  {{ count.countImportName }}
                  <ion-label>
                    <p>created date</p>
                  </ion-label>
                </ion-card-title>
                <ion-note>10 items</ion-note>
              </ion-card-header>
              <ion-item lines="none">
                {{ translate("Due date") }}
                <ion-label slot="end">
                  <p>{{ getTime(count.dueDate) }}</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </template> 
        </section>

        <section>  
          <template v-for="count in cycleCount" :key="count.inventoryCountImportId">
            <ion-card v-if="selectedSegment === 'pendingReview' && count.statusId === 'INV_COUNT_REVIEW'" @click="navigateToStoreView(count.inventoryCountImportId)">
              <ion-card-header>
                <ion-card-title>
                  {{ count.countImportName }}
                  <ion-label>
                    <p>created date</p>
                  </ion-label>
                </ion-card-title>
                <ion-note>9/10 items counted</ion-note>
              </ion-card-header>
              <ion-item>
                {{ translate("Due date") }}
                <ion-label slot="end">
                  <p>2nd July 2024</p>
                </ion-label>
              </ion-item>
              <ion-item lines="none">
                {{ translate("Submission date") }}
                <ion-label slot="end">
                  <p>1st July 2024</p>
                </ion-label>
              </ion-item>
            </ion-card>
          </template>
        </section>

        <section> 
          <template v-for="count in cycleCount" :key="count.inventoryCountImportId">
            <ion-card v-if="selectedSegment === 'closed' && (count.statusId === 'INV_COUNT_COMPLETED' || count.statusId === 'INV_COUNT_REJECTED')" @click="navigateToStoreView(count.inventoryCountImportId)">
              <ion-card-header>
                <ion-card-title>
                  {{ count.countImportName }}
                  <ion-label>
                    <p>created date</p>
                  </ion-label>
                </ion-card-title>
                <ion-note>9/10 items counted</ion-note>
              </ion-card-header>
              <div class="header">
                <div class="search">
                  <ion-item>
                    {{ translate("Due date") }}
                    <ion-label slot="end">
                      <p>2nd July 2024</p>
                    </ion-label>
                  </ion-item>
                  <ion-item>
                    {{ translate("Submission date") }}
                    <ion-label slot="end">
                      <p>1st July 2024</p>
                    </ion-label>
                  </ion-item>
                  <ion-item lines="none">
                    {{ translate("Closed date") }}
                    <ion-label slot="end">
                      <p>1st July 2024</p>
                    </ion-label>
                  </ion-item>
                </div>
                <div class="filters">
                  <ion-item>
                    {{ translate("Rejected") }}
                    <ion-label slot="end">
                      <p>4</p>
                    </ion-label>
                  </ion-item>
                  <ion-item>
                    {{ translate("Total variance") }}
                    <ion-label slot="end">
                      <p>2</p>
                    </ion-label>
                  </ion-item>
                </div>
              </div>
            </ion-card>
          </template> 
        </section>
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
import { DateTime } from 'luxon';
import { translate } from '@/i18n';
import { computed, ref } from "vue";
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'
import { UtilService } from '@/services/UtilService';

const store = useStore();
const router = useRouter()

const cycleCount = computed(() => store.getters["pickerCount/getCycleCount"]);
const isScrollable = computed(() => store.getters["pickerCount/isCycleCountScrollable"])

const selectedSegment = ref('assigned');
const isScrollingEnabled = ref(false);
const contentRef = ref({});
const infiniteScrollRef = ref({});

onIonViewDidEnter(async() => {
  fetchCycleCounts();
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
  const payload = {
    pageSize,
    pageIndex,
  };
  await store.dispatch("pickerCount/fetchCycleCounts", payload);
}

function getTime(time) {
  if (!time) return '';
  const dateTime = DateTime.fromMillis(time);
  const suffix = UtilService.getOrdinalSuffix(dateTime.day);

  return `${dateTime.day}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
}

function navigateToStoreView(countId) {
  router.push(`/count-detail/${countId}`)
}

</script> 

<style scoped>

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0px;
}

main {
  margin: var(--spacer-base) auto 0;
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


