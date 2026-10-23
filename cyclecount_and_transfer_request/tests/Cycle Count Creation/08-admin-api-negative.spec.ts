import { test, expect } from '@playwright/test';

/**
 * Configure this entire test suite to run using the pre-authenticated Admin session.
 * This skips the login screen and jumps straight into the application.
 */
test.use({ storageState: 'playwright/.auth/admin.json' });

// Grouping our API-level negative tests for the Cycle Count app
test.describe('Admin API Negative Tests - Error Handling & Images (DEV)', () => {
  
  /**
   * Before every test, navigate to the correct page in the application.
   * This ensures a clean slate for each API mock.
   */
  test.beforeEach(async ({ page }) => {
    // 1. Start at the Launchpad (main hub)
    await page.goto('https://launchpad.hotwax.io/home');
    // 2. Click the specific DEV button for the Inventory (Cycle Count) app
    await page.getByTestId('dev-button-inventorycount').click();
    // 3. Verify the URL changed successfully
    await expect(page).toHaveURL(/.*\/assigned/, { timeout: 15000 });

    // 4. Navigate to the "Create count" page using the side menu
    await page.getByText('Create count').click();
  });

  /**
   * SCENARIO 1: API Server Crash (500 Error)
   * Goal: Ensure the UI doesn't completely freeze or break if the backend goes down.
   */
  test('Search API Failure Handling (500 Error)', async ({ page }) => {
    // Intercept (mock) the Solr search API call that happens when typing in the search bar.
    // Instead of letting it hit the real server, we force it to return a 500 Server Error.
    await page.route('**/runSolrQuery', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Type into the search bar. This natively triggers the intercepted API call.
    await page.getByTestId('create-count-search-input').locator('input').fill('trigger-500');

    // VERIFICATION: The UI should catch the 500 error and display an 'ion-toast' (a small popup)
    // rather than showing an infinite loading spinner or a blank white screen.
    const toast = page.locator('ion-toast');
    await expect(toast).toBeVisible({ timeout: 10000 });
  });

  /**
   * SCENARIO 2: Zero Search Results
   * Goal: Ensure the UI gracefully handles searches that return nothing.
   */
  test('Empty Search Results', async ({ page }) => {
    // Intercept the search API to return a perfectly formatted but EMPTY response
    await page.route('**/runSolrQuery', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          response: { numFound: 0, start: 0, docs: [] } 
        }),
      });
    });

    // Trigger the search
    await page.getByTestId('create-count-search-input').locator('input').fill('trigger-empty');

    // Wait for the UI to process the empty response
    await page.waitForTimeout(2000);
    
    // VERIFICATION: We count how many product rows (ion-items with checkboxes) rendered.
    const productItems = page.locator('ion-item').filter({ has: page.locator('ion-checkbox') });
    const itemCount = await productItems.count();
    
    // We expect at most 1 item (the "Select All" master checkbox might still render), 
    // but there should be exactly 0 actual products.
    expect(itemCount).toBeLessThanOrEqual(1); 
  });

  /**
   * SCENARIO 3: Custom Image URL Rendering
   * Goal: Verify the UI correctly extracts and maps the 'mainImageUrl' from the backend.
   */
  test('Image Rendering - Correct URL Mapping', async ({ page }) => {
    // Note: Playwright testing in browsers often enforces Content Security Policies (CSP).
    // We use an image hosted on the exact same domain to avoid CORS/CSP blocking our test.
    const fakeImageUrl = 'https://inventorycount-dev.hotwax.io/assets/icon/favicon.png';

    // Intercept the API to return 1 fake product with our custom image URL
    await page.route('**/runSolrQuery', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          response: { 
            numFound: 1, 
            start: 0, 
            docs: [{
              productId: 'MOCK-123',
              internalName: 'Mock Image Product',
              mainImageUrl: fakeImageUrl
            }] 
          } 
        }),
      });
    });

    // Trigger the search
    await page.getByTestId('create-count-search-input').locator('input').fill('mock-image');

    // Locate the physical image element in the DOM
    const productImg = page.locator('ion-img[src], img[src]').last();
    await expect(productImg).toBeVisible({ timeout: 10000 });
    
    // VERIFICATION: Extract the 'src' attribute and ensure our custom URL was correctly injected
    const src = await productImg.getAttribute('src');
    console.log('Mapped Image URL in DOM:', src);
    expect(src).toContain('favicon.png');
  });

  /**
   * SCENARIO 4: Missing Image Fallback
   * Goal: Verify the UI doesn't break (e.g. show a broken image icon) if a product lacks an image.
   */
  test('Image Rendering - Missing Image URL Fallback', async ({ page }) => {
    // Intercept the API to return a product that is completely missing the 'mainImageUrl' field
    await page.route('**/runSolrQuery', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          response: { 
            numFound: 1, 
            start: 0, 
            docs: [{
              productId: 'MOCK-NO-IMG',
              internalName: 'Mock No Image Product'
              // Notice: mainImageUrl is explicitly omitted
            }] 
          } 
        }),
      });
    });

    // Trigger the search
    await page.getByTestId('create-count-search-input').locator('input').fill('mock-no-image');

    // Wait a moment for rendering
    await page.waitForTimeout(2000);

    // Locate the image element
    const productImg = page.locator('ion-img, img').last();
    await expect(productImg).toBeVisible({ timeout: 10000 });
    
    // VERIFICATION: Extract the 'src'. It should NOT be empty or undefined. 
    // It should contain a default fallback placeholder image path provided by the frontend app.
    const src = await productImg.getAttribute('src');
    console.log('Fallback Image URL in DOM:', src);
    expect(src).toBeTruthy();
  });

});
