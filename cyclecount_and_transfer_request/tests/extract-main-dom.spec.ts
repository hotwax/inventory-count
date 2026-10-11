
import { test, expect } from "@playwright/test";

test("Extract DOM for Transfer Orders Main Page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "playwright/.auth/storeUser.json" });
    const page = await context.newPage();
    
    await page.goto("https://launchpad.hotwax.io/home");
    const receivingAppBtn = page.getByTestId("dev-button-receiving");
    await expect(receivingAppBtn).toBeVisible({ timeout: 15000 });
    await receivingAppBtn.click();
    await page.waitForURL(/.*transfer-orders.*/i, { timeout: 15000 });
    
    await page.waitForTimeout(2000);

    // Save screenshot
    await page.screenshot({ path: "transfer-orders-main-page.png" });

    // Save outerHTML of the ion-page
    const html = await page.locator(".ion-page:not(.ion-page-hidden)").last().evaluate((el) => el.outerHTML);
    const fs = require("fs");
    fs.writeFileSync("transfer-orders-main-page.html", html);
    
    await context.close();
});
