import { expect, type Locator, type Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async expectVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }
}
