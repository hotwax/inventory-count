import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test("pending review details", async ({ page }) => {
  fs.mkdirSync(path.join(process.cwd(), "screenshots"), { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto(
    "https://launchpad.hotwax.io/login?isLoggedOut=true&redirectUrl=https://inventorycount-dev.hotwax.io/login"
  );

  await page.locator("#ion-input-0").fill("dev-oms");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("textbox", { name: "Username" }).fill("hotwax.user");
  await page.getByRole("textbox", { name: "Password" }).fill("hotwax@786");
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForTimeout(1000);

  await page.locator('ion-item[routerlink="/pending-review"]').click();

  const listItem = page.locator(".list-item").first();
  await expect(listItem).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "screenshots/PendingReviewList.png" });

  await listItem.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/PendingReviewDetail.png" });

  await page.locator('ion-item[routerlink="/closed"]').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/ClosedList.png" });

  await page.getByRole("button", { name: /Export history/i }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/ExportHistory.png" });
});
