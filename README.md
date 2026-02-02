# Inventory Count

## 1. Repository Overview
- **Logical Name**: Inventory Count (cycle-count) — not a Sanskrit word.
- **Business Purpose**: This repository delivers HotWax Commerce’s Inventory/Cycle Count mobile + web application used by store and warehouse teams to execute physical counts. It focuses on creating, running, and reviewing cycle counts, capturing scan events offline, and synchronizing results back to the HotWax OMS for inventory accuracy and variance review. It also supports bulk count imports, session management, and exporting completed count data for operations teams.

## 2. Core Responsibilities & Business Logic
- **Primary domains / business rules**:
  - Inventory/Cycle Count execution (Directed vs. Hard Count workflows).
  - Session lifecycle management (create, lock, release, submit, void).
  - Scan event capture and aggregation (counted, uncounted, undirected, unmatched).
  - Bulk upload of count sessions and error reporting.
  - Product identification and lookup (SKU/UPC/internal identifiers) with cached product/inventory data.
  - Permissions-driven access to count actions and admin features.

- **Core business logic & workflows**:
  - **Authentication & permission gating**: users authenticate via token + OMS endpoint, load permissions, and are blocked if they lack the configured app permission. Facility and product store context is loaded on login to scope counts. The app configures product identifier preferences and status descriptions before initializing local storage for offline use.【F:src/stores/authStore.ts†L1-L177】
  - **Cycle Count work effort lifecycle**: the app lists cycle count work efforts, starts counts, and updates work effort status through the `inventory-cycle-count/cycleCounts/workEfforts` APIs. It also supports navigating into sessions tied to a work effort and initiating new sessions (including cloning sessions for directed counts).【F:src/composables/useInventoryCountRun.ts†L29-L285】【F:src/views/Count.vue†L280-L406】
  - **Session operations**: sessions can be created, locked/released, submitted, or voided. The app manages session items and supports update/delete flows per item while tracking session locks in OMS data documents.【F:src/composables/useInventoryCountImport.ts†L300-L506】
  - **Scan event and item aggregation**: scanning produces `scanEvents` that are written to IndexedDB and aggregated into counted/uncounted/undirected/unmatched views. Local storage allows offline counting and later synchronization.【F:src/composables/useInventoryCountImport.ts†L20-L292】
  - **Bulk upload workflow**: users upload CSV files to create cycle count sessions, review processing errors, and download processed files, all via system message APIs.【F:src/views/BulkUpload.vue†L151-L377】【F:src/composables/useInventoryCountRun.ts†L72-L168】
  - **Product lookup and inventory snapshot**: product data is cached in IndexedDB and refreshed using Solr queries and OMS inventory data views to support scanning, search, and QOH/ATP visibility while counting.【F:src/composables/useProductMaster.ts†L1-L338】【F:src/composables/useProductMaster.ts†L390-L553】

## 3. Dependencies & Architecture
- **Tech Stack**:
  - Vue 3 + Ionic Vue (mobile/web UI) with Capacitor for native builds.
  - Pinia for state management.
  - Axios + axios-cache-adapter for API access.
  - Dexie (IndexedDB) for offline storage and scan event persistence.
  - Luxon for date/time handling.
  - CASL for permission evaluation.

- **Dependency Map (App repo)**:
  - **HotWax OMS API** (primary backend):
    - `inventory-cycle-count/*` endpoints for work efforts, sessions, uploads, exports, reviews, and diagnostics.【F:src/composables/useInventoryCountRun.ts†L29-L285】【F:src/composables/useInventoryCountImport.ts†L300-L506】
    - `oms/dataDocumentView` for session locks and inventory snapshots.【F:src/composables/useInventoryCountImport.ts†L430-L469】【F:src/composables/useProductMaster.ts†L390-L487】
    - `oms/statuses` for cycle count status descriptions.【F:src/composables/useInventoryCountRun.ts†L150-L170】
    - `admin/serviceJobs/*` for upload job status details.【F:src/composables/useInventoryCountImport.ts†L507-L516】
  - **Search/Index services**: Solr-backed product queries via `inventory-cycle-count/runSolrQuery` to resolve product identifiers and lists.【F:src/composables/useProductMaster.ts†L43-L178】【F:src/composables/useProductMaster.ts†L255-L368】
  - **Auth/Launchpad integration**: app login redirects through Launchpad and uses tokenized OMS endpoints defined in environment settings.【F:.env.example†L9-L10】【F:src/stores/authStore.ts†L55-L176】

## 4. Technical Context
- **Run locally**:
  1. Install dependencies: `npm install`.
  2. Copy `.env.example` to `.env` and fill in the required values.
  3. Start the dev server: `ionic serve` (or `npm run serve`).

- **Environment variables**:
  - `VUE_APP_PERMISSION_ID` controls the permission required to access the app.
  - `VUE_APP_LOGIN_URL` and `VUE_APP_EMBEDDED_LAUNCHPAD_URL` configure login and embedded Launchpad URLs.
  - `VUE_APP_VIEW_SIZE`, `VUE_APP_CACHE_MAX_AGE`, and `VUE_APP_MAPPING_INVCOUNT` control pagination, caching, and CSV import mappings.
  - See `.env.example` for the full set of supported variables and their defaults.【F:.env.example†L1-L10】

---

![Inventory Count app](https://user-images.githubusercontent.com/15027245/150728116-1677a5d6-223f-4d65-9c45-2582ed7056dd.png)


# Prerequisite
Ionic CLI - If you don't have the ionic CLI installed, refer [official documentation](https://ionicframework.com/docs/intro/cli) for the installation instructions.

For a high level overview of the project layout take a look at [docs/README.md](docs/README.md).


# Build Notes (Users)

1. Download the app from [release](https://github.com/hotwax/inventorycount/releases) page and extract it.
2. Go to the app directory.
3. Run following command to download dependencies  
    `npm i`
4. Create a `.env` file by taking reference from the `.env.example`.
5. To run the app in browser use the command: `ionic serve`


# Build Notes (Contributors)

1. Open a Terminal window
2. Clone app using the command: `git clone https://github.com/hotwax/inventorycount.git <repository-name>`
3. Go to the <repository-name> directory using command: `cd <repository-name>`
4. Run following command to download dependencies
    `npm i`
5. Create a `.env` file by taking reference from the `.env.example`.
6. To run the app in browser use the command: `ionic serve`

## Firebase Hosting

Here are the steps to deploy app on firebase hosting

### Prerequisite

- [Firebase Cli](https://firebase.google.com/docs/cli) should be installed
- Firebase project should be created
- You should have access to firebase project

### Dev deployment

- Build the application using following command
  `ionic build`

- Login into firebase
  `firebase login`

- Run following command to deploy to firebase hosting
  `firebase deploy --only hosting:sm-dev`

## How to build application in different environment or modes(staging, production, qa, etc)?

As there is a bug in Ionic cli due to which we cannot pass flag variables for commands (See [#4669](https://github.com/ionic-team/ionic-cli/issues/4642)). To build application in different modes we need to use vue-cli-service to build and then use the built app using capacitor copy command further.

Follow following instructions:

1. Manually build the application using vue-cli-service:
   npx vue-cli-service build --mode=sandbox

2. Copy web assets to the native project without building the app:
   ionic capacitor copy ios --no-build

3. Open the Android Studio / XCode project:
   ionic capacitor open android  
   ionic capacitor open ios

# Contribution Guideline

1. Fork the repository and clone it locally from the `main` branch. Before starting your work make sure it's up to date with current `main` branch.
2. Pick an issue from [here](https://github.com/hotwax/inventorycount/issues). Write in the issue comment that you want to pick it, if you can't assign yourself. **Please stay assigned to one issue at a time to not block others**.
3. Create a branch for your edits. Use the following branch naming conventions: **inventorycount/issue-number**.
4. Please add issue number to your commit message.
5. Propose a Pull Request to `main` branch containing issue number and issue title.
6. Use [Pull Request template](https://github.com/hotwax/inventorycount/blob/main/.github/PULL_REQUEST_TEMPLATE.md) (it's automatically added to each PR) and fill as much fields as possible to describe your solution.
7. Reference any relevant issues or other information in your PR.
8. Wait for review and adjust your PR according to it.
9. Congrats! Your PR should now be merged in!

If you can't handle some parts of the issue then please ask for help in the comment. If you have any problems during the implementation of some complex issue, feel free to implement just a part of it.

## Report a bug or request a feature

Always define the type of issue:
* Bug report
* Feature request

While writing issues, please be as specific as possible. All requests regarding support with implementation or application setup should be sent to.
# UI / UX Resources
You may find some useful resources for improving the UI / UX of the app <a href="https://www.figma.com/community/file/885791511781717756" target="_blank">here</a>.

# Join the community on Discord
If you have any questions or ideas feel free to join our <a href="https://discord.gg/SwpJnpdyg3" target="_blank">Discord channel</a>.
    
# The license

Inventory Count app is completely free and released under the Apache v2.0 License. Check <a href="https://github.com/hotwax/inventorycount/blob/main/LICENSE" target="_blank">LICENSE</a> for more details.

