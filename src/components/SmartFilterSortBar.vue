<template>
  <div class="smart-controls">
    <!-- FILTER ROW -->
    <ion-list lines="full" class="filters ion-margin">
      <!-- Search -->
      <ion-searchbar
        v-model="localSearch"
        :placeholder="placeholderSearch"
      />

      <!-- Status Filter -->
      <ion-item>
        <ion-select
          v-model="localStatus"
          :label="statusLabel"
          placeholder="All"
          interface="popover"
        >
          <ion-select-option value="all">{{ t("All") }}</ion-select-option>
          <ion-select-option value="open">{{ t("Open") }}</ion-select-option>
          <ion-select-option value="accepted">{{ t("Accepted") }}</ion-select-option>
          <ion-select-option value="rejected">{{ t("Rejected") }}</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Compliance Filter -->
      <ion-item>
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

      <!-- Extra (optional) -->
      <ion-item v-if="extraFilter">
        <slot name="extra-filter"></slot>
      </ion-item>
    </ion-list>

    <!-- SORT + SELECT ROW -->
    <ion-item-divider color="light" class="sort-row">
      <div class="select-left">
        <ion-checkbox
          :checked="isAllSelected"
          @ionChange="toggleSelectAll"
          class="checkbox"
        />
        <span class="selected-count" v-if="selectedItems?.length">
          {{ selectedItems.length }} {{ t("selected") }}
        </span>
      </div>

      <ion-select
        v-model="localSort"
        slot="end"
        :label="sortByLabel"
        interface="popover"
      >
        <ion-select-option value="alphabetic">{{ t("Alphabetic") }}</ion-select-option>
        <ion-select-option value="variance-asc">{{ t("Variance (Low → High)") }}</ion-select-option>
        <ion-select-option value="variance-desc">{{ t("Variance (High → Low)") }}</ion-select-option>
      </ion-select>
    </ion-item-divider>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import {
  IonList,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
  IonItemDivider,
  IonCheckbox
} from "@ionic/vue";
import { translate as t } from "@/i18n";

const props = defineProps({
  items: { type: Array, required: true },
  selectedItems: { type: Array, required: true },
  thresholdConfig: { type: Object, required: true },
  placeholderSearch: { type: String, default: "Search product name" },
  statusLabel: { type: String, default: "Status" },
  sortByLabel: { type: String, default: "Sort by" },
  extraFilter: { type: Boolean, default: false }
});

const emit = defineEmits([
  "update:filtered",
  "toggle-item",
  "select-all",
  "configure-threshold"
]);

/* LOCAL STATE */
const localSearch = ref("");
const localStatus = ref("all");
const localSort = ref("alphabetic");
const localCompliance = ref("all");

/* COMPLIANCE LABEL */
const computedComplianceLabel = computed(() => {
  const unit = props.thresholdConfig.unit === "percent" ? "%" : " units";
  return `${t("Compliance")} (${props.thresholdConfig.value}${unit})`;
});

/* FILTER + SORT ENGINE */
watch([localSearch, localStatus, localSort, localCompliance, () => props.items], () => {
  let results = [...props.items];

  /* SEARCH */
  const key = localSearch.value.trim().toLowerCase();
  if (key) {
    results = results.filter(i =>
      i.internalName?.toLowerCase().includes(key) ||
      i.productIdentifier?.toLowerCase().includes(key)
    );
  }

  /* STATUS FILTER */
  if (localStatus.value === "accepted") {
    results = results.filter(i => i.decisionOutcomeEnumId === "APPLIED");
  } else if (localStatus.value === "rejected") {
    results = results.filter(i => i.decisionOutcomeEnumId === "SKIPPED");
  } else if (localStatus.value === "open") {
    results = results.filter(i => !i.decisionOutcomeEnumId);
  }

  /* COMPLIANCE FILTER */
  function isCompliant(item) {
    const variance = Math.abs(item.proposedVarianceQuantity);
    const threshold = props.thresholdConfig.value;

    if (props.thresholdConfig.unit === "units") {
      return variance <= threshold;
    }
    if (props.thresholdConfig.unit === "percent") {
      if (item.quantityOnHand === 0) return item.proposedVarianceQuantity === 0;
      return Math.abs((item.proposedVarianceQuantity / item.quantityOnHand) * 100) <= threshold;
    }
    return true;
  }

  if (localCompliance.value === "acceptable") {
    results = results.filter(i => isCompliant(i));
  } else if (localCompliance.value === "rejectable") {
    results = results.filter(i => !isCompliant(i));
  }

  /* SORTING */
  if (localSort.value === "alphabetic") {
    results.sort((a, b) => a.internalName.localeCompare(b.internalName));
  } else if (localSort.value === "variance-asc") {
    results.sort((a, b) => Math.abs(a.proposedVarianceQuantity) - Math.abs(b.proposedVarianceQuantity));
  } else if (localSort.value === "variance-desc") {
    results.sort((a, b) => Math.abs(b.proposedVarianceQuantity) - Math.abs(a.proposedVarianceQuantity));
  }

  emit("update:filtered", results);
});

/* COMPLIANCE CONFIGURE OPTION */
function handleComplianceChange(event) {
  if (event.detail.value === "configure") {
    localCompliance.value = "all"; 
    emit("configure-threshold");
  }
}

/* SELECT-ALL CHECKBOX */
const isAllSelected = computed(() => 
  props.items.length > 0 &&
  props.selectedItems.length === props.items.filter(i => !i.decisionOutcomeEnumId).length
);

function toggleSelectAll(ev) {
  emit("select-all", ev.detail.checked);
}
</script>

<style scoped>
.smart-controls {
  position: sticky;
  top: 0;
  background: var(--ion-background-color);
  z-index: 999;
}

/* EXACT layout from screenshot */
.filters {
  display: flex;
  gap: var(--spacer-sm);
  align-items: end;
}

.filters > * {
  flex: 1;
}

/* Row 2 */
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
