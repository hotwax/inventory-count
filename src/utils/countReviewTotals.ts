type Row = Record<string, any>;

function quantity(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (value === '' || typeof value === 'boolean' || !Number.isFinite(Number(value))) {
    throw new Error('Count totals are incomplete. Refresh the count.');
  }
  return Number(value);
}

/** The review view joins price/store records before SUM; sum saved sessions instead. */
export function reconcileCountReviewTotals(review: Row[], contributions: Row[]): Row[] {
  const items = new Map<string, Row>();
  for (const row of review) {
    if (!row.productId || items.has(row.productId)) throw new Error('Count totals are incomplete. Refresh the count.');
    items.set(row.productId, {...row, quantity: null, numberOfSessions: 0});
  }
  const seen = new Set<string>();
  for (const row of contributions) {
    if (row.statusId === 'SESSION_VOIDED') continue;
    const item = items.get(row.productId);
    const key = JSON.stringify([row.productId, row.inventoryCountImportId]);
    if (!item || !row.inventoryCountImportId || seen.has(key)) throw new Error('Count totals are incomplete. Refresh the count.');
    seen.add(key);
    const counted = quantity(row.counted);
    if (counted !== null) item.quantity = (item.quantity ?? 0) + counted;
    item.numberOfSessions++;
  }
  return review.map(row => {
    const item = items.get(row.productId)!;
    if (!item.numberOfSessions || (row.numberOfSessions != null && item.numberOfSessions !== quantity(row.numberOfSessions))) {
      throw new Error('Count totals are incomplete. Refresh the count.');
    }
    // A reviewed row is an audit record. Later inventory changes must not rewrite its totals.
    if (row.decisionOutcomeEnumId && row.countedQuantity != null) item.quantity = quantity(row.countedQuantity);
    item.proposedVarianceQuantity = row.decisionOutcomeEnumId && row.varianceQuantity != null
      ? quantity(row.varianceQuantity)
      : item.quantity === null ? null : item.quantity - (quantity(row.systemQuantityOnHand) ?? 0);
    item.extendedUnitCost = (item.proposedVarianceQuantity ?? 0) * (quantity(row.unitCost) ?? 0);
    item.extendedPrice = (item.proposedVarianceQuantity ?? 0) * (quantity(row.price) ?? 0);
    return item;
  });
}
