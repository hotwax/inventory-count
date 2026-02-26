import { test, expect } from '@playwright/test';

test.describe('Variance Page Clear All Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth and product state into localStorage to bypass login and select facility
    const authStore = '{"oms":"dev-maarg","omsRedirectionUrl":"https://dev-oms.hotwax.io:443/api/","token":{"value":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJ1c2VyTG9naW5JZCI6ImhvdHdheC51c2VyIiwiaXNzIjoiZGV2LW9tcyIsImV4cCI6MTc3MTU4MDc5OSwiaWF0IjoxNzcxNDk0Mzk5fQ.v_fsTaXQosFHLg_2s6LEs_gWBDJgbmULLrGpRmFTxUDYiq3wLY5N7P5GbpOVVFOu1sOf6rsEeJA92x2OQfsITQ","expiration":"1771580799062"}}';
    const productStore = '{"currentFacility":{"facilityId":"BROADWAY","facilityName":"Broadway"}}';

    await page.addInitScript(({ auth, product }) => {
      localStorage.setItem('authStore', auth);
      localStorage.setItem('productStore', product);
    }, { auth: authStore, product: productStore });

    // Navigate to the Variance page (now under tabs)
    await page.goto('http://localhost:8100/tabs/variance', { waitUntil: 'load', timeout: 60000 });
  });

  test('should clear all records and persist after refresh', async ({ page }) => {
    // 1. Scan a product (unmatched first for simplicity)
    const scanInput = page.getByPlaceholder('Scan a barcode');
    await expect(scanInput).toBeVisible({ timeout: 15000 });
    
    await scanInput.click({ force: true });
    await scanInput.fill('SCAN_ITEM_PLAYWRIGHT_123');
    await page.keyboard.press('Enter');

    // 2. Verify unmatched item appears in segment label
    // Note: The aggregation worker runs every 5 seconds.
    const unmatchedSegment = page.locator('ion-segment-button[value="unmatched"]');
    await expect(unmatchedSegment).toContainText('(1)', { timeout: 30000 });

    // 3. Click the Unmatched segment to view the card
    await unmatchedSegment.click({ force: true });
    
    // 4. Verify item card is present
    const unmatchedCard = page.locator('ion-card').first();
    await expect(unmatchedCard).toBeVisible({ timeout: 15000 });
    await expect(unmatchedCard).toContainText('SCAN_ITEM_PLAYWRIGHT_123');

    // 5. Click New Session button
    const newSessionButton = page.locator('ion-button.new-session');
    await newSessionButton.click({ force: true });

    // 6. Verify confirmation modal appears
    const alert = page.locator('ion-alert');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert.locator('.alert-title, .alert-head')).toContainText('Clear all');

    // 7. Click "Clear data" in the alert
    const confirmButton = alert.locator('button:has-text("Clear data")');
    await confirmButton.click({ force: true });

    // 8. Verify modal dismissed and lists are empty
    await expect(alert).not.toBeVisible();
    await expect(unmatchedSegment).toContainText('(0)', { timeout: 10000 });
    await expect(unmatchedCard).not.toBeVisible();

    // 9. Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 10. Verify lists are still empty after refresh
    await expect(unmatchedSegment).toContainText('(0)');
    await expect(page.locator('ion-card')).not.toBeVisible();
  });
});
