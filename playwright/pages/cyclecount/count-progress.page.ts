import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class CountProgressPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get submitButton() {
    return this.page.getByTestId("count-progress-submit-btn");
  }

  async expectLoaded(countName: string) {
    await expect(this.page.getByText(/Track progress/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      this.page
        .locator("h1")
        .filter({ hasText: this.exactTextMatcher(countName) })
    ).toBeVisible({ timeout: 20_000 });
  }

  async expectSubmitDisabled() {
    await expect(this.submitButton).toHaveAttribute("aria-disabled", "true");
  }

  async expectSubmitted() {
    await expect(
      this.page.getByTestId("count-progress-submitted-card")
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      this.page.getByTestId("count-progress-submitted-title")
    ).toHaveText(/Count submitted for review/i);
    await expect(
      this.page.getByTestId("count-progress-status-badge")
    ).toHaveText(/Completed/i);
  }

  async expectRequirementVisible(text: string | RegExp) {
    await expect(this.page.locator("main")).toContainText(text);
  }

  async expectRemainingProducts(text: string | RegExp) {
    await expect(this.page.locator("main")).toContainText(text);
  }

  async submitForReview(clickFromCountedTab: boolean = false) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const isDisabled = await this.submitButton.getAttribute("disabled");
      if (isDisabled === null) {
        if (clickFromCountedTab) {
          const countedTab = this.page.getByTestId(
            "count-progress-segment-counted"
          );
          await expect(countedTab).toBeVisible({ timeout: 10_000 });
          await countedTab.click();
          await this.wait(1_000);
        }
        await this.submitButton.click();
        return;
      }

      if (attempt === 6) {
        throw new Error("Submit for review never became enabled");
      }

      await this.reload();
      await this.wait(5_000);
    }
  }

  async openSession(countName: string) {
    const sessionButton = this.page.getByRole("button", {
      name: new RegExp(this.escapeRegex(countName), "i"),
    });
    await expect(sessionButton).toBeVisible({ timeout: 20_000 });
    await sessionButton.click();
  }

  async goBack() {
    await this.page.getByTestId("count-progress-back-btn").click();
    await this.wait(2_000);
  }
}
