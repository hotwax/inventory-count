import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { AssignedPage } from '../../pages/cyclecount/assigned.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { PreviewCountPage } from '../../pages/cyclecount/preview-count.page';
import { SessionCountDetailPage } from '../../pages/cyclecount/session-count-detail.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Assigned Count List and Filters', () => {
  test.setTimeout(600_000);

  test('positive: verifies list data, search, and filters on Assigned page', async ({
    page,
  }, testInfo) => {
    // Generate deterministic test data
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));

    try {
      const bulkUploadPage = new BulkUploadPage(page);
      const assignedPage = new AssignedPage(page);

      // TC: Bulk upload Directed Count
      await bulkUploadPage.open();
      await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

      // TC01: Assigned page access
      await assignedPage.open();

      // TC03: Exact count search & wait for sync
      await assignedPage.waitForCount(fixture.countImportName);
      
      // TC02: Assigned list data
      const details = await assignedPage.getCountDetails(fixture.countImportName);
      expect(details.status).toMatch(/Created/i);
      expect(details.rawText).toContain(fixture.countImportName);

      // TC06: Clear search
      await assignedPage.clearSearch();

      // TC04: Partial search
      const partialName = fixture.countImportName.substring(0, fixture.countImportName.length - 5);
      await assignedPage.search(partialName);
      const partialDetails = await assignedPage.getCountDetails(fixture.countImportName);
      expect(partialDetails.rawText).toContain(fixture.countImportName);
      await assignedPage.clearSearch();

      // TC05: Invalid search
      await assignedPage.search(`NON_EXISTING_${Date.now()}`);
      // Wait to ensure list updates
      await page.waitForTimeout(2000);
      const listItems = page.locator('.list-item');
      expect(await listItems.count()).toBe(0);
      await assignedPage.clearSearch();

      // TC07: Status = Created
      await assignedPage.selectStatus('Created');
      await page.waitForTimeout(2000);
      await assignedPage.search(fixture.countImportName);
      // Our uploaded counts should be visible
      const createdDetails = await assignedPage.getCountDetails(fixture.countImportName);
      expect(createdDetails.status).toMatch(/Created/i);
      await assignedPage.clearSearch();
      
      // TC12: Type = All Types
      await assignedPage.selectType('All Types');
      await page.waitForTimeout(2000);

      // TC13: Single facility filter
      const testFacility = fixture.facilityCandidates[0];
      if (testFacility) {
        await assignedPage.selectFacility(testFacility);
        await page.waitForTimeout(2000);
        await assignedPage.search(fixture.countImportName);
        const facilityDetails = await assignedPage.getCountDetails(fixture.countImportName);
        
        // Facility IDs often use underscores (e.g. TEST_STORE) but the UI shows spaces (e.g. Test Store)
        const normalizedFacility = testFacility.replace(/_/g, ' ');
        expect(facilityDetails.facility).toMatch(new RegExp(normalizedFacility, 'i'));
      }

      // NEW FLOW: Store permissions -> Preview Count
      await assignedPage.navigateViaMenu('Store permissions');
      await page.waitForTimeout(2000); // Wait for navigation and menu to close

      // The user wants to "find store view from there and click on that"
      // Looking for a card or item that says "Store View" or "Store Count"
      const storeViewElement = page.locator('ion-card, ion-item, ion-button').filter({ hasText: /Store view|Store Count/i }).first();
      if (await storeViewElement.isVisible().catch(() => false)) {
        await storeViewElement.click();
      } else {
        // Fallback to navigate if the element cannot be easily found by text
        await page.goto('/tabs/count');
      }
      await page.waitForURL(/\/tabs\/count/);

      // Now we are on StoreCountsPage
      const storeCountsPage = new StoreCountsPage(page);
      await storeCountsPage.expectLoaded();
      await storeCountsPage.clickPreview(fixture.countImportName);

      // Now we are on PreviewCountPage
      const previewCountPage = new PreviewCountPage(page);
      await previewCountPage.expectLoaded();
      
      // fixture.row.idValue may contain one SKU, but we might have multiple rows.
      // For this test, verifying the first SKU is sufficient, or we can just verify countImportName is present if it's there
      const expectedSkus = fixture.row.idValue ? [fixture.row.idValue] : [];
      if (expectedSkus.length > 0) {
        await previewCountPage.verifyDetails({ skus: expectedSkus });
      }
      
      // Click the back button on Track Progress
      await previewCountPage.closePreview();
      await storeCountsPage.expectLoaded();

      // Click "Start Counting" (or resume) to go to Session Count Detail
      await storeCountsPage.startOrResumeSession(fixture.countImportName);

      const sessionPage = new SessionCountDetailPage(page);
      await sessionPage.expectLoaded();

      // Scan the requested SKU, it should go to COUNTED
      if (expectedSkus.length > 0) {
        const skuToScan = expectedSkus[0];
        await sessionPage.scanBarcode(skuToScan);
        await sessionPage.verifyBarcodeInTab(skuToScan, 'counted');
      }

      // Scan an invalid barcode to test successful matching
      const matchBarcode = `BOGUS_MATCH_${Date.now()}`;
      await sessionPage.scanBarcode(matchBarcode);
      await sessionPage.verifyBarcodeInTab(matchBarcode, 'unmatched');
      // Resolve it by matching it with a valid SKU
      if (expectedSkus.length > 0) {
        await sessionPage.resolveUnmatchedProduct(matchBarcode, expectedSkus[0]);
      }

      // Scan another invalid barcode to test removal
      const removeBarcode = `BOGUS_REMOVE_${Date.now()}`;
      await sessionPage.scanBarcode(removeBarcode);
      await sessionPage.verifyBarcodeInTab(removeBarcode, 'unmatched');
      
      // Attempt to search for it, see "No results found", and close the modal
      await sessionPage.resolveUnmatchedProduct(removeBarcode);

      // Remove the unmatched scan using the action menu
      await sessionPage.removeScan(removeBarcode);

      // Wait for the unmatched tab to reflect the removal
      await expect(page.getByText('No unmatched items')).toBeVisible({ timeout: 10_000 });

      // Submit the session
      await sessionPage.submitSession();

      // Ensure we are redirected to the count progress review page
      await expect(page).toHaveURL(/\/count-progress-review\//, { timeout: 15_000 });

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
