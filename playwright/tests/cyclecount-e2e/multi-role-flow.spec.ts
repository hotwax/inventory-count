import { test } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import { CountProgressPage } from '../../pages/cyclecount/count-progress.page';
import { PendingReviewPage } from '../../pages/cyclecount/pending-review.page';
import { PendingReviewDetailPage } from '../../pages/cyclecount/pending-review-detail.page';
import { ClosedPage } from '../../pages/cyclecount/closed.page';
import { ClosedDetailPage } from '../../pages/cyclecount/closed-detail.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
  type CycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Multi-Role Cycle Count Workflow', () => {
  test.setTimeout(360_000);
  let fixture: CycleCountUploadFixture;

  test.beforeAll(async ({}, testInfo) => {
    fixture = createCycleCountUploadFixture(undefined, testInfo.project.name.replace('chromium-', ''));
  });

  test.afterAll(async () => {
    cleanupCycleCountUploadFixture(fixture);
  });

  test('Manager: Seeds the cycle count via bulk upload', async ({ page }) => {
    const bulkUploadPage = new BulkUploadPage(page);
    await bulkUploadPage.open();
    await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);
  });

  test('Counter: Opens isolated session, performs physical count and submits', async ({ browser }, testInfo) => {
    // Inherits storageState cache for login explicitly, but operates in an entirely separate browser context as if they are a Store Associate on a handheld device.
    const context = await browser.newContext({ storageState: testInfo.project.use.storageState as string });
    const page = await context.newPage();

    const storeCountsPage = new StoreCountsPage(page);
    const sessionCountPage = new SessionCountPage(page);
    const countProgressPage = new CountProgressPage(page);

    await storeCountsPage.startOrResumeSession(
      fixture.countImportName
    );
    await sessionCountPage.expectLoaded();
    await sessionCountPage.startCountingIfNeeded();
    await sessionCountPage.scanBarcode(fixture.requestedItemId);
    await sessionCountPage.wait(10_000);
    await sessionCountPage.submitSession();
    await sessionCountPage.goBackToCountList();

    await storeCountsPage.openReviewProgress(
      fixture.countImportName
    );
    await countProgressPage.expectLoaded(fixture.countImportName);
    await countProgressPage.submitForReview();

    await context.close();
  });

  test('Manager: Switches back to manager context, reviews the variances and closes the count', async ({ browser }, testInfo) => {
    // Creates another isolated manager session mimicking them using the dashboard app on their desktop PC
    const context = await browser.newContext({ storageState: testInfo.project.use.storageState as string });
    const page = await context.newPage();

    const pendingReviewPage = new PendingReviewPage(page);
    const pendingReviewDetailPage = new PendingReviewDetailPage(page);
    const closedPage = new ClosedPage(page);
    const closedDetailPage = new ClosedDetailPage(page);

    await pendingReviewPage.open();
    await pendingReviewPage.openCount(fixture.countImportName);
    await pendingReviewDetailPage.acceptFirstItem();
    await pendingReviewDetailPage.closeCount();

    await closedPage.open();
    await closedPage.openCount(fixture.countImportName);
    await closedDetailPage.expectLoaded(fixture.countImportName);

    await context.close();
  });
});
