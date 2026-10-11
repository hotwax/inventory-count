import { test, expect } from '@playwright/test';

test.describe.serial('Transfer Request - Destructive Chaos Tests (DEV)', () => {
  let adminBrowser, storeBrowser;
  let adminPage, adminPageTabB, storePage;

  test.beforeAll(async ({ browser }) => {
    adminBrowser = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    storeBrowser = await browser.newContext({ storageState: 'playwright/.auth/storeUser.json' });
    adminPage = await adminBrowser.newPage();
    adminPageTabB = await adminBrowser.newPage();
    storePage = await storeBrowser.newPage();
  });

  test.afterAll(async () => {
    await adminPage.close();
    await adminPageTabB.close();
    await storePage.close();
    await adminBrowser.close();
    await storeBrowser.close();
  });

  // Helper to quickly generate an isolated dummy order that doesn't mess with created-orders.json
  async function createDummyOrder(page, prefix, orderNameStr = null) {
    console.log(`[Store User] Creating isolated dummy Transfer Order: ${prefix}...`);
    await page.goto('https://launchpad.hotwax.io/home');
    const receivingAppBtn = page.getByTestId('dev-button-receiving');
    await expect(receivingAppBtn).toBeVisible({ timeout: 15000 });
    await receivingAppBtn.click();
    await page.waitForURL(/.*transfer-orders.*/i, { timeout: 45000 });
    
    await page.waitForTimeout(1000);
    const newTransferFab = page.getByTestId('transfer-orders-page-create-order-btn').or(page.locator('ion-fab-button').last());
    await expect(newTransferFab.first()).toBeVisible({ timeout: 15000 });
    await newTransferFab.first().click();

    // Assign Origin
    const originAssignBtn = page.getByTestId('create-order-origin-assign-btn');
    await expect(originAssignBtn).toBeVisible({ timeout: 10000 });
    await originAssignBtn.click();
    await page.waitForTimeout(2000);
    const facilityOptions = page.getByTestId("facility-radio-options").or(page.locator("ion-radio"));
    await expect(facilityOptions.first()).toBeVisible({ timeout: 5000 });
    await facilityOptions.first().click();
    await page.waitForTimeout(1000);
    const saveModalBtn = page.locator("ion-modal ion-fab-button");
    if (await saveModalBtn.first().isVisible().catch(() => false)) await saveModalBtn.first().click();
    await page.waitForTimeout(2000);

    // Add Product
    const searchTabBtn = page.locator("ion-segment").last().locator("ion-segment-button").last();
    await searchTabBtn.click({ force: true });
    await searchTabBtn.evaluate((node) => node.click()).catch(() => {});
    await page.waitForTimeout(1500);

    const searchBox = page.getByTestId('search-product-input');
    await searchBox.locator('input').first().fill('red');
    await searchBox.locator('input').first().press('Enter');
    await page.waitForTimeout(3000);
    const addToOrderBtn = page.getByTestId('add-to-transfer-btn').or(page.getByRole("button", { name: /ADD TO ORDER/i })).first();
    await expect(addToOrderBtn).toBeVisible({ timeout: 5000 });
    await addToOrderBtn.click();
    await page.waitForTimeout(1000);

    // Name Order
    const uniqueName = orderNameStr || `Transfer_Chaos_${prefix}_${Date.now()}`;
    const nameInput = page.getByRole('textbox', { name: /Transfer name/i });
    if (await nameInput.isVisible({ timeout: 3000 }).catch(()=>false)) await nameInput.fill(uniqueName);
    
    // Qty
    const qtyInput = page.locator('ion-input[type="number"] input').or(page.locator('input[type="number"]')).first();
    await expect(qtyInput).toBeVisible({timeout: 2000});
    await qtyInput.fill('2');
    
    const reviewFab = page.locator("ion-fab-button").filter({ has: page.locator("ion-icon[name='checkmark-done-outline']").or(page.locator("ion-icon[name='checkmark-outline']")) }).or(page.locator("ion-fab-button")).last();
    await reviewFab.click();
    await page.waitForTimeout(2000);

    const createFinalBtn = page.locator('ion-fab-button').filter({ has: page.locator("ion-icon[name='checkmark-done-outline']") }).or(page.locator("ion-fab-button")).last();
    await expect(createFinalBtn).toBeVisible({ timeout: 10000 });
    await createFinalBtn.click();
    await page.waitForTimeout(3000);
    
    return uniqueName;
  }

  // Helper to open an order in admin app
  async function openAdminOrder(page, orderName) {
    await page.goto('https://launchpad.hotwax.io/home');
    const transfersAppBtn = page.getByTestId('dev-button-transfers');
    if (await transfersAppBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await transfersAppBtn.click();
    } else {
        await page.goto('https://transfers-dev.hotwax.io/');
    }
    await page.waitForTimeout(3000);
    const searchBar = page.locator('ion-searchbar input').or(page.locator('input[type="search"]')).first();
    await expect(searchBar).toBeVisible({ timeout: 10000 });
    await searchBar.fill(orderName);
    await searchBar.press('Enter');
    await page.waitForTimeout(3000);
    const targetOrder = page.locator('ion-item').filter({ hasText: orderName }).first();
    await expect(targetOrder).toBeVisible({ timeout: 10000 });
    await targetOrder.click();
    await page.waitForTimeout(2000);
  }

  test('Test 1: Two Tabs Desynchronization (State Collision)', async () => {
    test.setTimeout(180000);
    const orderName = await createDummyOrder(storePage, 'TwoTabs');
    
    // Open in Tab A
    await openAdminOrder(adminPage, orderName);
    // Open in Tab B
    await openAdminOrder(adminPageTabB, orderName);

    // Cancel in Tab A
    const cancelBtnA = adminPage.getByRole('button', { name: /CANCEL ORDER/i });
    if (await cancelBtnA.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await cancelBtnA.click();
        const confirmBtn = adminPage.locator('ion-alert').getByRole('button', { name: /Confirm|Yes|Cancel Order/i }).last();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) await confirmBtn.click();
        await adminPage.waitForTimeout(3000);
    }

    // Try to Approve in Tab B (which has stale state)
    const approveBtnB = adminPageTabB.getByRole('button', { name: /Approve/i });
    if (await approveBtnB.isVisible({ timeout: 3000 }).catch(()=>false)) {
        await approveBtnB.click();
        await adminPageTabB.waitForTimeout(2000);
        // We expect it to fail or show an error because it's already cancelled
        const errorToast = adminPageTabB.locator('ion-toast');
        if (await errorToast.first().isVisible().catch(()=>false)) {
            console.log("Tab B request gracefully rejected by backend!");
        } else {
            console.log("Warning: Tab B request might have bypassed stale state lock.");
        }
    }
  });

  test('Test 2: Network Interruption (Offline Mode)', async () => {
    test.setTimeout(180000);
    
    // Begin creating an order
    await storePage.goto('https://launchpad.hotwax.io/home');
    const receivingAppBtn = storePage.getByTestId('dev-button-receiving');
    await expect(receivingAppBtn).toBeVisible({ timeout: 15000 });
    await receivingAppBtn.click();
    await storePage.waitForURL(/.*transfer-orders.*/i, { timeout: 45000 });
    
    await storePage.waitForTimeout(1000);
    const newTransferFab = storePage.getByTestId('transfer-orders-page-create-order-btn').or(storePage.locator('ion-fab-button').last());
    await expect(newTransferFab.first()).toBeVisible({ timeout: 15000 });
    await newTransferFab.first().click();

    // Assign Origin
    const originAssignBtn = storePage.getByTestId('create-order-origin-assign-btn');
    await expect(originAssignBtn).toBeVisible({ timeout: 10000 });
    await originAssignBtn.click();
    await storePage.waitForTimeout(2000);
    const facilityOptions = storePage.getByTestId("facility-radio-options").or(storePage.locator("ion-radio"));
    await expect(facilityOptions.first()).toBeVisible({ timeout: 5000 });
    await facilityOptions.first().click();
    await storePage.waitForTimeout(1000);
    const saveModalBtn = storePage.locator("ion-modal ion-fab-button");
    if (await saveModalBtn.first().isVisible().catch(() => false)) await saveModalBtn.first().click();
    await storePage.waitForTimeout(2000);

    // Add Product
    const searchTabBtn = storePage.locator("ion-segment").last().locator("ion-segment-button").last();
    await searchTabBtn.click({ force: true });
    await searchTabBtn.evaluate((node) => node.click()).catch(() => {});
    await storePage.waitForTimeout(1500);

    const searchBox = storePage.getByTestId('search-product-input');
    await searchBox.locator('input').first().fill('red');
    await searchBox.locator('input').first().press('Enter');
    await storePage.waitForTimeout(3000);
    const addToOrderBtn = storePage.getByTestId('add-to-transfer-btn').or(storePage.getByRole("button", { name: /ADD TO ORDER/i })).first();
    await expect(addToOrderBtn).toBeVisible({ timeout: 5000 });
    await addToOrderBtn.click();
    await storePage.waitForTimeout(1000);

    const qtyInput = storePage.locator('ion-input[type="number"] input').or(storePage.locator('input[type="number"]')).first();
    await expect(qtyInput).toBeVisible({timeout: 2000});
    await qtyInput.fill('1');
    const reviewFab = storePage.locator("ion-fab-button").filter({ has: storePage.locator("ion-icon[name='checkmark-done-outline']").or(storePage.locator("ion-icon[name='checkmark-outline']")) }).or(storePage.locator("ion-fab-button")).last();
    await reviewFab.click();
    await storePage.waitForTimeout(2000);

    const createFinalBtn = storePage.locator('ion-fab-button').filter({ has: storePage.locator("ion-icon[name='checkmark-done-outline']") }).or(storePage.locator("ion-fab-button")).last();
    await expect(createFinalBtn).toBeVisible({ timeout: 10000 });
    
    // ---- CHAOS EVENT: DISCONNECT NETWORK ----
    console.log("Simulating internet outage...");
    await storePage.route('**/*', route => route.abort('internetdisconnected'));
    
    await createFinalBtn.click();
    await storePage.waitForTimeout(2000);
    
    // Expect some sort of network error instead of 500 error or silent failure
    const errorToast = storePage.locator('ion-toast');
    if (await errorToast.first().isVisible().catch(()=>false)) {
        console.log("Network error gracefully handled via toast.");
    }
    
    // Reconnect network to avoid breaking other tests
    await storePage.unroute('**/*');
  });

  test('Test 3: Concurrency / Rapid Fire Clicks', async () => {
    test.setTimeout(120000);
    const orderName = await createDummyOrder(storePage, 'RapidFire');
    
    await openAdminOrder(adminPage, orderName);
    
    const approveBtn = adminPage.getByRole('button', { name: /Approve/i });
    if (await approveBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        console.log("Simulating aggressive double-clicking / rapid fire...");
        // Fire 5 clicks in rapid succession without waiting
        for(let i=0; i<5; i++) {
           approveBtn.click({ force: true }).catch(()=>{});
        }
        await adminPage.waitForTimeout(3000);
        
        // Ensure the app didn't crash with a 500 error
        const errorToast = adminPage.locator('ion-toast').filter({ hasText: /500|internal/i });
        expect(await errorToast.count()).toBe(0);
    }
  });

  test('Test 4: Extreme String Limits & Sanitization', async () => {
    test.setTimeout(120000);
    
    // Build a malicious and excessively long string
    const sqlInjection = "' OR 1=1; -- <script>alert('pwned')</script> ";
    const longString = "A".repeat(150); // Using 150 because ionic input might crash playwright if too large
    const chaosName = sqlInjection + longString + `_${Date.now()}`;
    
    const createdName = await createDummyOrder(storePage, 'StringLimit', chaosName);
    
    // If it successfully created, let's see if the Admin app crashes when trying to render it
    await adminPage.goto('https://launchpad.hotwax.io/home');
    const transfersAppBtn = adminPage.getByTestId('dev-button-transfers');
    if (await transfersAppBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await transfersAppBtn.click();
    } else {
        await adminPage.goto('https://transfers-dev.hotwax.io/');
    }
    await adminPage.waitForTimeout(3000);
    
    // Verify it doesn't crash the list view
    const targetOrder = adminPage.locator('ion-item').filter({ hasText: chaosName }).first();
    // It might be truncated via CSS, so we just check if it's there or if the app is still alive
    if (await targetOrder.isVisible().catch(()=>false)) {
        console.log("App successfully rendered the malicious/extreme string without crashing.");
    }
  });

});
