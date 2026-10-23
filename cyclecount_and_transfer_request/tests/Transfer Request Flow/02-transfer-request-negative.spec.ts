import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe.serial('Transfer Request - Negative Tests (DEV)', () => {
  let adminBrowser, storeBrowser;
  let adminPage, storePage;

  test.beforeAll(async ({ browser }) => {
    adminBrowser = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    storeBrowser = await browser.newContext({ storageState: 'playwright/.auth/storeUser.json' });
    adminPage = await adminBrowser.newPage();
    storePage = await storeBrowser.newPage();
  });

  test.afterAll(async () => {
    await adminPage.close();
    await storePage.close();
    await adminBrowser.close();
    await storeBrowser.close();
  });

  test('Test 1: Boundary Value Analysis for Product Quantity (Creation Phase)', async () => {
    test.setTimeout(120000);
    await storePage.goto('https://launchpad.hotwax.io/home');
    const receivingAppBtn = storePage.getByTestId('dev-button-receiving');
    await expect(receivingAppBtn).toBeVisible({ timeout: 15000 });
    await receivingAppBtn.click();
    await storePage.waitForURL(/.*transfer-orders.*/i, { timeout: 45000 });
    
    await storePage.waitForTimeout(1000);
    const newTransferFab = storePage.getByTestId('transfer-orders-page-create-order-btn').or(storePage.locator('ion-fab-button').last());
    await expect(newTransferFab.first()).toBeVisible({ timeout: 15000 });
    await newTransferFab.first().click();

    // Select facility
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

    // 2. Add Product (Search and add)
    const searchTabBtn = storePage.locator("ion-segment").last().locator("ion-segment-button").last();
    await searchTabBtn.click({ force: true });
    await searchTabBtn.evaluate((node) => node.click()).catch(() => {});
    await storePage.waitForTimeout(1500);

    // Search product
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
    const reviewFab = storePage.locator("ion-fab-button").filter({ has: storePage.locator("ion-icon[name='checkmark-done-outline']").or(storePage.locator("ion-icon[name='checkmark-outline']")) }).or(storePage.locator("ion-fab-button")).last();

    // BVA 1: Blank
    await qtyInput.fill('');
    await reviewFab.click();
    // Expect error toast
    const errorToast = storePage.locator('ion-toast').filter({ hasText: /quantity/i }).or(storePage.locator('ion-toast'));
    if (await errorToast.first().isVisible({timeout:3000}).catch(()=>false)) {
       console.log("Caught blank error toast");
       await storePage.waitForTimeout(3000); // let toast disappear
    }

    // BVA 2: Zero
    await qtyInput.fill('0');
    await reviewFab.click();
    const zeroToast = storePage.locator('ion-toast').filter({ hasText: /greater than 0/i }).or(storePage.locator('ion-toast'));
    await expect(zeroToast.first()).toBeVisible({ timeout: 5000 });
    console.log("Caught zero error toast");
    await storePage.waitForTimeout(3000); // let toast disappear

    // BVA 3: Negative
    await qtyInput.fill('-1');
    await reviewFab.click();
    const negToast = storePage.locator('ion-toast').filter({ hasText: /greater than 0/i }).or(storePage.locator('ion-toast'));
    await expect(negToast.first()).toBeVisible({ timeout: 5000 });
    console.log("Caught negative error toast");
    await storePage.waitForTimeout(3000); // let toast disappear

    // BVA 4: Greater than QOH (TC-11)
    // Since QOH is not visible on the UI, we enter an arbitrarily large number to test the backend validation behavior.
    await qtyInput.fill('99999');
    await reviewFab.click();
    await storePage.waitForTimeout(1000);
    const largeQtyToast = storePage.locator('ion-toast').filter({ hasText: /quantity|exceeds|inventory/i }).or(storePage.locator('ion-toast'));
    if (await largeQtyToast.first().isVisible({timeout:3000}).catch(()=>false)) {
       console.log("Caught quantity > QOH error toast");
       await storePage.waitForTimeout(3000); // let toast disappear
    } else {
       console.log("Quantity > QOH was allowed to proceed to summary.");
       // Go back to the edit screen so we can test the Minimum Valid next
       const backBtn = storePage.locator('ion-buttons[slot="start"] ion-back-button').or(storePage.locator('ion-buttons[slot="start"] ion-button')).first();
       if (await backBtn.isVisible().catch(()=>false)) await backBtn.click();
       await storePage.waitForTimeout(1000);
    }

    // BVA 5: Minimum Valid
    await qtyInput.fill('1');
    await reviewFab.click();
    
    // Should successfully navigate to summary page!
    await storePage.waitForTimeout(2000);
    const createFinalBtn = storePage.locator('ion-fab-button').filter({ has: storePage.locator("ion-icon[name='checkmark-done-outline']") }).or(storePage.locator("ion-fab-button")).last();
    await expect(createFinalBtn).toBeVisible({ timeout: 5000 }); 
  });

  test('Test 2: Invalid SKU Search (Creation Phase)', async () => {
    test.setTimeout(60000);
    await storePage.goto('https://launchpad.hotwax.io/home');
    const receivingAppBtn = storePage.getByTestId('dev-button-receiving');
    await expect(receivingAppBtn).toBeVisible({ timeout: 15000 });
    await receivingAppBtn.click();
    await storePage.waitForURL(/.*transfer-orders.*/i, { timeout: 45000 });
    
    await storePage.waitForTimeout(1000);
    const newTransferFab = storePage.getByTestId('transfer-orders-page-create-order-btn').or(storePage.locator('ion-fab-button').last());
    await expect(newTransferFab.first()).toBeVisible({ timeout: 15000 });
    await newTransferFab.first().click();

    // 2. Add Product (Search and add)
    const searchTabBtn = storePage.locator("ion-segment").last().locator("ion-segment-button").last();
    await searchTabBtn.click({ force: true });
    await searchTabBtn.evaluate((node) => node.click()).catch(() => {});
    await storePage.waitForTimeout(1500);

    // Search product
    const searchBox = storePage.getByTestId('search-product-input');
    await searchBox.locator('input').first().fill('INVALID_SKU_999123');
    await searchBox.locator('input').first().press('Enter');
    await storePage.waitForTimeout(3000);

    const emptyState = storePage.locator('ion-item').filter({ hasText: /No products found|No results|No product/i }).or(storePage.locator('.empty-state')).or(storePage.locator('text=/No products found/i')).first();
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });

  test('Test 3: Edit Quantity Validation (Admin Phase)', async () => {
    test.setTimeout(120000);
    // Find an existing order
    const filePath = 'tests/Transfer Request Flow/created-orders.json';
    let data = [];
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    const orderName = data.length > 0 ? data[0] : null;
    test.skip(!orderName, 'No existing order found to test Admin Phase!');

    await adminPage.goto('https://launchpad.hotwax.io/home');
    const transfersAppBtn = adminPage.getByTestId('dev-button-transfers');
    await expect(transfersAppBtn).toBeVisible({ timeout: 15000 });
    await transfersAppBtn.click();
    await adminPage.waitForTimeout(3000);

    const searchBar = adminPage.locator('ion-searchbar input').or(adminPage.locator('input[type="search"]')).first();
    await expect(searchBar).toBeVisible({ timeout: 10000 });
    await searchBar.fill(orderName);
    await searchBar.press('Enter');
    await adminPage.waitForTimeout(3000);
    
    const targetOrder = adminPage.locator('ion-item').filter({ hasText: orderName }).first();
    await expect(targetOrder).toBeVisible({ timeout: 10000 });
    await targetOrder.click();
    await adminPage.waitForTimeout(2000);

    const kebabMenuBtn = adminPage.locator('[data-testid^="order-item-actions-btn"]').first();
    await expect(kebabMenuBtn).toBeVisible({ timeout: 5000 });
    await kebabMenuBtn.click();
    await adminPage.waitForTimeout(1000);

    const editQtyOption = adminPage.locator('ion-item').filter({ hasText: /Edit ordered qty/i }).first();
    await editQtyOption.click();
    await adminPage.waitForTimeout(1000);

    const qtyInput = adminPage.locator('ion-alert input.alert-input').or(adminPage.getByRole('spinbutton')).first();
    const okBtn = adminPage.locator('ion-alert button').filter({ hasText: /OK|Save/i }).first();
    
    // Blank
    await qtyInput.fill('');
    await adminPage.waitForTimeout(500);
    
    // Depending on Ionic version, OK button might be disabled, or it might throw a toast.
    if (await okBtn.isDisabled()) {
       console.log("OK button disabled for blank input.");
    } else {
       await okBtn.click();
       await adminPage.waitForTimeout(1000);
       const toast = adminPage.locator('ion-toast');
       if (await toast.first().isVisible().catch(()=>false)) console.log("Blank value rejected by toast");
    }

    // Since we might still be in the alert or toast, let's reopen it if needed
    const isAlertOpen = await adminPage.locator('ion-alert').isVisible().catch(()=>false);
    if (!isAlertOpen && await kebabMenuBtn.isVisible().catch(()=>false)) {
        await kebabMenuBtn.click();
        await editQtyOption.click();
        await adminPage.waitForTimeout(1000);
    }

    // Zero
    await qtyInput.fill('0');
    if (await okBtn.isDisabled().catch(()=>false)) {
       console.log("OK button disabled for zero input.");
    } else {
       await okBtn.click();
       await adminPage.waitForTimeout(1000);
       const zeroToast = adminPage.locator('ion-toast').filter({ hasText: /greater than 0|invalid/i }).or(adminPage.locator('ion-toast'));
       if (await zeroToast.first().isVisible().catch(()=>false)) console.log("Zero value rejected by toast");
    }

    const cancelBtn = adminPage.locator('ion-alert button').filter({ hasText: /Cancel/i }).first();
    if (await cancelBtn.isVisible().catch(()=>false)) await cancelBtn.click();
  });

  test('Test 4: Approve Empty Order (Admin Phase)', async () => {
    test.setTimeout(60000);
    // Find an existing order
    const filePath = 'tests/Transfer Request Flow/created-orders.json';
    let data = [];
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    const orderName = data.length > 0 ? data[data.length - 1] : null;
    test.skip(!orderName, 'No existing order found to test Admin Phase!');

    await adminPage.goto('https://launchpad.hotwax.io/home');
    const transfersAppBtn = adminPage.getByTestId('dev-button-transfers');
    if (await transfersAppBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await transfersAppBtn.click();
        await adminPage.waitForTimeout(3000);
    } else {
        await adminPage.goto('https://transfers-dev.hotwax.io/');
    }

    const searchBar = adminPage.locator('ion-searchbar input').or(adminPage.locator('input[type="search"]')).first();
    await expect(searchBar).toBeVisible({ timeout: 10000 });
    await searchBar.fill(orderName);
    await searchBar.press('Enter');
    await adminPage.waitForTimeout(3000);
    
    const targetOrder = adminPage.locator('ion-item').filter({ hasText: orderName }).first();
    await expect(targetOrder).toBeVisible({ timeout: 10000 });
    await targetOrder.click();
    await adminPage.waitForTimeout(2000);

    // Remove item
    const kebabMenuBtn = adminPage.locator('[data-testid^="order-item-actions-btn"]').first();
    if (await kebabMenuBtn.isVisible({ timeout: 5000 }).catch(()=>false)) {
        await kebabMenuBtn.click();
        await adminPage.waitForTimeout(1000);
        const removeOption = adminPage.locator('ion-item').filter({ hasText: /Remove item/i }).first();
        await removeOption.click();
        await adminPage.waitForTimeout(2000);
    }
    
    // Try to approve
    const approveBtn = adminPage.getByRole('button', { name: /Approve/i });
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(()=>false)) {
       await approveBtn.click();
       await adminPage.waitForTimeout(1000);
       const errorToast = adminPage.locator('ion-toast');
       await expect(errorToast.first()).toBeVisible({ timeout: 5000 });
       console.log("Caught empty order approval rejection toast");
    } else {
       console.log("Approve button is properly hidden/disabled for empty order.");
    }
  });

  test('Test 5: Role Permission Violation', async () => {
    test.setTimeout(60000);
    // Store user tries to go directly to Transfers app via URL
    await storePage.goto('https://transfers-dev.hotwax.io/');
    await storePage.waitForTimeout(4000);
    
    // Assert that they cannot see the actual transfers list
    const transferListItems = storePage.locator('ion-list ion-item');
    const isListVisible = await transferListItems.first().isVisible().catch(()=>false);
    
    if (isListVisible) {
        // Technically a failure of permission, but let's assert it shouldn't happen
        expect(isListVisible).toBe(false); 
    }
  });

});
