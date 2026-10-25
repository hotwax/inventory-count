import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Real page with API/worker doubles: lifecycle coverage, not backend validation.
const state = vi.hoisted(() => ({ enter: null as any, leave: null as any, store: null as any, api: vi.fn(), create: vi.fn(), logs: vi.fn(), adjustments: vi.fn(), unmatched: vi.fn(), clear: vi.fn(), stock: vi.fn() }));
vi.mock('@common', () => ({ api: state.api, translate: (s: string) => s, commonUtil: { showToast: vi.fn(), getOmsURL: () => '', getMaargURL: () => '', getOMSInstanceName: () => 'unit-only', getToken: () => '' } }));
vi.mock('@ionic/vue', async () => ({ ...await vi.importActual<any>('@ionic/vue'), onIonViewDidEnter: (fn: any) => { state.enter = fn; }, onIonViewDidLeave: (fn: any) => { state.leave = fn; } }));
vi.mock('@common/core/workerFactory', () => ({ WorkerFactory: { createWorker: state.create } }));
vi.mock('@/stores/productStore', () => ({ useProductStore: () => state.store }));
vi.mock('@/stores/userProfileStore', () => ({ useUserProfile: () => ({ getUserProfile: { username: 'unit-only' } }) }));
vi.mock('@/composables/useProductMaster', () => ({ useProductMaster: () => ({ getVarianceLogs: state.logs, getInventoryAdjustments: state.adjustments, getUnmatchedInventoryAdjustments: state.unmatched, clearVarianceLogsAndAdjustments: state.clear, getProductStock: state.stock }) }));
vi.mock('@/components/Image.vue', () => ({ default: { template: '<div />' } }));
import Variance from '@/views/Variance.vue';

let wrapper: any;
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  state.store = reactive({ getCurrentFacility: { facilityId: 'F1' }, getGoodIdentificationOptions: [], getBarcodeIdentificationPref: 'SKU' });
  state.api.mockResolvedValue({ status: 200, data: [] });
  state.stock.mockResolvedValue({ data: { qoh: 0 } });
  for(const query of [state.logs, state.adjustments, state.unmatched]) query.mockReturnValue(of([]));
  state.create.mockImplementation(() => ({ worker: { postMessage: vi.fn(), terminate: vi.fn() }, api: {} }));
  wrapper = mount(Variance, { shallow: true });
  await state.enter();
});
afterEach(async () => { await state.leave(); wrapper.unmount(); vi.useRealTimers(); });

describe('variance facility switching', () => {
  it('preserves manual rows on ordinary navigation, then clears cached rows on facility change', async () => {
    wrapper.vm.handCountedProducts = [{ productId: 'P1', countedQuantity: 2 }];
    await state.leave(); await state.enter();
    expect(wrapper.vm.handCountedProducts).toHaveLength(1);
    wrapper.vm.events = [{ facilityId: 'F1' }];
    wrapper.vm.inventoryAdjustments = [{ facilityId: 'F1' }];
    wrapper.vm.unmatchedItems = [{ facilityId: 'F1' }];
    await state.leave();
    state.store.getCurrentFacility = { facilityId: 'F2' };
    for(const field of ['events', 'inventoryAdjustments', 'unmatchedItems', 'handCountedProducts']) expect(wrapper.vm[field]).toEqual([]);
    await state.enter();
    for(const query of [state.logs, state.adjustments, state.unmatched]) expect(query).toHaveBeenLastCalledWith('F2');
    expect(state.create.mock.results.at(-1)!.value.worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ context: expect.objectContaining({ facilityId: 'F2' }) }) }));
  });
  it('ignores a manual product lookup that finishes after switching facility', async () => {
    const stock = deferred(); state.stock.mockReturnValueOnce(stock.promise);
    const adding = wrapper.vm.addProductInhandCountedItems({ productId: 'P1' });
    await state.leave(); state.store.getCurrentFacility = { facilityId: 'F2' };
    stock.resolve({ data: { qoh: 8 } }); await adding;
    expect(wrapper.vm.handCountedProducts).toEqual([]);
  });
  it('clears the submitted facility when the response arrives after a switch', async () => {
    const response = deferred(); state.api.mockReturnValueOnce(response.promise);
    wrapper.vm.inventoryAdjustments = [{ productId: 'P1', facilityId: 'F1', quantity: 2 }];
    wrapper.vm.optedVarianceReason = 'IID_FOUND';
    const submitting = wrapper.vm.logVariance(); await flushPromises();
    expect(state.api.mock.lastCall![0].data.varianceList[0]).toMatchObject({ facilityId: 'F1', quantity: 2 });
    await state.leave(); state.store.getCurrentFacility = { facilityId: 'F2' };
    response.resolve({ status: 200 }); await submitting;
    expect(state.clear).toHaveBeenCalledWith('F1');
  });
  it('does not clear new manual rows when an earlier facility submission finishes', async () => {
    const response = deferred(); state.api.mockReturnValueOnce(response.promise);
    wrapper.vm.handCountedProducts = [{ productId: 'P1', countedQuantity: 2 }];
    wrapper.vm.optedVarianceReasonForHandCounted = 'IID_FOUND';
    const submitting = wrapper.vm.logHandCountedItemVariances(); await flushPromises();
    await state.leave(); state.store.getCurrentFacility = { facilityId: 'F2' };
    wrapper.vm.handCountedProducts = [{ productId: 'P2', countedQuantity: 4 }];
    response.resolve({ status: 200 }); await submitting;
    expect(wrapper.vm.handCountedProducts).toEqual([{ productId: 'P2', countedQuantity: 4 }]);
  });
  it('does not start a worker when the user leaves during initialization', async () => {
    await state.leave(); state.create.mockClear();
    const response = deferred(); state.api.mockReturnValueOnce(response.promise);
    const entering = state.enter(); await state.leave();
    response.resolve({ status: 200, data: [] }); await entering;
    expect(state.create).not.toHaveBeenCalled();
  });
});
