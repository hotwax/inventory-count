import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
const { getClientConfig } = require('../config/clients');

/**
 * Perform login using the OMS backend (webtools) first, then navigate to Launchpad / Cycle Count
 */
async function performLogin(page, config) {
  const { clientId, username, password } = config;

  if (!username || !password) {
    throw new Error(`Credentials missing for ${clientId}. Provide username/password in CLIENTS JSON or env.`);
  }

  const webtoolsUrl = `https://${clientId}.hotwax.io/webtools/control/main`;

  const fillAndSubmitLoginForm = async () => {
    const userField = page.locator('input[name="USERNAME"], input[placeholder*="Username"], td.label:has-text("User Name") + td input').first();
    await expect(userField).toBeVisible({ timeout: 10000 });
    await userField.fill(username);

    const passField = page.locator('input[type="password"][name="PASSWORD"], input[placeholder*="Password"]').first();
    await passField.fill(password);

    const submitBtn = page.locator('input[type="submit"][value="Login"], button:has-text("Login")').first();
    await submitBtn.click();
    await page.waitForLoadState('domcontentloaded');
  };

  const isLoginFormVisible = async () => {
    return page.locator('input[name="USERNAME"], input[placeholder*="Username"], input[type="password"]').first().isVisible().catch(() => false);
  };

  await page.goto(webtoolsUrl);
  await page.waitForLoadState('domcontentloaded');

  // PRE-CHECK: If already logged in, skip
  if (!(await isLoginFormVisible())) {
    const currentUrl = page.url();
    if (!currentUrl.includes('login') && !currentUrl.includes('checkLogin')) {
      await page.goto(`https://${clientId}.hotwax.io/commerce/control/main`);
      await page.waitForLoadState('networkidle');
    }
  }

  // 1. Click Login trigger when the current page is not already the login form.
  if (!(await isLoginFormVisible())) {
    const loginTrigger = page.locator('a:has-text("Login"), button:has-text("Login")').first();
    await loginTrigger.click().catch(() => {});
    await page.waitForLoadState('domcontentloaded');
  }

  // 2. Fill credentials (support both classic and modern login pages)
  if (await isLoginFormVisible()) {
    await fillAndSubmitLoginForm();
  }

  // 4. Navigate to Commerce (Prefer single sign-on link click to transfer session via externalLoginKey)
  const commerceLink = page.locator('a:has-text("Hotwax Commerce"), a:has-text("Commerce")').first();
  if (await commerceLink.isVisible().catch(() => false)) {
    await commerceLink.click();
    await page.waitForLoadState('networkidle');
  } else {
    await page.goto(`https://${clientId}.hotwax.io/commerce/control/main`);
    await page.waitForLoadState('networkidle');
  }

  if (await isLoginFormVisible()) {
    await fillAndSubmitLoginForm();
    const retryCommerceLink = page.locator('a:has-text("Hotwax Commerce"), a:has-text("Commerce")').first();
    if (await retryCommerceLink.isVisible().catch(() => false)) {
      await retryCommerceLink.click();
    } else {
      await page.goto(`https://${clientId}.hotwax.io/commerce/control/main`);
    }
    await page.waitForLoadState('networkidle');
  }

  // Hard wait for session stabilization
  await page.waitForTimeout(3000);

  // Now we are in Commerce. Execute the Go To Launchpad flow exactly as OMS project does.
  await page.evaluate(() => {
    const sidebar = document.querySelector('.side-menu');
    if (sidebar) {
      sidebar.classList.remove('hidden-xs');
      sidebar.style.display = 'block';
    }
  });

  const sideMenu = page.locator('.side-menu').first();
  await sideMenu.hover();
  await page.waitForTimeout(1500);

  const launchpadLink = page.locator('.side-menu').getByText('Go to Launchpad').first();
  await expect(launchpadLink).toBeVisible({ timeout: 15000 });

  const context = page.context();
  const [launchpadPage] = await Promise.all([
    context.waitForEvent('page'),
    launchpadLink.click(),
  ]);

  await launchpadPage.waitForLoadState('networkidle');
  await expect(launchpadPage).toHaveURL(/launchpad.hotwax.io\/home/);
  await expect(launchpadPage.locator('body')).toContainText(clientId);

  return launchpadPage;
}

setup("authenticate and save storage state", async ({ page }, testInfo) => {
  setup.setTimeout(120_000);
  const projectName = testInfo.project.name;
  const clientId = projectName.replace("setup-", "");
  
  const config = getClientConfig(clientId);
  const authFilePath = path.resolve(__dirname, `../.auth/${clientId}.user.json`);

  // 1. Attempt direct login on the app URL first
  await page.goto(config.baseUrl);
  await page.waitForLoadState('networkidle');

  let appPage = page;
  let directLoginSuccess = false;

  const omsInput = page.locator('input[name="oms"], input[type="text"]').first();
  if (await omsInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await omsInput.fill(clientId);
    await page.getByRole('button', { name: /Next/i }).click();
  }

  const ionicUserField = page.locator('input[name="username"]').first();
  try {
    await ionicUserField.waitFor({ state: 'visible', timeout: 15_000 });
    await ionicUserField.fill(config.username);
    await page.locator('input[name="password"]').first().fill(config.password);
    const loginBtn = page.locator('ion-button:has-text("Login"), button:has-text("Login")').first();
    await loginBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});
  } catch (e) {
  }

  // Wait for the URL to change away from login, or fail if it takes too long
  try {
    await page.waitForURL(url => !url.href.includes('login'), { timeout: 15_000 });
    directLoginSuccess = true;
  } catch (e) {
  }

  // 2. Fallback to Launchpad if direct login didn't work
  if (!directLoginSuccess) {
    throw new Error('Direct login to ' + config.baseUrl + ' failed. Aborting to prevent falling back to dev Launchpad.');
  }

  // Wait 5 seconds to ensure IndexedDB and LocalStorage are fully populated by the app
  await appPage.waitForTimeout(5000);

  fs.mkdirSync(path.dirname(authFilePath), { recursive: true });
  await appPage.context().storageState({ path: authFilePath });
});
