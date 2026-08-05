import { test, expect, Page } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { PendingReviewPage } from '../../pages/cyclecount/pending-review.page';
import { PendingReviewDetailPage } from '../../pages/cyclecount/pending-review-detail.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import { CountProgressPage } from '../../pages/cyclecount/count-progress.page';
import { ClosedPage } from '../../pages/cyclecount/closed.page';
import { AssignedPage } from '../../pages/cyclecount/assigned.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
  CycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Pending Review Actions', () => {
  test.setTimeout(600_000);

  async function createAndSubmitCount(page: Page, fixture: CycleCountUploadFixture) {
    const bulkUploadPage = new BulkUploadPage(page);
    const storeCountsPage = new StoreCountsPage(page);
    const sessionCountPage = new SessionCountPage(page);
    const pendingReviewPage = new PendingReviewPage(page);

    // Upload Count
    await bulkUploadPage.open();
    await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

    // Simulate store scanning the items so it has variances and can be submitted
    await storeCountsPage.startOrResumeSession(fixture.countImportName);
    await sessionCountPage.expectLoaded();
    await sessionCountPage.startCountingIfNeeded();
    for (const itemId of fixture.requestedItemIds) {
      await sessionCountPage.scanBarcode(itemId);
      await sessionCountPage.scanBarcode(itemId); // Scan twice to create a variance (+1) and avoid auto-accept
    }
    await sessionCountPage.expectProductsCounted(fixture.requestedItemIds.length);
    await sessionCountPage.submitSession();
    await sessionCountPage.goBackToCountList();

    const countProgressPage = new CountProgressPage(page);
    await storeCountsPage.openReviewProgress(fixture.countImportName);
    await countProgressPage.expectLoaded(fixture.countImportName);
    await countProgressPage.submitForReview(true);
    await countProgressPage.expectSubmitted();

    // Open pending review details
    await pendingReviewPage.open();
    await pendingReviewPage.openCount(fixture.countImportName);
    
    return new PendingReviewDetailPage(page);
  }

  test('positive: bulk accept then close and redirect to closed via side menu', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));

    try {
      const pendingReviewDetailPage = await createAndSubmitCount(page, fixture);
      await pendingReviewDetailPage.expectLoaded(fixture.countImportName);

      const item1 = fixture.requestedItemIds[0];

      // Select Product 1 Checkbox -> Bulk Accept
      await pendingReviewDetailPage.selectProductCheckbox(item1);
      await pendingReviewDetailPage.bulkAccept();
      await pendingReviewDetailPage.expectProductStatus(item1, 'Accepted');

      // Close Count
      await pendingReviewDetailPage.closeCount({ action: 'accept_all' });

      // Navigate to a page with the side menu
      const assignedPage = new AssignedPage(page);
      await assignedPage.open();

      // Verify it moves to Closed
      const closedPage = new ClosedPage(page);
      await closedPage.open(true); // open via side menu
      // Should exist in closed
      await closedPage.openCount(fixture.countImportName);

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });

  test('positive: bulk reject then close and redirect to closed via side menu', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));

    try {
      const pendingReviewDetailPage = await createAndSubmitCount(page, fixture);
      await pendingReviewDetailPage.expectLoaded(fixture.countImportName);

      const item1 = fixture.requestedItemIds[0];

      // Select Product 1 Checkbox -> Bulk Reject
      await pendingReviewDetailPage.selectProductCheckbox(item1);
      await pendingReviewDetailPage.bulkReject();
      await pendingReviewDetailPage.expectProductStatus(item1, 'Rejected');

      // Close Count
      await pendingReviewDetailPage.closeCount({ action: 'accept_all' });

      // Navigate to a page with the side menu
      const assignedPage = new AssignedPage(page);
      await assignedPage.open();

      // Verify it moves to Closed
      const closedPage = new ClosedPage(page);
      await closedPage.open(true); // open via side menu
      // Should exist in closed
      await closedPage.openCount(fixture.countImportName);

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });

  test('positive: accept and reject item by item then close and redirect to closed via side menu', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));

    try {
      const pendingReviewDetailPage = await createAndSubmitCount(page, fixture);
      await pendingReviewDetailPage.expectLoaded(fixture.countImportName);

      const item1 = fixture.requestedItemIds[0];
      const item2 = fixture.requestedItemIds[1] || fixture.requestedItemIds[0]; // fallback if only 1 SKU

      // Product 1: Accept item by item
      await pendingReviewDetailPage.acceptProduct(item1);
      await pendingReviewDetailPage.expectProductStatus(item1, 'Accepted');

      // Product 2: Reject item by item (only if different)
      if (item1 !== item2) {
        await pendingReviewDetailPage.rejectProduct(item2);
        await pendingReviewDetailPage.expectProductStatus(item2, 'Rejected');
      }

      // Close Count
      // All items are already accepted/rejected, so "Accept all" vs "Reject all" doesn't practically change existing statuses, 
      // but we test the modal flow.
      await pendingReviewDetailPage.closeCount({ action: 'accept_all' });

      // Navigate to a page with the side menu
      const assignedPage = new AssignedPage(page);
      await assignedPage.open();

      // Verify it moves to Closed
      const closedPage = new ClosedPage(page);
      await closedPage.open(true); // open via side menu
      
      // Should exist in closed
      await closedPage.openCount(fixture.countImportName);

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
