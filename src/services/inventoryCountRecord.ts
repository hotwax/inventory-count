/** A missing acknowledgment or an edit after it must remain pending on device. */
export function needsInventoryCountSync(item?: {
  lastSyncedAt?: number | null;
  lastUpdatedAt?: number | null;
}): boolean {
  return !!item && (!item.lastSyncedAt || !!(item.lastUpdatedAt && item.lastUpdatedAt > item.lastSyncedAt));
}

/** Zero is counted only after a counter has explicitly recorded it. */
export function hasRecordedCount(item: { quantity?: number; countedByUserLoginId?: string | null }): boolean {
  return Number(item.quantity || 0) > 0 || !!item.countedByUserLoginId;
}
