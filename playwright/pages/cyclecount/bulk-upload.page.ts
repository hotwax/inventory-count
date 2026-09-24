import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";
import { buildCycleCountUrl } from "./config";

export class BulkUploadPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.gotoUrl(buildCycleCountUrl("/bulkUpload"));
    // Wait for the main elements to load. Sometimes it loads directly to the history list.
    await Promise.race([
      this.page
        .locator("input#inventoryCountInputFile")
        .waitFor({ state: "attached", timeout: 30_000 }),
      this.page
        .locator(".system-message-section")
        .waitFor({ state: "visible", timeout: 30_000 }),
    ]);
  }

  async uploadFile(csvPath: string) {
    await this.page.setInputFiles("input#inventoryCountInputFile", csvPath);
    await this.expectToast(/File uploaded successfully/i);
    await expect(
      this.page.getByRole("button", { name: /^Count name\b/i })
    ).toBeVisible({
      timeout: 15_000,
    });
  }

  private async pickOption(labelText: string, optionText: string) {
    const select = this.page.getByRole("button", {
      name: new RegExp(`^${this.escapeRegex(labelText)}\\b`, "i"),
    });

    await select.waitFor({ state: "visible" });
    await expect(select).toBeEnabled({ timeout: 15_000 });
    await select.click({ force: true });

    const option = this.page
      .getByRole("radio", {
        name: new RegExp(`^${this.escapeRegex(optionText)}\\s*$`, "i"),
      })
      .first();

    await option.waitFor({ state: "visible" });
    await option.click({ force: true });

    const anyPopover = this.page.locator("ion-popover.select-popover");
    await anyPopover.waitFor({ state: "hidden" });
    // Add a tiny buffer for the animation to fully resolve before the next click
    await this.page.waitForTimeout(500);
    await expect(select).toHaveAttribute(
      "aria-label",
      new RegExp(this.escapeRegex(optionText.trim()), "i")
    );
  }

  async mapRequiredFields(options: { isHardCount?: boolean } = {}) {
    await this.page
      .getByRole("button", { name: /^Count name\b/i })
      .waitFor({ state: "visible", timeout: 30_000 });
    await this.pickOption("Count name", "countImportName");

    if (options.isHardCount) {
      await this.pickOption("Product SKU", "Skip");
    } else {
      await this.pickOption("Product SKU", "idValue");
    }

    await this.pickOption("Count Type", "purposeType");
    await this.pickOption("Facility ID", "externalFacilityId");
    await this.pickOption("Due date", "estimatedCompletionDate");
    await this.pickOption("Start date", "estimatedStartDate");
  }

  async submit() {
    await this.page.getByRole("button", { name: /^Submit$/i }).click();
  }

  async expectToast(textOrRegex: string | RegExp) {
    const toastMessage = this.page
      .locator("ion-toast")
      .locator(".toast-message")
      .filter({ hasText: textOrRegex })
      .first();
    await expect(toastMessage).toBeVisible({ timeout: 10_000 });
  }

  async waitForProcessedUpload(uploadFileName: string, maxChecks = 35) {
    const pollIntervalMs = 15_000;
    const itemList = this.page.locator(".system-message-section .item");

    for (let attempt = 1; attempt <= maxChecks; attempt += 1) {
      if (this.page.url().includes("login")) {
        throw new Error("Lost session - redirected to login during polling!");
      }
      // The page should auto-refresh, or we can reload if needed.
      // But instead of full reload, we can just check the status.
      // Sometimes it requires a page reload to see the update in HotWax apps.
      await this.page.reload();
      await this.page.waitForTimeout(2_000);

      const targetItem = itemList
        .filter({
          has: this.page.locator("ion-label", { hasText: uploadFileName }),
        })
        .first();

      await expect(targetItem).toBeVisible({ timeout: 15_000 });

      const statusText = (
        (await targetItem.locator("ion-note").textContent()) || ""
      ).trim();

      if (/processed/i.test(statusText)) {
        // Remove the 1 min wait if the user wants to proceed immediately,
        // we'll rely on the assigned page to poll for sync.
        return;
      }

      if (!/pending|processing/i.test(statusText)) {
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

      await this.page.waitForTimeout(pollIntervalMs);
    }
  }

  async waitForErrorUpload(uploadFileName: string, maxChecks = 10) {
    const pollIntervalMs = 30_000;
    const itemList = this.page.locator(".system-message-section .item");

    for (let attempt = 1; attempt <= maxChecks; attempt += 1) {
      await this.open();
      await this.wait(2_000);

      const targetItem = itemList
        .filter({
          has: this.page.locator("ion-label", { hasText: uploadFileName }),
        })
        .first();

      await expect(targetItem).toBeVisible({ timeout: 15_000 });

      const statusText = (
        (await targetItem.locator("ion-note").textContent()) || ""
      ).trim();

      if (/error/i.test(statusText)) return;

      if (!/pending|processing/i.test(statusText)) {
        throw new Error(
          `Upload status became "${statusText}" instead of error for ${uploadFileName}`
        );
      }

      if (attempt === maxChecks) {
        throw new Error(
          `Status did not change to error after ${maxChecks} attempts (every ${
            pollIntervalMs / 1000
          }s). Last seen status: "${statusText}"`
        );
      }

      await this.wait(pollIntervalMs);
    }
  }

  async openActionPopover(uploadFileName: string) {
    const itemList = this.page.locator(".system-message-section .item");
    const targetItem = itemList
      .filter({
        has: this.page.locator("ion-label", { hasText: uploadFileName }),
      })
      .first();

    await targetItem.locator(".system-message-action ion-button").click();
    await this.page.locator("ion-popover").waitFor({ state: "visible" });
  }

  async viewError(uploadFileName: string) {
    await this.openActionPopover(uploadFileName);
    await this.page.locator("ion-item", { hasText: /View error/i }).click();
    await this.page
      .locator("ion-modal.show-modal")
      .waitFor({ state: "visible" })
      .catch(() =>
        this.page.locator("ion-modal").last().waitFor({ state: "visible" })
      );
  }

  async expectErrorModalMessage(msg: RegExp | string) {
    const errorMsg = this.page
      .locator('[data-testid="bulk-upload-error-modal-msg"]')
      .last();
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });
    await expect(errorMsg).toHaveText(msg, { timeout: 10_000 });
  }

  async closeErrorModal() {
    await this.page
      .locator("ion-modal ion-button")
      .filter({ has: this.page.locator('ion-icon[aria-label="close"]') })
      .first()
      .click();
    await this.page.locator("ion-modal").waitFor({ state: "hidden" });
  }

  async createCycleCount(
    csvPath: string,
    uploadFileName: string,
    options: { isHardCount?: boolean } = {}
  ) {
    await this.uploadFile(csvPath);
    await this.mapRequiredFields(options);
    await this.submit();

    await expect(
      this.page
        .locator(".system-message-section .item", { hasText: uploadFileName })
        .first()
    ).toBeVisible({ timeout: 30_000 });
    await this.waitForProcessedUpload(uploadFileName);
  }
}
