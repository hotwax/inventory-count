import { test, expect } from '@playwright/test';

// Use the store user session for these tests
test.use({ storageState: 'playwright/.auth/storeUser.json' });

test('Navigate to Receiving UAT app for Transfer Requests', async ({ page }) => {
  // Go to Launchpad
  await page.goto('https://launchpad.hotwax.io/home');
  
  // Verify we are logged in by checking the Launch Pad heading
  await expect(page.getByRole('heading', { name: 'Launch Pad' })).toBeVisible();

  // Find the Receiving app card.
  // Click the DEV button `<..>`.
  // Target the exact dev button for Receiving using the correct data-testid from the DOM.
  await page.getByTestId('dev-button-receiving').click();

});
