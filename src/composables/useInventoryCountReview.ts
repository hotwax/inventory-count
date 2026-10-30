import {api, commonUtil} from '@common';
import {reconcileCountReviewTotals} from '@/utils/countReviewTotals';

type Row = Record<string, any>;
const root = 'inventory-cycle-count/cycleCounts';
const inFlight = new Set<string>();

export function useInventoryCountReview() {
  async function readRows(workEffortId: string, resource: string, orderByField: string) {
    const result: Row[] = [];
    for (let pageIndex = 0; pageIndex < 10000; pageIndex++) {
      const resp = await api({url: `${root}/workEfforts/${encodeURIComponent(workEffortId)}/${resource}`,
        method: 'get', cache: false, params: {pageIndex, pageSize: 500, orderByField}});
      if (commonUtil.hasError(resp) || !Array.isArray(resp?.data) || resp.data.some((row: any) => !row || typeof row !== 'object')) {
        throw new Error('Count totals could not be loaded.');
      }
      result.push(...resp.data);
      if (resp.data.length < 500) return result;
    }
    throw new Error('Count totals could not be fully loaded.');
  }

  async function load(workEffortId: string) {
    const [review, contributions] = await Promise.all([
      readRows(workEffortId, 'reviews', 'productId'),
      readRows(workEffortId, 'count', 'productId,inventoryCountImportId'),
    ]);
    return {items: reconcileCountReviewTotals(review, contributions), contributions};
  }

  /** Used by single, selected and bulk-close decisions; never trust stale screen totals. */
  async function submitCurrent(inventoryCountProductsList: Row[]) {
    if (!inventoryCountProductsList.length) return;
    const workEffortId = inventoryCountProductsList[0].workEffortId;
    if (!workEffortId || inventoryCountProductsList.some(row => row.workEffortId !== workEffortId)) throw new Error('Invalid count selection.');
    const [current, workResp] = await Promise.all([load(workEffortId), api({
      url: `${root}/workEfforts/${encodeURIComponent(workEffortId)}`, method: 'get', cache: false,
    })]);
    if (commonUtil.hasError(workResp) || workResp?.data?.statusId !== 'CYCLE_CNT_CMPLTD' ||
        current.contributions.some(row => row.statusId !== 'SESSION_SUBMITTED' && row.statusId !== 'SESSION_VOIDED')) {
      throw new Error('Count is not ready for approval.');
    }
    const byId = new Map(current.items.map(row => [row.productId, row]));
    const seen = new Set<string>();
    const pending: Row[] = [];
    for (const requested of inventoryCountProductsList) {
      const row = byId.get(requested.productId);
      if (!row || seen.has(requested.productId) || requested.facilityId !== workResp.data.facilityId ||
          !['APPLIED', 'SKIPPED'].includes(requested.decisionOutcomeEnumId)) throw new Error('Invalid count selection.');
      seen.add(requested.productId);
      if (row.decisionOutcomeEnumId) {
        if (row.decisionOutcomeEnumId !== requested.decisionOutcomeEnumId) throw new Error('Review decision changed. Refresh the count.');
        continue; // A retry after a lost response must not apply inventory a second time.
      }
      if ((row.quantity === null && requested.decisionOutcomeEnumId === 'APPLIED') ||
          requested.countedQuantity !== row.quantity || requested.varianceQuantity !== row.proposedVarianceQuantity) throw new Error('Count changed. Refresh the count before approving.');
      pending.push({...requested, countedQuantity: row.quantity, varianceQuantity: row.proposedVarianceQuantity,
        systemQuantity: row.systemQuantityOnHand ?? 0});
    }
    if (!pending.length) return;
    const resp = await api({url: `${root}/submit`, method: 'post', data: {inventoryCountProductsList: pending}});
    if (commonUtil.hasError(resp)) throw new Error('Count approval failed.');
  }
  async function submit(items: Row[]) {
    const id = items[0]?.workEffortId;
    if (!id) return;
    if (inFlight.has(id)) throw new Error('A review is already being submitted.');
    inFlight.add(id);
    try { return await submitCurrent(items); }
    finally { inFlight.delete(id); }
  }
  return {load, submit};
}
