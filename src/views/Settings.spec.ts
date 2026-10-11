import { describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, reactive } from 'vue';
const state = vi.hoisted(() => ({ store: null as any }));
vi.mock('@common', () => ({
  translate: (value: string) => value,
  useAuth: () => ({}),
  commonUtil: { isAppEmbedded: () => false, getOMSInstanceName: () => '', getToken: () => '', getOmsURL: () => '' },
}));
vi.mock('@/stores/productStore', () => ({ useProductStore: () => state.store }));
vi.mock('@/stores/userProfileStore', () => ({ useUserProfile: () => ({ getUserProfile: null, hasPermission: () => false }) }));
vi.mock('@/router', () => ({ default: { currentRoute: { value: { fullPath: '/settings' } } } }));
vi.mock('@/composables/useDiagnostics', () => ({ useDiagnostics: () => ({ baseDiagnosticsList: [], omsDiagnosticsList: [], runDiagnostics: vi.fn() }) }));
vi.mock('@/services/appInitializer', () => ({ db: {} }));
vi.mock('@/components/FacilitySwitcher.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/TimeZoneSwitcher.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/DxpAppVersionInfo.vue', () => ({ default: { render: () => null } }));
import Settings from './Settings.vue';

describe('Settings initialization across logout', () => {
  it.each(['before mount', 'settings request', 'identifier options request'])(
    'stops when the store is cleared during %s', async (stage) => {
      let finish!: () => void;
      const pending = () => new Promise<void>((resolve) => { finish = resolve; });
      state.store = reactive({
        getCurrentProductStore: stage === 'before mount' ? null : { productStoreId: 'STORE' },
        getProductStores: [], getProductIdentificationPref: {}, getProductIdentificationOptions: [],
        getGoodIdentificationOptions: [], getBarcodeIdentificationPref: '',
        getSettings: vi.fn(stage === 'settings request' ? pending : async () => {}),
        prepareProductIdentifierOptions: vi.fn(stage === 'identifier options request' ? pending : async () => {}),
        getDxpIdentificationPref: vi.fn(),
      });
      const errors = vi.fn();
      const app = createApp(Settings);
      app.config.errorHandler = errors;
      app.mount(document.createElement('div'));
      if (stage !== 'before mount') {
        await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
        state.store.getCurrentProductStore = null;
        finish();
      }
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(errors).not.toHaveBeenCalled();
      expect(state.store.getDxpIdentificationPref).not.toHaveBeenCalled();
      app.unmount();
    }
  );
});
