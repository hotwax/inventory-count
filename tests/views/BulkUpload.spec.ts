import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Test page timer ownership, not the backend contract.
const state = vi.hoisted(() => ({ enter: null as any, leave: null as any, messages: vi.fn(), job: vi.fn() }));
vi.mock('@ionic/vue', async () => ({
  ...await vi.importActual<any>('@ionic/vue'),
  onIonViewDidEnter: (fn: any) => { state.enter = fn; },
  onIonViewWillLeave: (fn: any) => { state.leave = fn; },
}));
vi.mock('@common', () => ({ translate: (key: string) => key, commonUtil: { hasError: () => false }, logger: {} }));
vi.mock('@/composables/useInventoryCountRun', () => ({ useInventoryCountRun: () => ({ getCycleCntImportSystemMessages: state.messages }) }));
vi.mock('@/composables/useInventoryCountImport', () => ({ useInventoryCountImport: () => ({ getServiceJobDetail: state.job }) }));
vi.mock('@/services/utils', () => ({ getUploadFileParamName: () => 'file' }));
import BulkUpload from '@/views/BulkUpload.vue';

let wrapper: ReturnType<typeof mount>;
beforeEach(() => {
  vi.useFakeTimers();
  state.leave = () => {};
  state.messages.mockReset().mockResolvedValue([]);
  state.job.mockReset().mockResolvedValue({ data: {} });
  wrapper = mount(BulkUpload, { shallow: true, global: { renderStubDefaultSlot: true } });
});
afterEach(() => { wrapper.unmount(); vi.clearAllTimers(); vi.useRealTimers(); });

describe('Bulk Upload polling lifecycle', () => {
  it('stops both timers while cached and resumes a single poller on re-entry', async () => {
    await state.enter();
    expect(vi.getTimerCount()).toBe(2);
    state.leave();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(30000);
    expect(state.messages).toHaveBeenCalledTimes(1);
    await state.enter();
    await vi.advanceTimersByTimeAsync(15000);
    expect(state.messages).toHaveBeenCalledTimes(3);
    expect(state.job).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(2);
  });

  it('does not restart timers when an initial request finishes after leaving', async () => {
    let finish!: (value: any[]) => void;
    state.messages.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const entering = state.enter();
    state.leave();
    finish([]);
    await entering;
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(30000);
    expect(state.messages).toHaveBeenCalledTimes(1);
  });

  it('also stops timers when the page is unmounted', async () => {
    await state.enter();
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
