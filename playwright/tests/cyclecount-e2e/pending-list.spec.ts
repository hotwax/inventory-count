import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { PendingReviewPage } from '../../pages/cyclecount/pending-review.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Pending Review List and Filters', () => {
  test.setTimeout(600_000);

  test('positive: verifies list data, search, and filters on Pending Review page', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));
    const fixtureHard = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''), true);

    try {
      const bulkUploadPage = new BulkUploadPage(page);
      const pendingReviewPage = new PendingReviewPage(page);
      const storeCountsPage = new StoreCountsPage(page);
      const sessionCountPage = new SessionCountPage(page);

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

      // Open Pending Review page
      await pendingReviewPage.open();

      // Search exact count
      await pendingReviewPage.search(fixture.countImportName);
      let details = await pendingReviewPage.getCountDetails(fixture.countImportName);
      expect(details.rawText).toContain(fixture.countImportName);
      await pendingReviewPage.clearSearch();

      // Type = Hard Count
      await pendingReviewPage.selectType('Hard count');
      await page.waitForTimeout(2000);
      const hardDetails = await pendingReviewPage.getCountDetails(fixtureHard.countImportName);
      expect(hardDetails.rawText).toContain(fixtureHard.countImportName);
      await expect(page.locator('.list-item').filter({ hasText: fixture.countImportName })).toBeHidden();
      await pendingReviewPage.selectType('All Types');

      // Facility
      const testFacility = fixture.facilityCandidates[0];
      if (testFacility) {
        await pendingReviewPage.selectFacility(testFacility);
        await page.waitForTimeout(2000);
        const facilityDetails = await pendingReviewPage.getCountDetails(fixture.countImportName);
        expect(facilityDetails.facility).toContain(testFacility);
      }

    } finally {
      cleanupCycleCountUploadFixture(fixture);
      cleanupCycleCountUploadFixture(fixtureHard);
    }
  });
});
