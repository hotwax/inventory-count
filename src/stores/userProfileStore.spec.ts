import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * After login the app has to make sure the offline database is open and agent control is running.
 * When the app is loaded on the login screen, the database is opened there but no facility is
 * known yet, so agent control is skipped and has to be started once login has loaded the facility.
 */
const { appInit, productStore } = vi.hoisted(() => ({
  appInit: { dbIsOpen: false, initialize: vi.fn(), startAgentControl: vi.fn() },
  productStore: {
    fetchUserFacilities: vi.fn(),
    fetchFacilityPreference: vi.fn(),
    fetchProductStores: vi.fn(),
    fetchProductStorePreference: vi.fn(),
    getProductIdentifierSettings: vi.fn(),
    getSettings: vi.fn(),
    prepareProductIdentifierOptions: vi.fn(),
    getCurrentProductStore: { productStoreId: "STORE_1" }
  }
}));

vi.mock("@common", () => ({
  api: vi.fn(),
  client: vi.fn(),
  commonUtil: { hasError: () => false },
  cookieHelper: () => ({ get: () => "test-oms" }),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  i18n: { global: {} },
  translate: (value: string) => value,
  useAuth: () => ({})
}));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => productStore }));
vi.mock("@/composables/useInventoryCountRun", () => ({
  useInventoryCountRun: () => ({ loadStatusDescription: vi.fn() })
}));
vi.mock("@/services/appInitializer", () => ({
  get db() { return appInit.dbIsOpen ? {} : undefined; },
  initialize: appInit.initialize,
  startAgentControl: appInit.startAgentControl
}));

import { useUserProfile } from "@/stores/userProfileStore";

function userProfileStore() {
  setActivePinia(createPinia());
  const store = useUserProfile();

  store.fetchUserProfile = vi.fn();
  store.fetchPermissions = vi.fn();
  store.fetchSystemInformation = vi.fn();

  return store;
}

beforeEach(() => {
  appInit.initialize.mockReset();
  appInit.startAgentControl.mockReset();
});

describe("post login start-up", () => {
  it("starts agent control when the database was already opened on the login screen", async () => {
    appInit.dbIsOpen = true;

    await userProfileStore().postLogin();

    expect(appInit.startAgentControl).toHaveBeenCalledTimes(1);
    expect(appInit.initialize).not.toHaveBeenCalled();
  });

  it("initializes the app, which starts agent control itself, when the database is not open yet", async () => {
    appInit.dbIsOpen = false;

    await userProfileStore().postLogin();

    expect(appInit.initialize).toHaveBeenCalledTimes(1);
    expect(appInit.startAgentControl).not.toHaveBeenCalled();
  });
});
