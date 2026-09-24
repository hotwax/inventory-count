export const cycleCountEnv = {
  appUrl:
    process.env.PLAYWRIGHT_CYCLECOUNT_APP_URL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "https://inventorycount-dev.hotwax.io",
  launchpadUrl:
    process.env.PLAYWRIGHT_LAUNCHPAD_URL ?? "https://launchpad.hotwax.io",
  oms: process.env.PLAYWRIGHT_OMS ?? "dev-oms",
  username: process.env.PLAYWRIGHT_USERNAME ?? "hotwax.user",
  password: process.env.PLAYWRIGHT_PASSWORD ?? "hotwax@786",
};

export function buildCycleCountUrl(pathname: string) {
  return pathname;
}
