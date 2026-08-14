import { expect, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly errorItem;
  readonly errorMessage;

  constructor(page: Page) {
    super(page);
    this.errorItem = page.getByTestId('login-error-item');
    this.errorMessage = page.getByTestId('login-error-message');
  }

  async open(query = '') {
    await this.goto(`/login${query}`);
  }

  async expectLoginScreenResolved() {
    await expect(this.page).toHaveURL(/\/login|\/assigned|\/tabs\/count|\/tabs\/settings/);
  }

  async expectErrorVisible() {
    await expect(this.errorItem).toBeVisible();
  }

  async expectErrorMessage(text: string | RegExp) {
    await expect(this.errorMessage).toContainText(text);
  }
}
