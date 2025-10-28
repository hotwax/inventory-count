<template>
    <ion-page>
        <ion-header>
        <ion-toolbar>
            <ion-title>{{ translate("Draft")}}</ion-title>
        </ion-toolbar>
        </ion-header>
        <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
            <p v-if="!cycleCounts.length" class="empty-state">
                {{ translate("No cycle counts found") }}
            </p>
            <ion-list v-else class="list">
                <ion-item lines="full" v-for="count in cycleCounts" :key="count.workEffortId" button detail>
                    <ion-label>
                        <p class="overline" v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
                        {{ count.workEffortName }}
                    </ion-label>
                </ion-item>
            </ion-list>
            <ion-infinite-scroll ref="infiniteScrollRef" v-show="isScrollable" threshold="100px" @ionInfinite="loadMoreCycleCounts($event)">
                <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
            </ion-infinite-scroll>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import { translate, useUserStore } from '@hotwax/dxp-components';
import { IonPage, IonHeader, IonContent, onIonViewDidEnter, IonList, IonLabel, onIonViewDidLeave, onIonViewWillLeave } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'

const isLoading = ref(false);
const store = useStore();
const router = useRouter()
const userStore = useUserStore();

const isScrollingEnabled = ref(false);
const contentRef = ref({}) as any
const infiniteScrollRef = ref({}) as any

const cycleCounts = computed(() => store.getters["count/getDraftWorkEfforts"]);
const isScrollable = computed(() => store.getters["count/isScrollable"]);

onIonViewDidEnter(async () => {
    isLoading.value = true;
    fetchDraftCycleCounts();
    isLoading.value = false;
});

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList", { workEffortStatusId: 'CYCLE_CNT_CREATED'})
})
async function fetchDraftCycleCounts(vSize?: any, vIndex?: any) {
    const pageSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
    const pageIndex = vIndex ? vIndex : 0;
    const payload = {
        pageSize,
        pageIndex,
        currentStatusId: "CYCLE_CNT_CREATED"
    };
    await store.dispatch("count/getCycleCounts", payload);
}

function enableScrolling() {
  const parentElement = contentRef.value.$el
  const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']")
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef?.value?.$el?.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
}

async function loadMoreCycleCounts(event: any) {
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  fetchDraftCycleCounts(
    undefined,
    Math.ceil(
      cycleCounts.value?.length / (process.env.VUE_APP_VIEW_SIZE as any)
    ).toString()
  ).then(async () => {
    await event.target.complete()})
}
</script>

<style scoped>
.list {
  padding: 6px 70px 0 70px;
}
</style>