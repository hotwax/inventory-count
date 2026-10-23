import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class AssignedDetailPage extends BasePage {
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

  async expectHardCount() {
    await expect(
      this.page
        .locator("ion-badge, ion-chip")
        .filter({ hasText: /Hard Count/i })
    ).toBeVisible();
    await expect(
      this.page
        .locator("ion-label")
        .filter({ hasText: /Items Requested/i })
        .locator("..")
        .filter({ hasText: /0/ })
    )
      .toBeVisible()
      .catch(() =>
        expect(
          this.page
            .locator(".list-header")
            .filter({ hasText: /Requested Items.*0/i })
        ).toBeVisible()
      );
  }

  // --- OVERVIEW ---
  async getCountId() {
    // Looks like Mxxxxx above the count title
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

  // --- COUNTING ACTIVITY ---
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

  // --- PRODUCTS ---
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

    // Parse counted/systemic, e.g. "150/- counted/systemic"
    const quantityMatch = text.match(/([\d-]+)\/([\d-]+)\s*counted\/systemic/i);
    const countedQuantity = quantityMatch?.[1] || null;
    const systemicQuantity = quantityMatch?.[2] || null;

    // Parse variance, e.g. "150 variance"
    const varianceMatch = text.match(/([\d-]+)\s*variance/i);
    const variance = varianceMatch?.[1] || null;

    return {
      countedQuantity:
        countedQuantity === "-" ? null : parseInt(countedQuantity || "0", 10),
      systemicQuantity:
        systemicQuantity === "-" ? null : parseInt(systemicQuantity || "0", 10),
      variance: variance === "-" ? null : parseInt(variance || "0", 10),
      rawText: text,
    };
  }

  async sortProducts(by: string) {
    const sortSelect = this.page
      .locator("ion-select, .sort-select")
      .filter({ hasText: /Sort By/i })
      .first();
    await sortSelect.click();
    await this.page.waitForTimeout(500);

    const option = this.page
      .locator("ion-popover, ion-action-sheet, ion-alert")
      .locator("ion-radio, ion-item, button")
      .filter({ hasText: new RegExp(`^\\s*${this.escapeRegex(by)}\\s*$`, "i") })
      .first();

    await option.click();
    await this.page
      .locator("ion-popover, ion-action-sheet, ion-alert")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await this.wait(1_500);
  }

  async goBack() {
    await this.page.getByTestId("assigned-detail-back-btn").click();
    await this.wait(2_000);
  }
}
