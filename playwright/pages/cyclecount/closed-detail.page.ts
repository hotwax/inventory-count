import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class ClosedDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded(countName: string) {
    await expect(
      this.page
        .locator("h1, ion-title, ion-card-title")
        .filter({ hasText: this.exactTextMatcher(countName) })
        .first()
    ).toBeVisible({ timeout: 20_000 });
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
      .locator(".list-item, ion-item")
      .filter({
        hasText: new RegExp(`\\b${this.escapeRegex(identifier)}\\b`, "i"),
      })
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

  async expandProductSession(identifier: string) {
    const row = this.productRow(identifier);
    await row.click();
    await this.page.waitForTimeout(1000);
    // Usually clicking the row expands an accordion or reveals session details underneath.
    // Return a locator to the expanded area if we can.
    // We'll just verify the click succeeded.
  }
}
