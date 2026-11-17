/** A missing acknowledgment or an edit after it must remain pending on device. */
export function needsInventoryCountSync(item?: {
  lastSyncedAt?: number | null;
  lastUpdatedAt?: number | null;
}): boolean {
  return !!item && (!item.lastSyncedAt || !!(item.lastUpdatedAt && item.lastUpdatedAt > item.lastSyncedAt));
}

/** An empty quantity is uncounted. Any number, including an entered zero, is a count. */
export function hasRecordedCount(item: { quantity?: number | null }): boolean {
  return item.quantity !== null && item.quantity !== undefined;
}

/** Removing scans back to zero leaves the item uncounted rather than counted as zero. */
export function toCountedQuantity(total: number, lastWasRemoval: boolean): number | null {
  return total === 0 && lastWasRemoval ? null : total;
}
