import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { PendingReviewPage } from '../../pages/cyclecount/pending-review.page';
import { PendingReviewDetailPage } from '../../pages/cyclecount/pending-review-detail.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Pending Review Details and Filters', () => {
  test.setTimeout(600_000);

  test('positive: verifies overview, thresholds, and product filters', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));

    try {
      const bulkUploadPage = new BulkUploadPage(page);
      const pendingReviewPage = new PendingReviewPage(page);
      const pendingReviewDetailPage = new PendingReviewDetailPage(page);
      const storeCountsPage = new StoreCountsPage(page);
      const sessionCountPage = new SessionCountPage(page);

      // Upload Count
      await bulkUploadPage.open();
      await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

      // Move to pending review by scanning one item (creating variance)
      await storeCountsPage.startOrResumeSession(fixture.countImportName);
      await sessionCountPage.expectLoaded();
      await sessionCountPage.startCountingIfNeeded();
      await sessionCountPage.scanBarcode(fixture.requestedItemId);
      await sessionCountPage.submitSession();

      // Open pending review details
      await pendingReviewPage.open();
      await pendingReviewPage.openCount(fixture.countImportName);
      await pendingReviewDetailPage.expectLoaded(fixture.countImportName);

      // Verify Overview
      expect(await pendingReviewDetailPage.getCountId()).toBeTruthy();
      expect(await pendingReviewDetailPage.getAssignedFacility()).toContain(fixture.facilityCandidates[0] || '');
      expect(await pendingReviewDetailPage.getStartDateTime()).toBeTruthy();
      expect(await pendingReviewDetailPage.getDueDateTime()).toBeTruthy();
      expect(await pendingReviewDetailPage.getFirstItemCounted()).toBeTruthy();
      expect(await pendingReviewDetailPage.getLastItemCounted()).toBeTruthy();

      // Verify Progress & Variance (we scanned 1 item)
      const progress = await pendingReviewDetailPage.getReviewProgress();
      expect(progress).toMatch(/0 out of/i);
      
      const overallVariance = await pendingReviewDetailPage.getOverallVariance();
      expect(overallVariance).toBeTruthy(); // e.g. "1 units"

      // Configure Threshold
      await pendingReviewDetailPage.configureThreshold('Units', 10);
      
      // Status Filter
      await pendingReviewDetailPage.selectStatusFilter('Open');
      const details = await pendingReviewDetailPage.getProductDetails(fixture.requestedItemId);
      expect(details.status).toBe('Open');

      // Compliance Filter
      await pendingReviewDetailPage.selectComplianceFilter('Compliant');
      // If variance is 1 and threshold is 10, it should be Compliant.
      const compliantDetails = await pendingReviewDetailPage.getProductDetails(fixture.requestedItemId);
      expect(compliantDetails.rawText).toContain(fixture.requestedItemId);

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
