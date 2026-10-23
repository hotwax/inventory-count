import { test, expect } from '@playwright/test';

// Use the Admin session for these tests
test.use({ storageState: 'playwright/.auth/admin.json' });

test('Admin Cycle Count Negative Tests (DEV)', async ({ page }) => {
  // 1. Go to Launchpad and navigate to the Cycle Count app
  await page.goto('https://launchpad.hotwax.io/home');
  await expect(page.getByRole('heading', { name: 'Launch Pad' })).toBeVisible();
  await page.getByTestId('dev-button-inventorycount').click();
  
  // 2. Wait for the assigned page and click 'Create count'
  await expect(page).toHaveURL(/.*\/assigned/, { timeout: 15000 });
  await page.getByText('Create count').click();

  // --- NEGATIVE TEST 1: Submit empty form ---
  const submitBtn = page.getByTestId('create-count-submit-btn');
  await submitBtn.click();
  
  // Verify inline validation errors appear
  await expect(page.getByText('Please enter count name')).toBeVisible();
  await expect(page.getByText('Please select due date')).toBeVisible();
  await expect(page.getByText('Please select at least one item.')).toBeVisible();

  console.log('\n--- NEGATIVE TEST 1 PASSED: Empty form correctly shows inline validation errors ---\n');

  // --- NEGATIVE TEST 2: Submit with Name/Date, but NO products selected ---
  // Fill Count Name
  const countName = `Negative Test ${Date.now()}`;
  await page.getByTestId('create-count-name-input').locator('input').fill(countName);

  // Set Due Date
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
  
  // Set Facility (only if not already selected)
  const facilityChip = page.getByTestId('create-count-facility-chip');
  const chipText = await facilityChip.textContent();
  
  if (chipText && chipText.includes('Select')) {
    await facilityChip.click();
    await page.locator('ion-modal[data-testid="create-count-facility-modal"] ion-item').first().click();
  }

  // Try to submit with 0 products
  await submitBtn.click();
  
  // Verify the Name and Date errors disappear, but the 0 items error remains
  await expect(page.getByText('Please enter count name')).toBeHidden();
  await expect(page.getByText('Please select due date')).toBeHidden();
  await expect(page.getByText('Please select at least one item.')).toBeVisible();

  console.log('\n--- NEGATIVE TEST 2 PASSED: Empty product list correctly blocked submission ---\n');
});
