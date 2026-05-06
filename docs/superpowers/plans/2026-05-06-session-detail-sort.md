# Session Detail Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add session-detail sorting with device-persisted `Uploaded order`, `Alphabetical`, and `Last updated` modes without backend changes.

**Architecture:** Reuse the existing client-side sort and persistence patterns already present in `SmartFilterSortBar` and `userProfileStore`. Persist the session-detail sort choice in the existing Pinia store, retain `importItemSeqId` in local session records, and route all segment list ordering through a shared session-detail sort helper.

**Tech Stack:** Vue 3, Ionic Vue, Pinia persisted state, Dexie IndexedDB, existing product hydration and session item composables.

---

### Task 1: Document persisted session-detail sort state

**Files:**
- Modify: `src/stores/userProfileStore.ts`
- Test: manual verification through app reload

- [ ] **Step 1: Add the new persisted sort slot for session detail**

Update the `uiFilters` state so session detail has its own sort preference instead of overloading `reviewDetail`.

```ts
sessionDetail: {
  sort: 'uploaded'
}
```

- [ ] **Step 2: Expose a getter for session-detail filters**

Add a getter next to `getDetailPageFilters`:

```ts
getSessionDetailFilters: (state) => state.uiFilters.sessionDetail
```

- [ ] **Step 3: Reuse `updateUiFilter` for writes**

Do not add a new action unless necessary. Use the existing action:

```ts
updateUiFilter(page: string, key: string, value: any) {
  if (!this.uiFilters[page]) this.uiFilters[page] = {}
  this.uiFilters[page][key] = value
}
```

- [ ] **Step 4: Run lint on the updated store**

Run: `npm run lint -- src/stores/userProfileStore.ts`

Expected: lint completes or only reports unrelated repo warnings

### Task 2: Preserve upload sequence in local session records

**Files:**
- Modify: `src/composables/useInventoryCountImport.ts`
- Test: manual verification through browser runtime

- [ ] **Step 1: Retain `importItemSeqId` during normalization**

In `storeInventoryCountItems`, include:

```ts
importItemSeqId: item.importItemSeqId || null,
```

inside the normalized local record object.

- [ ] **Step 2: Preserve sequence when grouping by product**

Update `groupByProductAndSum` so the first grouped row tracks the minimum upload sequence and maximum last-updated time:

```ts
existing.importItemSeqId = Math.min(
  Number(existing.importItemSeqId || Number.MAX_SAFE_INTEGER),
  Number(item.importItemSeqId || Number.MAX_SAFE_INTEGER)
)
existing.lastUpdatedAt = Math.max(
  Number(existing.lastUpdatedAt || 0),
  Number(item.lastUpdatedAt || 0)
)
```

- [ ] **Step 3: Keep grouped rows stable when there is no sequence**

Add a safe fallback for records that do not have `importItemSeqId`:

```ts
const sequence = Number(item.importItemSeqId || 0)
```

and ensure comparisons do not produce `NaN`.

- [ ] **Step 4: Verify the updated composable compiles**

Run: `npm run lint -- src/composables/useInventoryCountImport.ts`

Expected: lint completes or only reports unrelated repo warnings

### Task 3: Add reusable session-detail sort helpers

**Files:**
- Modify: `src/composables/useInventoryCountImport.ts`
- Test: manual verification through browser runtime

- [ ] **Step 1: Add a sort mode type**

Add a local union type near the composable helpers:

```ts
type SessionSortMode = 'uploaded' | 'alphabetic' | 'lastUpdated'
```

- [ ] **Step 2: Add a display-key resolver**

Add a helper that mirrors existing app behavior:

```ts
function getAlphabeticSortKey(item: any) {
  return (
    item.primaryId ||
    useProductMaster().primaryId(item.product) ||
    item.internalName ||
    item.productIdentifier ||
    ''
  )
}
```

- [ ] **Step 3: Add a reusable sorter**

Add a helper:

```ts
function sortSessionItems(items: any[], sortMode: SessionSortMode) {
  const results = [...items]

  if (sortMode === 'uploaded') {
    results.sort((a, b) => Number(a.importItemSeqId || 0) - Number(b.importItemSeqId || 0))
  } else if (sortMode === 'alphabetic') {
    results.sort((a, b) => getAlphabeticSortKey(a).localeCompare(getAlphabeticSortKey(b)))
  } else if (sortMode === 'lastUpdated') {
    results.sort((a, b) => Number(b.lastUpdatedAt || 0) - Number(a.lastUpdatedAt || 0))
  }

  return results
}
```

- [ ] **Step 4: Route live-query list builders through the sorter**

Update:

- `getCountedItems`
- `getUncountedItems`
- `getUndirectedItems`
- `getUnmatchedItems`

to sort their final mapped arrays through `sortSessionItems(...)` before returning.

- [ ] **Step 5: Pass sort mode into each list getter**

Change the getter signatures from:

```ts
const getCountedItems = (inventoryCountImportId: string) =>
```

to:

```ts
const getCountedItems = (inventoryCountImportId: string, sortMode: SessionSortMode) =>
```

and do the same for the other list getters used by session detail.

- [ ] **Step 6: Run lint on the composable**

Run: `npm run lint -- src/composables/useInventoryCountImport.ts`

Expected: lint completes or only reports unrelated repo warnings

### Task 4: Add session-detail sort UI and wiring

**Files:**
- Modify: `src/views/SessionCountDetail.vue`
- Test: manual verification through browser runtime

- [ ] **Step 1: Read the persisted sort preference**

Add a computed or ref based on the user profile store:

```ts
const userProfile = useUserProfile()
const sessionSort = computed({
  get: () => userProfile.getSessionDetailFilters?.sort || 'uploaded',
  set: (value) => userProfile.updateUiFilter('sessionDetail', 'sort', value)
})
```

- [ ] **Step 2: Add a lightweight Ionic sort control**

In the session-detail template, add an Ionic control near the segment list area using existing Ionic components only, for example:

```vue
<ion-item lines="none">
  <ion-label>{{ translate('Sort by') }}</ion-label>
  <ion-select :value="sessionSort" @ionChange="sessionSort = $event.detail.value">
    <ion-select-option value="uploaded">{{ translate('Uploaded order') }}</ion-select-option>
    <ion-select-option value="alphabetic">{{ translate('Alphabetical') }}</ion-select-option>
    <ion-select-option value="lastUpdated">{{ translate('Last updated') }}</ion-select-option>
  </ion-select>
</ion-item>
```

- [ ] **Step 3: Rebind list subscriptions to the selected sort**

Where the view currently subscribes to:

```ts
useInventoryCountImport().getCountedItems(props.inventoryCountImportId)
```

change the calls to include `sessionSort.value`.

- [ ] **Step 4: Refresh subscriptions when sort changes**

Watch the sort preference and reinitialize the list subscriptions:

```ts
watch(sessionSort, () => {
  initializeLiveQueries()
})
```

Use the existing session-detail setup structure and avoid broad refactoring.

- [ ] **Step 5: Keep segment behavior consistent**

Apply the same sort mode to:

- `uncountedItems`
- `undirectedItems`
- `unmatchedItems`
- `countedItems`

Do not leave one segment on the old implicit ordering.

- [ ] **Step 6: Run lint on the session detail view**

Run: `npm run lint -- src/views/SessionCountDetail.vue`

Expected: lint completes or only reports unrelated repo warnings

### Task 5: Update app documentation and issue summary

**Files:**
- Modify: `docs/README.md`
- Modify: GitHub issue `#1392`

- [ ] **Step 1: Document the new session-detail sort feature**

Add a short subsection to the app docs describing:

- the three sort modes
- the first-load default of `Uploaded order`
- device persistence of the selected sort

- [ ] **Step 2: Update the GitHub issue body**

Expand `#1392` to include:

- approved scope: `Uploaded order`, `Alphabetical`, `Last updated`
- reuse of SmartFilterSortBar sorting rules
- no backend changes in this iteration
- persistence on device via existing user profile store

- [ ] **Step 3: Verify docs are readable**

Run: `sed -n '1,220p' docs/README.md`

Expected: the new section reads clearly and matches implementation scope

### Task 6: Runtime verification in browser

**Files:**
- Test only: local app runtime

- [ ] **Step 1: Start the app locally**

Run: `npm install` if needed, then `npm run serve`

Expected: local development server starts successfully

- [ ] **Step 2: Open the app in Browser Use or Chrome DevTools MCP**

Navigate to a session detail page with representative data.

Expected: session detail loads without errors

- [ ] **Step 3: Verify default behavior**

Check that a first-load session on a clean preference state shows `Uploaded order`.

Expected: the UI indicates `Uploaded order`, and rows align with import sequence behavior

- [ ] **Step 4: Verify alphabetical sorting**

Change the sort to `Alphabetical`.

Expected: visible rows reorder by the same display identity users see in the list

- [ ] **Step 5: Verify last-updated sorting**

Change the sort to `Last updated`.

Expected: recently updated rows move to the top

- [ ] **Step 6: Verify persistence**

Reload the page after choosing a non-default sort.

Expected: the same sort remains selected and active after reload

### Task 7: Final repo verification and PR prep

**Files:**
- Modify: git metadata only

- [ ] **Step 1: Run targeted lint**

Run:

```bash
npm run lint -- src/stores/userProfileStore.ts src/composables/useInventoryCountImport.ts src/views/SessionCountDetail.vue
```

Expected: pass or only unrelated pre-existing warnings

- [ ] **Step 2: Review changed files**

Run:

```bash
git diff -- src/stores/userProfileStore.ts src/composables/useInventoryCountImport.ts src/views/SessionCountDetail.vue docs/README.md docs/superpowers/specs/2026-05-06-session-detail-sort-design.md docs/superpowers/plans/2026-05-06-session-detail-sort.md
```

Expected: diff contains only scoped feature work

- [ ] **Step 3: Commit**

Run:

```bash
git add src/stores/userProfileStore.ts src/composables/useInventoryCountImport.ts src/views/SessionCountDetail.vue docs/README.md docs/superpowers/specs/2026-05-06-session-detail-sort-design.md docs/superpowers/plans/2026-05-06-session-detail-sort.md
git commit -m "feat: add persisted session detail sorting"
```

- [ ] **Step 4: Push and create PR**

Run:

```bash
git push -u origin <branch-name>
gh pr create --draft --title "feat: add persisted session detail sorting" --body-file <prepared-pr-body>
```

Expected: draft PR created against `main`
