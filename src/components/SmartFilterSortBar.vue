<template>
  <div class="smart-controls">
    <!-- FILTER ROW -->
    <ion-list lines="full" class="filters ion-margin">
      <!-- SEARCH -->
      <ion-searchbar
        v-if="showSearch"
        v-model="localSearch"
        :placeholder="placeholderSearch"
      />

      <!-- STATUS FILTER -->
      <ion-item v-if="showStatus">
        <ion-select
          v-model="localStatus"
          :label="statusLabel"
          placeholder="All"
          interface="popover"
        >
          <ion-select-option value="all">{{ t("All") }}</ion-select-option>
          <ion-select-option v-for="opt in statusOptions" :value="opt.value">
            {{ opt.label }}
          </ion-select-option>
        </ion-select>
      </ion-item>

      <!-- COMPLIANCE FILTER -->
      <ion-item v-if="showCompliance">
        <ion-select
          v-model="localCompliance"
          :label="computedComplianceLabel"
          placeholder="All"
          interface="popover"
          @ionChange="handleComplianceChange"
        >
          <ion-select-option value="all">{{ t("All") }}</ion-select-option>
          <ion-select-option value="acceptable">{{ t("Acceptable") }}</ion-select-option>
          <ion-select-option value="rejectable">{{ t("Rejectable") }}</ion-select-option>
          <ion-select-option value="configure">{{ t("Configure threshold") }}</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- EXTRA FILTER SLOT -->
      <ion-item v-if="showExtraFilter">
        <slot name="extra-filter"></slot>
      </ion-item>

    </ion-list>

    <!-- SORT & SELECT -->
    <ion-item-divider color="light" class="sort-row">
      <!-- SELECT ALL -->
      <div class="select-left" v-if="showSelect">
        <ion-checkbox
          :checked="isAllSelected"
          @ionChange="toggleSelectAll"
          class="checkbox"
        />
        <span class="selected-count" v-if="selectedItems?.length">
          {{ selectedItems.length }} {{ t("selected") }}
        </span>
      </div>

      <!-- empty placeholder so Sort aligns on right -->
      <div v-else></div>
      <!-- SORT -->
      <ion-select
        v-if="showSort" v-model="localSort" slot="end" :label="sortByLabel" interface="popover">
        <ion-select-option v-for="opt in sortOptions" :value="opt.value">
          {{ opt.label }}
        </ion-select-option>
      </ion-select>
    </ion-item-divider>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { IonList, IonItem, IonSelect, IonSelectOption, IonSearchbar, IonItemDivider, IonCheckbox } from "@ionic/vue";
import { translate as t } from "@/i18n";

const props = defineProps({
  items: { type: Array, required: true },
  selectedItems: { type: Array, default: () => [] },
  thresholdConfig: { type: Object, default: () => ({ unit: "units", value: 0 }) },

  showSearch: { type: Boolean, default: true },
  showStatus: { type: Boolean, default: false },
  showCompliance: { type: Boolean, default: false },
  showSort: { type: Boolean, default: true },
  showSelect: { type: Boolean, default: false },
  showExtraFilter: { type: Boolean, default: false },

  placeholderSearch: { type: String, default: "Search" },
  statusLabel: { type: String, default: "Status" },
  sortByLabel: { type: String, default: "Sort by" },

  statusOptions: { type: Array, default: () => [] },  
  sortOptions: { type: Array, required: true }
});

const emit = defineEmits([
  "update:filtered",
  "select-all",
  "configure-threshold"
]);

/* LOCAL STATE */
const localSearch = ref("");
const localStatus = ref("all");
const localCompliance = ref("all");
const localSort = ref("alphabetic");

/* COMPLIANCE LABEL */
const computedComplianceLabel = computed(() => {
  const unit = props.thresholdConfig.unit === "percent" ? "%" : " units";
  return `${t("Compliance")} (${props.thresholdConfig.value}${unit})`;
});

/* FILTER ENGINE */
watch(
  [localSearch, localStatus, localSort, localCompliance, () => props.items],
  () => {
    let results = [...props.items];

    /* SEARCH */
    if (props.showSearch) {
      const key = localSearch.value.trim().toLowerCase();
      if (key) {
        results = results.filter(i =>
          i.internalName?.toLowerCase().includes(key) ||
          i.productIdentifier?.toLowerCase().includes(key)
        );
      }
    }

    /* STATUS */
    if (props.showStatus) {
      if (localStatus.value === "accepted") results = results.filter(i => i.decisionOutcomeEnumId === "APPLIED");
      if (localStatus.value === "rejected") results = results.filter(i => i.decisionOutcomeEnumId === "SKIPPED");
    }

    /* COMPLIANCE */
    if (props.showCompliance) {
      const limit = props.thresholdConfig.value;

      function isCompliant(item) {
        const variance = Math.abs(item.proposedVarianceQuantity);
        if (props.thresholdConfig.unit === "units") return variance <= limit;
        if (props.thresholdConfig.unit === "percent") {
          if (item.quantityOnHand === 0) return item.proposedVarianceQuantity === 0;
          return Math.abs((item.proposedVarianceQuantity / item.quantityOnHand) * 100) <= limit;
        }
        return true;
      }

      if (localCompliance.value === "acceptable") results = results.filter(isCompliant);
      if (localCompliance.value === "rejectable") results = results.filter(i => !isCompliant(i));
    }

    /* SORT */
    if (props.showSort) {
      if (localSort.value === "alphabetic") {
        results.sort((predecessor, successor) => predecessor.internalName.localeCompare(successor.internalName));
      } else if (localSort.value === "variance-asc") {
        results.sort((predecessor, successor) => Math.abs(predecessor.proposedVarianceQuantity) - Math.abs(successor.proposedVarianceQuantity));
      } else if (localSort.value === "variance-desc") {
        results.sort((predecessor, successor) => Math.abs(successor.proposedVarianceQuantity) - Math.abs(predecessor.proposedVarianceQuantity));
      }
    }
    emit("update:filtered", results);
  }
);

function toggleSelectAll(ev) {
  emit("select-all", ev.detail.checked);
}

function handleComplianceChange(ev) {
  if (ev.detail.value === "configure") {
    localCompliance.value = "all";
    emit("configure-threshold");
  }
}

const isAllSelected = computed(() =>
  props.items.length > 0 &&
  props.selectedItems.length === props.items.filter(i => !i.decisionOutcomeEnumId).length
);
</script>

<style scoped>
.smart-controls {
  position: sticky;
  top: 0;
  background: var(--ion-background-color);
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

.sort-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.select-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selected-count {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}
</style>
