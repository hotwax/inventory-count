import { test, type Page } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { AssignedPage } from '../../pages/cyclecount/assigned.page';
import { AssignedDetailPage } from '../../pages/cyclecount/assigned-detail.page';
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

test.describe.serial('Cycle count full flow', () => {
  test.setTimeout(1200_000);

  async function createFlow(page: Page) {
    return {
      bulkUploadPage: new BulkUploadPage(page),
      assignedPage: new AssignedPage(page),
      assignedDetailPage: new AssignedDetailPage(page),
      storeCountsPage: new StoreCountsPage(page),
      sessionCountPage: new SessionCountPage(page),
      countProgressPage: new CountProgressPage(page),
      pendingReviewPage: new PendingReviewPage(page),
      pendingReviewDetailPage: new PendingReviewDetailPage(page),
      closedPage: new ClosedPage(page),
      closedDetailPage: new ClosedDetailPage(page),
    };
  }

  type CycleCountFlow = Awaited<ReturnType<typeof createFlow>>;

  async function uploadAndOpenCount(page: Page, fixture: CycleCountUploadFixture) {
    const flow = await createFlow(page);

    await flow.bulkUploadPage.open();
    await flow.bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);
    await flow.assignedPage.open();
    await flow.assignedPage.openCount(fixture.countImportName);
    await flow.assignedDetailPage.expectLoaded(fixture.countImportName);

    return flow;
  }

  async function completeAndCloseCount(
    fixture: CycleCountUploadFixture,
    flow: CycleCountFlow
  ) {
    await flow.storeCountsPage.startOrResumeSession(
      fixture.countImportName
    );
    await flow.sessionCountPage.expectLoaded();
    await flow.sessionCountPage.startCountingIfNeeded();
    for (const itemId of fixture.requestedItemIds) {
      await flow.sessionCountPage.scanBarcode(itemId);
      await flow.sessionCountPage.wait(2_000);
    }
    await flow.sessionCountPage.expectProductsCounted(fixture.requestedItemIds.length);
    await flow.sessionCountPage.submitSession();
    await flow.sessionCountPage.goBackToCountList();

    await submitForReviewAndCloseCount(fixture, flow);
  }

  async function submitForReviewAndCloseCount(
    fixture: CycleCountUploadFixture,
    flow: CycleCountFlow
  ) {
    await flow.storeCountsPage.openReviewProgress(
      fixture.countImportName
    );
    await flow.countProgressPage.expectLoaded(fixture.countImportName);
    await flow.countProgressPage.submitForReview(true);
    await flow.countProgressPage.expectSubmitted();
    
    // Navigate to a page where the side menu is visible
    await flow.assignedPage.open();

    await flow.pendingReviewPage.open(true);
    await flow.pendingReviewPage.openCount(fixture.countImportName);
    await flow.pendingReviewDetailPage.acceptFirstItem();
    await flow.pendingReviewDetailPage.closeCount({ action: 'accept_all' });

    await flow.closedPage.open();
    await flow.closedPage.openCount(fixture.countImportName);
    await flow.closedDetailPage.expectLoaded(fixture.countImportName);
  }

  test('positive: uploads, counts, submits, reviews, and closes a cycle count', async ({
    page,
  }, testInfo) => {
    const clientId = testInfo.project.name.replace('chromium-', '');
    const fixture = createCycleCountUploadFixture(clientId, false);

    try {
      const flow = await uploadAndOpenCount(page, fixture);
      await completeAndCloseCount(fixture, flow);
    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });

  test('negative: blocks review submission until requested items are counted', async ({
    page,
  }, testInfo) => {
    const clientId = testInfo.project.name.replace('chromium-', '');
    const fixture = createCycleCountUploadFixture(clientId, false);

    try {
      const flow = await uploadAndOpenCount(page, fixture);

      await flow.storeCountsPage.startOrResumeSession(
        fixture.countImportName
      );
      await flow.sessionCountPage.expectLoaded();
      await flow.sessionCountPage.startCountingIfNeeded();
      await flow.sessionCountPage.goBackToCountList();

      await flow.storeCountsPage.openReviewProgress(
        fixture.countImportName
      );
      await flow.countProgressPage.expectLoaded(fixture.countImportName);
      await flow.countProgressPage.expectSubmitDisabled();
      await flow.countProgressPage.openSession(fixture.countImportName);
      await flow.sessionCountPage.expectLoaded();
      for (const itemId of fixture.requestedItemIds) {
        await flow.sessionCountPage.scanBarcode(itemId);
        await flow.sessionCountPage.wait(2_000);
      }
      await flow.sessionCountPage.submitSession();
      await flow.sessionCountPage.goBackToCountList();

      await submitForReviewAndCloseCount(fixture, flow);
    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
