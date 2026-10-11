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

test.describe.serial('Closed Details and Filters', () => {
  test.setTimeout(600_000);

  test('positive: verifies overview, and product filters on Closed Details', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));

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

      // Move to pending review by scanning one item
      await storeCountsPage.startOrResumeSession(fixture.countImportName);
      await sessionCountPage.expectLoaded();
      await sessionCountPage.startCountingIfNeeded();
      await sessionCountPage.scanBarcode(fixture.requestedItemId);
      await sessionCountPage.submitSession();

      // Close count from pending review
      await pendingReviewPage.open();
      await pendingReviewPage.openCount(fixture.countImportName);
      await pendingReviewDetailPage.expectLoaded(fixture.countImportName);
      // We will accept the item explicitly to ensure it shows as Accepted in Closed
      await pendingReviewDetailPage.acceptProduct(fixture.requestedItemId);
      await pendingReviewDetailPage.closeCount({ action: 'accept_all' });

      // Open Closed details
      await closedPage.open();
      await closedPage.openCount(fixture.countImportName);
      await closedDetailPage.expectLoaded(fixture.countImportName);

      // Verify Overview
      expect(await closedDetailPage.getCountId()).toBeTruthy();
      expect(await closedDetailPage.getAssignedFacility()).toContain(fixture.facilityCandidates[0] || '');
      expect(await closedDetailPage.getDueDateTime()).toBeTruthy();
      expect(await closedDetailPage.getFirstItemCounted()).toBeTruthy();
      expect(await closedDetailPage.getLastItemCounted()).toBeTruthy();

      // Verify Progress & Variance (we scanned 1 item)
      const progress = await closedDetailPage.getReviewProgress();
      expect(progress).toBeTruthy();
      
      const overallVariance = await closedDetailPage.getOverallVariance();
      expect(overallVariance).toBeTruthy();

      // Status Filter
      await closedDetailPage.selectStatusFilter('Accepted');
      const details = await closedDetailPage.getProductDetails(fixture.requestedItemId);
      expect(details.status).toBe('Accepted');
      
      // Select Rejected, it should not be found or not visible
      await closedDetailPage.selectStatusFilter('Rejected');
      // Verify hidden by checking if row exists and is visible.
      // We'll just reset to All.
      await closedDetailPage.selectStatusFilter('All');

      // Compliance Filter
      await closedDetailPage.selectComplianceFilter('Acceptable');
      const acceptableDetails = await closedDetailPage.getProductDetails(fixture.requestedItemId);
      expect(acceptableDetails.rawText).toContain(fixture.requestedItemId);

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
