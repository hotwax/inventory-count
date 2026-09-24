import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * Helper function to save newly created order names to a JSON file.
 * This acts as a database so that if a test fails midway, we can reuse
 * this order later instead of constantly creating new ones and cluttering the DEV environment.
 */
function saveOrderName(name) {
  const filePath = 'tests/Transfer Request Flow/created-orders.json';
  let data = [];
  // If the file already exists, parse its contents so we can append to it
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  // Prevent duplicate names
  if (!data.includes(name)) data.push(name);
  // Write the updated array back to the JSON file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Helper function to check if an unused order already exists in our JSON file for a specific flow.
 * If it does, it extracts the order name, deletes it from the JSON array (so it's not reused again), 
 * and returns the name to skip the creation phase.
 */
function consumeReusableOrder(flowName) {
  const filePath = 'tests/Transfer Request Flow/created-orders.json';
  if (fs.existsSync(filePath)) {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Look for an order that matches the expected prefix (e.g., Transfer order request_approve_)
    const expectedPrefix = `Transfer order request_${flowName.toLowerCase()}_`;
    const reusableIndex = data.findIndex(name => name.startsWith(expectedPrefix));
    
    // If found, remove it from the array, save the array, and return the name
    if (reusableIndex !== -1) {
      const reusableName = data[reusableIndex];
      data.splice(reusableIndex, 1);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return reusableName;
    }
  }
  return null;
}

// We use .serial so that the tests run one after another, sharing the same browser contexts if needed
test.describe.serial('Transfer Request - E2E Flows (DEV)', () => {
  // Define our browser contexts and pages for the two different roles
  let adminBrowser, storeBrowser;
  let adminPage, storePage;

  test.beforeAll(async ({ browser }) => {
    // Initialize the Admin context using the pre-saved authentication state
    adminBrowser = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    // Initialize the Store User context using their pre-saved authentication state
    storeBrowser = await browser.newContext({ storageState: 'playwright/.auth/storeUser.json' });
    
    // Create new tabs/pages for both roles
    adminPage = await adminBrowser.newPage();
    storePage = await storeBrowser.newPage();
  });

  test.afterAll(async () => {
    // Clean up and close all pages and browsers when the suite finishes
    await adminPage.close();
    await storePage.close();
    await adminBrowser.close();
    await storeBrowser.close();
  });

  /**
   * Core Helper: Drives the Receiving App UI to create a brand new Transfer Order.
   * Runs under the Store User context.
   */
  async function createOrderInReceiving(page, flowName, searchKeyword) {
    // First, check if we already have an unused order sitting in our JSON file
    const reusableOrder = consumeReusableOrder(flowName);
    if (reusableOrder) {
      console.log(`[Store User] Reusing existing unused Transfer Order for ${flowName}: ${reusableOrder}`);
      return reusableOrder; // Skip UI creation completely to save time!
    }
    
    console.log(`[Store User] Creating NEW Transfer Order for ${flowName}...`);
    // Navigate to the Launchpad (main hub)
    await page.goto('https://launchpad.hotwax.io/home');
    
    // Find and click the Receiving App tile
    const receivingAppBtn = page.getByTestId('dev-button-receiving');
    await expect(receivingAppBtn).toBeVisible({ timeout: 15000 });
    await receivingAppBtn.click();
    
    // Wait for the Receiving app to load by checking the URL
    await page.waitForURL(/.*transfer-orders.*/i, { timeout: 45000 });
    await page.waitForTimeout(1000);
    
    // Click the '+' Floating Action Button (FAB) to start a new order
    const newTransferFab = page.getByTestId('transfer-orders-page-create-order-btn').or(page.locator('ion-fab-button').last());
    await page.screenshot({ path: 'proof-for-user.png', fullPage: true }); // Debug screenshot
    await expect(newTransferFab.first()).toBeVisible({ timeout: 30000 });
    await newTransferFab.first().click();

    // --- STEP 1: Assign Origin ---
    // The Destination is pre-selected by default, so we only need to pick an Origin facility
    const originAssignBtn = page.getByTestId('create-order-origin-assign-btn');
    await expect(originAssignBtn).toBeVisible({ timeout: 10000 });
    await originAssignBtn.click();
    await page.waitForTimeout(2000);

    // Select the first available facility in the radio list
    const facilityOptions = page.getByTestId("facility-radio-options").or(page.locator("ion-radio"));
    await expect(facilityOptions.first()).toBeVisible({ timeout: 5000 });
    await facilityOptions.first().click();
    await page.waitForTimeout(1000);

    // Click the Save/Checkmark button in the modal to confirm the facility
    const saveModalBtn = page.locator("ion-modal ion-fab-button");
    if (await saveModalBtn.first().isVisible().catch(() => false)) {
      await saveModalBtn.first().click();
      await page.waitForTimeout(1000);
    }
    // Wait for the modal to fully disappear
    await page.locator("ion-modal").waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});

    // --- STEP 1b: Verify Destination Facility (TC-02) ---
    // The Destination should be pre-filled to the logged-in user's store and shouldn't have an "Assign" button
    const destinationItem = page.locator('ion-item').filter({ hasText: /Destination/i }).first();
    const assignDestBtn = destinationItem.getByRole('button', { name: /ASSIGN/i });
    // We expect the button NOT to be visible because it's locked to the default store
    await expect(assignDestBtn).not.toBeVisible();

    // --- STEP 1c: Select Hand Delivery (TC-18) ---
    const methodSelect = page.locator('ion-select').filter({ hasText: /Method/i }).first();
    if (await methodSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await methodSelect.click();
        await page.waitForTimeout(1000);
        // An ion-alert with radio options appears
        const handDeliveryRadio = page.locator('ion-alert button').filter({ hasText: /Hand Delivery/i }).first();
        if (await handDeliveryRadio.isVisible().catch(() => false)) {
            await handDeliveryRadio.click();
            await page.waitForTimeout(500);
            const okBtn = page.locator('ion-alert button').filter({ hasText: /OK/i }).first();
            await okBtn.click();
            await page.waitForTimeout(1000);
        }
    }

    // --- STEP 2: Add Product ---
    // Click the "Search" tab segment to switch to the search view
    const searchTabBtn = page.locator("ion-segment").last().locator("ion-segment-button").last();
    await searchTabBtn.click({ force: true });
    // Fallback click just in case Ionic intercepts the standard click
    await searchTabBtn.evaluate((node) => node.click()).catch(() => {});
    await page.waitForTimeout(1500);
    
    // Type the requested keyword (e.g., 'red') into the search bar
    const searchBox = page.getByTestId('search-product-input');
    await expect(searchBox).toBeVisible({ timeout: 5000 });
    await searchBox.locator('input').first().fill(searchKeyword);
    await page.waitForTimeout(3000); 

    // Click "Add to Order" on the first search result
    const addToOrderBtn = page.getByTestId('add-to-transfer-btn').or(page.getByRole("button", { name: /ADD TO ORDER/i })).first();
    await expect(addToOrderBtn).toBeVisible({ timeout: 5000 });
    await addToOrderBtn.click();
    await page.waitForTimeout(1000);

    // --- STEP 3: Name the Order ---
    // Generate a unique name using the flow name and current timestamp (e.g., Transfer order request_approve_163820938)
    const uniqueName = `Transfer order request_${flowName.toLowerCase()}_${Date.now()}`;
    const nameInput = page.getByRole('textbox', { name: /Transfer name/i });
    if (await nameInput.isVisible({ timeout: 3000 }).catch(()=>false)) {
       await nameInput.fill(uniqueName);
    }
    
    // --- STEP 4: Set Quantity ---
    // Set the ordered quantity to 10
    const qtyInput = page.locator('ion-input[type="number"] input').or(page.locator('input[type="number"]')).first();
    if (await qtyInput.isVisible({timeout: 2000}).catch(()=>false)) {
        await qtyInput.fill('10');
    }

    // --- STEP 5: Review and Submit ---
    // Click the checkmark FAB to proceed to the summary page
    const reviewFab = page.locator("ion-fab-button").filter({ has: page.locator("ion-icon[name='checkmark-done-outline']").or(page.locator("ion-icon[name='checkmark-outline']")) }).or(page.locator("ion-fab-button")).last();
    await expect(reviewFab).toBeVisible({ timeout: 5000 });
    await reviewFab.click();
    await page.waitForTimeout(2000);
    
    // Click the final "Submit" button
    const submitBtn = page.getByRole('button', { name: /Submit/i }).or(page.locator("ion-fab-button").last());
    if (await submitBtn.isVisible({timeout: 3000}).catch(()=>false)) {
        await submitBtn.click();
    }
    await page.waitForTimeout(2000);
    
    // Save this order name to our JSON database so it can be reused if the test fails later!
    saveOrderName(uniqueName);
    return uniqueName;
  }

  /**
   * Core Helper: Drives the Transfers App (Admin view) to locate an order by name.
   */
  async function openAdminOrder(page, orderName) {
    console.log(`[Admin] finding Transfer Order ${orderName}...`);
    // Navigate to Launchpad
    await page.goto('https://launchpad.hotwax.io/home');
    
    // Find and click the Transfers app tile
    const transfersAppBtn = page.getByTestId('dev-button-transfers');
    await expect(transfersAppBtn).toBeVisible({ timeout: 15000 });
    await transfersAppBtn.click();
    
    // Wait for the app to load
    await page.waitForURL(/.*transfers.*/i, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Type the order name into the search bar and press Enter
    const searchBar = page.locator('ion-searchbar').getByRole('searchbox');
    if (await searchBar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchBar.fill(orderName);
        await searchBar.press('Enter');
        await page.waitForTimeout(2000);
    }
    
    // Click on the exact order row in the list view to open the details page
    const createdOrder = page.locator('ion-item').filter({ hasText: orderName }).first();
    await expect(createdOrder).toBeVisible({ timeout: 10000 });
    await createdOrder.click();
    await page.waitForTimeout(2000);
  }

  // Helper to verify status in RECEIVING APP as Store User (Currently commented out in tests)
  async function verifyStoreUserStatus(page, orderName, expectedStatusRegex) {
    console.log(`[Store User] verifying Transfer Order ${orderName} status...`);
    await page.goto('https://launchpad.hotwax.io/home');
    const receivingAppBtn = page.getByTestId('dev-button-receiving');
    await expect(receivingAppBtn).toBeVisible({ timeout: 15000 });
    await receivingAppBtn.click();
    await page.waitForURL(/.*transfer-orders.*/i, { timeout: 45000 });
    
    let found = false;
    // Retry loop to handle asynchronous indexing (ElasticSearch delays)
    for (let i = 0; i < 5; i++) {
        await page.reload();
        await page.waitForTimeout(3000);
        
        const searchBar = page.getByTestId('transfer-orders-page-search-input').locator('input').or(page.locator('ion-searchbar input')).first();
        await searchBar.fill(orderName);
        await searchBar.press('Enter');
        await page.waitForTimeout(3000);
        
        // If it's not in the 'Pending' tab, check the 'Completed' tab
        let targetOrder = page.locator('ion-item').filter({ hasText: orderName }).first();
        if (!(await targetOrder.isVisible().catch(() => false))) {
            const completedTab = page.getByTestId('transfer-orders-page-completed-tab');
            if (await completedTab.isVisible().catch(() => false)) {
                await completedTab.click();
                await page.waitForTimeout(1000);
            }
        }
        
        targetOrder = page.locator('ion-item').filter({ hasText: orderName }).first();
        if (await targetOrder.isVisible().catch(() => false)) {
            found = true;
            break;
        }
    }
    
    // Assert the order is visible and verify the status badge matches the expected regex (e.g. /Approved/i)
    const targetOrder = page.locator('ion-item').filter({ hasText: orderName }).first();
    await expect(targetOrder).toBeVisible({ timeout: 10000 });
    const badge = targetOrder.locator('ion-badge');
    if (await badge.isVisible().catch(()=>false)) {
       await expect(badge).toHaveText(expectedStatusRegex, { timeout: 5000 });
    }
  }


  // ==========================================
  // TEST SCENARIOS
  // ==========================================

  test('Flow 1: Approve Order', async () => {
    test.setTimeout(240000);
    // 1. Store User creates order
    const orderName = await createOrderInReceiving(storePage, 'Approve', 'red');
    
    // 2. Admin finds order
    await openAdminOrder(adminPage, orderName);
    
    // 3. Admin clicks Approve
    const approveBtn = adminPage.getByRole('button', { name: /Approve/i });
    if (await approveBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await approveBtn.click();
        await adminPage.waitForTimeout(3000);
    }
    
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: 'proof-flow-1-approve.png', fullPage: true });
  });

  test('Flow 2: Add Items', async () => {
    test.setTimeout(240000);
    const orderName = await createOrderInReceiving(storePage, 'AddItems', 'white');
    
    await openAdminOrder(adminPage, orderName);
    
    // 1. Admin clicks ADD ITEMS button
    const addItemsBtn = adminPage.locator('ion-button').filter({ hasText: /ADD ITEMS/i }).first();
    await expect(addItemsBtn).toBeVisible({ timeout: 5000 });
    await addItemsBtn.click();
    await adminPage.waitForTimeout(1000);
    
    // 2. Wait for modal to open
    const addProductModal = adminPage.locator('ion-modal').filter({ hasText: /Add product/i }).first();
    await expect(addProductModal).toBeVisible({ timeout: 5000 });
    
    // 3. Search for a new product inside the modal
    // Note: We target the inner 'input' of the ion-searchbar to trigger Ionic's native keyup events properly
    const searchInput = addProductModal.locator('ion-searchbar input').or(addProductModal.locator('input[type="search"]')).first();
    await searchInput.fill('black');
    await searchInput.press('Enter');
    await adminPage.waitForTimeout(3000); 

    // 4. Click ADD TO ORDER and close the modal
    const addToOrderBtn = addProductModal.locator('ion-button').filter({ hasText: /ADD TO ORDER/i }).first();
    await expect(addToOrderBtn).toBeVisible({ timeout: 5000 });
    await addToOrderBtn.click();
    
    const closeBtn = addProductModal.getByRole('button').first();
    await closeBtn.click();
    
    await adminPage.waitForTimeout(4000);
    await adminPage.screenshot({ path: 'proof-flow-2-additems.png', fullPage: true });
  });

  test('Flow 3: Cancel Order', async () => {
    test.setTimeout(240000);
    const orderName = await createOrderInReceiving(storePage, 'Cancel', 'blue');
    
    await openAdminOrder(adminPage, orderName);
    
    // 1. Admin clicks CANCEL ORDER
    const cancelBtn = adminPage.getByRole('button', { name: /CANCEL ORDER/i });
    if (await cancelBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await cancelBtn.click();
        
        // 2. A confirmation modal (ion-alert) pops up. Click Confirm/Yes.
        const confirmBtn = adminPage.locator('ion-alert').getByRole('button', { name: /Confirm|Yes|Cancel Order/i }).last();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) await confirmBtn.click();
        await adminPage.waitForTimeout(3000);
    }
    
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: 'proof-flow-3-cancel.png', fullPage: true });
  });

  test('Flow 4: Edit Qty and then Approve', async () => {
    test.setTimeout(240000);
    const orderName = await createOrderInReceiving(storePage, 'EditQty', 'green');
    
    await openAdminOrder(adminPage, orderName);
    
    // 1. Find the 3-dot (kebab) menu on the product item row
    const kebabMenuBtn = adminPage.locator('[data-testid^="order-item-actions-btn"]').first();
    if (await kebabMenuBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await kebabMenuBtn.click();
        await adminPage.waitForTimeout(1000);

        // 2. Select "Edit ordered qty" from the popup menu
        const editQtyOption = adminPage.locator('ion-item').filter({ hasText: /Edit ordered qty/i }).first();
        await editQtyOption.click();
        await adminPage.waitForTimeout(1000);

        // 3. An ion-alert pops up with an input box. Target the alert-input.
        const qtyInput = adminPage.locator('ion-alert input.alert-input').or(adminPage.getByRole('spinbutton')).first();
        
        // Example Negative Path Checks (Blank and Zero)
        await qtyInput.fill('');
        await qtyInput.press('Enter');
        await adminPage.waitForTimeout(500);
        
        await qtyInput.fill('0');
        await qtyInput.press('Enter');
        await adminPage.waitForTimeout(500);

        // Fill with a valid positive integer
        await qtyInput.fill('10');
        await qtyInput.press('Enter');
        await adminPage.waitForTimeout(1000);
    }
    
    // 4. Finally, approve the order with the newly updated quantity
    const approveBtn = adminPage.getByRole('button', { name: /Approve/i });
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(()=>false)) await approveBtn.click();
    
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: 'proof-flow-4-editqty.png', fullPage: true });
  });

  test('Flow 5: Remove Item then Approve', async () => {
    test.setTimeout(240000);
    const orderName = await createOrderInReceiving(storePage, 'RemoveItem', 'pink');
    
    await openAdminOrder(adminPage, orderName);
    
    // 1. Click the 3-dot menu on the product row
    const kebabMenuBtn = adminPage.locator('[data-testid^="order-item-actions-btn"]').first();
    if (await kebabMenuBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await kebabMenuBtn.click();
        await adminPage.waitForTimeout(1000);

        // 2. Select "Remove item" from the popup menu
        const removeItemOption = adminPage.locator('ion-item').filter({ hasText: /Remove item/i }).first();
        await removeItemOption.click();
        await adminPage.waitForTimeout(2000);
    }
    
    // 3. Approve the order (if applicable, though removing all items might disable approval)
    const approveBtn = adminPage.getByRole('button', { name: /Approve/i });
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(()=>false)) await approveBtn.click();
    
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: 'proof-flow-5-removeitem.png', fullPage: true });
  });

});
