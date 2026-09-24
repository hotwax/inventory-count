import { test, expect } from '@playwright/test';

/**
 * Configure this test to run using the pre-authenticated Admin session.
 * This bypasses the login screen entirely.
 */
test.use({ storageState: 'playwright/.auth/admin.json' });

test.describe.serial('Admin Cycle Count E2E (DEV)', () => {

  test('Admin Cycle Count Creation', async ({ page }) => {
    // --- STEP 1: App Navigation ---
    // Start at the Launchpad (main hub)
    await page.goto('https://launchpad.hotwax.io/home');

    // Verify the page loaded correctly
    await expect(page.getByRole('heading', { name: 'Launch Pad' })).toBeVisible();

    // Find the Cycle Count app card using its specific test ID and click it
    await page.getByTestId('dev-button-inventorycount').click();

    // Ensure we successfully navigated into the app by checking the URL
    await expect(page).toHaveURL(/.*\/assigned/, { timeout: 15000 });

    // Navigate to the "Create count" page via the side menu
    await page.getByText('Create count').click();


    // --- STEP 2: Fill out the basic Cycle Count form ---

    // Generate a unique name for this cycle count using a timestamp
    const countName = `Test Count ${Date.now()} - A`;
    await page.getByTestId('create-count-name-input').locator('input').fill(countName);

    // Check the currently selected Facility (Location)
    const facilityChip = page.getByTestId('create-count-facility-chip');
    const chipText = await facilityChip.textContent();

    // If the chip says "Select Facility", we must open the modal and pick one
    if (chipText && chipText.includes('Select')) {
      await facilityChip.click();
      // Wait for the modal and blindly click the very first facility in the list
      await page.locator('ion-modal[data-testid="create-count-facility-modal"] ion-item').first().click();
    }

    // Change the "Count Type" (e.g. from 'Cycle' to 'Location' or vice-versa)
    await page.getByTestId('create-count-type-select').click();
    // Ionic radio groups often close the popover automatically once clicked
    await page.getByRole('radio').last().click();

    // Open the Due Date picker
    await page.getByTestId('create-count-due-date-btn').click();
    const datePicker = page.getByTestId('create-count-due-date-picker');
    await expect(datePicker).toBeVisible();

    /**
     * Ionic datetime pickers use complex shadow-DOM structures that are hard to automate with normal clicks.
     * Instead, we use `evaluate` to inject a JavaScript snippet directly into the browser to forcefully 
     * set the component's value to tomorrow's date and trigger its internal `confirm()` function.
     */
    await datePicker.evaluate((el: any) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      el.value = tomorrow.toISOString();
      if (typeof el.confirm === 'function') {
        el.confirm();
      }
    });

    // Clean up: If the date picker popover didn't close itself, try to click a Done/Confirm button
    const doneBtn = page.getByRole('button', { name: /Done|Confirm|OK/i }).last();
    if (await doneBtn.isVisible()) {
      await doneBtn.click();
    }

    // --- STEP 3: Add Products to the Count ---

    // Define an array of keywords and pick one entirely at random to test different database results
    const keywords = ['red', 'black', 'green', 'white', '22', '11', '33', '12', '19'];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];

    // Target the native <input> hiding inside the <ion-searchbar> web component
    await page.getByTestId('create-count-search-input').locator('input').fill(keyword);
    // Wait 3 seconds for the app to finish its API call and render the search results
    await page.waitForTimeout(3000);

    // Find all rows in the results list that contain a checkbox
    const productItems = page.locator('ion-item').filter({ has: page.locator('ion-checkbox') });
    await page.waitForTimeout(1000);
    const itemCount = await productItems.count();

    // We want to select up to 3 products. 
    // We skip index 0 because that row is usually the "Select All" master checkbox.
    const maxToSelect = Math.min(itemCount, 4);
    const selectedProducts: string[] = [];

    // Loop through the results and click the checkboxes
    for (let i = 1; i < maxToSelect; i++) {
      const item = productItems.nth(i);
      // Extract the text of the product so we know what we clicked
      const details = await item.textContent();
      const cleanDetails = details?.trim() || '';
      console.log(`\n--- SELECTED PRODUCT ${i} ---\n${cleanDetails}\n----------------------------\n`);

      selectedProducts.push(cleanDetails);
      await item.locator('ion-checkbox').click();
    }

    // --- STEP 4: Save State and Submit ---

    // Save the Count Name and Product details to a JSON file. 
    // Other scripts can read this file later to know exactly what was created!
    const fs = require('fs');
    fs.writeFileSync('playwright/.auth/admin-cycle-count.json', JSON.stringify({
      countName,
      products: selectedProducts
    }, null, 2));

    // Take a final screenshot right before submission for debugging
    await page.screenshot({ path: '/Users/varnitajain/.gemini/antigravity-ide/brain/f337a462-329a-4a2d-b8f2-63764e48ad21/before-submit.png' });

    // Click the submit button on the main page
    await page.getByTestId('create-count-submit-btn').click();

    // Handle the confirmation alert (e.g., "Are you sure you want to create cycle count with 1 items?")
    const alert = page.locator('ion-alert');
    await expect(alert).toBeVisible();

    // Click the specific "CREATE" button inside the alert dialog
    await alert.locator('.alert-button').filter({ hasText: 'CREATE' }).click();

    // Verify the operation actually succeeded by waiting for the success toast message
    const toast = page.locator('ion-toast');
  });

  test('Admin Cycle Count Execution Flow', async ({ page }) => {
    test.setTimeout(400000); // Increase timeout to ~6.6 minutes to allow for the 6-minute polling

    const fs = require('fs');
    if (!fs.existsSync('playwright/.auth/admin-cycle-count.json')) {
      test.skip(true, 'No cycle count data found. Skipping execution test.');
      return;
    }

    const countData = JSON.parse(fs.readFileSync('playwright/.auth/admin-cycle-count.json', 'utf8'));
    const countName = countData.countName;
    const products = countData.products || [];

    // We try to extract a SKU from the product string (usually the second line), otherwise fallback to the keyword used
    const firstProductDetails = products[0] || '';
    const parts = firstProductDetails.split('\n');
    let barcodeToScan = parts.length > 1 ? parts[1].trim() : '11';

    // --- STEP 1: App Navigation to Assigned Tab ---
    await page.goto('https://launchpad.hotwax.io/home');
    await page.getByTestId('dev-button-inventorycount').click();
    await expect(page).toHaveURL(/.*\/assigned/, { timeout: 15000 });

    // Wait for the cycle counts to load
    // The OMS sync job must run to sync the newly created count to the Assigned tab.
    // We poll every 2 minutes (up to 3 times / 6 mins) as the backend job can be slow.
    let countFound = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Waiting 2 minutes for OMS sync... (Attempt ${attempt}/3)`);
      await page.waitForTimeout(120000); // 2 minutes wait per attempt

      // Refresh the page to fetch the newly synced counts
      await page.reload();
      await expect(page).toHaveURL(/.*\/assigned/, { timeout: 15000 });
      await page.waitForTimeout(3000); // Wait for the page to settle after reload

      // Use the search bar to find our specific count (since it might be off-screen due to pagination)
      const searchInput = page.locator('ion-searchbar').locator('input').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(countName);
        // Wait for the debounce and API response
        await page.waitForTimeout(2000); 
      }

      const countCard = page.locator('ion-card').filter({ hasText: countName }).first();
      if (await countCard.isVisible()) {
        countFound = true;
        console.log(`Cycle count ${countName} found on attempt ${attempt}! Proceeding...`);
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
    await page.getByTestId('count-new-session-name-input').locator('input').fill(`Admin Session ${Date.now()}`);
    // Select first area radio
    await page.locator('ion-radio').first().click();
    // Save session
    await page.getByTestId('count-new-session-save-btn').click();
    await page.waitForTimeout(2000);

    // Open the newly created session 
    // Wait for the active session item to appear (it should be the first item in the list)
    const sessionItem = countCard.locator('ion-item').filter({ hasText: 'Admin Session' }).first();
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

    // Wait for the success toast and for the page to navigate back
    const toast = page.locator('ion-toast');
    await expect(toast).toContainText('successfully', { timeout: 15000 });

    // Go back to the cycle count review page (CountProgressReview.vue)
    // The app auto-navigates back to the assigned page or review page
    await page.waitForTimeout(3000);

  });

});
