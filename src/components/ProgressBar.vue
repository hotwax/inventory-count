<template>
  <div class="progress-bar-wrapper ion-padding">
    <ion-label data-testid="progress-bar-title">{{ $t("Loading session items...") }}</ion-label>
    <ion-progress-bar class="ion-margin-vertical bar-width" :value="progressValue" data-testid="progress-bar-indicator"></ion-progress-bar>
    <ion-note data-testid="progress-bar-status">{{ loadedItems }} / {{ totalItems }}</ion-note>
  </div>
</template>

<script setup lang="ts">
import { IonLabel, IonProgressBar, IonNote } from '@ionic/vue'
import { computed, defineProps } from 'vue'
import i18n from '@/i18n'

const props = defineProps({
  totalItems: {
    type: Number,
    required: true
  },
  loadedItems: {
    type: Number,
    default: 0
  }
})

const progressValue = computed(() => {
  if (!props.totalItems) return 0
  return Math.min(props.loadedItems / props.totalItems, 1)
})
</script>

<style scoped>
.progress-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.bar-width {
  width: 60%;
}
</style>
