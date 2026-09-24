import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../base.page";
import { buildCycleCountUrl } from "./config";

export class PendingReviewPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(viaMenu: boolean = false) {
    if (viaMenu) {
      const menuItem = this.page.getByTestId("app-menu-item-pending-review");
      const menuBtn = this.page.locator("ion-menu-button").first();

      // If the menu item isn't visible (e.g., hidden behind a hamburger menu on smaller screens), toggle it open
      if (
        !(await menuItem.isVisible().catch(() => false)) &&
        (await menuBtn.isVisible().catch(() => false))
      ) {
        await menuBtn.click();
      }

      await expect(menuItem).toBeVisible({ timeout: 10_000 });
      await menuItem.click();

      // If we opened the menu via button, it might still be open and overlaying content, wait for it to close if it's an overlay
      const menu = this.page.getByTestId("app-side-menu");
      if (await menuBtn.isVisible().catch(() => false)) {
        await menu.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      }
    } else {
      await this.gotoUrl(buildCycleCountUrl("/pending-review"));
    }
    await expect(this.page).toHaveURL(/\/pending-review/);
    await expect(this.searchInput).toBeVisible({ timeout: 15_000 });
  }

  private get searchInput() {
    return this.page.locator('ion-searchbar input[type="search"]').first();
  }

  private row(countName: string): Locator {
    return this.page
      .locator(".list-item")
      .filter({
        hasText: new RegExp(this.escapeRegex(countName), "i"),
      })
      .first();
  }

  async openCount(countName: string) {
    await this.searchInput.waitFor({ state: "visible", timeout: 15_000 });
    await this.searchInput.fill(countName);
    await this.searchInput.press("Enter");
    await this.wait(2_000);
    const row = this.row(countName);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
  }

  // --- FILTERS ---
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
