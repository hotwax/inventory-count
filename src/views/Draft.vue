<template>
  <ion-page>
    <Filters menu-id="draft-filter" content-id="draft-filter"/>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" menu="start"/>
        <ion-title>{{ translate("Drafts") }}</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button menu="draft-filter" :disabled="!cycleCounts?.length">
            <ion-icon :icon="filterOutline" />
          </ion-menu-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content id="draft-filter">
      <p v-if="!cycleCounts.length" class="empty-state">
        {{ translate("No cycle counts found") }}
      </p>
      <ion-list v-else class="list">
        <ion-item lines="full" v-for="count in cycleCounts" :key="count.inventoryCountImportId" button detail @click="router.push(`/draft/${count.inventoryCountImportId}`)">
          <ion-label>
            {{ count.countImportName }}
            <p>{{ count.inventoryCountImportId }}</p>
          </ion-label>
          <ion-note slot="end" color="medium">{{ "items" }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button @click="createCycleCount">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
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
import { addOutline, filterOutline } from "ionicons/icons";
import { computed } from "vue"
import { translate } from "@/i18n";
import Filters from "@/components/Filters.vue"
import store from "@/store";
import { showToast } from "@/utils";
import router from "@/router";
import { DateTime } from "luxon";

const cycleCounts = computed(() => store.getters["count/getCounts"])

onIonViewWillEnter(async () => {
  await store.dispatch("count/fetchCycleCounts", {
    statusId: "INV_COUNT_CREATED"
  })
})

onIonViewWillLeave(async () => {
  await store.dispatch("count/clearCycleCountList")
  await store.dispatch("count/clearQuery")
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
        statusId: "INV_COUNT_CREATED",
        createdDate: DateTime.now()
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