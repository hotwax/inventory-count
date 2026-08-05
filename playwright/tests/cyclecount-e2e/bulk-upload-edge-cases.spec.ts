import { test, expect } from '@playwright/test';
import { BulkUploadPage } from '../../pages/cyclecount/bulk-upload.page';
import {
  cleanupCycleCountUploadFixture,
  createCycleCountUploadFixture,
} from '../../fixtures/cyclecount.fixture';
import fs from 'fs';

test.describe.serial('Bulk upload edge cases', () => {
  test.setTimeout(180_000);

  test('negative: handles missing mapping fields securely and blocks upload', async ({ page }, testInfo) => {
    const fixture = createCycleCountUploadFixture(undefined, testInfo.project.name.replace('chromium-', ''));
    const bulkUploadPage = new BulkUploadPage(page);

    try {
      await bulkUploadPage.open();

      await bulkUploadPage.uploadFile(fixture.csvPath);

      // We intentionally do not map fields.
      await bulkUploadPage.submit();
      
      // The submit process should be blocked and a validation toast should appear.
      await bulkUploadPage.expectToast(/Select all required fields/i);

    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });

  test('negative: allows reviewing asynchronous processing error in the modal', async ({ page }) => {
    const bulkUploadPage = new BulkUploadPage(page);
    
    // Mock the system messages API to return a simulated error system message
    await page.route('**/inventory-cycle-count/cycleCounts/systemMessages*', async (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              systemMessageId: "123456789",
              messageText: "Fake_Error_File-1234567.csv",
              statusId: "SmsgError"
            }
          ])
        });
      }
      return route.fallback();
    });

    // Mock the error detail API
    await page.route('**/inventory-cycle-count/cycleCounts/systemMessages/123456789/errors', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            systemMessageId: "123456789",
            errorText: "Failed due to invalid CSV structure. Please review."
          }
        ])
      });
    });

    await bulkUploadPage.open();

    // Verify the mock is rendering
    await expect(page.locator('.system-message-section .item', { hasText: 'Fake_Error_File-1234567.csv' })).toBeVisible({ timeout: 15_000 });

    // Open the error modal
    await bulkUploadPage.viewError("Fake_Error_File-1234567.csv");
    
    // Assert the mocked error text is in the modal
    await bulkUploadPage.expectErrorModalMessage(/Failed due to invalid CSV structure/i);

    await bulkUploadPage.closeErrorModal();
  });

  test('negative: handles synchronous upload rejection from the backend', async ({ page }, testInfo) => {
    const fixture = createCycleCountUploadFixture(undefined, testInfo.project.name.replace('chromium-', ''));
    
    // Using valid headers but invalid facility IDs to trigger an immediate synchronous error
    const lines = fs.readFileSync(fixture.csvPath, 'utf8').split('\n');
    lines[1] = lines[1].replace('YONKERS', 'INVALID_FACILITY').replace('STORE_14', 'INVALID_STORE');
    fs.writeFileSync(fixture.csvPath, lines.join('\n'));

    const bulkUploadPage = new BulkUploadPage(page);

    try {
      await bulkUploadPage.open();

      await bulkUploadPage.uploadFile(fixture.csvPath);
      await bulkUploadPage.mapRequiredFields();
      await bulkUploadPage.submit();

      // Ensure that because the data payload contains critical errors (invalid facility/types),
      // the backend rejects it on upload, and the frontend shows a red toast rather than generating a system message.
      await bulkUploadPage.expectToast(/Failed to upload the file, please try again/i);
    } finally {
      cleanupCycleCountUploadFixture(fixture);
    }
  });
});
