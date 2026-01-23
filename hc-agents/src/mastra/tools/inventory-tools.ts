import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const inventoryCountItemSchema = z.object({
  inventoryCountImportId: z.string().optional(),
  productId: z.string().nullable().optional(),
  productIdentifier: z.string().optional(),
  facilityId: z.string().optional(),
  quantity: z.number().optional(),
  isRequested: z.string().optional(),
  status: z.string().optional(),
});

const productSchema = z.object({
  productId: z.string(),
  productName: z.string().optional(),
  parentProductName: z.string().optional(),
  internalName: z.string().optional(),
  goodIdentifications: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

const productIdentificationSchema = z.object({
  productId: z.string(),
  identKey: z.string(),
  value: z.string(),
});

const scanEventSchema = z.object({
  productId: z.string().nullable().optional(),
  scannedValue: z.string().optional(),
  quantity: z.number().optional(),
  createdAt: z.number().optional(),
});

const productInventorySchema = z.object({
  productId: z.string(),
  facilityId: z.string(),
  quantityOnHandTotal: z.number().optional(),
  availableToPromiseTotal: z.number().optional(),
});

const importRowSchema = z.record(z.any());

const uniqueValues = (values: string[]) => [
  ...new Set(values.map((value) => value.trim()).filter(Boolean)),
];

const normalizeKey = (value?: string | null) => (value || '').trim().toLowerCase();

const pickFirstString = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
  }
  return '';
};

const extractIdentifierFromQuery = (query?: string) => {
  if (!query) return '';
  const match = query.match(/identifier\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (match?.[1]) return match[1].trim();

  const goodIdentMatch = query.match(/good\s*identifications?\s*(?:for|:)?\s*([A-Za-z0-9._-]+)/i);
  if (goodIdentMatch?.[1]) return goodIdentMatch[1].trim();

  const skuMatch = query.match(/sku\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (skuMatch?.[1]) return skuMatch[1].trim();

  const productMatch = query.match(/product(?:\s+id)?\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (productMatch?.[1]) return productMatch[1].trim();

  return '';
};

export const summarizeInventoryCountTool = createTool({
  id: 'summarize-inventory-count',
  description: 'Summarize inventory count items exported from IndexedDB.',
  inputSchema: z.object({
    items: z.array(inventoryCountItemSchema),
  }),
  outputSchema: z.object({
    totalItems: z.number(),
    countedItems: z.number(),
    uncountedItems: z.number(),
    unmatchedItems: z.number(),
    undirectedItems: z.number(),
    distinctProducts: z.number(),
    facilities: z.array(z.string()),
    sampleMissingIdentifiers: z.array(z.string()),
  }),
  execute: async ({ items }) => {
    const totalItems = items.length;
    const countedItems = items.filter((item) => (item.quantity ?? 0) > 0).length;
    const uncountedItems = items.filter((item) => (item.quantity ?? 0) === 0).length;
    const unmatchedItems = items.filter((item) => !item.productId).length;
    const undirectedItems = items.filter((item) => item.isRequested === 'N').length;
    const distinctProducts = new Set(items.map((item) => item.productId).filter(Boolean)).size;
    const facilities = uniqueValues(items.map((item) => item.facilityId || '')).slice(0, 25);
    const sampleMissingIdentifiers = uniqueValues(
      items
        .filter((item) => !item.productId)
        .map((item) => item.productIdentifier || '')
    ).slice(0, 10);

    return {
      totalItems,
      countedItems,
      uncountedItems,
      unmatchedItems,
      undirectedItems,
      distinctProducts,
      facilities,
      sampleMissingIdentifiers,
    };
  },
});

export const lookupProductTool = createTool({
  id: 'lookup-product',
  description: 'Find a product match from an IndexedDB product export.',
  inputSchema: z.object({
    identifier: z.string(),
    products: z.array(productSchema).optional(),
  }),
  outputSchema: z.object({
    matches: z.array(
      z.object({
        productId: z.string(),
        productName: z.string().optional(),
        internalName: z.string().optional(),
        matchedBy: z.string(),
      })
    ),
  }),
  execute: async ({ identifier, products }) => {
    const needle = identifier.trim().toLowerCase();
    if (!needle) return { matches: [] };

    const safeProducts = products ?? [];
    const matches = [] as Array<{
      productId: string;
      productName?: string;
      internalName?: string;
      matchedBy: string;
    }>;

    for (const product of safeProducts) {
      if (product.productId.toLowerCase() === needle) {
        matches.push({
          productId: product.productId,
          productName: product.productName,
          internalName: product.internalName,
          matchedBy: 'productId',
        });
        continue;
      }

      const identMatch = product.goodIdentifications?.find(
        (ident) => ident.value.toLowerCase() === needle
      );
      if (identMatch) {
        matches.push({
          productId: product.productId,
          productName: product.productName,
          internalName: product.internalName,
          matchedBy: `ident:${identMatch.type}`,
        });
      }
    }

    return { matches: matches.slice(0, 10) };
  },
});

export const localDbQueryTool = createTool({
  id: 'local-db-query',
  description:
    'Answer questions about local IndexedDB data (inventoryCountRecords, productIdentifications, products, scanEvents, productInventory) using app-provided context.',
  inputSchema: z.object({
    query: z.string().optional(),
    identifier: z.string().optional(),
    inventoryCountImportId: z.string().optional(),
    inventoryCountRecords: z.array(inventoryCountItemSchema).optional(),
    productIdentifications: z.array(productIdentificationSchema).optional(),
    products: z.array(productSchema).optional(),
    scanEvents: z.array(scanEventSchema).optional(),
    productInventory: z.array(productInventorySchema).optional(),
    notes: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    match: z.boolean(),
    summary: z.string(),
    products: z.array(productSchema).optional(),
    productIdentifications: z.array(productIdentificationSchema).optional(),
    inventoryCountRecords: z.array(inventoryCountItemSchema).optional(),
    scanEvents: z.array(scanEventSchema).optional(),
    productInventory: z.array(productInventorySchema).optional(),
    hints: z.array(z.string()),
  }),
  execute: async ({
    query,
    identifier,
    inventoryCountRecords,
    productIdentifications,
    products,
    scanEvents,
    productInventory,
    notes,
  }) => {
    const needle = (identifier || extractIdentifierFromQuery(query)).trim().toLowerCase();
    const hints: string[] = [];

    if (!needle) {
      hints.push('Provide an identifier, SKU, or productId to narrow the local lookup.');
      return {
        match: false,
        summary: 'No identifier was provided for the local lookup.',
        hints,
      };
    }

    const matchedProductIds = new Set<string>();
    const matchedProductIdentifications =
      productIdentifications?.filter((ident) => ident.value.toLowerCase() === needle) || [];
    matchedProductIdentifications.forEach((ident) => matchedProductIds.add(ident.productId));

    const matchedProducts =
      products?.filter((product) => {
        const normalized = needle;
        if (product.productId.toLowerCase() === needle) {
          matchedProductIds.add(product.productId);
          return true;
        }
        const nameMatch = [product.productName, product.parentProductName, product.internalName]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
          .some((value) => value.includes(normalized));
        if (nameMatch) {
          matchedProductIds.add(product.productId);
          return true;
        }
        const identMatch = product.goodIdentifications?.some(
          (ident) => ident.value.toLowerCase() === needle
        );
        if (identMatch) matchedProductIds.add(product.productId);
        return !!identMatch;
      }) || [];

    const matchedInventoryRecords =
      inventoryCountRecords?.filter(
        (record) =>
          (record.productId || '').toLowerCase() === needle ||
          (record.productIdentifier || '').toLowerCase() === needle
      ) || [];

    const matchedScanEvents =
      scanEvents?.filter(
        (event) =>
          (event.productId || '').toLowerCase() === needle ||
          (event.scannedValue || '').toLowerCase() === needle
      ) || [];

    const matchedProductInventory =
      productInventory?.filter((record) => record.productId.toLowerCase() === needle) || [];

    if (notes?.length) hints.push(...notes);
    if (!productIdentifications?.length && !products?.length) {
      hints.push('No product data was provided by the app for this lookup.');
    }
    if (!inventoryCountRecords?.length && !scanEvents?.length && !productInventory?.length) {
      hints.push('No inventory session data was provided by the app for this lookup.');
    }

    const hasMatches =
      matchedProductIdentifications.length ||
      matchedProducts.length ||
      matchedInventoryRecords.length ||
      matchedScanEvents.length ||
      matchedProductInventory.length;

    const summaryParts = [];
    if (matchedProductIdentifications.length) {
      summaryParts.push(`${matchedProductIdentifications.length} product identification(s)`);
    }
    if (matchedProducts.length) summaryParts.push(`${matchedProducts.length} product(s)`);
    if (matchedInventoryRecords.length) {
      summaryParts.push(`${matchedInventoryRecords.length} inventory count record(s)`);
    }
    if (matchedScanEvents.length) summaryParts.push(`${matchedScanEvents.length} scan event(s)`);
    if (matchedProductInventory.length) {
      summaryParts.push(`${matchedProductInventory.length} inventory snapshot(s)`);
    }

    return {
      match: hasMatches,
      summary: hasMatches
        ? `Found ${summaryParts.join(', ')} for "${needle}".`
        : `No local matches found for "${needle}".`,
      products: matchedProducts.length ? matchedProducts : undefined,
      productIdentifications: matchedProductIdentifications.length
        ? matchedProductIdentifications
        : undefined,
      inventoryCountRecords: matchedInventoryRecords.length ? matchedInventoryRecords : undefined,
      scanEvents: matchedScanEvents.length ? matchedScanEvents : undefined,
      productInventory: matchedProductInventory.length ? matchedProductInventory : undefined,
      hints,
    };
  },
});

export const findMissingReferencesTool = createTool({
  id: 'find-missing-references',
  description: 'Identify missing SKUs or facilities from import rows.',
  inputSchema: z.object({
    rows: z.array(importRowSchema),
    knownSkus: z.array(z.string()).optional(),
    knownFacilities: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    missingSkus: z.array(z.string()),
    missingFacilities: z.array(z.string()),
    rowsMissingSku: z.number(),
    rowsMissingFacility: z.number(),
    hints: z.array(z.string()),
  }),
  execute: async ({ rows, knownSkus = [], knownFacilities = [] }) => {
    const skuSet = new Set(knownSkus.map(normalizeKey).filter(Boolean));
    const facilitySet = new Set(knownFacilities.map(normalizeKey).filter(Boolean));

    const missingSkus = new Set<string>();
    const missingFacilities = new Set<string>();
    let rowsMissingSku = 0;
    let rowsMissingFacility = 0;

    for (const row of rows) {
      const sku = pickFirstString(row, [
        'productSku',
        'productId',
        'sku',
        'productIdentifier',
        'productCode',
      ]);
      const facility = pickFirstString(row, [
        'facilityId',
        'facility',
        'externalFacility',
        'facilityExternalId',
        'facilityCode',
      ]);

      if (!sku) {
        rowsMissingSku += 1;
      } else if (skuSet.size && !skuSet.has(normalizeKey(sku))) {
        missingSkus.add(sku);
        rowsMissingSku += 1;
      }

      if (!facility) {
        rowsMissingFacility += 1;
      } else if (facilitySet.size && !facilitySet.has(normalizeKey(facility))) {
        missingFacilities.add(facility);
        rowsMissingFacility += 1;
      }
    }

    const hints: string[] = [];
    if (!knownSkus.length) {
      hints.push('No known SKUs were provided to validate against.');
    }
    if (!knownFacilities.length) {
      hints.push('No known facilities were provided to validate against.');
    }
    if (rowsMissingSku) {
      hints.push('Some rows are missing or have unknown SKUs. Verify import mapping and product master sync.');
    }
    if (rowsMissingFacility) {
      hints.push('Some rows are missing or have unknown facility IDs. Verify facility mapping in the file.');
    }

    return {
      missingSkus: Array.from(missingSkus).slice(0, 50),
      missingFacilities: Array.from(missingFacilities).slice(0, 50),
      rowsMissingSku,
      rowsMissingFacility,
      hints,
    };
  },
});
