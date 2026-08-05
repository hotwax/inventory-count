import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import { StoreCountsPage } from '../../pages/cyclecount/store-counts.page';
import { SessionCountPage } from '../../pages/cyclecount/session-count.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
  type CycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';
import fs from 'fs';

test.describe('Session Count Detail - Functional Coverage', () => {
  test.setTimeout(300_000);
  let fixture: CycleCountUploadFixture;

  test.beforeEach(async ({}, testInfo) => {
    fixture = createCycleCountUploadFixture(undefined, testInfo.project.name.replace('chromium-', ''));
  });

  test.afterEach(async () => {
    // We don't necessarily need to cleanup every time if we want to debug, but good practice
    cleanupCycleCountUploadFixture(fixture);
  });

  test('Directed Count: handles Uncounted, Undirected, Unmatched, and Edit/Submit actions', async ({ page }) => {
    const bulkUploadPage = new BulkUploadPage(page);
    const storeCountsPage = new StoreCountsPage(page);
    const sessionCountPage = new SessionCountPage(page);

    // 1. Seed Directed Count
    await bulkUploadPage.open();
    await bulkUploadPage.createCycleCount(fixture.csvPath, fixture.uploadFileName);

    // 2. Open Session
    await storeCountsPage.startOrResumeSession(fixture.countImportName);
    await sessionCountPage.expectLoaded();
    await sessionCountPage.verifyCountType('Directed Count');
    await sessionCountPage.startCountingIfNeeded();

    // 3. Verify Uncounted segment
    await sessionCountPage.switchSegment('uncounted');
    await sessionCountPage.expectItemInSegment('uncounted', fixture.requestedItemId);

    // 4. Scan valid item -> Check Counted
    // Using barcode identification value from fixture if available, else requestedItemId
    await sessionCountPage.scanBarcode(fixture.requestedItemId);
    await sessionCountPage.switchSegment('counted');
    await sessionCountPage.expectItemInSegment('counted', fixture.requestedItemId);

    // 5. Scan undirected item (not in seed list) -> Check Undirected
    const undirectedSku = 'MH02-XS-Black'; 
    await sessionCountPage.scanBarcode(undirectedSku);
    await sessionCountPage.switchSegment('undirected');
    await sessionCountPage.expectItemInSegment('undirected', undirectedSku);

    // 6. Scan unmatched barcode -> Check Unmatched & Match it
    const fakeBarcode = 'FAKE_BARCODE_123';
    await sessionCountPage.scanBarcode(fakeBarcode);
    await sessionCountPage.switchSegment('unmatched');
    await sessionCountPage.expectItemInSegment('unmatched', fakeBarcode);

    // Match fake barcode to the original requested item
    await sessionCountPage.matchProduct(fakeBarcode, fixture.requestedItemId);
    
    // Give time for aggregation
    await sessionCountPage.wait(3000);
    await sessionCountPage.switchSegment('counted');
    await sessionCountPage.expectItemInSegment('counted', fixture.requestedItemId);

    // 7. Edit session name
    const updatedName = `Updated-${fixture.countImportName.substring(0, 10)}`;
    await sessionCountPage.editSessionName(updatedName);

    // 8. Submit Session
    await sessionCountPage.submitSession();
    await expect(page.getByTestId('session-detail-reopen-btn')).toBeVisible({ timeout: 20_000 });
  });

  test('Hard Count: handles blind counting and session discard', async ({ page }) => {
    // Generate a fresh fixture name for Hard Count to avoid collision in this run
    const hardCountFixture = createCycleCountUploadFixture(undefined, testInfo.project.name.replace('chromium-', ''));
    const content = fs.readFileSync(hardCountFixture.csvPath, 'utf8');
    const updatedContent = content.replace(/DIRECTED_COUNT/g, 'HARD_COUNT');
    fs.writeFileSync(hardCountFixture.csvPath, updatedContent);

    const bulkUploadPage = new BulkUploadPage(page);
    const storeCountsPage = new StoreCountsPage(page);
    const sessionCountPage = new SessionCountPage(page);

    try {
      // 1. Seed Hard Count
      await bulkUploadPage.open();
      await bulkUploadPage.createCycleCount(hardCountFixture.csvPath, hardCountFixture.uploadFileName);

      // 2. Open Session
      await storeCountsPage.startOrResumeSession(hardCountFixture.countImportName);
      await sessionCountPage.expectLoaded();
      await sessionCountPage.startCountingIfNeeded();

      // 3. Verify labels (HARD COUNT badge)
      await sessionCountPage.verifyCountType('Hard Count');

      // 4. Verify Uncounted/Undirected segments are ABSENT in template (Hard count doesn't have them)
      await expect(page.getByTestId('session-detail-segment-uncounted-btn')).not.toBeVisible();
      await expect(page.getByTestId('session-detail-segment-undirected-btn')).not.toBeVisible();

      // 5. Scan item -> Counted
      await sessionCountPage.scanBarcode(fixture.requestedItemId);
      await sessionCountPage.switchSegment('counted');
      await sessionCountPage.expectItemInSegment('counted', fixture.requestedItemId);

      // 6. Discard Session
      await sessionCountPage.discardSession();
      await storeCountsPage.expectLoaded();
    } finally {
      cleanupCycleCountUploadFixture(hardCountFixture);
    }
  });
});
