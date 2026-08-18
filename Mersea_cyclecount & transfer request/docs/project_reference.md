# Project Setup & Context Reference

This document serves as the central reference for all training, setup, and architectural decisions made for the `mersea` Playwright automation project.

## 1. Project Initialization & Architecture
- **Framework:** Playwright (TypeScript).
- **Authentication Strategy:** Utilizes Playwright's "Project Dependencies". 
  - `tests/auth.setup.ts` logs in once per persona (Admin & Store User).
  - Sessions are saved locally to `playwright/.auth/admin.json` and `playwright/.auth/storeUser.json` to bypass login for all subsequent tests, saving massive execution time.
- **Strict Assertions:** The global setup strictly verifies that the `LOGIN` button disappears and the URL changes. If authentication fails or the environment is down, the setup will hard-fail the test suite.

## 2. Environment Variables & Roles
The project relies on `.env` (which is `.gitignore`'d for security).
```env
ADMIN_USERNAME=ajinkya.moghe
ADMIN_PASSWORD=hotwax@786
STORE_USER_USERNAME=yash.maheshwari
STORE_USER_PASSWORD=hotwax@786
OMS_NAME=mersea-oms
MERSEA_UAT_URL=https://inventorycount-uat.hotwax.io/login
MERSEA_PROD_URL=https://inventorycount.hotwax.io/bulkUpload
```

### Direct Environment URLs (For Reference)
- **Mersea UAT (Login):** `https://inventorycount-uat.hotwax.io/login`
- **Mersea PROD (Bulk Upload):** `https://inventorycount.hotwax.io/bulkUpload`

## 3. Login Flow & Launchpad Navigation
- **Login Flow:** Navigate to `https://launchpad.hotwax.io/home` -> Click Login -> Enter OMS Name (`mersea-oms`) -> Enter SSO Credentials -> Redirect back to authenticated Launchpad.
- **DOM Strategies used:** Locators use robust `getByRole` and `getByLabel` instead of XPaths. Case-insensitive Regex (`/login/i`) is used to prevent failures from text case changes.
- **App Launching (UAT/DEV):** 
  - To open apps reliably, we extracted the DOM and found exact `data-testid` attributes for each app button.
  - Cycle Count: `dev-button-inventorycount` and `uat-button-inventorycount`
  - Receiving (used for Transfers): `dev-button-receiving` and `uat-button-receiving`
  - Scripts now use `getByTestId('dev-button-inventorycount')` directly to completely eliminate any DOM traversal ambiguity.

---

## 4. Test Flows & Requirements (Training Context)

### Flow 1: Cycle Count
*Status: Partially automated. Cycle Count Execution tests are built but Creation flow is pending DOM extraction.*
- **Cycle Count Creation:** Store users use a Shopify-embedded app or Admin uses Launchpad. **(Blocked: Pending identification of the exact App and DOM selectors for tag-based creation, as it is not in the `inventory-count` execution app).**
- **Cycle Count Execution (inventory-count app):** Users can preview counts, scan barcodes (aggregating duplicate scans), see progress updates, view a timer/due countdown, and finally submit the count for admin review.
- **Admin Count Review:** Admins view submitted counts under "Pending Review". They can view variances, accept or reject those variances, edit session counts if needed, and close the cycle count.
- **Inventory Sync After Count:** Accepted variances sync to HotWax, NetSuite (with a reference memo), and Shopify within 15 minutes. Rejected variances do not update any inventory.
- **Inventory Reset NS to OMS:** NetSuite inventory reset files update HotWax QOH. Reservation-aware resets recalculate ATP from actual reservations. Shopify inventory reset logs and retries failures without creating duplicate records.

### Flow 2: Transfer Request
*Status: Fully automated and verified against UAT/DEV.*
- **Store User Request (Receiving App):** Initiated via the HotWax Receiving app (`dev-button-receiving`). Destination defaults to the assigned store. Users select the origin facility, search by partial SKU (filtering out inactive products), or scan barcodes. QOH is NOT displayed in UI. Automated tests cover boundary value analysis (e.g., quantity > QOH).
- **Admin Transfer Review:** Admins review the store's requests (origin, destination, items, QOH, and quantities). Admins can edit quantities. Strict input validation blocks blanks, zeros, negatives, and non-numeric values. Hand delivery/pickup is supported without carrier credentials.
- **System Sync:** Approved transfers change to "pending fulfillment" and sync to NetSuite. Unapproved transfers do not sync to NetSuite.

---

## 5. Quick Start / Developer Onboarding (How to Run the Tests)

Welcome to the Mersea automation project! Follow these steps to run the scripts locally:

### Step 1: Environment Setup
You must create a `.env` file in the root of the `mersea` project directory. This file is ignored by Git to keep credentials secure.
```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
STORE_USER_USERNAME=your_store_user_username
STORE_USER_PASSWORD=your_store_user_password
OMS_NAME=mersea-oms
MERSEA_UAT_URL=https://inventorycount-uat.hotwax.io/login
MERSEA_PROD_URL=https://inventorycount.hotwax.io/bulkUpload
```

### Step 2: Install Dependencies
Run the following commands in your terminal to install Playwright and its required browsers:
```bash
npm install
npx playwright install
```

### Step 3: Run the Tests
You can run the entire suite, or focus on specific flows:
- **Run Everything (Headless):** `npx playwright test`
- **Run Everything (Headed/Visual):** `npx playwright test --headed`
- **Run Only Cycle Counts:** `npx playwright test "tests/Cycle Count Creation/"`
- **Run Only Transfer Requests:** `npx playwright test "tests/Transfer Request Flow/"`

### 🧠 Important Project Mechanics to Know
1. **Smart Authentication (`auth.setup.ts`):** 
   Playwright is configured to log in before every test run. However, our setup script is "smart"—it checks if you already have a valid session JSON file (`playwright/.auth/*.json`) that is less than 12 hours old. If so, it **skips the login process** to save time and prevent backend rate-limiting!
2. **OMS Background Sync Delays:** 
   When a new Cycle Count is created via the API, the backend OMS sync job can take several minutes to push it to the "Assigned" tab in the UI. Our scripts handle this gracefully by **polling the UI every 2 minutes (up to 6 minutes maximum)** before failing. Do not panic if the script pauses for a few minutes after creating a count!
3. **SSO Redirection Delays:**
   The UAT/DEV environment can sometimes take up to 45 seconds to route from Launchpad into the Receiving app. Navigation timeouts have been bumped globally to handle this.
