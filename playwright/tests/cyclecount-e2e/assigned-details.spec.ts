import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { AssignedPage } from '../../pages/cyclecount/assigned.page';
import { AssignedDetailPage } from '../../pages/cyclecount/assigned-detail.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Assigned Count Details', () => {
  test.setTimeout(600_000);

  test('positive: verifies overview, dates and activity on Assigned Detail page', async ({
    page,
  }, testInfo) => {
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''));

    try {
      const bulkUploadPage = new BulkUploadPage(page);
      const assignedPage = new AssignedPage(page);
      const assignedDetailPage = new AssignedDetailPage(page);

      // TC: Bulk upload Directed Count
      await bulkUploadPage.open();
      await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

      // Open assigned page
      await assignedPage.open();
      
      // TC16: Open count details
      await assignedPage.openCount(fixture.countImportName);
      await assignedDetailPage.expectLoaded(fixture.countImportName);

      // Verify overview details
      const countId = await assignedDetailPage.getCountId();
      expect(countId).toBeTruthy();

      const facility = await assignedDetailPage.getAssignedFacility();
      expect(facility).toContain(fixture.facilityCandidates[0] || '');

      const startDateTime = await assignedDetailPage.getStartDateTime();
      expect(startDateTime).toBeTruthy();

      const dueDateTime = await assignedDetailPage.getDueDateTime();
      expect(dueDateTime).toBeTruthy();

      // TC19: Counting activity for a newly created count
      // For a newly created count, these might be empty or show a placeholder. We verify they don't crash.
      const firstItem = await assignedDetailPage.getFirstItemCounted();
      const lastItem = await assignedDetailPage.getLastItemCounted();
      expect(firstItem).toBeDefined();
      expect(lastItem).toBeDefined();

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
