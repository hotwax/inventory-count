import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { PendingReviewPage } from '../../pages/cyclecount/pending-review.page';
import { PendingReviewDetailPage } from '../../pages/cyclecount/pending-review-detail.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import { ClosedPage } from '../../pages/cyclecount/closed.page';
import { ClosedDetailPage } from '../../pages/cyclecount/closed-detail.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Closed Products and Sessions', () => {
  test.setTimeout(600_000);

  test('positive: verifies product session expansion and final statuses', async ({
    page,
  }, testInfo) => {
    // Generate data with multiple SKUs
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));
    fixture.numItems = 2; 

    try {
      const bulkUploadPage = new BulkUploadPage(page);
      const pendingReviewPage = new PendingReviewPage(page);
      const pendingReviewDetailPage = new PendingReviewDetailPage(page);
      const storeCountsPage = new StoreCountsPage(page);
      const sessionCountPage = new SessionCountPage(page);
      const closedPage = new ClosedPage(page);
      const closedDetailPage = new ClosedDetailPage(page);

      // Upload Count
      await bulkUploadPage.open();
      await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

      // Simulate store scanning
      await storeCountsPage.startOrResumeSession(fixture.countImportName);
      await sessionCountPage.expectLoaded();
      await sessionCountPage.startCountingIfNeeded();
      
      const item1 = fixture.items[0].sku;
      const item2 = fixture.items[1].sku;

      await sessionCountPage.scanBarcode(item1);
      await sessionCountPage.scanBarcode(item2);
      await sessionCountPage.submitSession();

      // Open pending review details, Accept one, Reject one
      await pendingReviewPage.open();
      await pendingReviewPage.openCount(fixture.countImportName);
      await pendingReviewDetailPage.expectLoaded(fixture.countImportName);

      await pendingReviewDetailPage.acceptProduct(item1);
      await pendingReviewDetailPage.rejectProduct(item2);
      await pendingReviewDetailPage.closeCount({ action: 'accept_all' }); // The rest get accepted

      // Open closed count details
      await closedPage.open();
      await closedPage.openCount(fixture.countImportName);
      await closedDetailPage.expectLoaded(fixture.countImportName);

      // Verify Statuses match our actions
      const details1 = await closedDetailPage.getProductDetails(item1);
      expect(details1.status).toBe('Accepted');

      const details2 = await closedDetailPage.getProductDetails(item2);
      expect(details2.status).toBe('Rejected');

      // Verify expansion (we just check the interaction works)
      await closedDetailPage.expandProductSession(item1);

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
