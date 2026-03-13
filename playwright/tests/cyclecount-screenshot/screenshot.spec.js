import { test, expect } from "@playwright/test";
// Gives access to Playwright test runner and page object comes from here

import fs from "fs";
import path from "path";

import { inventoryCountPages } from "./pagesURL";
// Imports array of page details from pagesURL.js

import { captureScreenshot } from "./screenshotHelper";
// Imports reusable function from screenshotHelper.js

test.setTimeout(180000);

test("Login and capture screenshots for Inventory Count pages", async ({
  page,
}) => {
  // Utility function (kept as you wrote, even if not used right now)
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create screenshots folder if it does not exist
  fs.mkdirSync(path.join(process.cwd(), "screenshots"), { recursive: true });

  // Set browser viewport size
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate to login page
  await page.goto(
    "https://launchpad.hotwax.io/login?isLoggedOut=true&redirectUrl=https://inventorycount-dev.hotwax.io/login"
  );

  // ion-input-0

  await page.locator("#ion-input-0").fill("dev-oms");
  await page.getByRole("button", { name: "Next" }).click();

  // Enter login credentials
  // await page.locator("#ion-input-0").fill("hotwax.user");
  await page.getByRole("textbox", { name: "Username" }).fill("hotwax.user");
  await page.getByRole("textbox", { name: "Password" }).fill("hotwax@786");
  // await page.locator("#ion-input-1").fill("hotwax@786");
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for UI stability
  await page.waitForTimeout(1000);

  // Click login button if required
  // await page.locator("button[type='submit']").click();

  // Wait until login and redirects are completed
  await page.waitForLoadState("networkidle");

  await page.waitForTimeout(5000);
  // Loop through all Inventory Count pages and capture screenshots
  for (const pageData of inventoryCountPages) {
    console.log(`Capturing screenshot for: ${pageData.pageName}`);

    await captureScreenshot(page, pageData.url, pageData.screenshotName);
  }
});
