import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class PendingReviewDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded(countName: string) {
    await expect(
      this.page
        .locator("h1, ion-title, ion-card-title")
        .filter({ hasText: this.exactTextMatcher(countName) })
        .first()
    ).toBeVisible({
      timeout: 20_000,
    });
  }

  // --- OVERVIEW ---
  async getCountId() {
    const idElem = this.page
      .locator("ion-label, span, div")
      .filter({ hasText: /^M\d{5,}$/ })
      .first();
    return (await idElem.isVisible()) ? await idElem.textContent() : null;
  }

  async getAssignedFacility() {
    const chip = this.page.locator("ion-chip").first();
    return (await chip.isVisible())
      ? ((await chip.textContent()) || "").trim()
      : "";
  }

  async getStartDateTime() {
    const item = this.page
      .locator("ion-item")
      .filter({ hasText: /Start Date/i })
      .first();
    return (await item.isVisible())
      ? ((await item.textContent()) || "").replace("Start Date", "").trim()
      : "";
  }

  async getDueDateTime() {
    const item = this.page
      .locator("ion-item")
      .filter({ hasText: /Due Date/i })
      .first();
    return (await item.isVisible())
      ? ((await item.textContent()) || "").replace("Due Date", "").trim()
      : "";
  }

  async getFirstItemCounted() {
    const item = this.page
      .locator("ion-item")
      .filter({ hasText: /First item counted/i })
      .first();
    return (await item.isVisible())
      ? ((await item.textContent()) || "")
          .replace("First item counted", "")
          .trim()
      : "";
  }

  async getLastItemCounted() {
    const item = this.page
      .locator("ion-item")
      .filter({ hasText: /Last item counted/i })
      .first();
    return (await item.isVisible())
      ? ((await item.textContent()) || "")
          .replace("Last item counted", "")
          .trim()
      : "";
  }

  // --- REVIEW PROGRESS ---
  async getReviewProgress() {
    const progressElem = this.page.locator("text=/items complete/i").first();
    return (await progressElem.isVisible())
      ? await progressElem.textContent()
      : null;
  }

  async getOverallVariance() {
    const varianceElem = this.page
      .locator("text=/Overall variance/i")
      .locator("..")
      .first();
    return (await varianceElem.isVisible())
      ? await varianceElem.textContent()
      : null;
  }

  // --- CONFIGURATION & FILTERS ---
  async selectStatusFilter(status: string) {
    const select = this.page
      .locator("ion-item")
      .filter({ hasText: "Status" })
      .locator("ion-select, button")
      .first();
    await select.click();
    await this.page.waitForTimeout(500);
    const option = this.page
      .locator("ion-popover, ion-alert")
      .locator("ion-radio, button")
      .filter({ hasText: new RegExp(`^\\s*${status}\\s*$`, "i") })
      .first();
    await option.click();
    await this.page
      .locator("ion-popover, ion-alert")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async selectComplianceFilter(compliance: string) {
    const select = this.page
      .locator("ion-item")
      .filter({ hasText: "Compliance" })
      .locator("ion-select, button")
      .first();
    await select.click();
    await this.page.waitForTimeout(500);
    const option = this.page
      .locator("ion-popover, ion-alert")
      .locator("ion-radio, button")
      .filter({ hasText: new RegExp(`^\\s*${compliance}\\s*$`, "i") })
      .first();
    await option.click();
    await this.page
      .locator("ion-popover, ion-alert")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async configureThreshold(unit: "Units" | "Percent" | "Cost", value: number) {
    const select = this.page
      .locator("ion-item")
      .filter({ hasText: "Compliance" })
      .locator("ion-select, button")
      .first();
    await select.click();
    await this.page.waitForTimeout(500);
    const configOption = this.page
      .locator("ion-popover, ion-alert")
      .locator("ion-item, button")
      .filter({ hasText: /Configure threshold/i })
      .first();
    await configOption.click();
    await this.page.waitForTimeout(1000);

    // Assume a modal/alert opens
    const modal = this.page.locator("ion-modal, ion-alert").last();
    // Select unit
    const unitSelect = modal.locator("ion-select").first();
    await unitSelect.click();
    await this.page.waitForTimeout(500);
    await this.page
      .locator("ion-popover, ion-alert")
      .locator("ion-radio")
      .filter({ hasText: new RegExp(unit, "i") })
      .first()
      .click();
    await this.page.waitForTimeout(500);

    // Enter value
    const input = modal.locator("input").first();
    await input.fill(value.toString());

    // Save
    const saveBtn = modal
      .locator("button")
      .filter({ hasText: /Save|OK|Confirm|Apply/i })
      .first();
    await saveBtn.click();
    await modal.waitFor({ state: "hidden" }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  // --- PRODUCT ROWS & SEARCH ---
  async searchProduct(searchValue: string) {
    const searchInput = this.page
      .locator('ion-searchbar input[type="search"]')
      .first();
    await searchInput.waitFor({ state: "visible" });
    await searchInput.fill(searchValue);
    await searchInput.press("Enter");
    await this.wait(1_500);
  }

  async clearProductSearch() {
    const searchInput = this.page
      .locator('ion-searchbar input[type="search"]')
      .first();
    await searchInput.fill("");
    await searchInput.press("Enter");
    await this.wait(1_500);
  }

  private productRow(identifier: string) {
    return this.page
      .getByTestId("pending-review-detail-item-header")
      .filter({ hasText: new RegExp(this.escapeRegex(identifier), "i") })
      .first();
  }

  async getProductDetails(identifier: string) {
    const row = this.productRow(identifier);
    await row.waitFor({ state: "visible" });

    const text = (await row.textContent()) || "";

    const quantityMatch = text.match(/([\d-]+)\/([\d-]+)\s*counted\/systemic/i);
    const countedQuantity = quantityMatch?.[1] || null;
    const systemicQuantity = quantityMatch?.[2] || null;

    const varianceMatch = text.match(/([\d-]+)\s*variance/i);
    const variance = varianceMatch?.[1] || null;

    let status = "Open";
    if (text.match(/Accepted/i)) status = "Accepted";
    if (text.match(/Rejected/i)) status = "Rejected";

    return {
      countedQuantity:
        countedQuantity === "-" ? null : parseInt(countedQuantity || "0", 10),
      systemicQuantity:
        systemicQuantity === "-" ? null : parseInt(systemicQuantity || "0", 10),
      variance: variance === "-" ? null : parseInt(variance || "0", 10),
      status,
      rawText: text,
    };
  }

  async expectProductStatus(
    identifier: string,
    expectedStatus: "Open" | "Accepted" | "Rejected"
  ) {
    const row = this.productRow(identifier);
    if (expectedStatus === "Open") {
      await expect(
        row.getByRole("button", { name: /accept/i }).first()
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        row.getByRole("button", { name: /reject/i }).first()
      ).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(row).toContainText(expectedStatus, { timeout: 15_000 });
      await expect(row.getByRole("button", { name: /accept/i })).toBeHidden({
        timeout: 5_000,
      });
    }
  }

  async acceptProduct(identifier: string) {
    const row = this.productRow(identifier);
    const acceptBtn = row.locator("ion-button", { hasText: /accept/i }).first();
    await acceptBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async rejectProduct(identifier: string) {
    const row = this.productRow(identifier);
    const rejectBtn = row.locator("ion-button", { hasText: /reject/i }).first();
    await rejectBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async selectProductCheckbox(identifier: string) {
    const row = this.productRow(identifier);
    const checkbox = row
      .getByTestId("pending-review-detail-item-checkbox")
      .first();
    await checkbox.click();
    await this.page.waitForTimeout(500);
  }

  // --- BULK ACTIONS ---
  async bulkAccept() {
    const footer = this.page.locator("ion-footer");
    const acceptBtn = footer
      .locator("ion-button", { hasText: /accept/i })
      .first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async bulkReject() {
    const footer = this.page.locator("ion-footer");
    const rejectBtn = footer
      .locator("ion-button", { hasText: /reject/i })
      .first();
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async acceptFirstItem() {
    const acceptButton = this.page
      .locator(".list-item, ion-item")
      .locator('ion-button[color="success"], ion-button', {
        hasText: /accept/i,
      })
      .first();
    await expect(acceptButton).toBeVisible({ timeout: 30_000 });
    await acceptButton.scrollIntoViewIfNeeded().catch(() => {});
    await acceptButton.click();
  }

  async closeCount(options?: { action: "accept_all" | "reject_all" }) {
    const closeButton = this.page
      .getByRole("button", { name: /^close$/i })
      .or(this.page.locator("ion-button", { hasText: /^close$/i }))
      .first();
    await expect(closeButton).toBeVisible({ timeout: 15_000 });
    await closeButton.click();

    // The modal asks to accept all or reject all
    if (options) {
      const modal = this.page
        .locator("ion-modal, ion-alert, .alert-wrapper")
        .last();
      await modal.waitFor({ state: "visible" });

      if (options.action === "accept_all") {
        const acceptRadio = modal
          .locator("ion-radio, button")
          .filter({ hasText: /Accept all/i })
          .first();
        if (await acceptRadio.isVisible()) await acceptRadio.click();
      } else if (options.action === "reject_all") {
        const rejectRadio = modal
          .locator("ion-radio, button")
          .filter({ hasText: /Reject all/i })
          .first();
        if (await rejectRadio.isVisible()) await rejectRadio.click();
      }

      // Check for Confirm button (if there are unreviewed items)
      let confirmButton = modal
        .locator("ion-button, button")
        .filter({ hasText: /^Confirm$/i })
        .first();

      // If all items were reviewed, it might show just "Close Count" or similar
      if (!(await confirmButton.isVisible().catch(() => false))) {
        confirmButton = modal
          .locator("ion-button, button")
          .filter({ hasText: /Close/i })
          .first();
      }

      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
      }

      await modal.waitFor({ state: "hidden" }).catch(() => {});
      return;
    }

    // Fallback to legacy flow
    const confirmButton = this.page
      .locator(".alert-button-group button")
      .filter({ hasText: /^Confirm$/i })
      .first();

    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
      return;
    }

    const bulkCloseButton = this.page.getByTestId(
      "pending-review-detail-bulk-close-btn"
    );
    if (await bulkCloseButton.isVisible().catch(() => false)) {
      await bulkCloseButton.click();
      return;
    }

    const bulkConfirmButton = this.page.getByTestId(
      "pending-review-detail-bulk-close-confirm-btn"
    );
    if (await bulkConfirmButton.isVisible().catch(() => false)) {
      await bulkConfirmButton.click();
      return;
    }

    throw new Error(
      "Pending review close flow did not expose a close confirmation action"
    );
  }
}
