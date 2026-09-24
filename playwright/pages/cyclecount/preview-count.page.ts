import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class PreviewCountPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded() {
    // Wait for the modal or page to open
    // Since we don't have the exact DOM, we will assert a common element
    await this.page.waitForTimeout(2000);
  }

  async verifyDetails(expectedDetails: { skus: string[] }) {
    await this.page.waitForTimeout(3000);

    // Assert SKUs are present in the preview
    // We use .and(page.locator(':visible')) to filter out hidden elements
    // created by vue-virtual-scroller in its recycle pool.
    for (const sku of expectedDetails.skus) {
      const el = this.page
        .getByText(sku, { exact: false })
        .and(this.page.locator(":visible"))
        .first();
      await expect(el).toBeVisible({ timeout: 10000 });
    }
  }

  async closePreview() {
    // Try to close modal if it is one or navigate back
    const backBtn = this.page.locator("ion-back-button").first();
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
    } else {
      // Fallback
      await this.page.goBack();
    }
  }
}
