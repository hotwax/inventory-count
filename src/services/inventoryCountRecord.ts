/** A missing acknowledgment or an edit after it must remain pending on device. */
export function needsInventoryCountSync(item?: {
  lastSyncedAt?: number | null;
  lastUpdatedAt?: number | null;
}): boolean {
  return !!item && (!item.lastSyncedAt || !!(item.lastUpdatedAt && item.lastUpdatedAt > item.lastSyncedAt));
}
