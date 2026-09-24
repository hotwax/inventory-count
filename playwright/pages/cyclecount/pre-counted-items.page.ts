import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class PreCountedItemsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded() {
    // Wait for markers using both text/role and testId
    await Promise.race([
      this.page
        .getByText(/Add Hand Counted Items/i)
        .waitFor({ state: "visible", timeout: 15_000 }),
      this.page
        .getByRole("heading", { name: /Add Items/i })
        .waitFor({ state: "visible", timeout: 15_000 }),
      this.page
        .locator('[data-testid="pre-counted-items-search-bar"]')
        .waitFor({ state: "visible", timeout: 15_000 }),
    ]).catch(() => {});

    await this.waitForLoaderToHide();
    await this.wait(2000); // Settle time for Ionic transitions
  }

  async searchProduct(keyword: string) {
    await this.waitForLoaderToHide();
    // ion-searchbar might have multiple internal inputs or transitions
    const searchBar = this.page
      .locator("ion-searchbar input")
      .filter({ visible: true })
      .first();
    await searchBar.waitFor({ state: "visible", timeout: 15_000 });
    await searchBar.click(); // Focus the input
    await searchBar.clear(); // Ensure it's empty
    await searchBar.pressSequentially(keyword, { delay: 50 }); // Type slowly to trigger ionInput
    await searchBar.press("Enter");

    // In this app, pressing Enter usually auto-adds the first result if found.
    await Promise.race([
      this.page
        .locator(`ion-card`)
        .filter({ hasText: keyword })
        .waitFor({ state: "visible", timeout: 10_000 }),
      this.page
        .getByText(/Add to count/i)
        .first()
        .waitFor({ state: "visible", timeout: 10_000 }),
    ]).catch(() => {});
  }

  async addFoundProductToCount() {
    await this.waitForLoaderToHide();
    // If it's already added (auto-add), this button might be gone or we are already done.
    const addBtn = this.page
      .getByRole("button", { name: /Add to count/i })
      .first();
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addBtn.click();
      await this.waitForLoaderToHide();
    }
    // Wait for the items list or the specific item card
    await expect(
      this.page.locator(".hand-counted-items, ion-list ion-card").first()
    ).toBeVisible({ timeout: 10_000 });
  }

  async setProductQuantity(identifier: string, quantity: number) {
    await this.waitForLoaderToHide();
    // Find the card that contains the identifier text
    const card = this.page
      .locator("ion-card")
      .filter({ hasText: identifier })
      .last();
    // Use a more robust input locator
    const input = card
      .locator("ion-input input")
      .or(card.locator('input[type="number"]'));
    await input.fill(quantity.toString());
    await input.press("Enter");
  }

  async saveProgress() {
    await this.waitForLoaderToHide();
    const saveBtn = this.page.getByTestId(
      "pre-counted-items-save-progress-btn"
    );
    await saveBtn.click();

    // Highly likely a loader appears during save
    await this.waitForLoaderToHide();
    await this.wait(2000);
  }

  async goBack() {
    await this.waitForLoaderToHide();
    // Robust locator for the back button
    const backBtn = this.page
      .locator('[data-testid="pre-counted-items-back-btn"]')
      .or(this.page.locator("ion-header ion-button").first());

    // Attempt standard clicks
    try {
      await backBtn.waitFor({ state: "visible", timeout: 5000 });
      await backBtn.click({ force: true, timeout: 5000 });

      // Check if an alert appeared
      const alert = this.page
        .locator("ion-alert, .alert-wrapper")
        .filter({ hasText: /Discard|Unsaved/i });
      if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
        const discardBtn = alert
          .locator("button")
          .filter({ hasText: /Discard/i })
          .first();
        await discardBtn.click();
      }
    } catch (e) {
      try {
        await backBtn.dispatchEvent("click");
        await this.wait(1000);
      } catch (e2) {
        // As a last resort, use browser back if we are sure we should be going back
        await this.page.evaluate(() => window.history.back());
      }
    }

    // Confirm navigation
    await this.page
      .waitForURL((url) => url.toString().includes("session-count-detail"), {
        timeout: 10_000,
      })
      .catch(() => {});
  }
}
