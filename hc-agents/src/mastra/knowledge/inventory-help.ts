export type InventoryHelpEntry = {
  id: string;
  title: string;
  body: string[];
  keywords: string[];
  related?: string[];
};

export const inventoryHelpEntries: InventoryHelpEntry[] = [
  {
    id: 'import-missing-skus',
    title: 'Missing SKUs in import file',
    body: [
      'Ensure the SKU column is mapped to productSku or productId in the import mapping.',
      'Check for leading zeros or whitespace differences in the file.',
      'Verify the product exists in the product master (sync if needed).',
      'Confirm the product identification preference matches the SKU type being imported.',
    ],
    keywords: ['missing sku', 'sku not found', 'product sku', 'product id', 'product identifier'],
    related: ['import-missing-facilities', 'import-date-format'],
  },
  {
    id: 'import-missing-facilities',
    title: 'Missing facilities in import file',
    body: [
      'Use facilityId or externalFacility columns that match OMS facilities.',
      'Verify the user has access to the facility in the app.',
      'If the file mixes facilities, ensure each row has the correct facility value.',
      'Check for typos or mismatched external IDs.',
    ],
    keywords: ['missing facility', 'facility not found', 'facility id', 'external facility'],
    related: ['import-missing-skus'],
  },
  {
    id: 'import-date-format',
    title: 'Invalid date format in import file',
    body: [
      'Use the expected format: MM-dd-yyyy HH:mm:ss (example: 12-31-2023 23:59:59).',
      'Ensure the date column is not auto-formatted by spreadsheets.',
      'If your file includes time zones, convert to the app time zone before upload.',
    ],
    keywords: ['date format', 'invalid date', 'estimatedCompletionDate', 'estimatedStartDate'],
    related: ['import-missing-skus', 'import-missing-facilities'],
  },
  {
    id: 'tabs-overview',
    title: 'Count tabs overview',
    body: [
      'Counted: items with a productId, requested (isRequested = Y or null), and quantity > 0.',
      'Uncounted: items with quantity = 0 after aggregation.',
      'Unmatched: items missing productId (not found in product catalog).',
      'Undirected: items with productId and isRequested = N (directed count only).',
    ],
    keywords: ['counted', 'uncounted', 'unmatched', 'undirected', 'tabs'],
    related: ['counted-tab', 'uncounted-tab', 'unmatched-tab', 'undirected-tab'],
  },
  {
    id: 'counted-tab',
    title: 'Why an item is in Counted',
    body: [
      'The item has a productId and is marked requested (isRequested = Y or null).',
      'After aggregation, its quantity is greater than zero.',
      'These items represent directed or accepted counts in the session.',
    ],
    keywords: ['counted tab', 'counted items'],
    related: ['tabs-overview'],
  },
  {
    id: 'uncounted-tab',
    title: 'Why an item is in Uncounted',
    body: [
      'After aggregation, the quantity is zero.',
      'This tab is shown for directed counts to highlight items not yet counted.',
    ],
    keywords: ['uncounted tab', 'uncounted items'],
    related: ['tabs-overview'],
  },
  {
    id: 'unmatched-tab',
    title: 'Why an item is in Unmatched',
    body: [
      'The scan does not match any product in the catalog, so productId is missing.',
      'Use Match to link the scan to the correct product before submitting.',
    ],
    keywords: ['unmatched tab', 'unmatched items', 'match product'],
    related: ['match-product'],
  },
  {
    id: 'undirected-tab',
    title: 'Why an item is in Undirected',
    body: [
      'Undirected items are not requested for this directed count (isRequested = N).',
      'In DIRECTED_COUNT, a product is undirected if it is not in the session or isRequested = N.',
      'These can be reviewed or discarded during review and completion.',
    ],
    keywords: ['undirected tab', 'undirected items', 'directed count'],
    related: ['match-product'],
  },
  {
    id: 'hand-counted-items',
    title: 'Hand-counted items',
    body: [
      'Use Add hand-counted items to search and add products manually.',
      'Undirected items cannot be added in a directed count.',
      'Save progress adds hand-counted quantities to the scan events log.',
      'You can remove a hand-counted line before saving if needed.',
    ],
    keywords: ['hand counted', 'add hand counted', 'manual count'],
    related: ['remove-scan'],
  },
  {
    id: 'remove-scan',
    title: 'Removing a scan',
    body: [
      'Open the scan action menu on a scan event and choose Remove scan.',
      'The app records a negating scan event to offset the original scan.',
      'Counts update automatically after aggregation.',
    ],
    keywords: ['remove scan', 'negate scan', 'scan event'],
    related: ['hand-counted-items'],
  },
  {
    id: 'match-product',
    title: 'Matching an unmatched product',
    body: [
      'Open the Unmatched tab, choose a scan, and click Match.',
      'Search and select the correct product, then save.',
      'In DIRECTED_COUNT, if the product is not already in the session, it becomes undirected (isRequested = N).',
      'If the product already exists in the session, it keeps its requested flag.',
      'In non-directed counts, matched items are requested (isRequested = Y) and will appear in Counted or Uncounted based on quantity.',
    ],
    keywords: ['match product', 'match', 'unmatched scan'],
    related: ['undirected-tab', 'counted-tab', 'uncounted-tab'],
  },
  {
    id: 'cycle-count-overview',
    title: 'Cycle count overview',
    body: [
      'Use cycle counts to capture on-hand inventory for a facility or store.',
      'Plan the count, start a session, scan or hand-count items, then review and complete.',
      'Docs: https://docs.hotwax.co/documents/store-operations/inventory/cycle-count',
    ],
    keywords: ['cycle count', 'overview', 'inventory count', 'cycle count guide'],
    related: ['cycle-count-plan', 'cycle-count-session', 'cycle-count-review'],
  },
  {
    id: 'cycle-count-plan',
    title: 'Plan cycle count',
    body: [
      'Define count scope, facility, and timing before starting.',
      'Decide on DIRECTED_COUNT vs HARD_COUNT and prepare the product list.',
      'Docs: https://docs.hotwax.co/documents/store-operations/inventory/cycle-count/plan-cycle-count',
    ],
    keywords: ['plan cycle count', 'create cycle count', 'directed count', 'hard count'],
    related: ['cycle-count-overview', 'cycle-count-session'],
  },
  {
    id: 'cycle-count-session',
    title: 'Start and complete a session',
    body: [
      'Start the session, scan or hand-count products, and keep an eye on unmatched items.',
      'Complete the session after resolving mismatches and reviewing counts.',
      'Docs: https://docs.hotwax.co/documents/store-operations/inventory/cycle-count/start-complete-session',
    ],
    keywords: ['start session', 'complete session', 'cycle count session', 'scan items'],
    related: ['cycle-count-overview', 'cycle-count-review'],
  },
  {
    id: 'cycle-count-review',
    title: 'Count progress review',
    body: [
      'Review counted, uncounted, unmatched, and undirected items before submission.',
      'Resolve unmatched items and decide on undirected items for directed counts.',
      'Docs: https://docs.hotwax.co/documents/store-operations/inventory/cycle-count/count-progress-review',
    ],
    keywords: ['count progress review', 'review count', 'counted items', 'uncounted items'],
    related: ['cycle-count-overview', 'tabs-overview'],
  },
];

export const inventoryHelpMap = Object.fromEntries(
  inventoryHelpEntries.map((entry) => [entry.id, entry])
);
