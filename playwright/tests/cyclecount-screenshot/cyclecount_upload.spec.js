import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test("test", async ({ page }) => {
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  await page.waitForURL(/inventorycount-dev\.hotwax\.io/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(5000);
  await page.goto("https://inventorycount-dev.hotwax.io/bulkUpload", {
    waitUntil: "networkidle",
  });

  await page
    .locator("input#inventoryCountInputFile")
    .waitFor({ state: "attached" });

  const csvPath = path.join(
    process.cwd(),
    "playwright",
    "tests",
    "cyclecount-screenshot",
    "data.csv"
  );
  const csvLines = fs.readFileSync(csvPath, "utf-8").trim().split(/\r?\n/);
  const toCells = (line) =>
    (line.match(/"([^"]*)"/g) || []).map((s) => s.replace(/"/g, ""));
  const headers = toCells(csvLines[0] || "");
  const values = toCells(csvLines[1] || "");
  const csvRow = Object.fromEntries(
    headers.map((h, i) => [h, values[i] ?? ""])
  );
  const oldCsvPath = path.join(
    process.cwd(),
    "playwright",
    "tests",
    "cyclecount-screenshot",
    "old_data.csv"
  );
  const oldCsvLines = fs
    .readFileSync(oldCsvPath, "utf-8")
    .trim()
    .split(/\r?\n/);
  const oldHeaders = toCells(oldCsvLines[0] || "");
  const oldValues = toCells(oldCsvLines[1] || "");
  const oldRow = Object.fromEntries(
    oldHeaders.map((h, i) => [h, oldValues[i] ?? ""])
  );
  const countImportName = oldRow["countImportName"];

  await page.setInputFiles("input#inventoryCountInputFile", csvPath);
  await expect(page.getByTestId("bulk-upload-submit-btn")).toBeEnabled({
    timeout: 15000,
  });

  // Map uploaded CSV columns to required fields
  const pickOption = async (fieldKey, optionText) => {
    const select = page.getByTestId(
      `bulk-upload-required-field-select-${fieldKey}`
    );

    await select.waitFor({ state: "visible" });
    await select.click({ force: true });

    const popover = page.locator("ion-select-popover");
    await popover.waitFor({ state: "visible" });

    const option = popover
      .getByRole("radio", {
        name: new RegExp(`^${escapeRegex(optionText)}\\s*$`, "i"),
      })
      .first();

    await option.waitFor({ state: "visible" });
    await option.click();

    await popover.waitFor({ state: "detached" });

    const selected = await select.evaluate((el) => el.value?.toString().trim());
    await expect(selected).toBe(optionText.trim());
  };

  await page.waitForTimeout(5000);

  await pickOption("countImportName", "countImportName");
  await pickOption("productSku", "idValue");
  await pickOption("purposeType", "purposeType");
  await pickOption("facility", "FACILITY ID");
  await pickOption("estimatedCompletionDate", "estimatedCompletionDate");
  await pickOption("estimatedStartDate", "estimatedStartDate");

  await page.screenshot({ path: "screenshots/FilaUploaded.png" });

  await page.getByRole("button", { name: /^Submit$/i }).click();

  // Wait briefly after submit before moving to Assigned
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "screenshots/SubmissionComplete.png" });

  await page.locator('ion-item[routerlink="/assigned"]').click();

  await page.waitForTimeout(2000);

  await page.screenshot({ path: "screenshots/AssignedList.png" });
  console.log("countImportName from CSV:", countImportName);
  await page.waitForTimeout(2000);

  // Search for the countImportName and open its details
  const searchInput = page.locator('ion-searchbar input[type="search"]');
  await searchInput.fill(countImportName);
  await searchInput.press("Enter");
  await page.waitForTimeout(1000);

  const resultCard = page
    .locator(".list-item ion-label")
    .filter({ hasText: countImportName })
    .first();

  await expect(resultCard).toBeVisible({ timeout: 10000 });
  await resultCard.click();

  await page
    .waitForLoadState("networkidle", { timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/AssignedDetail.png" });
});

// https://launchpad.hotwax.io/login?isLoggedOut=true&redirectUrl=https://inventorycount-dev.hotwax.io/login
