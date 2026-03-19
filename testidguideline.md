# Generic `data-testid` Guideline for Ionic + Vue (Agent-Ready)

## Purpose
Use `data-testid` to make UI tests stable, readable, and independent of text, style, and DOM layout changes.

## Scope
Applies to Ionic + Vue templates/components, including overlays (`alertController`, `modalController`, `popoverController`) and state blocks (`loading`, `empty`, `error`).

## Naming convention
- Use `kebab-case` only.
- Canonical pattern: `<scope>-<feature>-<element>-<type>`.
- `scope` should be page or component level (`orders`, `product-list`, `picker-modal`).
- Common suffixes:
  - Actions/inputs: `-btn`, `-input`, `-search`, `-toggle`, `-checkbox`, `-radio`, `-select`
  - Structure: `-tab`, `-segment`, `-chip`, `-card`, `-row`, `-list`, `-section`
  - Overlay: `-modal`, `-popover`, `-drawer`
  - State: `-loading`, `-empty`, `-error`, `-success`

Examples:
- `orders-search-input`
- `inventory-filter-toggle`
- `shipment-create-btn`
- `product-row-${productId}`

## What must get a test ID
- Navigation controls: back/menu/open/close.
- Primary and destructive actions: save/submit/confirm/delete/cancel.
- Form fields: `ion-input`, `ion-searchbar`, `ion-select`, toggles, checkboxes, radios.
- Filters/sorts and segment tabs.
- Business entity rows/cards and their row-level actions.
- State containers: loading, empty, error.
- Infinite scroll/pagination triggers.

## What should usually not get a test ID
- Decorative icons/images.
- Purely presentational wrappers.
- Static text-only nodes (unless test-critical status text).

## Ionic-specific rules
- Put `data-testid` on the component receiving interaction:
  - `ion-button`, `ion-item[button]`, `ion-toggle`, `ion-checkbox`, `ion-radio`, `ion-segment-button`, `ion-fab-button`, `ion-searchbar`, `ion-input`, `ion-select`.
- For `ion-input` and `ion-searchbar`, keep ID on Ionic wrapper (not only native inner input).
- For overlays, ensure IDs exist for:
  - Open trigger
  - Confirm button
  - Cancel button
  - Critical overlay input(s)

## Vue-specific rules
- `v-for`: use stable business key in ID, never index.
  - Good: `order-row-${order.id}`
  - Avoid: `order-row-${index}`
- `v-if` / `v-else`: assign IDs to each major conditional state block.
- Reusable components: expose a test-id contract via prop if parent needs deterministic selectors.

## Dynamic ID patterns
- Row: `<feature>-row-${entityId}`
- Card: `<feature>-card-${entityId}`
- Row action: `<feature>-${entityId}-edit-btn`
- Filter option: `<feature>-filter-${filterKey}`

## Consistency rules
- Same intent => same suffix pattern across app (`*-save-btn`, `*-cancel-btn`).
- IDs must be unique within visible page scope.
- Do not rename existing IDs unless migration is explicitly requested.

## Agent execution contract
Use this when an AI agent is asked to add/standardize `data-testid`.

### Inputs the agent should expect
- One or more `.vue` files.
- A request to add/update/standardize test IDs.
- Optional constraints: no behavior changes, no refactor, no style changes.

### Required behavior
1. Read template and script sections.
2. Inventory interaction/state targets using this order:
   - navigation/actions
   - form controls
   - filters/tabs
   - list/card/row actions
   - loading/empty/error states
   - overlays and overlay actions
3. Preserve existing valid IDs.
4. Add missing IDs using the naming convention.
5. Replace only invalid IDs (index-based, non-deterministic, inconsistent naming).
6. Do not change runtime behavior.

### Required output format (for the agent response)
- `Summary`: what files were updated.
- `Coverage`: counts of added/preserved/renamed IDs.
- `Notable decisions`: any naming choices or conflicts resolved.
- `Validation`: confirmation that no logic changes were introduced.

### Conflict resolution rules
- If multiple names are possible, prefer shorter and intent-clear.
- If existing names conflict with convention but are already used in tests, preserve and document.
- If entity lacks stable ID, use best stable fallback (slug/code), not index.

## Definition of done
- Every critical action/input/filter/state has a deterministic `data-testid`.
- No index-based dynamic IDs remain.
- Overlay confirm/cancel/input paths are covered.
- Existing behavior unchanged.
- Naming is convention-compliant and consistent.

## PR checklist
- All new interactive elements have `data-testid`.
- All loading/empty/error states have `data-testid`.
- All `v-for` IDs are stable-key based.
- No duplicate IDs in same visible scope.
- No CSS/logic dependency introduced on `data-testid`.
