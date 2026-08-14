import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { getAllClients } from './config/clients';

const port = Number(process.env.PLAYWRIGHT_PORT || 8080);
const localBaseURL = `http://127.0.0.1:${port}`;
// Global default web server logic - use local if no generic override exists and we want webServer
const useWebServer = !process.env.PLAYWRIGHT_BASE_URL;

/**
 * Dynamically generate projects for each client found in environment
 */
const generateProjects = () => {
  const projects = [];
  let clients = getAllClients();

  // If a specific CLIENT is requested, filter the projects
  if (process.env.CLIENT) {
    const targets = process.env.CLIENT.toLowerCase().split(",").map((s) => s.trim());
    clients = clients.filter((c) => targets.includes(c.clientId.toLowerCase()));
  }

  for (const config of clients) {
    const clientId = config.clientId;

    // 1. Setup Auth
    projects.push({
      name: `setup-${clientId}`,
      testMatch: /.*\.setup\.ts/,
    });

    // 2. Normal Test Execution
    projects.push({
      name: `chromium-${clientId}`,
      use: {
        ...devices['Desktop Chrome'],
        storageState: `playwright/.auth/${clientId}.user.json`,
        baseURL: config.baseUrl, /* injected */
      },
      dependencies: [`setup-${clientId}`],
    });
  }

  return projects;
};

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 360_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: './playwright-report' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: useWebServer
    ? {
        command: `npm run serve -- --port ${port}`,
        url: localBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
  projects: generateProjects(),
});
