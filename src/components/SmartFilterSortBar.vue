<template>
  <div class="smart-controls">
    <!-- FILTER ROW -->
    <ion-list lines="full" class="filters ion-margin">

      <!-- SEARCH -->
      <ion-searchbar
        v-if="showSearch"
          :inputmode="'search'"
          :value="search"
          @ionInput="handleSearch($event.target.value)"
          :placeholder="placeholderSearch"
      />

      <!-- STATUS FILTER -->
      <ion-item v-if="showStatus">
        <ion-select
          :value="filters.status"
          @ionChange="updateFilter('status', $event.detail.value)"
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
          :value="filters.compliance"
          @ionChange="handleComplianceChange($event.detail.value)"
          :label="computedComplianceLabel"
          placeholder="All"
          interface="popover"
        >
          <ion-select-option value="all">{{ t("All") }}</ion-select-option>
          <ion-select-option value="acceptable">{{ compliantLabel }}</ion-select-option>
          <ion-select-option value="rejectable">{{ nonCompliantLabel }}</ion-select-option>
          <ion-select-option value="configure">{{ t("Configure threshold") }}</ion-select-option>
        </ion-select>
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
        :value="filters.sort"
        @ionChange="updateFilter('sort', $event.detail.value)"
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

import { reactive, computed, defineProps, defineEmits, onMounted, ref } from "vue";
import { translate as t } from "@/i18n";
import { closeOutline, checkmarkDoneOutline } from "ionicons/icons";
import { useUserProfile } from "@/stores/userProfileStore";

const userProfile = useUserProfile();

/* PROPS */
const props = defineProps({
  items: Array,
  selectedItems: Array,
  showSearch: Boolean,
  showStatus: Boolean,
  showCompliance: Boolean,
  showSort: Boolean,
  showSelect: Boolean,

  placeholderSearch: { type: String, default: () => t("Search product name") },
  statusLabel: { type: String, default: () => t("Status") },
  sortByLabel: { type: String, default: () => t("Sort By") },

  statusOptions: Array,
  sortOptions: Array,
  thresholdConfig: {
    type: Object,
    default: () => ({ unit: "units", value: 2 })
  },
});

const emit = defineEmits([
  "update:filtered",
  "select-all",
  "update:threshold"
]);

/* DIRECT STATE REFERENCE */
const filters = computed(() => userProfile.getDetailPageFilters);
const search = ref("");

function handleSearch(value) {
  search.value = value;
  applyFilters();
}

/* THRESHOLD CONFIG */
const internalThreshold = reactive({
  unit: filters.value.threshold.unit,
  value: filters.value.threshold.value
});

const compliantLabel = computed(() => {
  const unit = internalThreshold.unit === "percent" ? "%" : " units";
  return `${t("Compliant")} (≤ ${internalThreshold.value}${unit})`;
});

const nonCompliantLabel = computed(() => {
  const unit = internalThreshold.unit === "percent" ? "%" : " units";
  return `${t("Uncompliant")} (> ${internalThreshold.value}${unit})`;
});

const computedComplianceLabel = computed(() => {
  const unit = internalThreshold.unit === "percent" ? "%" : " units";
  return `${t("Compliance")} (${internalThreshold.value}${unit})`;
});

/* THRESHOLD MODAL */
const isThresholdModalOpen = ref(false);
const tempThreshold = reactive({ unit: "units", value: 0 });

function openThresholdModal() {
  tempThreshold.unit = internalThreshold.unit;
  tempThreshold.value = internalThreshold.value;
  isThresholdModalOpen.value = true;
}

function closeThresholdModal() {
  isThresholdModalOpen.value = false;
}

function saveThreshold() {
  internalThreshold.unit = tempThreshold.unit;
  internalThreshold.value = tempThreshold.value;

  // persist to store
  userProfile.updateThreshold({ ...internalThreshold });

  emit("update:threshold", { ...internalThreshold });
  applyFilters();
  closeThresholdModal();
}

/* SELECT ALL */
function toggleSelectAll(ev) {
  emit("select-all", ev.detail.checked);
}

/* COMPLIANCE CHECKER */
function isCompliant(item) {
  const limit = internalThreshold.value;
  const variance = Math.abs(item.proposedVarianceQuantity);

  if (internalThreshold.unit === "units") return variance <= limit;

  if (internalThreshold.unit === "percent") {
    if (!item.quantityOnHand) return variance === 0;
    return Math.abs((variance / item.quantityOnHand) * 100) <= limit;
  }

  return true;
}

/* MAIN FILTER ENGINE */
function applyFilters() {
  let results = [...props.items];

  // Search
  const key = search.value.trim().toLowerCase();
  if (props.showSearch && key) {
    results = results.filter(item =>
      item.internalName?.toLowerCase().includes(key) ||
      item.productIdentifier?.toLowerCase().includes(key)
    );
  }

  // Status
  if (props.showStatus) {
    const status = filters.value.status;

    if (status === "accepted") results = results.filter(item => item.decisionOutcomeEnumId === "APPLIED");
    if (status === "rejected") results = results.filter(item => item.decisionOutcomeEnumId === "SKIPPED");
    if (status === "open") results = results.filter(item => !item.decisionOutcomeEnumId);
  }

  // Compliance
  if (props.showCompliance) {
    const compliance = filters.value.compliance;

    if (compliance === "acceptable") results = results.filter(isCompliant);
    if (compliance === "rejectable") results = results.filter(item => !isCompliant(item));
  }

  // Sort
  if (props.showSort) {
    const sort = filters.value.sort;

    if (sort === "alphabetic") results.sort((predecessor, successor) => (predecessor.internalName || "").localeCompare(successor.internalName || ""));
    if (sort === "variance-asc") results.sort((predecessor, successor) => Math.abs(predecessor.proposedVarianceQuantity) - Math.abs(successor.proposedVarianceQuantity));
    if (sort === "variance-desc") results.sort((predecessor, successor) => Math.abs(successor.proposedVarianceQuantity) - Math.abs(predecessor.proposedVarianceQuantity));
  }
  emit("update:filtered", results);
}

function updateFilter(key, value) {
  userProfile.updateUiFilter("reviewDetail", key, value);
  applyFilters();
}

onMounted(() => {
  applyFilters();
});

function handleComplianceChange(value) {
  if (value === "configure") {
    openThresholdModal();
    return;
  }

  updateFilter("compliance", value);
}

/* ALL SELECTED? */
const isAllSelected = computed(() =>
  props.items.length > 0 &&
  props.selectedItems.length === props.items.filter(item => !item.decisionOutcomeEnumId).length
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
