# Session Detail Sort Design

## Goal

Add user-selectable sorting on the session detail page so store users do not need to pre-shape import files to get a usable counting order. Persist the selected sort preference on the device until the user changes it.

## Problem

Today the session detail experience does not expose user-controlled sorting. Users have been alphabetizing imports before upload because that is the only way to influence the count flow once a session starts. That workaround pushes operational complexity onto the uploader instead of letting the store user choose the most helpful order while counting.

The approved scope is intentionally narrow:

- support `Uploaded order`
- support `Alphabetical`
- support `Last updated`
- persist the selected sort on the device
- do not introduce backend changes in this iteration

## Existing Patterns

### Client-side sorting already exists

The admin review flows already use `SmartFilterSortBar` to perform client-side filtering and sorting on hydrated item data. Alphabetic sort in that component prefers:

1. `item.primaryId`
2. `productMaster.primaryId(item.product)`
3. `item.internalName`

That is the baseline pattern to reuse for the session detail feature.

### Device persistence already exists

The app already persists UI filter state through the Pinia `userProfile` store. The review-detail sort preference is stored in `uiFilters.reviewDetail.sort` and survives app restarts because the store uses `persist: true`.

The new session-detail sort preference should reuse this same persisted-store approach instead of introducing a new storage mechanism.

## Current Data Contract

### Backend session item fields available now

Session detail reads from `inventory-cycle-count/cycleCounts/sessions/:inventoryCountImportId/items`, backed by Poorti view `InventoryCountImportItemAndInventory`.

The underlying `InventoryCountImportItem` entity already includes:

- `inventoryCountImportId`
- `importItemSeqId`
- `locationSeqId`
- `productId`
- `productIdentifier`
- `quantity`
- `createdDate`
- Poorti extensions such as `uuid`, `isRequested`, and `systemQuantityOnHand`

### Why no backend work is required

`Uploaded order` can be derived from existing `importItemSeqId` values, assuming the current create order remains stable, which is consistent with the upload service creating rows in CSV iteration order.

`Alphabetical` can be derived client-side after product hydration, using the same identity logic already used by `SmartFilterSortBar`.

`Last updated` can be derived from the locally stored `lastUpdatedAt` value that the session-detail flow already uses.

### Known limitation

No backend field currently exposes a richer human-readable location label for sorting. `locationSeqId` exists, and OFBiz facility location data contains fields like `areaId`, `aisleId`, `sectionId`, `levelId`, and `positionId`, but those are not part of the current session item payload. Location sorting is therefore out of scope for this iteration.

## Product Behavior

### Sort options

The session detail page will expose exactly three sort options:

- `Uploaded order`
- `Alphabetical`
- `Last updated`

### Default behavior

For users with no saved preference on the device, default to `Uploaded order`.

### Persistence behavior

When a user changes the sort on the session detail page, save that choice to the persisted user profile store. Future session-detail visits on the same device should use that saved value until the user changes it again or clears app data.

### Segment behavior

The selected sort should apply consistently to the item lists shown on the session detail page rather than behaving differently per segment. The current session-detail segments are:

- `Uncounted`
- `Undirected`
- `Unmatched`
- `Counted`

The actual comparator can differ by data availability, but the selected sort mode should remain conceptually consistent across segments.

## Technical Design

### Local record changes

The local `inventoryCountRecords` normalization step should retain `importItemSeqId` so `Uploaded order` is explicit and durable in IndexedDB-backed views.

Without this, upload order is only accidental and is easy to lose when records are grouped or re-sorted.

### Sort keys

#### Uploaded order

Use `importItemSeqId` ascending.

For grouped rows, such as grouped counted or uncounted product rows, use the minimum `importItemSeqId` among the contributing records so the grouped item stays anchored to its earliest uploaded position.

#### Alphabetical

Use the same user-facing product identity pattern that already exists in the app:

1. hydrated `primaryId`
2. fallback `internalName`
3. fallback `productIdentifier`

This keeps the sort aligned with what users actually see in the list.

#### Last updated

Use `lastUpdatedAt` descending so the most recently changed items appear first.

For grouped rows, use the maximum `lastUpdatedAt` among the contributing records.

### Reuse strategy

Do not duplicate sorting logic ad hoc across session-detail segments. Reuse the same comparison rules and naming conventions already established by `SmartFilterSortBar`, but keep the session-detail implementation lightweight since that page does not currently use the full filter bar UI.

The implementation may extract shared sort helpers if that reduces duplication cleanly, but should avoid broad refactoring unrelated to this feature.

### Persistence strategy

Add a new persisted field under `uiFilters` for session-detail sort state, following the same pattern used by `reviewDetail`.

No new storage library or custom local-storage plumbing should be introduced.

## Documentation

Update the app documentation to describe:

- the new session-detail sort options
- the device-persisted preference behavior
- the meaning of `Uploaded order`

## Testing

Validation should cover:

- first load defaults to `Uploaded order`
- changing sort persists across reloads on the same device
- `Alphabetical` uses hydrated display identity correctly
- `Last updated` surfaces most recently changed rows first
- grouped rows remain stable and do not lose their upload-order anchor
- behavior works in the actual browser runtime, not just by code inspection

## Out of Scope

- backend or Poorti entity changes
- admin review-page changes beyond reuse of existing patterns
- location-based sorting
- centralized admin-controlled default sort
