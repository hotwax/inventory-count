import { type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { cycleCountEnv } from './cyclecount/config';

type LoginOptions = {
  oms?: string;
  username?: string;
  password?: string;
};

export class LaunchpadLoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    const redirectUrl = encodeURIComponent(`${cycleCountEnv.appUrl}/login`);
    await this.gotoUrl(
      `${cycleCountEnv.launchpadUrl}/login?isLoggedOut=true&redirectUrl=${redirectUrl}`
    );
  }

  async login(options: LoginOptions = {}) {
    const credentials = {
      oms: options.oms ?? cycleCountEnv.oms,
      username: options.username ?? cycleCountEnv.username,
      password: options.password ?? cycleCountEnv.password,
    };

    await this.open();
    
    // Choose the OMS instance
    const omsInput = this.page.getByRole('textbox', { name: /oms/i });
    await omsInput.waitFor({ state: 'visible', timeout: 30_000 });
    await omsInput.fill(credentials.oms);
    await this.page.getByRole('button', { name: /next/i }).click();

    // Entering credentials
    const usernameInput = this.page.getByRole('textbox', { name: /username/i });
    await usernameInput.waitFor({ state: 'visible', timeout: 30_000 });
    await usernameInput.fill(credentials.username);
    
    const passwordInput = this.page.getByRole('textbox', { name: /password/i });
    await passwordInput.fill(credentials.password);
    
    await this.page.getByRole('button', { name: /login/i }).click();
    
    // Wait for redirect to the app's base URL
    await this.page.waitForURL((url) => url.toString().includes(cycleCountEnv.appUrl) && !url.toString().includes('login'), {
      timeout: 60_000,
    });
    
    await this.waitForNetworkIdle();
  }
}
