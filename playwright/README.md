# Playwright Structure

- Put spec files in `playwright/tests/`.
- Put page object models in `playwright/pages/`.
- Use `data-testid` selectors first.

## Commands

- `npm run test:playwright`
- `npm run test:playwright:headed`
- `npm run test:playwright:ui`

## Runtime

- By default Playwright starts the Vue app on `http://127.0.0.1:8080`.
- To target an already running environment, set `PLAYWRIGHT_BASE_URL`.

Example:

```bash
PLAYWRIGHT_BASE_URL=https://inventorycount-dev.hotwax.io npm run test:playwright
```

## Notes

- Keep environment-specific credentials out of specs.
- Prefer reusable page objects over inline locators in large flows.
