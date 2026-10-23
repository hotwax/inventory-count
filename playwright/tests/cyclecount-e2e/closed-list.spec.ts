import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { PendingReviewPage } from '../../pages/cyclecount/pending-review.page';
import { PendingReviewDetailPage } from '../../pages/cyclecount/pending-review-detail.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import { ClosedPage } from '../../pages/cyclecount/closed.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Closed List and Filters', () => {
  test.setTimeout(600_000);

  test('positive: verifies list data, search, filters, and export on Closed page', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));
    const fixtureHard = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''), true);

    try {
      const bulkUploadPage = new BulkUploadPage(page);
      const pendingReviewPage = new PendingReviewPage(page);
      const pendingReviewDetailPage = new PendingReviewDetailPage(page);
      const storeCountsPage = new StoreCountsPage(page);
      const sessionCountPage = new SessionCountPage(page);
      const closedPage = new ClosedPage(page);

      // Upload counts
      await bulkUploadPage.open();
      await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

      await bulkUploadPage.open();
      await bulkUploadPage.createCycleCount(fixtureHard.csvPath, fixtureHard.uploadFileName, { isHardCount: true });

      // Move counts to Pending Review by submitting store sessions
      for (const countName of [fixture.countImportName, fixtureHard.countImportName]) {
        await storeCountsPage.startOrResumeSession(countName);
        await sessionCountPage.expectLoaded();
        await sessionCountPage.submitSession();
        await page.waitForTimeout(2000);
      }

      // Accept and Close counts to move them to Closed
      await pendingReviewPage.open();
      for (const countName of [fixture.countImportName, fixtureHard.countImportName]) {
        await pendingReviewPage.openCount(countName);
        await pendingReviewDetailPage.expectLoaded(countName);
        await pendingReviewDetailPage.closeCount({ action: 'accept_all' });
        await page.waitForTimeout(2000);
      }

      // Open Closed page
      await closedPage.open();

      // Search exact count
      await closedPage.search(fixture.countImportName);
      let details = await closedPage.getCountDetails(fixture.countImportName);
      expect(details.rawText).toContain(fixture.countImportName);
      await closedPage.clearSearch();

      // Type = Hard Count
      await closedPage.selectType('Hard count');
      await page.waitForTimeout(2000);
      const hardDetails = await closedPage.getCountDetails(fixtureHard.countImportName);
      expect(hardDetails.rawText).toContain(fixtureHard.countImportName);
      await expect(page.locator('.list-item').filter({ hasText: fixture.countImportName })).toBeHidden();
      await closedPage.selectType('All Types');

      // Facility
      const testFacility = fixture.facilityCandidates[0];
      if (testFacility) {
        await closedPage.selectFacility(testFacility);
        await page.waitForTimeout(2000);
        const facilityDetails = await closedPage.getCountDetails(fixture.countImportName);
        expect(facilityDetails.facility).toContain(testFacility);
      }

      // Export
      await closedPage.exportHistory();
      // Toast message verified inside exportHistory()

    } finally {
      cleanupCycleCountUploadFixture(fixture);
      cleanupCycleCountUploadFixture(fixtureHard);
    }
  });
});
