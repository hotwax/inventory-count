<template>
  <ion-page>  
    <Filters menu-id="filter" content-id="filter"/>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" menu="start"/>
        <ion-title>{{ translate("Closed")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="filter" :disabled="!cycleCounts?.length">
            <ion-icon :icon="filterOutline"/>
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter">
      <p v-if="!cycleCounts.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <template v-else>
        <!-- TODO: implement this as does not have support for the same in the apis for now -->
        <!-- <div class="header">
          <div class="search">
            <ion-item lines="full">
              <ion-icon slot="start" :icon="listOutline"/>
              <ion-label>{{ translate("Counts closed") }}</ion-label>
              <ion-label slot="end">14</ion-label>
            </ion-item>
          </div>
          <div class="filters">
            <ion-item lines="full">
              <ion-icon slot="start" :icon="thermometerOutline"/>
              <ion-label>{{ translate("Average variance") }}</ion-label>
              <ion-label slot="end">50%</ion-label>
            </ion-item>
          </div>
        </div> -->

        <div class="list-item" v-for="count in cycleCounts" :key="count.inventoryCountImportId">
          <ion-item lines="none">
            <ion-icon :icon="storefrontOutline" slot="start"></ion-icon>
            <ion-label>
              {{ count.countImportName }}
              <p>{{ count.inventoryCountImportId }}</p>
            </ion-label>
          </ion-item>

          <ion-chip outline>
            <ion-label>{{ getFacilityName(count?.facilityId) }}</ion-label>
          </ion-chip>

          <ion-label>
            {{ getCycleCountStats(count.inventoryCountImportId) }}
            <p>{{ translate("products counted") }}</p>
          </ion-label>

          <ion-label>
            {{ cycleCountStats(id)?.rejectedCount || 0 }}
            <p>{{ translate("rejected counts") }}</p>
          </ion-label>

          <ion-label>
            {{ cycleCountStats(id)?.totalVaraince || 0 }}
            <p>{{ translate("total variance") }}</p>
          </ion-label>

          <ion-label class="ion-padding">
            {{ getDateWithOrdinalSuffix(count.closedDate) }}
            <p>{{ translate("closed") }}</p>
          </ion-label>
        </div>
      </template>

      <!-- TODO: need to implement support to download cycle counts, will be picked in second phase -->
      <!-- <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="openClosedCountModal">
          <ion-icon :icon="cloudDownloadOutline" />
        </ion-fab-button>
      </ion-fab> -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButtons,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  alertController,
  onIonViewWillEnter,
  onIonViewWillLeave
} from "@ionic/vue";
import { cloudDownloadOutline, filterOutline, listOutline, storefrontOutline, thermometerOutline } from "ionicons/icons";
import { computed } from "vue"
import { translate } from "@/i18n";
import Filters from "@/components/Filters.vue"
import store from "@/store";
import { getDateWithOrdinalSuffix, showToast } from "@/utils";
import router from "@/router";

const cycleCounts = computed(() => store.getters["count/getCounts"])
const facilities = computed(() => store.getters["user/getFacilities"])
const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))

onIonViewWillEnter(async () => {
  await store.dispatch("count/fetchCycleCounts", {
    statusId: "INV_COUNT_CLOSED"
  })
})

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList")
  await store.dispatch("count/clearQuery")
})

function getFacilityName(id: string) {
  return facilities.value.find((facility: any) => facility.facilityId === id)?.facilityName || id
}

function getCycleCountStats(id: string) {
  const stats = cycleCountStats.value(id)
  return stats ? `${stats.itemCounted}/${stats.totalItems}` : '0/0'
}
</script>

<style scoped>
.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.search {
  grid-column: 1 / 2;
}

.filters {
  grid-column: 2 / 3;
}

</style>
