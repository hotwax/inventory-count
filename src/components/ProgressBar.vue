<template>
  <div class="progress-bar-wrapper">
    <ion-label>{{ translate("Loading cycle count") }}</ion-label>
    <ion-progress-bar class="ion-margin-vertical bar-width" :value="progressValue()"></ion-progress-bar>
    <ion-note>{{ props.existingItemsCount + props.cycleCountItemsProgress }} / {{ getTotalItems() }}</ion-note>
  </div>
</template>

<script setup>
import { IonLabel, IonProgressBar, IonNote } from '@ionic/vue';
import { computed, defineProps, onMounted } from 'vue';
import { useStore } from "@/store";
import { useRoute } from 'vue-router';
import { translate } from '@hotwax/dxp-components';

const store = useStore();
const route = useRoute();
const cycleCountId = route.params.id || route.params.inventoryCountImportId;
const cycleCountStats = computed(() => store.getters["count/getCycleCountStats"](cycleCountId));

const props = defineProps({
  cycleCountItemsProgress: {
    type: Number,
    default: 0
  },
  existingItemsCount: {
    type: Number,
    default: 0
  },
  uploadingItemsCount: {
    type: Number,
    default: 0
  }
});

onMounted(async() => {
  await store.dispatch("count/fetchCycleCountStats", cycleCountId)
})

function getTotalItems() {
  // If uploadingItemsCount is provided, use it for draft page csv upload scenario
  if(props.uploadingItemsCount) {
    return props.uploadingItemsCount + (props.existingItemsCount || 0);
  }
  return cycleCountStats.value?.totalItems || 0;
}

function progressValue() {
  const total = getTotalItems();
  if(!total) return 0;
  return (props.existingItemsCount + props.cycleCountItemsProgress) / total;
}
</script>

<style scoped>
.progress-bar-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.bar-width {
  width: 60%;
}
</style>