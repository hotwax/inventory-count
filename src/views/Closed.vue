<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Closed")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="assigned-filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <div class="list-item" v-for="count in cycleCounts" :key="count.workEffortId">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              <p class="overline" v-if="count.workEffortPurposeTypeId === 'HARD_COUNT'">{{ translate("HARD COUNT") }}</p>
              {{ count.workEffortName }}
              <p>{{ count.workEffortId }}</p>
            </ion-label>
          </ion-item>

          <ion-chip outline>
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>
        </div>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from '@/i18n';
import store from '@/store';
import { useUserStore } from '@hotwax/dxp-components';
import { IonPage, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonContent, IonList, IonItem, onIonViewDidEnter } from '@ionic/vue';
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { computed } from 'vue';

const cycleCounts = computed(() => store.getters["count/getClosedCounts"]);

onIonViewDidEnter(async () => {
  fetchClosedCycleCounts();
})

async function fetchClosedCycleCounts(vSize?: any, vIndex?: any) {
  const pageSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const pageIndex = vIndex ? vIndex : 0;
  const payload = {
    pageSize,
    pageIndex,
    currentStatusId: "CYCLE_CNT_IN_CLOSED"
  }
  await store.dispatch("count/getCycleCounts", payload);
}

function getFacilityName(id: string) {
  return useUserStore().getFacilites.find((facility: any) => facility.facilityId === id)?.facilityName || id
}
</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}

.list-item {
  --columns-desktop: 7;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}
</style>