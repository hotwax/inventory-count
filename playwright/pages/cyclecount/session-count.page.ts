import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class SessionCountPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded() {
    await this.waitForLoaderToHide();
    const title = this.page.getByText("Session Count Detail").first();
    await title.waitFor({ state: "visible", timeout: 30_000 });
    const marker = this.page
      .getByTestId("session-detail-session-name")
      .or(this.page.getByTestId("session-detail-count-type"));
    await marker.first().waitFor({ state: "visible", timeout: 30_000 });
  }

  async verifyCountType(type: "Directed Count" | "Hard Count") {
    await this.expectLoaded();
    const locator = this.page
      .locator('[data-testid="session-detail-count-type"], .overline')
      .filter({ visible: true });
    await expect(locator.first()).toContainText(new RegExp(type, "i"), {
      timeout: 20_000,
    });
  }

  async openAddHandCountedItems() {
    await this.expectLoaded();
    const card = this.page
      .getByTestId("session-detail-add-hand-counted-card")
      .or(this.page.getByRole("button", { name: /add hand-counted items/i }));
    await expect(card.first()).toBeVisible({ timeout: 20_000 });
    await card.first().click({ force: true });
    // Wait for the route to change
    await this.page.waitForURL(
      (url) => url.toString().includes("add-hand-counted"),
      { timeout: 15_000 }
    );
  }

  async startCountingIfNeeded() {
    await this.waitForLoaderToHide();
    const startButton = this.page
      .getByTestId("session-detail-scanner-btn")
      .or(this.page.getByRole("button", { name: /start counting/i }));

    // Retry bridge: click it up to 3 times if it stays visible
    for (let i = 0; i < 3; i++) {
      if (
        await startButton
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        await startButton.first().click({ force: true });
        await this.waitForLoaderToHide();
        await this.wait(2000);
        if (
          !(await startButton
            .first()
            .isVisible({ timeout: 2000 })
            .catch(() => false))
        )
          break;
      } else {
        break;
      }
    }

    const scanInput = this.page
      .getByTestId("session-detail-scan-input")
      .locator("input");
    await expect(scanInput.first()).toBeVisible({ timeout: 15_000 });
  }

  async scanBarcode(barcode: string) {
    await this.startCountingIfNeeded();
    const input = this.page
      .getByTestId("session-detail-scan-input")
      .locator("input");
    await expect(input.first()).toBeEnabled({ timeout: 20_000 });
    await input.first().fill(barcode);
    await input.first().press("Enter");
    await this.waitForLoaderToHide();
    await this.wait(1000);
  }

  async expectProductsCounted(count: number) {
    const statsProducts = this.page.getByTestId(
      "session-detail-stats-products"
    );
    await expect(statsProducts.first()).toHaveText(count.toString(), {
      timeout: 20_000,
    });
  }

  async submitSession() {
    const submitButton = this.page.getByRole("button", { name: /^submit$/i });
    await expect(submitButton).toBeVisible({ timeout: 30_000 });
    await submitButton.click();

    const confirmButton = this.page
      .locator(".alert-button-group button")
      .filter({ hasText: /^Submit$/i })
      .first();
    await expect(confirmButton).toBeVisible({ timeout: 10_000 });
    await confirmButton.click();
  }

  async switchSegment(
    segmentType: "uncounted" | "undirected" | "unmatched" | "counted"
  ) {
    await this.waitForLoaderToHide();
    const btn = this.page.getByTestId(
      `session-detail-segment-${segmentType}-btn`
    );

    // Always click to be sure, it's safer than checking state in shadow DOM
    await btn.first().click({ force: true });

    await expect(
      this.page.getByTestId(`session-detail-${segmentType}-content`).first()
    ).toBeVisible({ timeout: 15_000 });
    await this.wait(1000); // Wait for transition
  }

  async expectItemInSegment(segmentType: string, itemName: string) {
    const content = this.page.getByTestId(
      `session-detail-${segmentType}-content`
    );
    await expect(content.getByText(itemName)).toBeVisible({ timeout: 15_000 });
  }

  async matchProduct(scannedValue: string, matchKeyword: string) {
    await this.switchSegment("unmatched");
    // Find the item with scannedValue and click match
    const item = this.page.locator(
      `[data-testid^="session-detail-unmatched-card-"]`,
      { hasText: scannedValue }
    );
    await item.getByTestId("session-detail-unmatched-match-btn").click();

    // In modal
    await this.waitForLoaderToHide();
    const searchInput = this.page
      .getByTestId("session-detail-match-modal-search-input")
      .locator("input");
    await searchInput.fill(matchKeyword);
    // Wait for debounce and result
    await this.wait(3_000);
    // Click result (assuming the first correct one is there)
    await this.page
      .getByTestId("session-detail-match-modal-radio-group")
      .getByRole("radio")
      .first()
      .click();
    await this.page.getByTestId("session-detail-match-modal-save-btn").click();
    await this.waitForLoaderToHide();
  }

  async editSessionName(newName: string) {
    await this.waitForLoaderToHide();
    await this.page.getByTestId("session-detail-edit-btn").click();
    const input = this.page
      .getByTestId("session-detail-edit-modal-name-input")
      .locator("input");
    await input.fill(newName);
    await this.page.getByTestId("session-detail-edit-modal-save-btn").click();
    await this.waitForLoaderToHide();
    await expect(
      this.page.getByTestId("session-detail-session-name")
    ).toContainText(newName);
  }

  async discardSession() {
    await this.page.getByTestId("session-detail-discard-btn").click();
    const confirmBtn = this.page
      .locator(".alert-button-group button")
      .filter({ hasText: /^Discard$/i })
      .first();
    await confirmBtn.waitFor({ state: "visible" });
    await confirmBtn.click();
    // After discarding user usually gets redirected back to store counts list
  }

  async goBackToCountList() {
    await this.page.getByRole("button", { name: "back", exact: true }).click();
    await this.wait(2_000);
  }
}
