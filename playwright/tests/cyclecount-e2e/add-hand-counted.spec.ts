import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import { PreCountedItemsPage } from '../../pages/cyclecount/pre-counted-items.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
  type CycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe('Add Hand-Counted Items', () => {
  test.setTimeout(300_000);
  let fixture: CycleCountUploadFixture;

  test.beforeEach(async ({}, testInfo) => {
    const clientId = testInfo.project.name.replace('chromium-', '');
    fixture = createCycleCountUploadFixture(clientId, false);
  });

  test.afterEach(async () => {
    cleanupCycleCountUploadFixture(fixture);
  });

  test('handles searching, adding, and saving a hand-counted item from the manual session block', async ({ page }) => {
    const bulkUploadPage = new BulkUploadPage(page);
    const storeCountsPage = new StoreCountsPage(page);
    const sessionCountPage = new SessionCountPage(page);
    const preCountedItemsPage = new PreCountedItemsPage(page);

    // Seed the count
    await bulkUploadPage.open();
    await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

    // Navigate to store count and open the session
    await storeCountsPage.startOrResumeSession(fixture.countImportName);
    await sessionCountPage.expectLoaded();
    await sessionCountPage.startCountingIfNeeded();
    
    // Explicitly click to add a hand-counted item
    await sessionCountPage.openAddHandCountedItems();
    
    // Work with the pre-counted page component
    await preCountedItemsPage.expectLoaded();
    
    // We search the exact SKU that was uploaded, since directed counts only let us add items already in the directive list.
    // In a Hard Count, anything could be added. But since the fixture is a Directed Count array, we use the known sku.
    await preCountedItemsPage.searchProduct(fixture.requestedItemId);
    await preCountedItemsPage.addFoundProductToCount();
    await preCountedItemsPage.setProductQuantity(fixture.requestedItemId, 5);
    await preCountedItemsPage.saveProgress();

    // Check we get redirected back to session view
    await preCountedItemsPage.goBack();
    await sessionCountPage.expectLoaded();

    // Session detail will list the line item we just added manually
    await sessionCountPage.switchSegment('counted');
    const textLocator = page.getByTestId('session-detail-counted-item-qty').filter({ hasText: '5' });
    await expect(textLocator.first()).toBeVisible({ timeout: 20_000 });
  });
});
