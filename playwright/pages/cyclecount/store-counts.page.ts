import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../base.page";
import { buildCycleCountUrl } from "./config";

export class StoreCountsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.gotoUrl(buildCycleCountUrl("/tabs/count"));
    await expect(this.page).toHaveURL(/\/tabs\/count/);
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/tabs\/count/);
    await this.page.waitForTimeout(1000);
  }

  private countCard(countName: string): Locator {
    return this.page
      .locator("ion-card")
      .filter({
        has: this.page.getByRole("heading").filter({
          hasText: this.exactTextMatcher(countName),
        }),
      })
      .first();
  }

  private sessionItem(card: Locator) {
    return card
      .locator(
        '[data-testid^="count-session-item-"], [data-testid^="count-session-item-active-"]'
      )
      .first();
  }

  async ensureCountVisible(countName: string) {
    const card = this.countCard(countName);

    await this.open();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      if (await card.isVisible().catch(() => false)) return card;

      await this.reload();
      // Increase visibility check time after reload
      try {
        await expect(card).toBeVisible({ timeout: 10_000 });
        return card;
      } catch (e) {
        // ignore and retry
      }
    }

    throw new Error(
      `Count ${countName} did not appear in Store View for the default facility after multiple reloads`
    );
  }

  async startOrResumeSession(countName: string) {
    const card = await this.ensureCountVisible(countName);
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.scrollIntoViewIfNeeded().catch(() => {});

    // Optimized: Wait for either start button or session item to be visible within the card
    const startButton = card.getByRole("button", { name: /start counting/i });
    const sessionItem = this.sessionItem(card);

    await Promise.race([
      startButton
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => {}),
      sessionItem
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => {}),
    ]);

    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
    } else {
      await expect(sessionItem).toBeVisible({ timeout: 10_000 });
      await sessionItem.click();
    }

    await this.waitForNetworkIdle().catch(() => {});
  }

  async openReviewProgress(countName: string) {
    const card = await this.ensureCountVisible(countName);
    await expect(card).toBeVisible({ timeout: 20_000 });

    const reviewButton = card.getByRole("button", {
      name: /review progress|review progress and complete/i,
    });
    const previewButton = card.getByRole("button", { name: /preview count/i });
    const actionButton = (await reviewButton.isVisible().catch(() => false))
      ? reviewButton
      : previewButton;

    await expect(actionButton).toBeVisible({ timeout: 15_000 });
    await actionButton.scrollIntoViewIfNeeded().catch(() => {});
    await actionButton.click();
  }
  async clickPreview(countName: string) {
    const card = await this.ensureCountVisible(countName);
    await expect(card).toBeVisible({ timeout: 20_000 });
    const previewButton = card.getByRole("button", { name: /preview count/i });
    await expect(previewButton).toBeVisible({ timeout: 15_000 });
    await previewButton.scrollIntoViewIfNeeded().catch(() => {});
    await previewButton.click();
    await this.waitForNetworkIdle();
  }
}
