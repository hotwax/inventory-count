import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('App smoke', () => {
  test('embedded login fallback stays in app and shows an error state', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.open('?embedded=1');
    await loginPage.expectLoginScreenResolved();
    await loginPage.expectErrorVisible();
    await loginPage.expectErrorMessage(/contact the administrator/i);
  });

  test('login route is reachable', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.open('?embedded=1');
    await expect(page).toHaveURL(/\/login/);
  });
});
