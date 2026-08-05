<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title data-testid="create-count-page-title">{{ translate("Create") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header">
        <ion-card>
          <ion-item lines="none">
            <ion-input v-model="countName" label-placement="stacked" :placeholder="translate('Enter count name')" clear-input :class="{ 'ion-invalid ion-touched': showNameError }" :error-text="translate('Please enter count name')" @ionInput="showNameError = false" data-testid="create-count-name-input">
              <ion-label slot="label">
                {{ translate("Count name") }}
                <ion-text color="danger">*</ion-text>
              </ion-label>
            </ion-input>
          </ion-item>

          <ion-item :class="{ 'ion-invalid ion-touched': showFacilityError }">
            <ion-icon :icon="businessOutline" slot="start" />
            <ion-label>
              {{ translate("Facility") }}
              <ion-text color="danger">*</ion-text>
              <p v-if="showFacilityError">
                <ion-text color="danger">
                  <small>{{ translate("Please select a facility") }}</small>
                </ion-text>
              </p>
            </ion-label>
            <ion-chip slot="end" outline @click="openFacilityModal()" data-testid="create-count-facility-chip">
              <ion-label>{{ selectedFacilityId ? getFacilityName(selectedFacilityId) : translate("Select Facility") }}</ion-label>
            </ion-chip>
          </ion-item>

          <ion-item>
            <ion-icon :icon="clipboardOutline" slot="start" />
            <ion-select :label="translate('Count type')" interface="popover" v-model="purposeType" data-testid="create-count-type-select">
              <ion-select-option value="DIRECTED_COUNT">{{ translate("Directed count") }}</ion-select-option>
              <ion-select-option value="HARD_COUNT">{{ translate("Hard count") }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-icon :icon="calendarClearOutline" slot="start" />
            <ion-label>
              {{ translate("Due Date") }}
              <ion-text color="danger">*</ion-text>
              <p v-if="showDueDateError">
                <ion-text color="danger">
                  <small>{{ translate("Please select due date") }}</small>
                </ion-text>
              </p>
            </ion-label>
            <ion-button id="open-due-date-modal" slot="end" fill="outline" data-testid="create-count-due-date-btn">
              {{ dueDate ? DateTime.fromMillis(dueDate).toFormat("dd MMM yyyy") : translate("Add Date") }}
            </ion-button>
          </ion-item>

          <ion-modal class="ion-datetime-button-overlay date-time-modal" trigger="open-due-date-modal" keep-contents-mounted>
            <ion-datetime id="dueDate" :value="dueDateIso" @ionChange="updateDueDate($event)" :min="getMinDateTime()" presentation="date" show-default-buttons data-testid="create-count-due-date-picker">
              <span slot="title">{{ translate("Cycle count due date") }}</span>
            </ion-datetime>
          </ion-modal>

          <ion-item lines="none">
            <ion-icon :icon="calendarNumberOutline" slot="start" />
            <ion-label>
              {{ translate("Start Date") }}
              <p v-if="showStartDateError">
                <ion-text color="danger">
                  <small>{{ translate("Start date cannot be after the due date") }}</small>
                </ion-text>
              </p>
            </ion-label>
            <ion-button id="open-start-date-modal" slot="end" fill="outline" data-testid="create-count-start-date-btn">
              {{ startDate ? DateTime.fromMillis(startDate).toFormat("dd MMM yyyy") : translate("Add Date") }}
            </ion-button>
          </ion-item>

          <ion-modal class="ion-datetime-button-overlay date-time-modal" trigger="open-start-date-modal" keep-contents-mounted>
            <ion-datetime id="startDate" :value="startDateIso" @ionChange="updateStartDate($event)" :min="getMinDateTime()" presentation="date" show-default-buttons data-testid="create-count-start-date-picker">
              <span slot="title">{{ translate("Cycle count start date") }}</span>
            </ion-datetime>
          </ion-modal>
        </ion-card>
      </div>

      <div class="header searchbar">
        <ion-searchbar :value="keyword" :placeholder="translate('Search products')" :disabled="showSelectedOnly" @ionInput="handleKeywordInput($event)" @ionClear="handleKeywordInput($event)" data-testid="create-count-search-input" />

        <ion-item v-for="facet in PRODUCT_FACET_FILTERS" :key="facet.field">
          <ion-label>{{ translate(facet.label) }}</ion-label>
          <ion-chip slot="end" outline :disabled="showSelectedOnly" @click="openFacetModal(facet)" :data-testid="'create-count-facet-chip-' + facet.field">
            <ion-label>{{ getFacetChipLabel(facet.field) }}</ion-label>
          </ion-chip>
        </ion-item>
      </div>

      <ion-item lines="none">
        <ion-label>{{ translate("Show selected only") }}</ion-label>
        <ion-toggle slot="end" v-model="showSelectedOnly" :disabled="!selectedRowsCount" data-testid="create-count-selected-only-toggle" />
      </ion-item>

      <ion-item lines="full" :class="{ 'ion-invalid ion-touched': showItemsError }">
        <ion-checkbox slot="start" :checked="allRowsSelected" :disabled="!visibleProducts.length" :indeterminate="someRowsSelected && !allRowsSelected" @ionChange="toggleAllRows($event.detail.checked)" data-testid="create-count-select-all-checkbox" />
        <ion-label>
          {{ translate("All") }}
          <p v-if="showItemsError">
            <ion-text color="danger">
              <small>{{ translate("Please select at least one item.") }}</small>
            </ion-text>
          </p>
        </ion-label>
        <ion-button v-if="!showSelectedOnly && totalProducts > products.length" slot="end" size="small" fill="clear" :disabled="isSelectingAll" @click="selectAllMatches()" data-testid="create-count-select-all-matches-btn">
          <ion-spinner v-if="isSelectingAll" name="crescent" slot="start" />
          {{ translate("Select all") }} {{ totalProducts }}
        </ion-button>
        <ion-note slot="end" data-testid="create-count-selected-note">{{ selectedRowsCount }} {{ translate("selected") }}</ion-note>
      </ion-item>

      <ion-list v-if="visibleProducts.length" data-testid="create-count-product-list">
        <div v-for="product in visibleProducts" :key="product.productId" class="list-item selectable-row" :class="{ 'selected-row': isProductSelected(product) }" @click="toggleSelection(product)" :data-testid="'create-count-product-row-' + product.productId">
          <ion-item lines="none">
            <ion-checkbox slot="start" :checked="isProductSelected(product)" @click.stop @ionChange="toggleSelection(product)" :data-testid="'create-count-product-checkbox-' + product.productId" />
            <ion-thumbnail slot="start">
              <Image :src="product.mainImageUrl" />
            </ion-thumbnail>
            <ion-label>
              {{ product.internalName || product.sku || product.productId }}
              <p>{{ translate("SKU") }}</p>
            </ion-label>
          </ion-item>
          <ion-label>
            {{ product.productName || product.parentProductName || "-" }}
            <p>{{ translate("Product name") }}</p>
          </ion-label>
          <ion-label>
            {{ product.primaryProductCategoryName || "-" }}
            <p>{{ translate("Category") }}</p>
          </ion-label>
          <ion-label>
            {{ product.productId || "-" }}
            <p>{{ translate("Product ID") }}</p>
          </ion-label>
        </div>

        <ion-infinite-scroll v-show="hasMoreProducts && !showSelectedOnly && products.length" @ionInfinite="loadMoreProducts($event)" data-testid="create-count-infinite-scroll">
          <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading more items...')" />
        </ion-infinite-scroll>
      </ion-list>
      <div v-else class="empty-state" data-testid="create-count-empty-state">
        <ion-spinner v-if="isFetching" color="secondary" name="crescent" />
        <p v-else>
          {{ isFilterApplied ? translate("No records found") : translate("Please select filters to view items") }}
        </p>
      </div>

      <FacetFilterModal
        :is-open="isFacetModalOpen"
        :title="activeFacet?.modalTitle"
        :search-placeholder="activeFacet?.searchPlaceholder"
        :selected-values="activeFacet ? selectedFacetValues[activeFacet.field] : []"
        :options="activeFacet ? facetOptions[activeFacet.field] : []"
        :is-loading="isFacetLoading"
        @update:is-open="isFacetModalOpen = $event"
        @apply="applyFacetSelection"
      />

      <ion-modal :is-open="isFacilityModalOpen" @didDismiss="isFacilityModalOpen = false" data-testid="create-count-facility-modal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="isFacilityModalOpen = false" data-testid="create-count-facility-modal-close-btn">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title data-testid="create-count-facility-modal-title">{{ translate("Select Facility") }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-searchbar :placeholder="translate('Search facilities')" v-model="facilityQueryString" data-testid="create-count-facility-modal-search-input" />
          <ion-radio-group :value="selectedFacilityId" @ionChange="applyFacilitySelection($event.detail.value)">
            <ion-list data-testid="create-count-facility-modal-list">
              <div class="empty-state" v-if="!filteredFacilities.length" data-testid="create-count-facility-modal-empty-state">
                <p>{{ translate("No facilities found") }}</p>
              </div>
              <ion-item v-else v-for="facility in filteredFacilities" :key="facility.facilityId" :data-testid="'create-count-facility-modal-item-' + facility.facilityId">
                <ion-radio label-placement="end" justify="start" :value="facility.facilityId" :data-testid="'create-count-facility-modal-radio-' + facility.facilityId">
                  <ion-label>
                    {{ facility.facilityName }}
                    <p>{{ facility.facilityId }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-list>
          </ion-radio-group>
        </ion-content>
      </ion-modal>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button color="success" fill="outline" :disabled="isSubmitting" @click="createCycleCount()" data-testid="create-count-submit-btn">
            <ion-spinner v-if="isSubmitting" name="crescent" slot="start" />
            {{ translate("Create Cycle Count") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue';
import { IonButton, IonButtons, IonCard, IonCheckbox, IonChip, IonContent, IonDatetime, IonFooter, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonItem, IonLabel, IonList, IonModal, IonNote, IonPage, IonRadio, IonRadioGroup, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonText, IonThumbnail, IonTitle, IonToggle, IonToolbar, alertController, onIonViewDidEnter, onIonViewWillLeave } from '@ionic/vue';
import { businessOutline, calendarClearOutline, calendarNumberOutline, clipboardOutline, closeOutline } from 'ionicons/icons';
import { DateTime } from 'luxon';
import { commonUtil, logger, translate, useSolrSearch } from '@common';
import Image from '@/components/Image.vue';
import FacetFilterModal from '@/components/FacetFilterModal.vue';
import { useInventoryCountImport } from '@/composables/useInventoryCountImport';
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useProductFacets, PRODUCT_FACET_FILTERS, FacetFilterConfig, FacetOption } from '@/composables/useProductFacets';
import { useProductStore } from '@/stores/productStore';

const SELECT_ALL_PAGE_SIZE = 250;
const DEFAULT_MAX_COUNT_ITEMS = 2000;

const viewSize = Number(import.meta.env.VITE_VIEW_SIZE) || 20;
const maxCountItems = Number(import.meta.env.VITE_MAX_COUNT_ITEMS) || DEFAULT_MAX_COUNT_ITEMS;

const productStore = useProductStore();
const { fetchFacetOptions, quoteFacetValue } = useProductFacets();

const countName = ref('');
const purposeType = ref('DIRECTED_COUNT');
const dueDate = ref<number | null>(null);
/** Optional, the importer falls back to nothing when it is not set so we send today instead */
const startDate = ref<number | null>(null);
/** Bound to the searchbar, `searchTerm` is the debounced value the query actually runs on */
const keyword = ref('');
const searchTerm = ref('');
const showSelectedOnly = ref(false);

const showNameError = ref(false);
const showFacilityError = ref(false);
const showDueDateError = ref(false);
const showStartDateError = ref(false);
const showItemsError = ref(false);

const isFetching = ref(false);
const isSubmitting = ref(false);
const isSelectingAll = ref(false);

/* ---------- Facility ---------- */
const isFacilityModalOpen = ref(false);
const facilityQueryString = ref('');
const selectedFacilityId = ref('');

const facilities = computed(() => productStore.getFacilities || []);

const filteredFacilities = computed(() => {
  const searchedString = facilityQueryString.value.trim().toLowerCase();
  if (!searchedString) return facilities.value;
  return facilities.value.filter((facility: any) =>
    facility.facilityName?.toLowerCase().includes(searchedString) ||
    facility.facilityId?.toLowerCase().includes(searchedString)
  );
});

const facilityTimeZone = computed(() =>
  facilities.value.find((facility: any) => facility.facilityId === selectedFacilityId.value)?.facilityTimeZone
);

function getFacilityName(facilityId: string) {
  return facilities.value.find((facility: any) => facility.facilityId === facilityId)?.facilityName || facilityId;
}

function openFacilityModal() {
  facilityQueryString.value = '';
  isFacilityModalOpen.value = true;
}

function applyFacilitySelection(facilityId: string) {
  selectedFacilityId.value = facilityId;
  showFacilityError.value = false;
  isFacilityModalOpen.value = false;
}

/* ---------- Due date ---------- */
function getMinDateTime(): any {
  return facilityTimeZone.value ? DateTime.now().setZone(facilityTimeZone.value).toISO() : DateTime.now().toISO();
}

/** The picker works on facility local dates, the refs keep the resolved epoch millis */
function toFacilityIsoDate(millis: number | null) {
  if (!millis) return undefined;
  const date = DateTime.fromMillis(millis);
  return (facilityTimeZone.value ? date.setZone(facilityTimeZone.value) : date).toISODate() || undefined;
}

function toFacilityMillis(iso: string) {
  return facilityTimeZone.value
    ? DateTime.fromISO(iso, { zone: facilityTimeZone.value }).toMillis()
    : DateTime.fromISO(iso).toMillis();
}

const dueDateIso = computed(() => toFacilityIsoDate(dueDate.value));
const startDateIso = computed(() => toFacilityIsoDate(startDate.value));

function updateDueDate(event: any) {
  const iso = event.detail.value;
  dueDate.value = iso ? toFacilityMillis(iso as string) : null;
  showDueDateError.value = false;
  showStartDateError.value = false;
}

function updateStartDate(event: any) {
  const iso = event.detail.value;
  startDate.value = iso ? toFacilityMillis(iso as string) : null;
  showStartDateError.value = false;
}

/* ---------- Facet filters ---------- */
const isFacetModalOpen = ref(false);
const isFacetLoading = ref(false);
const activeFacet = ref<FacetFilterConfig | null>(null);

// Keyed by Solr field, seeded from the config so a new filter needs no change here
const facetOptions = reactive<Record<string, FacetOption[]>>(
  Object.fromEntries(PRODUCT_FACET_FILTERS.map((facet: FacetFilterConfig) => [facet.field, []]))
);

const selectedFacetValues = reactive<Record<string, string[]>>(
  Object.fromEntries(PRODUCT_FACET_FILTERS.map((facet: FacetFilterConfig) => [facet.field, []]))
);

function getFacetChipLabel(field: string) {
  const selected = selectedFacetValues[field];
  if (!selected?.length) return translate('All');
  if (selected.length === 1) {
    const option = facetOptions[field].find((entry: FacetOption) => entry.value === selected[0]);
    return option?.label || selected[0];
  }
  return `${selected.length} ${translate('selected')}`;
}

async function openFacetModal(facet: FacetFilterConfig) {
  activeFacet.value = facet;
  isFacetModalOpen.value = true;
  if (facetOptions[facet.field].length) return;
  isFacetLoading.value = true;
  try {
    facetOptions[facet.field] = await fetchFacetOptions(facet);
    if (!facetOptions[facet.field].length) {
      commonUtil.showToast(translate('No options found'));
    }
  } catch (err) {
    logger.error(err);
    commonUtil.showToast(translate('Failed to fetch filter options'));
  } finally {
    isFacetLoading.value = false;
  }
}

async function applyFacetSelection(values: string[]) {
  if (!activeFacet.value) return;
  selectedFacetValues[activeFacet.value.field] = values;
  await refreshProducts();
}

/* ---------- Product search ---------- */
const products = ref<any[]>([]);
const totalProducts = ref(0);
const hasMoreProducts = ref(false);
let viewIndex = 0;
/** Only the most recent request may write to the list, a stale page must not overwrite it */
let searchToken = 0;

/** Nothing is listed until the user narrows the catalog down with a keyword or a facet */
const isFilterApplied = computed(() =>
  !!searchTerm.value || Object.values(selectedFacetValues).some((values: string[]) => values.length)
);

/** Load the first page of the current filters, or empty the list when there are none */
async function refreshProducts() {
  if (isFilterApplied.value) {
    await getProducts(true);
  } else {
    clearProducts();
  }
}

/**
 * Facet selections as searchProducts filters. Values are phrase quoted, category names and
 * feature descriptions carry spaces and slashes and an unquoted slash starts a regex query.
 * searchProducts adds docType: PRODUCT and isVirtual: false itself.
 *
 * isVariant is indexed as the string "true"/"false", only variants are countable SKUs.
 */
function buildFilters() {
  const filters: any = { isVariant: { value: 'true' } };
  Object.keys(selectedFacetValues).forEach((field: string) => {
    const values = selectedFacetValues[field];
    if (!values.length) return;
    filters[field] = { value: values.map(quoteFacetValue), op: 'OR' };
  });
  return filters;
}

async function getProducts(isNewSearch = true) {
  if (isNewSearch) viewIndex = 0;
  // hasMoreProducts is only ever set from a response. Flipping it true up front reveals the
  // infinite scroll over an empty list, which fires ionInfinite at once and races this request.
  const token = ++searchToken;
  isFetching.value = true;

  try {
    const { products: found, total } = await useSolrSearch().searchProducts({
      keyword: searchTerm.value,
      viewSize,
      viewIndex,
      filters: buildFilters()
    });
    // A newer search was started while this one was in flight, its result is the one that counts
    if (token !== searchToken) return;

    // searchProducts returns an empty object, not an array, when nothing matched
    const docs = Array.isArray(found) ? found : [];
    totalProducts.value = total || 0;
    products.value = isNewSearch ? docs : [...products.value, ...docs];

    hasMoreProducts.value = docs.length === viewSize && products.value.length < totalProducts.value;
  } catch (err: any) {
    if (token !== searchToken) return;
    // Surface the failure, an empty list otherwise reads as "no matching products"
    logger.error('Failed to fetch products', err?.response?.data || err);
    commonUtil.showToast(translate('Failed to fetch products'));
    if (isNewSearch) {
      products.value = [];
      totalProducts.value = 0;
    } else {
      // Retry the same page on the next scroll rather than skipping it
      viewIndex--;
    }
    hasMoreProducts.value = false;
  } finally {
    if (token === searchToken) isFetching.value = false;
  }
}

async function loadMoreProducts(event: any) {
  // Never start a page while one is still loading, that is what lets viewIndex run away
  if (isFetching.value || !hasMoreProducts.value) {
    event?.target?.complete();
    return;
  }
  viewIndex++;
  await getProducts(false);
  event?.target?.complete();
}

function clearProducts() {
  // Bump the token so an in-flight request cannot repopulate the list after it is cleared
  searchToken++;
  products.value = [];
  totalProducts.value = 0;
  hasMoreProducts.value = false;
  isFetching.value = false;
  viewIndex = 0;
}

let keywordDebounce: ReturnType<typeof setTimeout> | null = null;

function handleKeywordInput(event: any) {
  keyword.value = event.target.value || '';
  if (keywordDebounce) clearTimeout(keywordDebounce);
  keywordDebounce = setTimeout(() => {
    keywordDebounce = null;
    searchTerm.value = keyword.value.trim();
  }, 300);
}

// Facet changes refresh through applyFacetSelection, this covers the debounced keyword
watch(searchTerm, async () => {
  await refreshProducts();
});

/* ---------- Selection ---------- */
const selectedProductsMap = reactive<Record<string, any>>({});

function isProductSelected(product: any) {
  return !!selectedProductsMap[product.productId];
}

function toggleSelection(product: any) {
  if (selectedProductsMap[product.productId]) {
    delete selectedProductsMap[product.productId];
  } else {
    if (!canSelectMore(1)) return;
    selectedProductsMap[product.productId] = product;
  }
  showItemsError.value = false;
}

const visibleProducts = computed(() =>
  showSelectedOnly.value ? Object.values(selectedProductsMap) : products.value
);

const selectedProducts = computed(() => Object.values(selectedProductsMap));
const selectedRowsCount = computed(() => selectedProducts.value.length);

const allRowsSelected = computed(() =>
  visibleProducts.value.length > 0 && visibleProducts.value.every((product: any) => isProductSelected(product))
);

const someRowsSelected = computed(() =>
  visibleProducts.value.some((product: any) => isProductSelected(product))
);

/** A count is capped so a broad category filter cannot queue tens of thousands of items */
function canSelectMore(additional: number) {
  if (selectedRowsCount.value + additional <= maxCountItems) return true;
  commonUtil.showToast(`${translate('A count cannot have more than')} ${maxCountItems} ${translate('items')}`);
  return false;
}

function toggleAllRows(checked: boolean) {
  if (checked) {
    const toAdd = visibleProducts.value.filter((product: any) => !selectedProductsMap[product.productId]);
    if (!canSelectMore(toAdd.length)) return;
    toAdd.forEach((product: any) => (selectedProductsMap[product.productId] = product));
  } else {
    visibleProducts.value.forEach((product: any) => delete selectedProductsMap[product.productId]);
  }
  showItemsError.value = false;
}

/**
 * The header checkbox only covers the loaded page, this pages through the whole result set so a
 * facet filter can be turned into a count without scrolling it all in.
 */
async function selectAllMatches() {
  if (!canSelectMore(totalProducts.value - selectedRowsCount.value)) return;
  isSelectingAll.value = true;
  try {
    let page = 0;
    let fetched = 0;
    let docs: any[] = [];
    do {
      const { products: found } = await useSolrSearch().searchProducts({
        keyword: searchTerm.value,
        viewSize: SELECT_ALL_PAGE_SIZE,
        viewIndex: page,
        filters: buildFilters()
      });
      docs = Array.isArray(found) ? found : [];
      docs.forEach((product: any) => (selectedProductsMap[product.productId] = product));
      fetched += docs.length;
      page++;
    } while (docs.length === SELECT_ALL_PAGE_SIZE && fetched < totalProducts.value && fetched < maxCountItems);
    showItemsError.value = false;
  } catch (err) {
    logger.error('Failed to select all matching products', err);
    commonUtil.showToast(translate('Failed to select all matching products'));
  } finally {
    isSelectingAll.value = false;
  }
}

watch(selectedRowsCount, async (count: number) => {
  if (count === 0 && showSelectedOnly.value) {
    await nextTick();
    showSelectedOnly.value = false;
  }
});

/* ---------- Create ---------- */
/** Warn when an open count of the same name already exists, the importer appends items to it */
async function hasOpenCountWithSameName(name: string) {
  try {
    const resp = await useInventoryCountRun().getWorkEfforts({
      keyword: name,
      statusId: 'CYCLE_CNT_CREATED',
      facilityId: selectedFacilityId.value,
      pageSize: 50
    }) as any;
    if (commonUtil.hasError(resp)) return false;
    return (resp?.data?.cycleCounts || []).some((count: any) => count.workEffortName === name);
  } catch (err) {
    logger.error(err);
    return false;
  }
}

async function createCycleCount() {
  const name = countName.value.trim();
  showNameError.value = !name;
  showFacilityError.value = !selectedFacilityId.value;
  showDueDateError.value = !dueDate.value;
  showItemsError.value = selectedRowsCount.value === 0;
  showStartDateError.value = !!(startDate.value && dueDate.value && startDate.value > dueDate.value);

  if (showNameError.value || showFacilityError.value || showDueDateError.value || showStartDateError.value || showItemsError.value) return;

  const isDuplicate = await hasOpenCountWithSameName(name);
  const message = isDuplicate
    ? `${translate('A count named')} "${name}" ${translate('is already open for this facility, these items will be added to it. Continue?')}`
    : `${translate('Are you sure you want to create cycle count with')} ${selectedRowsCount.value} ${translate('items?')}`;

  const alert = await alertController.create({
    header: translate('Create Cycle Count'),
    message,
    buttons: [
      {
        text: translate('Cancel'),
        role: 'cancel'
      },
      {
        text: translate('Create'),
        handler: () => {
          submitCycleCount(name);
        }
      }
    ]
  });

  await alert.present();
}

/**
 * The importer parses both dates as facility local wall time. The zone shift has to happen before
 * the day boundary is taken, otherwise start/end of day lands on the host's day, not the facility's.
 */
function formatForImport(millis: number, boundary?: 'startOf' | 'endOf') {
  let date = DateTime.fromMillis(millis);
  if (facilityTimeZone.value) date = date.setZone(facilityTimeZone.value);
  if (boundary === 'startOf') date = date.startOf('day');
  if (boundary === 'endOf') date = date.endOf('day');
  return date.toFormat('MM-dd-yyyy HH:mm:ss');
}

async function submitCycleCount(name: string) {
  isSubmitting.value = true;
  try {
    const resp = await useInventoryCountImport().createCycleCountFromProducts({
      countName: name,
      purposeType: purposeType.value,
      facilityId: selectedFacilityId.value,
      startDate: startDate.value ? formatForImport(startDate.value, 'startOf') : formatForImport(Date.now()),
      dueDate: formatForImport(dueDate.value as number, 'endOf'),
      products: selectedProducts.value
    }) as any;

    if (commonUtil.hasError(resp)) throw resp.data;

    clearCreateCycleCount();
    commonUtil.showToast(translate('The cycle count has been created successfully'));
  } catch (err) {
    logger.error(err);
    commonUtil.showToast(translate('Failed to create count, please try again'));
  } finally {
    isSubmitting.value = false;
  }
}

/* ---------- Lifecycle ---------- */
function clearCreateCycleCount() {
  countName.value = '';
  purposeType.value = 'DIRECTED_COUNT';
  dueDate.value = null;
  startDate.value = null;
  keyword.value = '';
  searchTerm.value = '';
  showSelectedOnly.value = false;
  showNameError.value = false;
  showFacilityError.value = false;
  showDueDateError.value = false;
  showStartDateError.value = false;
  showItemsError.value = false;
  facilityQueryString.value = '';
  activeFacet.value = null;
  isFacetModalOpen.value = false;
  isFacilityModalOpen.value = false;

  clearProducts();

  Object.keys(selectedProductsMap).forEach((key: string) => delete selectedProductsMap[key]);
  Object.keys(selectedFacetValues).forEach((field: string) => (selectedFacetValues[field] = []));

  if (keywordDebounce) {
    clearTimeout(keywordDebounce);
    keywordDebounce = null;
  }
}

onIonViewDidEnter(() => {
  clearCreateCycleCount();
  selectedFacilityId.value = productStore.getCurrentFacility?.facilityId || '';
});

onIonViewWillLeave(() => {
  clearCreateCycleCount();
});

onUnmounted(() => {
  if (keywordDebounce) clearTimeout(keywordDebounce);
});
</script>

<style scoped>
.selectable-row {
  --columns-desktop: 4;
  border-bottom: 1px solid var(--ion-color-medium);
}

.selectable-row ion-item {
  width: 100%;
}

.selected-row {
  background-color: var(--ion-color-light-tint);
}

ion-thumbnail {
  --size: 40px;
}
</style>
