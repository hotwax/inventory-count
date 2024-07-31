<template>
  <ion-page>
    <Filters menu-id="filter" content-id="filter"/>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Pending review")}}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter">
      <p v-if="!cycleCounts.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list v-else>
        <div class="list-item" v-for="count in cycleCounts" :key="count.inventoryCountImportId" @click="router.push(`/pending-review/${count.inventoryCountImportId}`)">
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
            <!-- TODO: make it dynamic currently not getting stats correctly -->
            {{ getCycleCountStats(count.inventoryCountImportId) }}
            <p>{{ translate("counted") }}</p>
          </ion-label>

          <ion-label>
            {{ getDateWithOrdinalSuffix(count.dueDate) }}
            <p>{{ translate("due date") }}</p>
          </ion-label>
          
          <ion-item lines="none">
            <ion-badge :color="getDerivedStatusForCount(count)?.color" slot="end">{{ translate(getDerivedStatusForCount(count)?.label) }}</ion-badge>
          </ion-item>
        </div>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from '@/i18n'
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { IonButtons, IonBadge, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonTitle, IonToolbar, onIonViewWillLeave, onIonViewDidEnter } from "@ionic/vue";
import { computed } from "vue"
import store from "@/store"
import router from "@/router"
import Filters from "@/components/Filters.vue"
import { getCycleCountStats, getDateWithOrdinalSuffix, getDerivedStatusForCount, getFacilityName } from "@/utils"

const cycleCounts = computed(() => store.getters["count/getCounts"])

onIonViewDidEnter(async () => {
  await store.dispatch("count/fetchCycleCounts", {
    statusId: "INV_COUNT_REVIEW"
  })
})

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList")
  await store.dispatch("count/clearQuery")
})
</script>

<style scoped>
.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}
</style>
