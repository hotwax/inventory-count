import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

/**
 * The Count page reads the signed in user's name while it renders each session. The profile is
 * null once the session has ended (logout or expiry) while the page is still mounted, which used
 * to crash the render with "Cannot read properties of null (reading 'username')".
 */
const { getCreatedAndAssignedWorkEfforts, userProfile } = vi.hoisted(() => ({
  getCreatedAndAssignedWorkEfforts: vi.fn(),
  userProfile: { getUserProfile: null as any }
}));

vi.mock("@common", () => ({
  translate: (value: string) => value,
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  commonUtil: {
    showToast: vi.fn(),
    getErrorMessage: () => "",
    getDateTimeWithOrdinalSuffix: () => "Nov 3rd"
  }
}));
vi.mock("@/router", () => ({ default: { push: vi.fn() } }));
vi.mock("@/services/uiUtils", () => ({ loader: { present: vi.fn(), dismiss: vi.fn() } }));
vi.mock("@/composables/useInventoryCountRun", () => ({
  useInventoryCountRun: () => ({ getCreatedAndAssignedWorkEfforts })
}));
vi.mock("@/composables/useInventoryCountImport", () => ({ useInventoryCountImport: () => ({}) }));
vi.mock("@/stores/productStore", () => ({
  useProductStore: () => ({ getCurrentFacility: { facilityId: "FAC_1", facilityName: "Store" } })
}));
vi.mock("@/stores/userProfileStore", () => ({
  useUserProfile: () => ({
    get getUserProfile() { return userProfile.getUserProfile; },
    getDeviceId: "this-device",
    hasPermission: () => false
  })
}));
// There is no IonRouterOutlet in the test, so the Ionic view lifecycle never fires. Map the hook
// the page uses onto the Vue equivalent so the page loads its data like a real navigation.
vi.mock("@ionic/vue", async () => {
  const actual: any = await vi.importActual("@ionic/vue");
  const { onMounted } = await vi.importActual<any>("vue");

  return { ...actual, onIonViewDidEnter: onMounted };
});

import Count from "@/views/Count.vue";

const lockedSession = {
  inventoryCountImportId: "S1",
  countImportName: "Front of store",
  statusId: "SESSION_ASSIGNED",
  lock: { userId: "someone.else", deviceId: "other-device" }
};

describe("Count page", () => {
  it("still renders a locked session when there is no signed in user profile", async () => {
    userProfile.getUserProfile = null;
    getCreatedAndAssignedWorkEfforts.mockResolvedValue({
      workEfforts: [{
        workEffortId: "WE1",
        workEffortName: "Weekly count",
        statusId: "CYCLE_CNT_IN_PRGS",
        sessions: [lockedSession]
      }],
      isScrollable: false
    });

    const wrapper = mount(Count);
    await flushPromises();

    expect(wrapper.find("[data-testid='count-session-item-locked-S1']").exists()).toBe(true);
  });
});
