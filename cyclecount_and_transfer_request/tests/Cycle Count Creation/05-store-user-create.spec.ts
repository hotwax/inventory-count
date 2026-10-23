import { test, expect } from '@playwright/test';

// Use the Store User session for this test
test.use({ storageState: 'playwright/.auth/storeUser.json' });

test.describe.serial('Store User Cycle Count E2E (DEV)', () => {

  test('Store User Cycle Count Creation Check', async ({ page }) => {
    // 1. Go to Launchpad and navigate to the Cycle Count app
    await page.goto('https://launchpad.hotwax.io/home');
    await expect(page.getByRole('heading', { name: 'Launch Pad' })).toBeVisible();

    // Click the DEV button for Cycle Count app
    await page.getByTestId('dev-button-inventorycount').click();

    // 2. Wait for the app to load and land on the counts tab
    await expect(page).toHaveURL(/.*\/tabs\/count/, { timeout: 15000 });

    // 3. Click the "Create" button in the bottom tab bar
    // The tab bar usually has buttons with text "Counts", "Create", "Settings"
    const createTabBtn = page.locator('ion-tab-button').filter({ hasText: 'Create' });
    await createTabBtn.click();

    // 4. Ensure we successfully navigated to the create page
    await expect(page).toHaveURL(/.*\/tabs\/create-cycle-count/, { timeout: 15000 });

    // 5. Fail the test if a permission error toast appears
    const toasts = await page.locator('ion-toast').allTextContents();
    for (const t of toasts) {
      expect(t.toLowerCase()).not.toContain('permission');
    }

    // 6. Fill Count Name (with - S for Store User)
    const countName = `Test Count ${Date.now()} - S`;
    await page.getByTestId('create-count-name-input').locator('input').fill(countName);

    // 7. (Facility is pre-filled for Store Users, skipping selection)

    // 8. Change Count Type (Randomly select)
    await page.getByTestId('create-count-type-select').click();
    await page.getByRole('radio').last().click();

    // 9. Set Due Date
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

    // 10. Search for a product using random keyword
    const keywords = ['red', 'black', 'green', 'white', '22', '11', '33', '12', '19'];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];

    await page.getByTestId('create-count-search-input').locator('input').fill(keyword);
    await page.waitForTimeout(3000);

    // 11. Select up to 3 products that appear
    const productItems = page.locator('ion-item').filter({ has: page.locator('ion-checkbox') });
    await page.waitForTimeout(1000);
    const itemCount = await productItems.count();

    const maxToSelect = Math.min(itemCount, 4);
    const selectedProducts: string[] = [];

    for (let i = 1; i < maxToSelect; i++) {
      const item = productItems.nth(i);
      const details = await item.textContent();
      const cleanDetails = details?.trim() || '';
      console.log(`\n--- STORE USER SELECTED PRODUCT ${i} ---\n${cleanDetails}\n----------------------------\n`);
      selectedProducts.push(cleanDetails);
      await item.locator('ion-checkbox').click();
    }

    // Save the Count Name and Product Details to a JSON file for use in the next test step!
    const fs = require('fs');
    fs.writeFileSync('playwright/.auth/store-cycle-count.json', JSON.stringify({
      countName,
      products: selectedProducts
    }, null, 2));

    // 12. Submit the Create Cycle Count form
    await page.getByTestId('create-count-submit-btn').click();

    // 13. Handle the confirmation alert
    const alert = page.locator('ion-alert');
    await expect(alert).toBeVisible();
    await alert.locator('.alert-button').filter({ hasText: 'CREATE' }).click();

    // 14. Verify the success toast message
    const toast = page.locator('ion-toast');
  });

  test('Store User Cycle Count Execution Flow', async ({ page }) => {
    test.setTimeout(400000); // Increase timeout to ~6.6 minutes to allow for the 6-minute polling

    const fs = require('fs');
    if (!fs.existsSync('playwright/.auth/store-cycle-count.json')) {
      test.skip(true, 'No cycle count data found. Skipping execution test.');
      return;
    }

    const countData = JSON.parse(fs.readFileSync('playwright/.auth/store-cycle-count.json', 'utf8'));
    const countName = countData.countName;
    const products = countData.products || [];

    // We try to extract a SKU from the product string (usually the second line), otherwise fallback to the keyword used
    const firstProductDetails = products[0] || '';
    const parts = firstProductDetails.split('\n');
    let barcodeToScan = parts.length > 1 ? parts[1].trim() : '11';

    // --- STEP 1: App Navigation to Assigned Tab ---
    await page.goto('https://launchpad.hotwax.io/home');
    await page.getByTestId('dev-button-inventorycount').click();

    // Store user might land on tabs/count instead of assigned directly, let's go to /tabs/count explicitly or click the tab
    await expect(page).toHaveURL(/.*\/tabs\/.*/, { timeout: 15000 });
    const countTabBtn = page.locator('ion-tab-button').filter({ hasText: 'Counts' }).first();
    if (await countTabBtn.isVisible()) {
      await countTabBtn.click();
    }

    // Wait for the cycle counts to load
    // The OMS sync job must run to sync the newly created count to the Assigned tab
    // We will poll every 2 minutes (up to 3 times / 6 mins) since the backend job can be slow
    let countFound = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Waiting 2 minutes for OMS sync... (Attempt ${attempt}/3)`);
      await page.waitForTimeout(120000); // 2 minutes
      
      await page.reload();
      await expect(page).toHaveURL(/.*\/tabs\/.*/, { timeout: 15000 });
      await page.waitForTimeout(3000); // Wait for the page to settle after reload
      
      // Use the search bar to find our specific count (since it might be off-screen due to pagination)
      const searchInput = page.locator('ion-searchbar').locator('input').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(countName);
        await page.waitForTimeout(2000); // wait for debounce and API request
      }
      
      const countCard = page.locator('ion-card').filter({ hasText: countName }).first();
      if (await countCard.isVisible()) {
        countFound = true;
        console.log(`Cycle count ${countName} found! Proceeding...`);
        break;
      }
    }

    if (!countFound) {
      throw new Error(`Cycle count ${countName} did not appear on the Assigned tab after 6 minutes.`);
    }

    const countCard = page.locator('ion-card').filter({ hasText: countName }).first();
    await expect(countCard).toBeVisible({ timeout: 10000 });

    // Click Start counting
    const startCountingBtn = countCard.getByTestId('count-start-counting-btn');
    if (await startCountingBtn.isVisible()) {
      await startCountingBtn.click();
      await page.waitForTimeout(2000); // Wait for API response and UI state change
    }

    // --- STEP 3: Create and Open New Session ---
    const newSessionBtn = countCard.getByTestId('count-start-new-session-btn');
    if (await newSessionBtn.isVisible()) {
      await newSessionBtn.click();
    } else {
      // Fallback to the header new session btn if sessions already exist
      await countCard.getByTestId('count-new-session-header-btn').click();
    }

    // Fill session modal
    await expect(page.getByTestId('count-new-session-modal')).toBeVisible();
    await page.getByTestId('count-new-session-name-input').locator('input').fill(`Store User Session ${Date.now()}`);
    // Select first area radio
    await page.locator('ion-radio').first().click();
    // Save session
    await page.getByTestId('count-new-session-save-btn').click();
    await page.waitForTimeout(2000);

    // Open the newly created session 
    const sessionItem = countCard.locator('ion-item').filter({ hasText: 'Store User Session' }).first();
    await expect(sessionItem).toBeVisible({ timeout: 10000 });
    await sessionItem.click();

    // Verify we navigated to the session detail page
    await expect(page).toHaveURL(/.*\/session-count-detail.*/, { timeout: 15000 });

    // --- STEP 4: Scanning Phase ---
    const scanInput = page.getByTestId('session-detail-scan-input').locator('input');
    await expect(scanInput).toBeVisible();

    // Scan the barcode
    await scanInput.fill(barcodeToScan);
    await scanInput.press('Enter');

    // Wait for aggregation and matching workers to process
    await page.waitForTimeout(4000);

    // Click on the Counted tab to see if it appeared there
    await page.getByTestId('session-detail-segment-counted-btn').click();
    await page.waitForTimeout(1000);

    // --- STEP 5: Submit Session ---
    await page.getByTestId('session-detail-submit-btn').click();

    const submitAlert = page.getByTestId('session-detail-submit-alert');
    await expect(submitAlert).toBeVisible();
    await submitAlert.locator('.alert-button').filter({ hasText: 'Submit' }).click();

    // Wait for the success toast
    const toast = page.locator('ion-toast');
    await expect(toast).toContainText('successfully', { timeout: 15000 });

    await page.waitForTimeout(3000);

  });

});
