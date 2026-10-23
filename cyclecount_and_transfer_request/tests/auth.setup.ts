import { test as setup, expect } from '@playwright/test';

import fs from 'fs';

const adminFile = 'playwright/.auth/admin.json';
const storeUserFile = 'playwright/.auth/storeUser.json';

setup('authenticate as admin', async ({ page }) => {
  // If we already have a token less than 12 hours old, skip the login to save time and prevent rate-limiting!
  if (fs.existsSync(adminFile)) {
    const stats = fs.statSync(adminFile);
    if (Date.now() - stats.mtime.getTime() < 12 * 60 * 60 * 1000) {
      console.log('✅ Admin auth token is less than 12 hours old. Skipping login.');
      return;
    }
  }

  setup.setTimeout(60000);
  await page.goto('https://launchpad.hotwax.io/home', { timeout: 60000 });
  await page.getByRole('button', { name: /^login$/i }).click();
  await expect(page).toHaveURL(/.*\/login/);

  // Fill OMS name and proceed
  const omsInput = page.locator('input[type="text"]').first();
  await omsInput.fill(process.env.OMS_NAME!); 
  await expect(omsInput).toHaveValue(process.env.OMS_NAME!); // Ensure React registered the input
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /next/i }).click();

  // Wait for the auth fields to appear and fill them using robust locators
  await page.getByRole('textbox', { name: /username/i }).fill(process.env.ADMIN_USERNAME!);
  await page.getByRole('textbox', { name: /password/i }).fill(process.env.ADMIN_PASSWORD!);
  
  await page.getByRole('button', { name: /login/i }).click();

  // STRICT ASSERTIONS: Ensure we reach home AND the login button is gone
  await expect(page).toHaveURL(/.*\/home/, { timeout: 15000 });
  await expect(page.getByRole('button', { name: /^login$/i })).not.toBeVisible({ timeout: 15000 });
  
  await page.context().storageState({ path: adminFile });
});

setup('authenticate as store user', async ({ page }) => {
  // If we already have a token less than 12 hours old, skip the login to save time and prevent rate-limiting!
  if (fs.existsSync(storeUserFile)) {
    const stats = fs.statSync(storeUserFile);
    if (Date.now() - stats.mtime.getTime() < 12 * 60 * 60 * 1000) {
      console.log('✅ Store User auth token is less than 12 hours old. Skipping login.');
      return;
    }
  }

  setup.setTimeout(60000);
  await page.goto('https://launchpad.hotwax.io/home', { timeout: 60000 });
  await page.getByRole('button', { name: /^login$/i }).click();
  await expect(page).toHaveURL(/.*\/login/);

  // Fill OMS name and proceed
  const omsInputStore = page.locator('input[type="text"]').first();
  await omsInputStore.fill(process.env.OMS_NAME!); 
  await expect(omsInputStore).toHaveValue(process.env.OMS_NAME!); // Ensure React registered the input
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /next/i }).click();

  // Wait for the auth fields to appear and fill them using robust locators
  await page.getByRole('textbox', { name: /username/i }).fill(process.env.STORE_USER_USERNAME!);
  await page.getByRole('textbox', { name: /password/i }).fill(process.env.STORE_USER_PASSWORD!);
  
  await page.getByRole('button', { name: /login/i }).click();

  // STRICT ASSERTIONS: Ensure we reach home AND the login button is gone
  await expect(page).toHaveURL(/.*\/home/, { timeout: 15000 });
  await expect(page.getByRole('button', { name: /^login$/i })).not.toBeVisible({ timeout: 15000 });
  
  await page.context().storageState({ path: storeUserFile });
});
