import { useInventoryCountImport } from '@/composables/useInventoryCountImport';

let isRunning = false;
let intervalId: number | null = null;

export function startBackgroundAggregation() {
  if (intervalId) return; // already running

  const { aggregateScanEvents } = useInventoryCountImport();

  intervalId = window.setInterval(async () => {
    if (isRunning) return; // skip parallel runs
    isRunning = true;

    try {
      await aggregateScanEvents();
      console.log('[Aggregation] Scan events aggregated successfully');
    } catch (err) {
      console.error('[Aggregation] Error:', err);
    } finally {
      isRunning = false;
    }
  }, 10_000); // every 10s
}

export function stopBackgroundAggregation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
  }
}