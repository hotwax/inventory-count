import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The initializer runs on every page load, including the login screen, where no facility has been
 * chosen yet. These tests cover that start-up path; the database and stores are stubbed.
 */
const { agentInitialize, productStore, warn } = vi.hoisted(() => ({
  agentInitialize: vi.fn(() => Promise.resolve()),
  productStore: { getCurrentFacility: null as any },
  warn: vi.fn()
}));

vi.mock("@common", () => ({
  commonUtil: { getOMSInstanceName: () => "test-oms" },
  logger: { warn, info: vi.fn(), error: vi.fn() }
}));
vi.mock("uuid", () => ({ v4: () => "generated-device-id" }));
vi.mock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ setDeviceId: vi.fn() }) }));
vi.mock("@/stores/productStore", () => ({ useProductStore: () => productStore }));
vi.mock("@/composables/useProductMaster", () => ({ useProductMaster: () => ({ init: vi.fn() }) }));
vi.mock("@/composables/useAgentControl", () => ({ useAgentControl: () => ({ initialize: agentInitialize }) }));
vi.mock("@/services/commonDatabase", () => ({
  createCommonDB: () => ({
    open: vi.fn(),
    appPreferences: { get: vi.fn(() => Promise.resolve({ key: "device", value: "device" })), put: vi.fn() }
  })
}));

import { initialize, startAgentControl } from "@/services/appInitializer";

beforeEach(() => {
  agentInitialize.mockClear();
  warn.mockClear();
});

describe("app initializer", () => {
  it("skips agent control without throwing when no facility is selected yet (login screen)", async () => {
    productStore.getCurrentFacility = null;

    await expect(initialize()).resolves.toBeUndefined();

    expect(agentInitialize).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("[AppInit] No facilityId available, skipping agent control initialization");
  });

  it("starts agent control with the facility id once a facility is selected", async () => {
    productStore.getCurrentFacility = { facilityId: "FAC_1" };

    await initialize();

    expect(agentInitialize).toHaveBeenCalledWith("FAC_1");
  });
});

describe("starting agent control after login", () => {
  it("does nothing while no facility is selected", () => {
    productStore.getCurrentFacility = null;

    startAgentControl();

    expect(agentInitialize).not.toHaveBeenCalled();
  });

  it("starts agent control for the facility selected at login", () => {
    productStore.getCurrentFacility = { facilityId: "FAC_2" };

    startAgentControl();

    expect(agentInitialize).toHaveBeenCalledWith("FAC_2");
  });
});
