import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../base.page";
import { buildCycleCountUrl } from "./config";

export class AssignedPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.gotoUrl(buildCycleCountUrl("/assigned"));
    await expect(this.page).toHaveURL(/\/assigned/);
    await expect(this.searchInput).toBeVisible({ timeout: 15_000 });
  }

  private get searchInput() {
    return this.page.locator('ion-searchbar input[type="search"]').first();
  }

  private countRow(countName: string): Locator {
    return this.page
      .locator(".list-item")
      .filter({
        has: this.page.locator('[data-testid="assigned-item-name"]', {
          hasText: new RegExp(`^\\s*${this.escapeRegex(countName)}\\s*$`, "i"),
        }),
      })
      .first();
  }

  async search(countName: string) {
    await this.searchInput.waitFor({ state: "visible", timeout: 20_000 });
    await this.searchInput.fill(countName);
    await this.searchInput.press("Enter");
    await this.wait(1_500);
  }

  async waitForCount(countName: string, maxChecks = 10) {
    const row = this.countRow(countName);

    for (let attempt = 1; attempt <= maxChecks; attempt += 1) {
      await this.search(countName);

      if (await row.isVisible().catch(() => false)) return row;

      if (attempt === maxChecks) {
        throw new Error(
          `Uploaded count ${countName} did not appear in Assigned`
        );
      }

      await this.reload();
      await this.wait(10_000);
    }

    return row;
  }

  async openCount(countName: string) {
    const row = await this.waitForCount(countName);
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.click();
  }

  // --- FILTERS ---
  async clearSearch() {
    await this.searchInput.fill("");
    await this.searchInput.press("Enter");
    await this.wait(1_500);
  }

  async selectStatus(status: string) {
    await this.selectFilter("Status", status);
  }

  async selectType(type: string) {
    await this.selectFilter("Type", type);
  }

  async selectFacility(facility: string) {
    const filterBtn = this.page
      .locator('[data-testid="assigned-facility-modal-btn"]')
      .first();
    await filterBtn.click();
    await this.page.waitForTimeout(1000);

    const popover = this.page
      .locator("ion-popover, ion-alert, ion-modal")
      .last();

    const search = popover.locator("ion-searchbar input").first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(facility);
      await this.page.waitForTimeout(500);
    }

    // Match the facility text ignoring case and treating underscores as spaces
    const normalizedFacility = facility.replace(/_/g, " ");
    const option = popover
      .locator("ion-item, ion-radio, ion-checkbox, button")
      .filter({
        hasText: new RegExp(this.escapeRegex(normalizedFacility), "i"),
      })
      .first();
    await option.waitFor({ state: "visible" });
    await option.click();

    const okBtn = popover.locator("button", {
      hasText: /OK|Confirm|Apply|Save/i,
    });
    if (await okBtn.isVisible().catch(() => false)) {
      await okBtn.click();
    } else {
      await this.page.keyboard.press("Escape");
    }

    await popover.waitFor({ state: "hidden" }).catch(() => {});
    await this.wait(1000);
  }

  private async selectFilter(labelName: string, optionText: string) {
    const select = this.page
      .locator("ion-item")
      .filter({ hasText: labelName })
      .locator("ion-select, button")
      .first();
    await select.waitFor({ state: "visible" });
    await select.click({ force: true });
    await this.page.waitForTimeout(500);

    const option = this.page
      .locator("ion-popover, ion-alert")
      .locator("ion-radio, ion-item, button")
      .filter({
        hasText: new RegExp(`^\\s*${this.escapeRegex(optionText)}\\s*$`, "i"),
      })
      .first();

    await option.waitFor({ state: "visible" });
    await option.click({ force: true });

    await this.page
      .locator("ion-popover, ion-alert")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await this.wait(1_000);
  }

  // --- ROW DATA ---
  async getCountDetails(countName: string) {
    const row = this.countRow(countName);
    await row.waitFor({ state: "visible", timeout: 30_000 });

    const statusBadge = row.locator(
      '[data-testid="assigned-item-status-badge"]'
    );
    const status = (await statusBadge.isVisible())
      ? ((await statusBadge.textContent()) || "").trim()
      : "";

    const facilityChip = row.locator(
      '[data-testid="assigned-item-facility-chip"]'
    );
    const facility = (await facilityChip.isVisible())
      ? ((await facilityChip.textContent()) || "").trim()
      : "";

    const text = (await row.textContent()) || "";

    return {
      rawText: text.trim(),
      status,
      facility,
    };
  }
}
