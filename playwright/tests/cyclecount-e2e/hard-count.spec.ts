import { test } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { AssignedPage } from '../../pages/cyclecount/assigned.page';
import { AssignedDetailPage } from '../../pages/cyclecount/assigned-detail.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';

test.describe.serial('Cycle count hard count flow', () => {
  test.setTimeout(600_000);

  test('positive: uploads a hard count and verifies assignment', async ({
    page,
  }, testInfo) => {
    // Generate a fixture specifically for a Hard Count (no products)
    const fixture = createCycleCountUploadFixture(testInfo.project.name.replace('chromium-', ''), true);

    try {
      const bulkUploadPage = new BulkUploadPage(page);
      const assignedPage = new AssignedPage(page);
      const assignedDetailPage = new AssignedDetailPage(page);

      await bulkUploadPage.open();
      
      // Pass isHardCount: true to ensure 'Product SKU' mapping is Skipped
      await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName, { isHardCount: true });

      // Verify the count appears in the Assigned tab
      await assignedPage.open();
      await assignedPage.openCount(fixture.countImportName);
      await assignedDetailPage.expectLoaded(fixture.countImportName);

      // Assert that it is indeed a Hard Count with 0 requested items
      await assignedDetailPage.expectHardCount();

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
