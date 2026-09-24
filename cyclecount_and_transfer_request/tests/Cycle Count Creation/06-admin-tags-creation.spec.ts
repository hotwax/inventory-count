
import { test, expect } from '@playwright/test';
import fs from 'fs';

// Use the Admin session for these tests
test.use({ storageState: 'playwright/.auth/admin.json' });

test('Admin Cycle Count via Tags (DEV)', async ({ page }) => {
  // 1. Go to Launchpad
  await page.goto('https://launchpad.hotwax.io/home');
  await expect(page.getByRole('heading', { name: 'Launch Pad' })).toBeVisible();

  // 2. Click the DEV icon for Cycle Count app
  await page.getByTestId('dev-button-inventorycount').click();
  await expect(page).toHaveURL(/.*\/assigned/, { timeout: 15000 });

  // 3. Click on "Create count" in the side menu
  await page.getByText('Create count').click();

  // 4. Fill Count Name
  const countName = `Tags Count ${Date.now()} - A`;
  await page.getByTestId('create-count-name-input').locator('input').fill(countName);

  // 5. Change Facility (only if not already selected)
  const facilityChip = page.getByTestId('create-count-facility-chip');
  const chipText = await facilityChip.textContent();
  
  if (chipText && chipText.includes('Select')) {
    await facilityChip.click();
    const facilityModal = page.locator('ion-modal[data-testid="create-count-facility-modal"]');
    await facilityModal.locator('ion-item').nth(1).click();
    await expect(facilityModal).toBeHidden();
  }

  // 6. Change Count Type
  await page.getByTestId('create-count-type-select').click();
  await page.getByRole('radio').last().click();

  // 7. Set Due Date
  await page.getByTestId('create-count-due-date-btn').click();
  const datePicker = page.getByTestId('create-count-due-date-picker');
  await expect(datePicker).toBeVisible();
  await datePicker.evaluate((el: any) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    el.value = tomorrow.toISOString();
    if (typeof el.confirm === 'function') el.confirm();
  });
  const doneBtn = page.getByRole('button', { name: /Done|Confirm|OK/i }).last();
  if (await doneBtn.isVisible()) await doneBtn.click();

  // --- NEW TAG SELECTION FLOW ---
  // 8. Click the 'All' chip next to Tags to open the tag selection modal
  // When no tags are selected, the chip says "All"
  await page.locator('ion-chip').filter({ hasText: 'All' }).click();

  // 9. Wait for the "Select tags" modal to open
  const tagsModal = page.locator('ion-modal').filter({ hasText: 'Select tags' });
  await expect(tagsModal).toBeVisible();

  // 10. Select a few tags (e.g. the first 3 checkboxes)
  const tagCheckboxes = tagsModal.locator('ion-checkbox');
  await expect(tagCheckboxes.first()).toBeVisible();
  
  const tagsCount = await tagCheckboxes.count();
  const maxTags = Math.min(tagsCount, 3);
  for (let i = 0; i < maxTags; i++) {
    await tagCheckboxes.nth(i).click();
  }

  // 11. Click the floating action button (checkmark) to confirm tag selection
  await tagsModal.locator('ion-fab-button').click();
  await expect(tagsModal).toBeHidden();

  // 12. Wait for products to load based on the tags
  await page.waitForTimeout(3000);

  // 13. Select up to 3 products
  const productItems = page.locator('ion-item').filter({ has: page.locator('ion-checkbox') });
  await expect(productItems.first()).toBeVisible({ timeout: 10000 }); // Make sure at least the "All" box is there
  
  const itemCount = await productItems.count();
  const maxToSelect = Math.min(itemCount, 4); // skip index 0
  const selectedProducts: string[] = [];

  for (let i = 1; i < maxToSelect; i++) {
    const item = productItems.nth(i);
    const details = await item.textContent();
    const cleanDetails = details?.trim() || '';
    console.log(`\n--- TAG-SELECTED PRODUCT ${i} ---\n${cleanDetails}\n----------------------------\n`);
    selectedProducts.push(cleanDetails);
    await item.locator('ion-checkbox').click();
  }

  // Save the Count Name and Product Details
  fs.writeFileSync('playwright/.auth/admin-cycle-count-tags.json', JSON.stringify({ 
    countName, 
    products: selectedProducts 
  }, null, 2));

  // 14. Submit the Create Cycle Count form
  await page.getByTestId('create-count-submit-btn').click();
  
  // 15. Handle the confirmation alert
  const alert = page.locator('ion-alert');
  await expect(alert).toBeVisible();
  await alert.locator('.alert-button').filter({ hasText: 'CREATE' }).click();
  
  // 16. Verify the success toast message
  const toast = page.locator('ion-toast');
  await expect(toast).toContainText('created successfully', { timeout: 15000 });
});
