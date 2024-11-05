<template>
  <ion-page>
    <Filters menu-id="draft-filter" content-id="filter"/>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" menu="start"/>
        <ion-title>{{ translate("Drafts") }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="draft-filter">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="filter">
      <p v-if="!cycleCounts.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list v-else class="list">
        <ion-item lines="full" v-for="count in cycleCounts" :key="count.inventoryCountImportId" button detail @click="router.push(`/draft/${count.inventoryCountImportId}`)">
          <ion-label>
            {{ count.countImportName }}
            <p>{{ count.inventoryCountImportId }}</p>
          </ion-label>
          <ion-note slot="end" color="medium">{{ cycleCountStats(count.inventoryCountImportId)?.totalItems || 0 }} {{ translate("items") }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button @click="createCycleCount">
            <ion-icon :icon="documentOutline" />
          </ion-fab-button>
          <ion-fab-button @click="router.push('/bulkUpload')">
            <ion-icon :icon="documentsOutline" />
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFabList,
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
  onIonViewDidEnter,
  onIonViewWillLeave
} from "@ionic/vue";
import { addOutline, documentOutline, documentsOutline, filterOutline } from "ionicons/icons";
import { computed } from "vue"
import { translate } from "@/i18n";
import Filters from "@/components/Filters.vue"
import store from "@/store";
import { showToast } from "@/utils";
import router from "@/router";

const cycleCounts = computed(() => store.getters["count/getCounts"])
const cycleCountStats = computed(() => (id: string) => store.getters["count/getCycleCountStats"](id))

onIonViewDidEnter(async () => {
  await store.dispatch("count/fetchCycleCounts", {
    statusId: "INV_COUNT_CREATED"
  })
})

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList")
})

async function createCycleCount() {
  const createCountAlert = await alertController.create({
    header: translate("Create cycle count"),
    buttons: [{
      text: translate("Cancel"),
      role: "cancel"
    }, {
      text: translate("Save"),
      handler: (data: any) => {
        const name = data?.name;
        if(!name.trim()) {
          showToast(translate("Enter a valid cycle count name"))
          return false;
        }
      }
    }],
    inputs: [{
      name: "name",
      placeholder: translate("count name"),
      min: 0,
      type: "text"
    }]
  })

  createCountAlert.onDidDismiss().then(async (result: any) => {
    // considered that if a role is available on dismiss, it will be a negative role in which we don't need to perform any action
    if(result.role) {
      return;
    }

    const name = result.data?.values?.name?.trim();

    if(name) {
      // When initially creating the cycleCount we are just assigning it a name, all the other params are updated from the details page
      await store.dispatch("count/createCycleCount", {
        countImportName: name,
        statusId: "INV_COUNT_CREATED"
      })
    }
  })

  return createCountAlert.present();
}
</script>

<style scoped>
.list {
  padding: 6px 70px 0 70px;
}
ion-note {
  align-self: center;
  padding: 0;
}
</style>