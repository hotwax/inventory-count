import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../base.page";
import { buildCycleCountUrl } from "./config";

export class ClosedPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(viaMenu?: boolean) {
    if (viaMenu) {
      await this.navigateViaMenu("Closed");
    } else {
      await this.gotoUrl(buildCycleCountUrl("/closed"));
    }
    await expect(this.page).toHaveURL(/\/closed/);
    await expect(this.searchInput).toBeVisible({ timeout: 20_000 });
  }

  private get searchInput() {
    return this.page.locator('ion-searchbar input[type="search"]').first();
  }

  private row(countName: string): Locator {
    return this.page
      .locator(".list-item:visible")
      .filter({
        hasText: new RegExp(this.escapeRegex(countName), "i"),
      })
      .first();
  }

  async openCount(countName: string, maxChecks = 6) {
    const row = this.row(countName);
    await this.searchInput.waitFor({ state: "visible", timeout: 20_000 });

    for (let attempt = 1; attempt <= maxChecks; attempt += 1) {
      await this.searchInput.fill(countName);
      await this.searchInput.press("Enter");
      await this.wait(3_000);

      if (await row.isVisible().catch(() => false)) {
        await row.click();
        return;
      }

      if (attempt === maxChecks) {
        throw new Error(
          `Closed count ${countName} did not appear in the Closed listing`
        );
      }

      await this.reload();
    }
  }

  // --- FILTERS ---
  async search(searchTerm: string) {
    await this.searchInput.waitFor({ state: "visible" });
    await this.searchInput.fill(searchTerm);
    await this.searchInput.press("Enter");
    await this.wait(1_500);
  }

  async clearSearch() {
    await this.searchInput.fill("");
    await this.searchInput.press("Enter");
    await this.wait(1_500);
  }

  async selectType(type: string) {
    await this.selectFilter("Type", type);
  }

  async selectFacility(facility: string) {
    const filterLabel = this.page
      .locator("ion-item, .filter, .chip")
      .filter({ hasText: "Facility" })
      .first();
    await filterLabel.click();
    await this.page.waitForTimeout(1000);

    const popover = this.page
      .locator("ion-popover, ion-alert, ion-modal")
      .last();

    const search = popover.locator("ion-searchbar input").first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(facility);
      await this.page.waitForTimeout(500);
    }

    const option = popover
      .locator("ion-item, ion-radio, ion-checkbox, button")
      .filter({ hasText: facility })
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

  async applyDateFilters(options: {
    createdAfter?: string;
    createdBefore?: string;
    closedAfter?: string;
    closedBefore?: string;
  }) {
    const moreFiltersBtn = this.page
      .locator("ion-button, button")
      .filter({ hasText: /More filters/i })
      .first();
    await moreFiltersBtn.click();
    await this.page.waitForTimeout(1000);

    const modal = this.page.locator("ion-modal, ion-alert").last();

    if (options.createdAfter) {
      const input = modal
        .locator("ion-item")
        .filter({ hasText: /Created after/i })
        .locator("input, ion-datetime")
        .first();
      // If it's standard input
      await input.fill(options.createdAfter).catch(() => {});
    }
    if (options.closedAfter) {
      const input = modal
        .locator("ion-item")
        .filter({ hasText: /Closed after/i })
        .locator("input, ion-datetime")
        .first();
      await input.fill(options.closedAfter).catch(() => {});
    }
    // Very simplified, real date pickers are notoriously tricky and need custom interaction.
    // For now we just attempt basic fill and apply.

    const applyBtn = modal
      .locator("button")
      .filter({ hasText: /Apply/i })
      .first();
    if (await applyBtn.isVisible().catch(() => false)) {
      await applyBtn.click();
      await modal.waitFor({ state: "hidden" }).catch(() => {});
    }
    await this.wait(1000);
  }

  // --- EXPORT ---
  async exportHistory() {
    // The export button is the blue arrow down at the bottom right, or "EXPORT HISTORY" button
    const exportBtn = this.page
      .locator("ion-fab-button, ion-button")
      .filter({ hasText: /export/i })
      .or(
        this.page
          .locator("ion-fab-button")
          .locator(
            'ion-icon[name="download-outline"], ion-icon[name="cloud-download-outline"]'
          )
      )
      .first();
    await exportBtn.click();

    // Expect toast message "Requesting export..."
    const toast = this.page
      .locator("ion-toast")
      .filter({ hasText: /Requesting export/i });
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  // --- ROW DATA ---
  async getCountDetails(countName: string) {
    const row = this.row(countName);
    await row.waitFor({ state: "visible" });

    const text = (await row.textContent()) || "";

    let facility = "";
    const chips = await row.locator("ion-chip").allTextContents();
    const facilityChip = chips.find(
      (c) => !c.match(/Hard Count|Directed Count/i)
    );
    if (facilityChip) {
      facility = facilityChip.trim();
    }

    return {
      rawText: text.trim(),
      facility,
    };
  }
}
