Cycle count full-flow E2E tests live here.

Coverage:
- positive flow: upload -> assigned -> store count -> session submit -> review -> close
- negative flow: review submission stays blocked until the requested item is actually counted

Implementation notes:
- specs stay under `playwright/tests/cyclecount-e2e`
- page objects stay under `playwright/pages/cyclecount`
- each test generates a unique upload CSV from the shared `data.csv` template
