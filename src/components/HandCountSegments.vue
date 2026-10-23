<template>
  <ion-segment :value="modelValue" data-testid="handcount-segment" @ion-change="$emit('update:modelValue', $event.detail.value)">
    <ion-segment-button value="assigned" data-testid="handcount-assigned-tab">
      <ion-label>{{ translate('Assigned') }} ({{ assignedCount }})</ion-label>
    </ion-segment-button>
    <ion-segment-button value="uncounted" data-testid="handcount-uncounted-tab">
      <ion-label>{{ translate('Uncounted', { uncountedItemsLength: uncountedCount }) }}</ion-label>
    </ion-segment-button>
    <ion-segment-button value="counted" data-testid="handcount-counted-tab">
      <ion-label>{{ translate('Counted', { countedItemsLength: assignedCount - uncountedCount }) }}</ion-label>
    </ion-segment-button>
  </ion-segment>
</template>

<script setup lang="ts">
import { translate } from "@common";
import { IonLabel, IonSegment, IonSegmentButton } from "@ionic/vue";

defineProps<{ modelValue: string; assignedCount: number; uncountedCount: number }>();
defineEmits<{ (event: "update:modelValue", value: string): void }>();
</script>
