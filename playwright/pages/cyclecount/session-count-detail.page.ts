import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base.page";

export class SessionCountDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/session-count-detail/);
    await expect(
      this.page.getByTestId("session-detail-page-title")
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      this.page
        .getByTestId("session-detail-scan-input")
        .locator("input")
        .first()
    ).toBeVisible({ timeout: 15_000 });
  }

  async scanBarcode(barcode: string) {
    // Click the start/focus button to ensure the session is started and input is focused
    const startScanBtn = this.page.getByTestId("session-detail-scanner-btn");
    await startScanBtn.click();

    const scanInput = this.page
      .getByTestId("session-detail-scan-input")
      .locator("input")
      .first();
    await expect(scanInput).toBeEnabled({ timeout: 10_000 });
    await scanInput.fill(barcode);
    await scanInput.press("Enter");

    // The scanning action will update the Vue state and display the scanned item,
    // wait a brief moment for the UI to settle.
    await this.page.waitForTimeout(2000);
  }

  async verifyBarcodeInTab(
    barcode: string,
    tab: "uncounted" | "undirected" | "unmatched" | "counted"
  ) {
    // Click the specific tab
    const tabBtn = this.page.getByTestId(`session-detail-segment-${tab}-btn`);
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
      await this.page.waitForTimeout(1000);
    } else {
      throw new Error(
        `Tab ${tab} is not visible on the session count detail page.`
      );
    }

    // Vue Virtual Scroller is used in the session-count-detail page for the lists as well.
    // We must ensure we filter by visible elements to avoid hitting the recycle pool.
    const itemEl = this.page
      .getByText(barcode, { exact: false })
      .and(this.page.locator(":visible"))
      .first();
    await expect(itemEl).toBeVisible({ timeout: 10_000 });
  }

  async resolveUnmatchedProduct(barcode: string, validSku?: string) {
    // We assume we are already on the UNMATCHED tab and the barcode is visible.

    // Find the MATCH button within the ion-card that contains the barcode text
    const matchBtn = this.page
      .locator("ion-card")
      .filter({ hasText: barcode })
      .getByTestId("session-detail-unmatched-match-btn");
    await matchBtn.click();

    // Wait for the modal
    const modal = this.page.getByTestId("session-detail-match-modal");
    await expect(modal).toBeVisible({ timeout: 10_000 });

    if (validSku) {
      const searchInput = modal.getByTestId(
        "session-detail-match-modal-search-input"
      );
      // Fill the searchbar
      await searchInput.locator("input").fill(validSku);

      // Wait for debounce/results (the UI shows 'Loading...' briefly or waits for API)
      await this.page.waitForTimeout(2000);

      // Click the radio for the matching product
      const radio = modal.locator("ion-radio").first();
      await radio.click();

      // Click save
      const saveBtn = modal.getByTestId("session-detail-match-modal-save-btn");
      await saveBtn.click();

      // Wait for the toast message
      const toast = this.page
        .locator("ion-toast")
        .filter({ hasText: /Product matched successfully/i });
      await expect(toast).toBeVisible({ timeout: 10_000 });

      // Wait for modal to close
      await expect(modal).toBeHidden({ timeout: 10_000 });
    } else {
      // For bogus barcodes, we expect "No results found"
      await expect(modal.getByText("No results found")).toBeVisible({
        timeout: 15_000,
      });

      // If a valid product is found, it would show a radio button here, but we'll just close it
      const closeBtn = this.page.getByTestId(
        "session-detail-match-modal-close-btn"
      );
      await closeBtn.click();
      await expect(modal).toBeHidden({ timeout: 10_000 });
    }
  }

  async removeScan(barcode: string) {
    // Find the scanned item in the left panel list. It is represented by an ion-item containing the barcode text.
    // Wait a brief moment to ensure the list is rendered, as the DOM updates asynchronously.
    await this.page.waitForTimeout(1000);
    const scanItem = this.page
      .locator("ion-item")
      .filter({ hasText: barcode })
      .first();

    // Click the 3 dots action menu
    const actionsBtn = scanItem.getByTestId("session-detail-event-actions-btn");
    await expect(actionsBtn).toBeVisible({ timeout: 5000 });
    await actionsBtn.click();

    // The ion-popover should open, click "Remove"
    const popover = this.page.locator("ion-popover");
    await expect(popover).toBeVisible({ timeout: 5000 });
    await popover.getByText("Remove", { exact: true }).click();

    // The "Remove scan" confirmation alert should open
    const alert = this.page.getByTestId("session-detail-remove-confirm-alert");
    await expect(alert).toBeVisible({ timeout: 5000 });

    // Click "ONLY THIS SCAN"
    const onlyThisScanBtn = alert
      .locator(".alert-button")
      .filter({ hasText: /only this scan/i });
    await onlyThisScanBtn.click();

    // Wait for the alert to close
    await expect(alert).toBeHidden({ timeout: 5000 });
  }

  async submitSession() {
    const submitBtn = this.page.getByTestId("session-detail-submit-btn");
    await submitBtn.click();

    // Wait for the alert
    const alert = this.page.getByTestId("session-detail-submit-alert");
    await expect(alert).toBeVisible({ timeout: 5_000 });

    // Click submit in the alert
    const confirmBtn = alert
      .locator(".alert-button")
      .filter({ hasText: /submit/i });
    await confirmBtn.click();

    // Wait for alert to close
    await expect(alert).toBeHidden({ timeout: 5_000 });

    // Wait for the success toast
    const toast = this.page
      .locator("ion-toast")
      .filter({ hasText: /Session submitted successfully/i });
    await expect(toast).toBeVisible({ timeout: 10_000 });
  }
}
