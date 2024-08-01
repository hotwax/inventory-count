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
        <div class="header">
          <ion-item lines="full">
            <ion-icon slot="start" :icon="listOutline"/>
            <ion-label>{{ translate("Counts closed") }}</ion-label>
            <ion-label slot="end">{{ cycleCounts.length }}</ion-label>
          </ion-item>
          <ion-item lines="full">
            <ion-icon slot="start" :icon="thermometerOutline"/>
            <ion-label>{{ translate("Average variance") }}</ion-label>
            <ion-label slot="end">{{ getAverageVariance() }}</ion-label>
          </ion-item>
        </div>

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
            {{ cycleCountStats(count.inventoryCountImportId)?.rejectedCount || 0 }}
            <p>{{ translate("rejected counts") }}</p>
          </ion-label>

          <ion-label>
            {{ cycleCountStats(count.inventoryCountImportId)?.totalVariance || 0 }}
            <p>{{ translate("total variance") }}</p>
          </ion-label>

          <ion-label class="ion-padding">
            {{ getClosedDate(count) }}
            <p>{{ translate("closed") }}</p>
          </ion-label>
        </div>
      </template>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="openDownloadClosedCountModal">
          <ion-icon :icon="cloudDownloadOutline" />
        </ion-fab-button>
      </ion-fab>
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
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  modalController,
  onIonViewWillEnter,
  onIonViewWillLeave
} from "@ionic/vue";
import { cloudDownloadOutline, filterOutline, listOutline, storefrontOutline, thermometerOutline } from "ionicons/icons";
import { computed } from "vue"
import { translate } from "@/i18n";
import Filters from "@/components/Filters.vue"
import store from "@/store";
import { getCycleCountStats, getDateWithOrdinalSuffix, getFacilityName } from "@/utils";
import DownloadClosedCountModal from "@/components/DownloadClosedCountModal.vue";

const cycleCounts = computed(() => store.getters["count/getCounts"])
const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))

onIonViewWillEnter(async () => {
  await store.dispatch("count/fetchCycleCounts", {
    statusId: "INV_COUNT_CLOSED,INV_COUNT_COMPLETED,INV_COUNT_REJECTED",
    statusId_op: "in"
  })
})

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList")
})

function getClosedDate(count: any) {
  const history = cycleCountStats.value(count.inventoryCountImportId)?.statusHistory
  if(!history) {
    return "-";
  }

  const submissionStatus = history.toReversed().find((status: any) => status.statusId === "INV_COUNT_COMPLETED")
  return getDateWithOrdinalSuffix(submissionStatus?.statusDate)
}

function getAverageVariance() {
  // TODO: add support to display average variance
  return "-"
}

async function openDownloadClosedCountModal() {
  const downloadClosedCountModal = await modalController.create({
    component: DownloadClosedCountModal,
    showBackdrop: false,
  });

  await downloadClosedCountModal.present();
}

</script>

<style scoped>
ion-content {
  --padding-bottom: 80px;
}

.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
</style>
