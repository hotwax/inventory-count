# Inventory Count App Structure

This document gives a high‑level overview of the project layout. It is intended for new developers who want to understand where the main pieces of the application live.

## Top‑level folders

- **`android/`** and **`ios/`** – Capacitor generated projects used to build the native Android and iOS applications.
- **`public/`** – Static assets and the main `index.html` used when running in the browser.
- **`src/`** – Core source code of the application (Vue 3 + Ionic + TypeScript).

Other files like `package.json`, `babel.config.js`, `vue.config.js` and `tsconfig.json` contain configuration for the build tools.

## Source folder (`src/`)

The `src` directory contains all application logic. Important sub‑folders are:

| Path | Purpose |
| ---- | ------- |
| `src/components/` | Reusable Vue components such as modals, popovers and common UI widgets. |
| `src/views/` | Page level components that map to application routes. |
| `src/router/` | Vue Router configuration defining navigation between views. |
| `src/store/` | Vuex modules for state management (`user`, `product`, `count`, `util`). |
| `src/services/` | Abstractions over API calls. Each file wraps related REST endpoints. |
| `src/authorization/` | Permission logic built with CASL. Provides helpers like `hasPermission`. |
| `src/adapter/` | Re‑exports API helper functions from `@hotwax/oms-api` for use throughout the app. |
| `src/event-bus/` | Event emitter instance (`mitt`) used for cross component communication. |
| `src/offline-helper/` | Helper for monitoring network status and handling offline events. |
| `src/user-utils/` | Utility functions related to user actions (login, logout, loading indicator). |
| `src/utils/` | Miscellaneous utilities (CSV parsing, toast helpers, date functions, etc.). |
| `src/logger/` | Configures application wide logging via `vue-logger-plugin`. |
| `src/i18n.ts` & `src/locales/` | Internationalisation setup and locale message files. |
| `src/theme/` | Ionic and application specific styling variables. |
| `src/assets/` | Static images and icons referenced by components. |
| `src/types/` | TypeScript interfaces and helper types. |

The main entry file is `src/main.ts`, which mounts the root `App.vue` component and initialises plugins such as routing, store and i18n.

### Entry point (`src/main.ts`)

`src/main.ts` creates the Vue application instance and wires together the major plugins:

- **IonicVue** – provides Ionic UI components configured in Material Design mode.
- **Vue Router** – imported from `src/router/index.ts` and registered with the app.
- **I18n** – localisation plugin setup from `src/i18n.ts`.
- **Vuex store** – centralised state from `src/store`.
- **CASL permission plugin** – initialises app permission rules from `src/authorization`.
- **dxp-components** – Hotwax UI components which rely on helper functions defined in
  `src/adapter` and `src/user-utils`.

It also registers global date filters using Luxon and finally mounts the `App.vue` root
component once the router is ready.

### Root component (`App.vue`)

`App.vue` sets up the high level layout. It renders an `IonSplitPane` with the side
`Menu` and a main `ion-router-outlet`. Before the component is mounted it registers to the
global event bus so other components can show or hide a loader. On mount it initialises the
API helper with the current user token and instance URL. When unmounted the configuration is
reset and event handlers are cleaned up.

### Routing

Route definitions live in `src/router/index.ts`. It creates a router using Ionic's
`createWebHistory` and defines all application pages. Each route can specify a
`permissionId` inside its `meta` field which is checked in a global `beforeEach` guard. The
`authGuard` and `loginGuard` functions ensure the user is authenticated before accessing
protected pages, redirecting to the login screen if needed.

### Vuex store

State management is handled via Vuex in `src/store`. The store uses
`vuex-persistedstate` so selected state survives page reloads. Modules are namespaced and
include:

- **`user`** – authentication data, user profile and store settings.
- **`product`** – cached product information and current product details.
- **`count`** – cycle count lists, stats and related query state.
- **`util`** – shared utility data such as facility groups.

Each module exposes its own state, getters, actions and mutations under `src/store/modules/`.

### Authentication flow

User login and logout are managed through the `user` Vuex module. During login the
`user/login` action performs a number of API requests and updates the store with
the returned data:

* Sets the instance URL used for subsequent requests.
* Retrieves the server side permission list to verify the user may access the app.
* Exchanges the login token for an API key via `UserService.login` and fetches
  the user profile with `UserService.getUserProfile`.
* Loads associated facilities, eCommerce stores and any saved preferences such as
  the selected brand and product identification settings.
* Updates product store settings and loads saved CSV field mappings.

State for the `user` module along with cached product details and unmatched count
items is persisted using `vuex-persistedstate`. The store configuration specifies
which paths are saved to browser `localStorage`:

```
paths: ["user", "product.cached", "count.cachedUnmatchProducts"]
```

This allows authentication data and cached resources to survive page reloads.

When logging out, the `user/logout` action clears session data and resets related
modules:

* Removes the token, user profile and permissions from the store.
* Clears OMS redirection info and resets API configuration and CASL permissions.
* Resets plugin state from `dxp-components` and clears cached products and count
  information.
* Resets product store settings back to their defaults.

These steps ensure a clean state before redirecting back to the login screen.

#### Module layout

Every module directory follows the same pattern:

- `actions.ts` – asynchronous operations such as API calls which commit mutations when data is received.
- `getters.ts` – helper functions that return or compute state for components.
- `mutations.ts` – synchronous updates to the module state.
- `mutation-types.ts` – string constants used as mutation names.
- `*State.ts` – TypeScript interface describing the module's state.
- `index.ts` – wires the module together with `namespaced: true`, provides the default state and exports a `Module`.

For example the count module at `src/store/modules/count/index.ts` defines the default state and registers its actions, getters and mutations.

##### Adding a new module

1. Create a folder inside `src/store/modules` (e.g. `src/store/modules/myModule`).
2. Define the state interface in `MyModuleState.ts` and initialise the default state inside `index.ts`.
3. Create `mutation-types.ts` with constants for all mutations.
4. Implement `mutations.ts` using those constants to modify the state.
5. Write `actions.ts` to perform asynchronous tasks and commit the mutations.
6. Expose computed values from `getters.ts`.
7. In `index.ts` import the above files and export the module object.
8. Register the module in `src/store/index.ts` so it becomes available application wide.
9. Extend `RootState.ts` with your new state type and, if needed, add its path to the persisted state plugin.

##### Adding a new page

Adding a new route generally involves wiring together a service, Vuex state and
a view component. The following steps outline the process used for features like
the Cycle Count Lists screen:

1. **Create the view component** under `src/views/` (e.g.
   `src/views/CycleCountLists.vue`). Define its route in `src/router/index.ts`
   and include any required permissions in the route `meta` field.
2. **Add an API service** in `src/services` if the page relies on new endpoints
   or logic. Each service groups related requests and returns typed responses.
3. **Update or create a Vuex module** in `src/store/modules` to manage the
   page's data. Implement actions to fetch records, mutations to update state and
   getters for computed values.
4. **Load data within the view** by dispatching the store actions from the
   component's `setup()` or lifecycle hooks. Use the resulting store getters to
   render lists and show loading indicators.
5. **Expose the page through navigation**, for example by adding an entry to the
   side menu or linking from other screens.

## Environment configuration

Configuration values for different environments are stored in `.env` files. The repository contains `.env.example` which lists all supported variables. Copy this file to `.env` and adjust the values to run the application locally.

---

For build instructions and contribution guidelines please refer to the main [README](../README.md).
