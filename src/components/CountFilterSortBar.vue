<template>
  <div class="controls">

    <!-- FILTER LIST (Search + Status + Compliance) -->
    <ion-list lines="full" class="filters ion-margin">

      <!-- SEARCH -->
      <ion-searchbar
        v-if="showSearch"
        v-model="localFilters.search"
        :placeholder="searchPlaceholder"
        @keyup.enter="emitUpdate"
      ></ion-searchbar>

      <!-- DYNAMIC FILTER SELECTS -->
      <ion-item v-for="filter in filters" :key="filter.key">
        <ion-select
          v-model="localFilters[filter.key]"
          :label="filter.label"
          placeholder="All"
          interface="popover"
          @ionChange="emitUpdate"
        >
          <ion-select-option
            v-for="opt in filter.options"
            :value="opt.value"
            :key="opt.value"
          >
            {{ opt.label }}
          </ion-select-option>
        </ion-select>
      </ion-item>

    </ion-list>

    <!-- SECOND ROW: Checkbox + Sort -->
    <ion-item-divider color="light">

      <!-- Checkbox -->
      <ion-checkbox
        v-if="showCheckbox"
        slot="start"
        :checked="checkboxValue"
        @ionChange="emitCheckbox"
      />

      <!-- Sort Select -->
      <ion-select
        v-if="sortOptions?.length"
        slot="end"
        v-model="localFilters.sortBy"
        label="Sort by"
        interface="popover"
        @ionChange="emitUpdate"
      >
        <ion-select-option
          v-for="opt in sortOptions"
          :value="opt.value"
          :key="opt.value"
        >
          {{ opt.label }}
        </ion-select-option>
      </ion-select>

    </ion-item-divider>
  </div>
</template>

<script setup>
import { IonList, IonSearchbar, IonItem, IonSelect, IonSelectOption, IonItemDivider, IonCheckbox } from '@ionic/vue';
import { defineProps, defineEmits, reactive, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Object, required: true },
  filters: { type: Array, default: () => [] }, // list of dropdown filters
  sortOptions: { type: Array, default: () => [] },
  showSearch: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: "Search" },
  showCheckbox: { type: Boolean, default: false },
  checkboxValue: { type: Boolean, default: false },
  sortLabel: { type: String, default: "Sort by" }
});

const emit = defineEmits(["update:modelValue", "checkbox-change"]);

const localFilters = reactive({ ...props.modelValue });

// keep parent in sync
watch(
  () => props.modelValue,
  (val) => Object.assign(localFilters, val)
);

function emitUpdate() {
  emit("update:modelValue", { ...localFilters });
}

function emitCheckbox(ev) {
  emit("checkbox-change", ev.detail.checked);
}
</script>

<style scoped>
.controls {
  position: sticky;
  top: 0;
  background-color: var(--ion-background-color);
  z-index: 999;
}

.filters {
  display: flex;
  gap: var(--spacer-sm);
  align-items: end;
}

.filters > * {
  flex: 1;
}
</style>

