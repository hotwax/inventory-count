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
            {{ "-" }}
            <p>{{ translate("counter") }}</p>
          </ion-label>

          <ion-label>
            {{ count.dueDate || "-" }}
            <p>{{ translate("due date") }}</p>
          </ion-label>
          
          <ion-item lines="none">
            <ion-badge slot="end">{{ translate(getDerivedStatusForCount(count)) }}</ion-badge>
          </ion-item>
        </div>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from '@/i18n'
import { filterOutline, storefrontOutline } from "ionicons/icons";
import { IonButtons, IonBadge, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonTitle, IonToolbar, onIonViewWillLeave } from "@ionic/vue";
import { onMounted, computed } from "vue"
import store from "@/store"
import router from "@/router"
import Filters from "@/components/Filters.vue"
import { getDerivedStatusForCount } from "@/utils"

const cycleCounts = computed(() => store.getters["count/getCounts"])
const facilities = computed(() => store.getters["user/getFacilities"])

onMounted(async () => {
  await store.dispatch("count/fetchCycleCounts", {
    statusId: "INV_COUNT_REVIEW"
  })
})

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList")
})

function getFacilityName(id: string) {
  return facilities.value.find((facility: any) => facility.facilityId === id)?.facilityName || id
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
</style>
