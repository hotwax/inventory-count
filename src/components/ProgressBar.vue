<template>
  <div class="progress-bar-wrapper">
    <ion-label>{{ translate("Loading cycle count") }}</ion-label>
    <ion-progress-bar class="ion-margin-vertical bar-width" :value="progressValue()"></ion-progress-bar>
    <ion-note>{{ cycleCountItemsProgress }} / {{ getTotalItems() }}</ion-note>
  </div>
</template>

<script setup>
import { IonLabel, IonProgressBar, IonNote } from '@ionic/vue';
import { computed, onMounted } from 'vue';
import { useStore } from "@/store";
import { useRoute } from 'vue-router';
import { translate } from '@hotwax/dxp-components';

const store = useStore();
const route = useRoute();
const cycleCountId = route.params.id || route.params.inventoryCountImportId;

const cycleCountItemsProgress = computed(() => store.getters["count/getCycleCountItemsProgress"]);
const cycleCountStats = computed(() => store.getters["count/getCycleCountStats"](cycleCountId));

onMounted(async() => {
  await store.dispatch("count/fetchCycleCountStats", cycleCountId)
})

function getTotalItems() {
  return cycleCountStats.value?.totalItems || 0;
}

function progressValue() {
  const total = getTotalItems();
  if(!total) return 0;
  return cycleCountItemsProgress.value / total;
}
</script>

<style scoped>
.progress-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.bar-width {
  width: 60%;
}
</style>