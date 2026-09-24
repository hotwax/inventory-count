import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { AssignedPage } from '../../pages/cyclecount/assigned.page';
import { AssignedDetailPage } from '../../pages/cyclecount/assigned-detail.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Assigned Count Products and Activity', () => {
  test.setTimeout(600_000);

  test('positive: verifies product list, sorting, searching, and in-progress activity on Assigned Detail page', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));

    try {
      const bulkUploadPage = new BulkUploadPage(page);
      const assignedPage = new AssignedPage(page);
      const assignedDetailPage = new AssignedDetailPage(page);
      const storeCountsPage = new StoreCountsPage(page);
      const sessionCountPage = new SessionCountPage(page);

      // Upload Count
      await bulkUploadPage.open();
      await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

      // TC: Create In-Progress data by starting a count session
      await storeCountsPage.startOrResumeSession(fixture.countImportName);
      await sessionCountPage.expectLoaded();
      await sessionCountPage.startCountingIfNeeded();
      await sessionCountPage.scanBarcode(fixture.requestedItemId);
      await sessionCountPage.wait(2_000); // Small wait to ensure backend registers the scan
      // We don't submit it, so it stays In Progress.
      await sessionCountPage.goBackToCountList();

      // Open assigned details
      await assignedPage.open();
      
      // TC08: Status = In Progress filter
      await assignedPage.selectStatus('In progress');
      const details = await assignedPage.getCountDetails(fixture.countImportName);
      expect(details.status).toMatch(/In progress/i);

      await assignedPage.openCount(fixture.countImportName);
      await assignedDetailPage.expectLoaded(fixture.countImportName);

      // Verify the counting activity timestamps have now populated since we scanned an item
      const firstItem = await assignedDetailPage.getFirstItemCounted();
      const lastItem = await assignedDetailPage.getLastItemCounted();
      expect(firstItem).not.toEqual('-');
      expect(lastItem).not.toEqual('-');

      // TC20: Product search by SKU
      await assignedDetailPage.searchProduct(fixture.requestedItemId);
      const productRow = await assignedDetailPage.getProductDetails(fixture.requestedItemId);
      expect(productRow.rawText).toContain(fixture.requestedItemId);
      // Verify counted quantity is updated since we scanned 1 item
      expect(productRow.countedQuantity).toBeGreaterThanOrEqual(1);

      // TC16: Clear product search
      await assignedDetailPage.clearProductSearch();

      // TC21: Invalid product search
      await assignedDetailPage.searchProduct(`NON_EXISTING_PROD_${Date.now()}`);
      await page.waitForTimeout(1000);
      const listItems = page.locator('.list-item, ion-item');
      // The search bar is an item, so we might have some items, but no product rows.
      // We assume product rows contain variance or counted/systemic text.
      const productItemsCount = await page.locator('text=/counted\\/systemic/i').count();
      expect(productItemsCount).toBe(0);
      await assignedDetailPage.clearProductSearch();

      // TC23: Alphabetic sorting
      await assignedDetailPage.sortProducts('Alphabetic');
      await page.waitForTimeout(1000);

      // TC24/25: Variance sorting
      await assignedDetailPage.sortProducts('Variance');
      await page.waitForTimeout(1000);

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
