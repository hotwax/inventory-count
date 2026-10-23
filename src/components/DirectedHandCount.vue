<template>
  <section class="handcount-screen" data-testid="directed-handcount">
    <div class="handcount-search">
      <ion-searchbar v-model="query" :placeholder="translate('Search assigned products')" data-testid="handcount-search" />
      <ion-item lines="none" data-testid="handcount-sort-item">
        <ion-icon slot="start" :icon="swapVerticalOutline" />
        <ion-select v-model="sessionSort" :aria-label="translate('Sort by')" interface="popover" data-testid="handcount-sort">
          <ion-select-option value="assigned">
            {{ translate('Assigned order') }}
          </ion-select-option>
          <ion-select-option value="alphabetic">
            {{ translate('Alphabetical') }}
          </ion-select-option>
          <ion-select-option value="lastUpdated">
            {{ translate('Last updated') }}
          </ion-select-option>
        </ion-select>
      </ion-item>
    </div>
    <ion-item lines="full" class="handcount-headings" aria-hidden="true">
      <div class="handcount-columns">
        <ion-label color="medium">
          {{ translate('Product') }}
        </ion-label>
        <ion-label color="medium" class="ion-text-center">
          {{ translate('Not in stock') }}
        </ion-label>
        <ion-label color="medium" class="ion-text-center">
          {{ translate('Counted quantity') }}
        </ion-label>
      </div>
    </ion-item>
    <ion-item v-if="loading" data-testid="handcount-loading">
      <ion-label><ion-skeleton-text animated /></ion-label>
    </ion-item>
    <ion-item v-else-if="error" data-testid="handcount-error">
      <ion-label color="danger">
        {{ error }}
      </ion-label>
      <ion-button slot="end" :disabled="saving" data-testid="handcount-retry-btn" @click="load">
        {{ translate('Retry') }}
      </ion-button>
    </ion-item>
    <ion-item v-if="!loading && !mutable && !error" data-testid="handcount-readonly">
      <ion-label>{{ translate('This session is not available for counting.') }}</ion-label>
    </ion-item>
    <DynamicScroller
      v-if="!loading && !error && visibleItems.length"
      :key="segment + ':' + query + ':' + sessionSort"
      :items="visibleItems"
      key-field="productId"
      :min-item-size="96"
      :buffer="300"
      class="virtual-list handcount-list"
      data-testid="handcount-list"
    >
      <template #default="{ item, index, active: rowActive }">
        <DynamicScrollerItem
          :item="item"
          :index="index"
          :active="rowActive"
          :size-dependencies="[!!drafts[item.productId], item.product, valid(quantity(item))]"
        >
          <ion-item :key="item.productId" :data-testid="'handcount-row-' + item.productId">
            <div class="handcount-row handcount-columns">
              <div class="handcount-product">
                <ion-thumbnail v-if="item.product?.mainImageUrl">
                  <Image :src="item.product.mainImageUrl" />
                </ion-thumbnail>
                <ion-label>
                  <h2>{{ primaryLabel(item) }}</h2>
                  <p v-if="fallbackMessage(item)">
                    {{ fallbackMessage(item) }}
                  </p>
                  <p v-if="secondaryLabel(item)">
                    {{ secondaryLabel(item) }}
                  </p>
                  <p v-if="drafts[item.productId]">
                    <ion-text color="primary">
                      {{ translate('Unsaved changes') }}
                    </ion-text>
                  </p>
                  <p v-else-if="notInStock(item)">
                    <ion-text color="success">
                      {{ translate('Counted · 0') }}
                    </ion-text>
                  </p>
                </ion-label>
              </div>
              <div class="handcount-zero">
                <ion-checkbox
                  justify="center"
                  :checked="notInStock(item)"
                  :aria-label="translate('Not in stock: {product}', { product: primaryLabel(item) })"
                  :disabled="!mutable || saving || (notInStock(item) && !drafts[item.productId])"
                  :data-testid="'handcount-zero-' + item.productId"
                  @ion-change="toggleNotInStock(item)"
                />
                <span class="handcount-zero-label">
                  {{ translate('Not in stock') }}
                </span>
              </div>
              <div class="handcount-quantity">
                <ion-button
                  fill="outline"
                  :disabled="!mutable || saving || Number(quantity(item)) <= 0"
                  :aria-label="translate('Decrease quantity: {product}', { product: primaryLabel(item) })"
                  :data-testid="'handcount-decrease-' + item.productId"
                  @click="adjust(item, -1)"
                >
                  <ion-icon slot="icon-only" :icon="removeOutline" />
                </ion-button>
                <ion-input
                  type="number"
                  min="0"
                  inputmode="numeric"
                  fill="outline"
                  :label="translate('Qty')"
                  label-placement="floating"
                  :aria-label="translate('Counted quantity: {product}', { product: primaryLabel(item) })"
                  :value="quantity(item)"
                  :disabled="!mutable || saving"
                  :class="{ 'ion-invalid': !valid(quantity(item)), 'ion-touched': !!drafts[item.productId] }"
                  :error-text="translate('Enter a quantity of zero or more.')"
                  :data-testid="'handcount-quantity-' + item.productId"
                  @ion-input="edit(item, $event.detail.value)"
                />
                <ion-button
                  fill="outline"
                  :disabled="!mutable || saving"
                  :aria-label="translate('Increase quantity: {product}', { product: primaryLabel(item) })"
                  :data-testid="'handcount-increase-' + item.productId"
                  @click="adjust(item, 1)"
                >
                  <ion-icon slot="icon-only" :icon="addOutline" />
                </ion-button>
              </div>
            </div>
          </ion-item>
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
    <ion-item v-if="!loading && !error && !visibleItems.length" data-testid="handcount-empty">
      <ion-label>{{ translate('No assigned items in this view.') }}</ion-label>
    </ion-item>
  </section>
</template>

<script setup lang="ts">
import { commonUtil, translate } from "@common";
import { IonButton, IonCheckbox, IonIcon, IonInput, IonItem, IonLabel, IonSearchbar, IonSelect, IonSelectOption, IonSkeletonText, IonText, IonThumbnail, alertController } from "@ionic/vue";
import { addOutline, removeOutline, swapVerticalOutline } from "ionicons/icons";
import { computed, onUnmounted, ref, watch } from "vue";
import { DynamicScroller, DynamicScrollerItem } from "vue-virtual-scroller";
import Image from "@/components/Image.vue";
import { useInventoryCountImport } from "@/composables/useInventoryCountImport";
import { useProductMaster } from "@/composables/useProductMaster";
import { useSessionItemDisplay } from "@/composables/useSessionItemDisplay";
import { hasRecordedCount } from "@/services/inventoryCountRecord";
import { waitForSessionTeardown } from "@/services/sessionSyncLifecycle";
import { useProductStore } from "@/stores/productStore";
import { useUserProfile } from "@/stores/userProfileStore";

const props = defineProps<{ inventoryCountImportId: string; active: boolean }>();
const counts = useInventoryCountImport();
const productMaster = useProductMaster();
const userProfile = useUserProfile();
const productStore = useProductStore();
const sessionSort = computed({
  get: () => userProfile.getSessionDetailFilters?.sort || "assigned",
  set: (value: string) => userProfile.updateUiFilter("sessionDetail", "sort", value)
});
const { getSessionItemPrimaryLabel: primaryLabel, getSessionItemSecondaryLabel: secondaryLabel,
  getSessionItemFallbackMessage: fallbackMessage } = useSessionItemDisplay();
const items = ref<any[]>([]);
const drafts = ref<Record<string, { value: string; expectedQuantity: number }>>({});
const segment = ref("uncounted");
const query = ref("");
const loading = ref(true);
const saving = ref(false);
const mutable = ref(false);
const error = ref("");
let subscription: { unsubscribe(): void } | undefined;
let visit = 0;
let sessionId = "";
const assignedCount = computed(() => items.value.length);
const uncountedCount = computed(() => items.value.filter(item => !hasRecordedCount(item)).length);
const visibleItems = computed(() => {
  const term = query.value.trim().toLowerCase();

  return items.value.filter(item => {
    if(segment.value === "uncounted" && hasRecordedCount(item)) {return false;}
    if(segment.value === "counted" && !hasRecordedCount(item)) {return false;}

    return !term || [primaryLabel(item), productMaster.secondaryId(item.product), item.product?.productName, item.productId,
      ...(item.product?.goodIdentifications || []).map((id: any) => id.value)]
      .some(value => String(value || "").toLowerCase().includes(term));
  });
});
const quantity = (item: any) => drafts.value[item.productId]?.value ?? String(item.quantity || 0);
const valid = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
const draftCount = computed(() => Object.keys(drafts.value).length);
const hasChanges = computed(() => draftCount.value > 0);
const canSave = computed(() => mutable.value && !loading.value && !saving.value && !error.value && hasChanges.value &&
  Object.values(drafts.value).every(draft => valid(draft.value)));
function edit(item: any, value: string | null | undefined) {
  const expectedQuantity = drafts.value[item.productId]?.expectedQuantity ?? Number(item.quantity || 0);
  if(valid(value ?? "") && Number(value) === expectedQuantity && (Number(value) !== 0 || hasRecordedCount(item))) {delete drafts.value[item.productId];} else {drafts.value[item.productId] = { value: value ?? "", expectedQuantity };}
}
function adjust(item: any, amount: number) {
  edit(item, String(Math.max(0, (Number(quantity(item)) || 0) + amount)));
}

function notInStock(item: any) {
  return valid(quantity(item)) && Number(quantity(item)) === 0 && (!!drafts.value[item.productId] || hasRecordedCount(item));
}
function toggleNotInStock(item: any) {
  if(!mutable.value || saving.value) {return;}
  if(drafts.value[item.productId] && notInStock(item)) {delete drafts.value[item.productId];} else {edit(item, "0");}
}

function stop() {
  visit++;
  subscription?.unsubscribe();
  subscription = undefined;
}
async function checkMutable() {
  const response = await counts.getInventoryCountImportSession({ inventoryCountImportId: props.inventoryCountImportId });
  if(response?.status !== 200 || commonUtil.hasError(response)) {throw new Error("Session unavailable");}
  const locks = await counts.getSessionLock({ inventoryCountImportId: props.inventoryCountImportId });
  if(locks?.status !== 200 || commonUtil.hasError(locks)) {throw new Error("Session lock unavailable");}
  const user = useUserProfile();

  return response.data?.statusId === "SESSION_ASSIGNED" && !(locks.data?.entityValueList || []).some((lock: any) =>
    lock.userId !== user.getUserProfile?.username || lock.deviceId !== user.getDeviceId);
}
async function load() {
  stop();
  const id = visit;
  loading.value = true;
  error.value = "";
  mutable.value = false;
  try {
    await waitForSessionTeardown();
    if(id !== visit) {return;}
    const canEdit = await checkMutable();
    if(id !== visit) {return;}
    mutable.value = canEdit;
    // This also supports a direct link or a cold launch without the scanner page.
    const pageSize = 500;
    for(let pageIndex = 0; ; pageIndex++) {
      const response = await counts.getSessionItemsByImportId({ inventoryCountImportId: props.inventoryCountImportId,
        facilityId: useProductStore().getCurrentFacility.facilityId, pageIndex, pageSize });
      if(id !== visit) {return;}
      if(response?.status !== 200 || !Array.isArray(response.data) || commonUtil.hasError(response)) {throw new Error("Session items unavailable");}
      await counts.storeInventoryCountItems(response.data);
      if(id !== visit) {return;}
      if(response.data.length < pageSize) {break;}
    }
    subscribeToItems(id);
    const productIds = await counts.getSessionProductIds(props.inventoryCountImportId);
    if(id === visit && productIds.length) {void productMaster.prefetch(productIds).catch(() => undefined);}
  } catch {
    if(id === visit) {
      error.value = translate("Failed to load assigned items.");
      loading.value = false;
    }
  }
}
function subscribeToItems(id: number) {
  subscription?.unsubscribe();
  subscription = counts.getAssignedHandCountItems(props.inventoryCountImportId, sessionSort.value).subscribe({
    next: (rows: any[]) => {
      if(id !== visit) {return;}
      items.value = rows;
      loading.value = false;
    },
    error: () => {
      if(id !== visit) {return;}
      error.value = translate("Failed to load assigned items.");
      loading.value = false;
    }
  });
}
// Reorder the live list without rehydrating it or discarding unsaved quantities.
watch([sessionSort, () => productStore.getPrimaryId], () => {
  if(subscription && props.active) {subscribeToItems(visit);}
});
async function save(): Promise<boolean> {
  if(!canSave.value) {return false;}
  saving.value = true;
  try {
    if(!(await checkMutable())) {throw new Error("Session no longer available");}
    const edits = Object.entries(drafts.value).map(([productId, draft]) => ({ productId,
      quantity: Number(draft.value), expectedQuantity: draft.expectedQuantity }));
    // Aggregation resolves explicit product IDs through the product cache. Wait for
    // edited products so a cold/direct launch cannot create unmatched records.
    for(const edit of edits) {
      const { product } = await productMaster.getById(edit.productId);
      if(!product) {throw new Error("Product unavailable");}
    }
    await counts.saveHandCountTotals(props.inventoryCountImportId, edits, userProfile.getUserProfile?.username);
    // Apply the saved totals immediately; liveQuery then reconciles the same local scan events.
    for(const edit of edits) {
      const item = items.value.find(item => item.productId === edit.productId);
      if(item) {item.quantity = edit.quantity; item.countedByUserLoginId = userProfile.getUserProfile?.username;}
    }
    drafts.value = {};
    commonUtil.showToast(translate("Items Saved"));

    return true;
  } catch {
    commonUtil.showToast(translate("Could not save counts. Your edits are kept; check the session and try again."));

    return false;
  } finally {
    saving.value = false;
  }
}
function confirmLeave(): Promise<boolean> {
  if(saving.value) {return Promise.resolve(false);}
  if(!hasChanges.value) {return Promise.resolve(true);}

  return new Promise(resolve => {
    void alertController.create({
      header: translate("Save hand-counted items"),
      message: translate("You have unsaved quantity changes."),
      buttons: [
        { text: translate("Cancel"), role: "cancel" },
        { text: translate("Discard"), role: "discard", handler: () => { drafts.value = {}; resolve(true); } },
        { text: translate("Save"), handler: async () => { resolve(await save()); } }
      ]
    }).then(async alert => {
      await alert.present();
      const result = await alert.onDidDismiss();
      if(result.role === "cancel" || result.role === "backdrop") {resolve(false);}
    });
  });
}
watch(() => [props.active, props.inventoryCountImportId], () => {
  if(!props.active) {
    stop();

    return;
  }
  if(sessionId !== props.inventoryCountImportId) {
    sessionId = props.inventoryCountImportId;
    items.value = [];
    drafts.value = {};
    segment.value = "uncounted";
    query.value = "";
  }
  void load();
}, { immediate: true });
onUnmounted(stop);
defineExpose({ confirmLeave, save, draftCount, canSave, segment, assignedCount, uncountedCount });
</script>

<style scoped>
.handcount-screen { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 0; padding-bottom: var(--keyboard-offset, 0px); box-sizing: border-box; }
.handcount-screen > :not(.handcount-list) { flex-shrink: 0; }
/* Keep virtual rows above the shared iOS keyboard offset. */
.handcount-list { flex: 1; min-height: 0; overflow-y: auto; }
.handcount-search { display: flex; align-items: center; gap: var(--spacer-sm); }
.handcount-search ion-searchbar { flex: 1; min-width: 0; }
.handcount-search ion-item { flex: 0 0 15rem; }
.handcount-columns { display: grid; grid-template-columns: minmax(0, 1fr) 9rem 16rem; align-items: center; gap: var(--spacer-base); width: 100%; }
.handcount-row { min-height: 96px; padding-block: var(--spacer-xs); }
.handcount-product { display: flex; align-items: center; gap: var(--spacer-sm); min-width: 0; }
.handcount-product ion-thumbnail { flex-shrink: 0; }
.handcount-product ion-label { min-width: 0; }
.handcount-zero { justify-self: center; display: flex; align-items: center; gap: var(--spacer-xs); }
.handcount-zero-label { display: none; }
.handcount-zero ion-checkbox { flex: 0 0 44px; width: 44px; height: 44px; }
.handcount-quantity { display: flex; align-items: center; justify-content: space-between; gap: var(--spacer-base); }
/* Safari needs the native shadow button to opt out of double-tap zoom too. */
.handcount-quantity ion-button,
.handcount-quantity ion-button::part(native),
.handcount-zero { touch-action: manipulation; }
.handcount-quantity ion-button { width: 56px; height: 56px; min-width: 56px; margin-inline: 0; --padding-start: 12px; --padding-end: 12px; }
.handcount-quantity ion-icon { font-size: 32px; }
.handcount-quantity ion-input { flex: 0 0 88px; width: 88px; }
@media (max-width: 699px) {
  .handcount-search { flex-wrap: wrap; gap: 0; }
  .handcount-search ion-searchbar { flex-basis: 100%; }
  .handcount-search ion-item { flex: 1; }
  .handcount-headings { display: none; }
  .handcount-columns { grid-template-columns: minmax(0, 1fr) 16rem; gap: var(--spacer-xs); }
  .handcount-product { grid-column: 1 / -1; }
  .handcount-zero { justify-self: start; width: auto; }
  .handcount-zero-label { display: inline; }
}
@media (max-width: 399px) {
  .handcount-columns { grid-template-columns: 1fr; }
  .handcount-quantity { justify-self: end; width: 16rem; }
}
</style>
