import { expect, type Locator, type Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async gotoUrl(url: string) {
    await this.page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  }

  async reload() {
    await this.page.reload({ waitUntil: 'load', timeout: 60_000 }).catch(() => {});
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  async wait(milliseconds: number) {
    await this.page.waitForTimeout(milliseconds);
  }

  async waitForLoaderToHide() {
    // Wait for common Ionic/HotWax loaders to disappear
    await this.page.locator('ion-loading, .loading-wrapper, ion-skeleton-text, .loading-overlay, [data-testid="session-detail-loading"]').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
    // Check for "Loading..." dialog if specifically labeled
    await this.page.getByRole('dialog', { name: /loading/i }).waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    // Short settle time after loader hides
    await this.wait(500);
  }

  async navigateViaMenu(menuItem: string) {
    const menuButton = this.page.locator('ion-menu-button');
    if (await menuButton.isVisible().catch(()=>false)) {
      await menuButton.click();
    }
    await this.wait(1000);
    
    const menuItemLocator = this.page.locator('ion-item').filter({ hasText: new RegExp(`^${this.escapeRegex(menuItem)}$`, 'i') });
    await expect(menuItemLocator).toBeVisible({ timeout: 15_000 });
    await menuItemLocator.click();
    await this.waitForNetworkIdle();
  }

  async expectVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }

  protected escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  protected exactTextMatcher(value: string) {
    return new RegExp(`^${this.escapeRegex(value)}$`, 'i');
  }
}
