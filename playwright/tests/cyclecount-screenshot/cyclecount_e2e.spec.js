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
  const countImportName = csvRow["countImportName"] || "";
  const uploadFileName = path.basename(csvPath);

  await page.setInputFiles("input#inventoryCountInputFile", csvPath);
  await expect(page.getByTestId("bulk-upload-submit-btn")).toBeEnabled({
    timeout: 15000,
  });

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

  await page.waitForTimeout(5000);
  await page.screenshot({ path: "screenshots/SubmissionComplete.png" });

  const pollIntervalMs = 30000;
  const maxChecks = 10; // ~5 minutes
  const itemList = page.locator(".system-message-section .item");

  for (let attempt = 1; attempt <= maxChecks; attempt++) {
    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(2000);

    const targetItem = itemList
      .filter({ has: page.locator("ion-label", { hasText: uploadFileName }) })
      .first();

    await expect(targetItem).toBeVisible({ timeout: 15000 });

    const statusText = (
      (await targetItem.locator("ion-note").textContent()) || ""
    ).trim();

    if (/processed/i.test(statusText)) {
      await page.screenshot({ path: "screenshots/StatusProcessed.png" });
      break;
    }

    if (/pending/i.test(statusText)) {
      // Keep waiting
    } else {
      throw new Error(
        `Upload status became "${statusText}" instead of processed for ${uploadFileName}`
      );
    }

    if (attempt === maxChecks) {
      throw new Error(
        `Status did not change to processed after ${maxChecks} attempts (every ${
          pollIntervalMs / 1000
        }s). Last seen status: "${statusText}"`
      );
    }

    await page.waitForTimeout(pollIntervalMs);
  }

  await page.locator('ion-item[routerlink="/assigned"]').click();
  await page.waitForTimeout(2000);

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
  await page.screenshot({ path: "screenshots/AssignedDetailAfterUpload.png" });

  await page.locator('ion-item[routerlink="/store-permissions"]').click();

  await page.waitForTimeout(2000);

  const storeViewLink = page.locator('ion-item[routerlink="/tabs/count"]');
  await storeViewLink.click();

  const storeCard = page
    .locator("ion-card")
    .filter({
      has: page.locator("ion-card-title", {
        hasText: new RegExp(`^${escapeRegex(countImportName)}\\s*$`, "i"),
      }),
    })
    .first();

  await expect(storeCard).toBeVisible({ timeout: 20000 });
  await storeCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/StoreViewCard.png" });

  const startCountingBtn = storeCard.getByRole("button", {
    name: /start counting/i,
  });

  const sessionInProgress = storeCard
    .locator('ion-item[routerlink*="/session-count-detail"]')
    .filter({ hasText: new RegExp(escapeRegex(countImportName), "i") })
    .filter({ has: storeCard.locator("ion-note", { hasText: /In Progress/i }) })
    .first();

  let startDestination;
  try {
    await startCountingBtn.waitFor({ state: "visible", timeout: 5000 });
    startDestination = startCountingBtn;
  } catch {
    await expect(sessionInProgress).toBeVisible({ timeout: 20000 });
    startDestination = sessionInProgress;
  }

  await startDestination.scrollIntoViewIfNeeded().catch(() => {});
  await startDestination.click();

  await page
    .waitForLoadState("networkidle", { timeout: 15000 })
    .catch(() => {});

  await page.waitForTimeout(2000);

  const startPageButton = page.getByRole("button", {
    name: /^Start counting$/i,
  });
  await startPageButton.waitFor({ state: "visible", timeout: 30000 });
  await startPageButton.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/StartCountingPage.png" });
  await startPageButton.click();

  await page.waitForTimeout(5000);

  const skuFromPage =
    (await page
      .locator(".vue-recycle-scroller__item-view ion-label p.sc-ion-label-md")
      .first()
      .textContent()
      .catch(() => "")) || "";
  const skuValue = skuFromPage.trim();
  if (!skuValue) {
    throw new Error("Could not resolve SKU to scan");
  }
  console.log(skuValue);
  const scanInput = page
    .locator('input#ion-input-14, input[placeholder="Scan a barcode"]')
    .first();
  await scanInput.waitFor({ state: "visible", timeout: 20000 });
  await scanInput.fill(skuValue);
  await scanInput.press("Enter");

  await page.screenshot({ path: "screenshots/ProductScanned.png" });

  await page.waitForTimeout(10000);

  await page.screenshot({ path: "screenshots/ProductScanCompleted.png" });

  const submitBtn = page.locator("ion-button", { hasText: /submit/i }).first();
  await submitBtn.waitFor({ state: "visible", timeout: 30000 });
  await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
  await submitBtn.click();

  await page.waitForTimeout(1000);

  const confirmButton = page
    .locator(".alert-button-group button")
    .filter({ hasText: /^Submit$/i })
    .first();
  await expect(confirmButton).toBeVisible({ timeout: 10000 });
  await confirmButton.click();

  await page.screenshot({ path: "screenshots/CycleSubmited.png" });

  await page.waitForTimeout(5000);

  await page.goBack();

  await page.waitForTimeout(2000);

  const submittedCard = page
    .locator("ion-card")
    .filter({
      has: page.locator("ion-card-title", {
        hasText: new RegExp(`^${escapeRegex(countImportName)}\\s*$`, "i"),
      }),
    })
    .first();

  await expect(submittedCard).toBeVisible({ timeout: 20000 });
  await submittedCard.scrollIntoViewIfNeeded().catch(() => {});
  await expect(
    submittedCard.locator("ion-note", { hasText: /submitted/i })
  ).toBeVisible({ timeout: 10000 });

  const reviewBtn = submittedCard.getByRole("button", {
    name: /review progress and complete/i,
  });
  await reviewBtn.waitFor({ state: "visible", timeout: 15000 });
  await reviewBtn.scrollIntoViewIfNeeded().catch(() => {});
  await reviewBtn.click();

  await page.waitForTimeout(2000);

  // On review page, submit for review
  const submitForReviewBtn = page.getByRole("button", {
    name: /submit for review/i,
  });
  await submitForReviewBtn.waitFor({ state: "visible", timeout: 20000 });
  await submitForReviewBtn.scrollIntoViewIfNeeded().catch(() => {});
  await submitForReviewBtn.click();

  await page.waitForTimeout(2000);

  await page.goto("https://inventorycount-dev.hotwax.io/pending-review");

  await page.waitForTimeout(1000);

  await page.screenshot({ path: "screenshots/PendingReviewPage.png" });

  const pendingSearchInput = page.locator('input[placeholder="Search"]');
  await pendingSearchInput.waitFor({ state: "visible", timeout: 15000 });
  await pendingSearchInput.fill(countImportName);
  await pendingSearchInput.press("Enter");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "screenshots/PendingReviewSearch.png" });

  const listRow = page
    .locator(".list-item")
    .filter({
      hasText: new RegExp(`\\b${escapeRegex(countImportName)}\\b`, "i"),
    })
    .first();
  await expect(listRow).toBeVisible({ timeout: 15000 });
  await listRow.click();

  await page.waitForTimeout(2000);

  const acceptButton = page
    .locator('.count-item-rollup .actions ion-button[color="success"]', {
      hasText: /Accept/i,
    })
    .filter({ hasNot: page.locator("[aria-disabled=true], [disabled]") })
    .first();

  await acceptButton.waitFor({ state: "visible", timeout: 30000 });
  await acceptButton.scrollIntoViewIfNeeded().catch(() => {});
  await acceptButton.click();

  await page.screenshot({ path: "screenshots/PendingReviewAccept.png" });

  await page.waitForTimeout(2000);

  const closeBtn = page.getByRole("button", { name: /^Close$/i });
  await closeBtn.waitFor({ state: "visible", timeout: 15000 });
  await closeBtn.scrollIntoViewIfNeeded().catch(() => {});
  await closeBtn.click();

  await page.waitForTimeout(1000);

  const confirmCloseBtn = page
    .locator(".alert-button-group button")
    .filter({ hasText: /^Confirm$/i })
    .first();
  await expect(confirmCloseBtn).toBeVisible({ timeout: 10000 });
  await confirmCloseBtn.click();

  await page.screenshot({ path: "screenshots/PendingReviewClosed.png" });

  await page.waitForTimeout(1000);

  await page.locator('ion-item[routerlink="/closed"]').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "screenshots/ClosedListing.png" });

  await page.waitForTimeout(2000);

  const closedSearchInput = page
    .locator('.filters ion-searchbar input[placeholder="Search"]')
    .first();
  await closedSearchInput.waitFor({ state: "visible", timeout: 20000 });
  await closedSearchInput.fill(countImportName);
  await closedSearchInput.press("Enter");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/ClosedSearch.png" });

  const closedListRow = page
    .locator(".list-item")
    .filter({
      hasText: new RegExp(`\\b${escapeRegex(countImportName)}\\b`, "i"),
    })
    .first();
  await expect(closedListRow).toBeVisible({ timeout: 15000 });
  await closedListRow.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/ClosedDetail.png" });

  await page.waitForTimeout(2000);
});
