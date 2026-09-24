import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class StorePermissionsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openStoreView() {
    const storeViewItem = this.page
      .locator("ion-item")
      .filter({ hasText: /Store View/i });
    await expect(storeViewItem).toBeVisible({ timeout: 15_000 });
    await storeViewItem.click();
    await this.waitForNetworkIdle();
  }
}
