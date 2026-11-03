import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ history: vi.fn(), download: vi.fn(), toast: vi.fn(), log: vi.fn() }));
vi.mock('@common', async () => {
  const { commonUtil } = await import('@common/utils/commonUtil');
  return { commonUtil: { ...commonUtil, showToast: state.toast }, translate: (value: string) => value, logger: { error: state.log } };
});
vi.mock('@ionic/vue', async () => ({ ...await vi.importActual<any>('@ionic/vue'), onIonViewDidEnter: vi.fn() }));
vi.mock('@/composables/useInventoryCountRun', () => ({ useInventoryCountRun: () => ({
  getExportedCycleCountsSystemMessages: state.history, getExportedCycleCountsFileData: state.download
}) }));
import ExportHistory from './ExportHistory.vue';

beforeEach(() => vi.resetAllMocks());

describe('Export failure reporting', () => {
  // Component boundary tests; these do not validate the HotWax server.
  it.each(['history', 'download'] as const)('keeps the raw %s error in logs and displays the server explanation', async (operation) => {
    const error = { response: { status: 403, data: { errors: 'Export access denied' } } };
    state[operation].mockRejectedValue(error);
    const wrapper = mount(ExportHistory, { shallow: true });
    try {
      if (operation === 'history') await (wrapper.vm as any).fetchExportHistory();
      else await (wrapper.vm as any).downloadExport({ systemMessageId: 'TEST' });
      expect(state.log.mock.calls[0][1]).toBe(error);
      expect(state.toast).toHaveBeenCalledWith(expect.stringContaining('Export access denied'));
    } finally { wrapper.unmount(); }
  });

  it('keeps a useful fallback when a proxy returns HTML', async () => {
    state.history.mockRejectedValue({ response: { data: '<html>Gateway error</html>' } });
    const wrapper = mount(ExportHistory, { shallow: true });
    try {
      await (wrapper.vm as any).fetchExportHistory();
      expect(state.toast).toHaveBeenCalledWith('Failed to load export history. ');
    } finally { wrapper.unmount(); }
  });
});
