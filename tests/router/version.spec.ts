import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { START_LOCATION } from "vue-router";

const auth = { isAuthenticated: { value: true }, fetchAppVersion: vi.fn(), checkAppVersionRedirect: vi.fn() };
const embedded = vi.fn(() => false);
const hasPermission = vi.fn(() => true);
let guard: any;
vi.doMock("@ionic/vue-router", () => ({ createWebHistory: vi.fn(), createRouter: () => ({ beforeEach: (fn: any) => { guard = fn; } }) }));
vi.doMock("@common", () => ({ useAuth: () => auth, commonUtil: { isAppEmbedded: embedded }, translate: (s: string) => s, ShopifyLogin: {}, ShopifyAppInstall: {}, Login: {} }));
vi.doMock("@/stores/userProfileStore", () => ({ useUserProfile: () => ({ hasPermission }) }));
for(const view of ["Tabs", "Assigned", "AssignedDetail", "PendingReview", "PendingReviewDetail", "Settings", "SessionCountDetail", "BulkUpload", "CreateCycleCount", "Closed", "StorePermissions", "ClosedDetail", "ExportHistory", "PreCountedItems", "CountProgressReview"]) {
  vi.doMock(`@/views/${view}.vue`, () => ({ default: {} }));
}
await import("@/router");

const settings = { path: "/settings", name: "Settings", meta: {} };
beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated.value = true;
  auth.fetchAppVersion.mockResolvedValue(undefined);
  auth.checkAppVersionRedirect.mockReturnValue(false);
  embedded.mockReturnValue(false);
  hasPermission.mockReturnValue(true);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

it("waits for the server choice before enforcing the cached version on a signed-in reload", async () => {
  let finish!: () => void;
  auth.fetchAppVersion.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  const opening = guard(settings, START_LOCATION);
  expect(auth.fetchAppVersion).toHaveBeenCalledTimes(1);
  expect(auth.checkAppVersionRedirect).not.toHaveBeenCalled();
  auth.checkAppVersionRedirect.mockReturnValue(true);
  finish();
  expect(await opening).toBe(false);
});

it("does not fetch or switch the selected version during normal menu navigation", async () => {
  await guard(settings, { path: "/assigned" });
  expect(auth.fetchAppVersion).not.toHaveBeenCalled();
});

it.each(["signed out", "offline", "embedded", "login"])("leaves %s startup to the existing flow", async (context) => {
  if(context === "signed out") {auth.isAuthenticated.value = false;}
  if(context === "offline") {vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);}
  if(context === "embedded") {embedded.mockReturnValue(true);}
  await guard(context === "login" ? { ...settings, name: "Login", path: "/login" } : settings, START_LOCATION);
  expect(auth.fetchAppVersion).not.toHaveBeenCalled();
});

it("still applies permissions after refreshing the selected version", async () => {
  hasPermission.mockReturnValue(false);
  expect(await guard({ ...settings, meta: { permissionId: "restricted" } }, START_LOCATION)).toEqual({ path: "/tabs/settings" });
});
