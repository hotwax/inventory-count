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
          <ion-select-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :value="opt.value"
          >
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
          <ion-select-option value="acceptable">{{ compliantLabel }}</ion-select-option>
          <ion-select-option value="rejectable">{{ nonCompliantLabel }}</ion-select-option>
          <ion-select-option value="configure">{{ t("Configure threshold") }}</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- EXTRA FILTER SLOT -->
      <ion-item v-if="showExtraFilter">
        <slot name="extra-filter"></slot>
      </ion-item>

    </ion-list>

    <!-- SORT BAR -->
    <ion-item-divider color="light" class="sort-row">

      <!-- SELECT ALL -->
      <div class="select-left" v-if="showSelect">
        <ion-checkbox
          class="checkbox"
          :checked="isAllSelected"
          @ionChange="toggleSelectAll"
        />
        <span v-if="selectedItems?.length" class="selected-count">
          {{ selectedItems.length }} {{ t("selected") }}
        </span>
      </div>

      <!-- Placeholder for alignment -->
      <div v-else></div>

      <!-- SORT -->
      <ion-select
        v-if="showSort"
        v-model="localSort"
        slot="end"
        :label="sortByLabel"
        interface="popover"
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

    <!-- INTERNAL THRESHOLD CONFIG MODAL -->
    <ion-modal :is-open="isThresholdModalOpen" @did-dismiss="closeThresholdModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ t("Configure Threshold") }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeThresholdModal">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-list>
          <ion-item>
            <ion-select v-model="tempThreshold.unit" label="Unit" interface="popover">
              <ion-select-option value="units">{{ t("Units") }}</ion-select-option>
              <ion-select-option value="percent">{{ t("Percent") }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-input
              v-model.number="tempThreshold.value"
              type="number"
              min="0"
              label="Threshold"
              label-placement="floating"
            />
          </ion-item>
        </ion-list>

        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button @click="saveThreshold">
            <ion-icon :icon="checkmarkDoneOutline" />
          </ion-fab-button>
        </ion-fab>
      </ion-content>
    </ion-modal>

  </div>
</template>

<script setup>
import {
  IonList, IonItem, IonSelect, IonSelectOption, IonSearchbar, IonItemDivider,
  IonCheckbox, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonButton, IonIcon, IonContent, IonInput, IonFab, IonFabButton
} from "@ionic/vue";

import { ref, watch, computed, defineProps, defineEmits, onMounted, reactive } from "vue";
import { translate as t } from "@/i18n";
import { closeOutline, checkmarkDoneOutline } from "ionicons/icons";

/* PROPS */
const props = defineProps({
  items: Array,
  selectedItems: Array,

  showSearch: Boolean,
  showStatus: Boolean,
  showCompliance: Boolean,
  showSort: Boolean,
  showSelect: Boolean,

  placeholderSearch: {
    type: String,
    default: () => t("Search product name")
  },
  statusLabel: {
    type: String,
    default: () => t("Status")
  },
  sortByLabel: {
    type: String,
    default: () => t("Sort By")
  },

  statusOptions: Array,
  sortOptions: Array,
  thresholdConfig: {
  type: Object,
  default: () => ({ unit: "units", value: 2 })
},
});

const internalThreshold = reactive({
  unit: "units",
  value: 2,
});

const compliantLabel = computed(() => {
  const unit = internalThreshold.unit === "percent" ? "%" : " units";
  return `${t("Compliant")} (≤ ${internalThreshold.value}${unit})`;
});

const nonCompliantLabel = computed(() => {
  const unit = internalThreshold.unit === "percent" ? "%" : " units";
  return `${t("Non-Compliant")} (> ${internalThreshold.value}${unit})`;
});

const emit = defineEmits([
  "update:filtered",
  "select-all",
  "update:threshold"
]);

/* LOCAL STATE */
const localSearch = ref("");
const localStatus = ref("all");
const localCompliance = ref("all");
const localSort = ref("alphabetic");

/* THRESHOLD MODAL */
const isThresholdModalOpen = ref(false);
const tempThreshold = ref({ unit: "units", value: 0 });

/* LABEL */
const computedComplianceLabel = computed(() => {
  const unit = internalThreshold.unit === "percent" ? "%" : " units";
  return `${t("Compliance")} (${internalThreshold.value}${unit})`;
});

onMounted(() => {
  internalThreshold.unit = props.thresholdConfig.unit;
  internalThreshold.value = props.thresholdConfig.value;
});

/* OPEN / CLOSE MODAL */
function openThresholdModal() {
  tempThreshold.value = {
    unit: internalThreshold.unit,
    value: internalThreshold.value
  };
  isThresholdModalOpen.value = true;
}


function closeThresholdModal() {
  isThresholdModalOpen.value = false;
}

/* SAVE THRESHOLD */
function saveThreshold() {
  // Copy from temp → internal
  internalThreshold.unit = tempThreshold.value.unit;
  internalThreshold.value = tempThreshold.value.value;

  const newConfig = {
    unit: internalThreshold.unit,
    value: internalThreshold.value
  };

  localStorage.setItem(
    "cyclecount_compliance_threshold",
    JSON.stringify(newConfig)
  );

  emit("update:threshold", newConfig);

  applyFilters();
  closeThresholdModal();
}

/* SELECT ALL */
function toggleSelectAll(ev) {
  emit("select-all", ev.detail.checked);
}

/* COMPLIANCE CLICK LOGIC */
function handleComplianceChange(ev) {
  if (ev.detail.value === "configure") {
    localCompliance.value = "all";
    openThresholdModal();
  }
}

/* COMPLIANCE CHECKER */
function isCompliant(item) {
  const limit = internalThreshold.value;
  const variance = Math.abs(item.proposedVarianceQuantity);

  if (internalThreshold.unit === "units") {
    return variance <= limit;
  }

  if (internalThreshold.unit === "percent") {
    if (item.quantityOnHand === 0) return variance === 0;
    return Math.abs((variance / item.quantityOnHand) * 100) <= limit;
  }

  return true;
}

/* MAIN FILTER ENGINE */
function applyFilters() {
  let results = [...props.items];

  // Search
  const key = localSearch.value.trim().toLowerCase();
  if (props.showSearch && key) {
    results = results.filter(i =>
      i.internalName?.toLowerCase().includes(key) ||
      i.productIdentifier?.toLowerCase().includes(key)
    );
  }

  // Status
  if (props.showStatus) {
    if (localStatus.value === "accepted") results = results.filter(i => i.decisionOutcomeEnumId === "APPLIED");
    if (localStatus.value === "rejected") results = results.filter(i => i.decisionOutcomeEnumId === "SKIPPED");
    if (localStatus.value === "open") results = results.filter(i => !i.decisionOutcomeEnumId);
  }

  // Compliance
  if (props.showCompliance) {
    if (localCompliance.value === "acceptable") {
      results = results.filter(i => isCompliant(i, internalThreshold.unit));
    } else if (localCompliance.value === "rejectable") {
      results = results.filter(i => !isCompliant(i, internalThreshold.unit));
    }
  }

  // Sort
  if (props.showSort) {
    if (localSort.value === "alphabetic")
      results.sort((a,b) => a.internalName.localeCompare(b.internalName));

    if (localSort.value === "variance-asc")
      results.sort((a,b) => Math.abs(a.proposedVarianceQuantity) - Math.abs(b.proposedVarianceQuantity));

    if (localSort.value === "variance-desc")
      results.sort((a,b) => Math.abs(b.proposedVarianceQuantity) - Math.abs(a.proposedVarianceQuantity));
  }

  emit("update:filtered", results);
}

/* WATCH FILTERS + THRESHOLD */
watch([localSearch, localStatus, localCompliance, localSort, () => props.items], applyFilters, { deep: true });
watch(
  () => [internalThreshold.unit, internalThreshold.value],
  applyFilters
);
/* ALL SELECTED? */
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
  font-size: .9rem;
}
</style>
