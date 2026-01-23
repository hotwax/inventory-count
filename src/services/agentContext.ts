import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { db } from '@/services/appInitializer';
import { useProductStore } from '@/stores/productStore';
import { detectAgentIntent } from '@/services/agentIntent';

const SAMPLE_LIMIT = 25;
const PRODUCT_SAMPLE_LIMIT = 20;
const LOCAL_DB_RESULT_LIMIT = 25;
const BULK_UPLOAD_DATE_FORMAT = 'MM-dd-yyyy HH:mm:ss';
const BULK_UPLOAD_SUPPORTED_FORMAT = 'CSV';

const bulkUploadFields = (() => {
  try {
    return process.env.VUE_APP_MAPPING_INVCOUNT
      ? JSON.parse(process.env.VUE_APP_MAPPING_INVCOUNT)
      : {};
  } catch {
    return {};
  }
})();

const bulkUploadRequiredFields = Object.keys(bulkUploadFields).filter(
  (key) => bulkUploadFields[key]?.required === true
);
const bulkUploadOptionalFields = Object.keys(bulkUploadFields).filter(
  (key) => bulkUploadFields[key]?.required === false
);

const mapInventoryItem = (item: any) => ({
  productId: item.productId || undefined,
  productIdentifier: item.productIdentifier || undefined,
  facilityId: item.facilityId || undefined,
  quantity: item.quantity,
  status: item.status || undefined,
  isRequested: item.isRequested || undefined,
});

const mapProductSummary = (product: any) => ({
  productId: product.productId,
  productName: product.productName,
  parentProductName: product.parentProductName,
  internalName: product.internalName,
  goodIdentifications: product.goodIdentifications,
});

const mapProductIdentification = (item: any) => ({
  productId: item.productId,
  identKey: item.identKey,
  value: item.value,
});

const mapScanEvent = (event: any) => ({
  productId: event.productId || undefined,
  scannedValue: event.scannedValue || undefined,
  quantity: event.quantity,
  createdAt: event.createdAt || undefined,
});

const mapProductInventory = (record: any) => ({
  productId: record.productId,
  facilityId: record.facilityId,
  quantityOnHandTotal: record.quantityOnHandTotal,
  availableToPromiseTotal: record.availableToPromiseTotal,
});

const extractValue = (input: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
};

const buildLocalDbQuery = async (
  prompt: string | undefined,
  route: RouteLocationNormalizedLoaded,
  intent: ReturnType<typeof detectAgentIntent>
) => {
  if (!prompt?.trim()) return null;
  const normalized = prompt.toLowerCase();
  const wantsLocalDb =
    /(inventorycountrecords|inventory count records|productidentification|product identification|good identification|goodidentification|scan events|scanevents|productinventory|product inventory)/.test(
      normalized
    );

  if (!wantsLocalDb) return null;

  const identifier =
    intent.identifier ||
    extractValue(prompt, [
      /identifier\s*[:=]?\s*([A-Za-z0-9._-]+)/i,
      /good\s*identifications?\s*(?:for|:)?\s*([A-Za-z0-9._-]+)/i,
    ]);
  const normalizedIdentifier = identifier?.toLowerCase();
  const productId = extractValue(prompt, [/product(?:\s+id)?\s*[:=]?\s*([A-Za-z0-9._-]+)/i]);
  const facilityId = extractValue(prompt, [/facility(?:\s+id)?\s*[:=]?\s*([A-Za-z0-9._-]+)/i]);
  const inventoryCountImportId = route.params?.inventoryCountImportId as string | undefined;

  const localDbQuery: Record<string, unknown> = {
    query: prompt,
  };
  let hasData = false;

  if (identifier) localDbQuery.identifier = identifier;
  if (productId) localDbQuery.productId = productId;
  if (facilityId) localDbQuery.facilityId = facilityId;
  if (inventoryCountImportId) localDbQuery.inventoryCountImportId = inventoryCountImportId;

  const database = db;
  if (!database) return localDbQuery;

  const wantsProductIdentifications =
    /(productidentification|product identification|good identification|goodidentification|identifier)/.test(
      normalized
    );
  const wantsInventoryCountRecords = /(inventorycountrecords|inventory count records)/.test(normalized);
  const wantsScanEvents = /(scan events|scanevents|scan event)/.test(normalized);
  const wantsProductInventory = /(productinventory|product inventory|qoh|atp|on hand)/.test(normalized);

  const productIds = new Set<string>();

  if (wantsProductIdentifications) {
    if (identifier) {
      const identMatches = await database.productIdentification
        .where('value')
        .equalsIgnoreCase(identifier)
        .limit(LOCAL_DB_RESULT_LIMIT)
        .toArray();
      if (identMatches.length) {
        localDbQuery.productIdentifications = identMatches.map(mapProductIdentification);
        identMatches.forEach((match) => productIds.add(match.productId));
        hasData = true;
      }
    }

    if (productId) productIds.add(productId);

    if (productIds.size) {
      const products = await database.products.bulkGet([...productIds]);
      localDbQuery.products = products.filter(Boolean).map(mapProductSummary);
      if ((localDbQuery.products as any[])?.length) hasData = true;
    } else if (identifier) {
      const directProduct = await database.products.get(identifier);
      if (directProduct) {
        localDbQuery.products = [mapProductSummary(directProduct)];
        productIds.add(directProduct.productId);
        hasData = true;
      }
    }
  }

  if (wantsInventoryCountRecords && inventoryCountImportId) {
    const records = await database.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter((item) => {
        if (
          normalizedIdentifier &&
          (item.productIdentifier || '').toLowerCase() !== normalizedIdentifier
        ) {
          return false;
        }
        if (productId && item.productId !== productId) return false;
        return true;
      })
      .limit(LOCAL_DB_RESULT_LIMIT)
      .toArray();
    if (records.length) {
      localDbQuery.inventoryCountRecords = records.map(mapInventoryItem);
      hasData = true;
    }
  }

  if (wantsScanEvents && inventoryCountImportId) {
    const events = await database.scanEvents
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter((event) => {
        if (
          normalizedIdentifier &&
          (event.scannedValue || '').toLowerCase() !== normalizedIdentifier
        ) {
          return false;
        }
        if (productId && event.productId !== productId) return false;
        return true;
      })
      .limit(LOCAL_DB_RESULT_LIMIT)
      .toArray();
    if (events.length) {
      localDbQuery.scanEvents = events.map(mapScanEvent);
      hasData = true;
    }
  }

  if (wantsProductInventory) {
    let inventoryRecords: any[] = [];
    const inventoryProductId = productId || Array.from(productIds)[0];
    if (inventoryProductId) {
      inventoryRecords = await database.productInventory
        .where('productId')
        .equals(inventoryProductId)
        .toArray();
    }

    if (facilityId) {
      inventoryRecords = inventoryRecords.filter((record) => record.facilityId === facilityId);
    }

    if (inventoryRecords.length) {
      localDbQuery.productInventory = inventoryRecords
        .slice(0, LOCAL_DB_RESULT_LIMIT)
        .map(mapProductInventory);
      hasData = true;
    }
  }

  if (!hasData) {
    localDbQuery.notes = ['No local matches found in IndexedDB for this query.'];
  }
  return localDbQuery;
};

const buildIntentData = async (
  route: RouteLocationNormalizedLoaded,
  intent: ReturnType<typeof detectAgentIntent>,
  prompt?: string
) => {
  const data: Record<string, unknown> = {};
  const database = db;

  if (intent.tags.includes('upload_help')) {
    data.bulkUpload = {
      requiredFields: bulkUploadRequiredFields,
      optionalFields: bulkUploadOptionalFields,
      supportedFormat: BULK_UPLOAD_SUPPORTED_FORMAT,
      dateFormat: BULK_UPLOAD_DATE_FORMAT,
    };
  }

  if (!database) return data;

  const inventoryCountImportId = route.params?.inventoryCountImportId as string | undefined;

  if (intent.tags.includes('missing_sku') && inventoryCountImportId) {
    const unmatched = await database.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter((item) => !item.productId)
      .limit(100)
      .toArray();

    const missingSkus = [
      ...new Set(
        unmatched
          .map((item) => item.productIdentifier)
          .filter((value) => typeof value === 'string' && value.trim())
          .map((value) => value.trim())
      ),
    ];

    if (missingSkus.length) data.missingSkus = missingSkus;
  }

  if (intent.tags.includes('missing_facility') && inventoryCountImportId) {
    const knownFacilityIds = new Set(
      (useProductStore().getFacilities || [])
        .map((facility: any) => facility.facilityId)
        .filter(Boolean)
    );

    const missingFacilities = await database.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter((item) =>
        !item.facilityId
          ? true
          : !knownFacilityIds.has(item.facilityId)
      )
      .limit(100)
      .toArray();

    const missingFacilityIds = [
      ...new Set(
        missingFacilities
          .map((item) => item.facilityId || '')
          .filter((value) => typeof value === 'string' && value.trim())
          .map((value) => value.trim())
      ),
    ];

    if (missingFacilityIds.length) data.missingFacilities = missingFacilityIds;
    if (missingFacilities.some((item) => !item.facilityId)) {
      data.missingFacilityCount = missingFacilities.filter((item) => !item.facilityId).length;
    }
  }

  if (intent.tags.includes('product_lookup') && intent.identifier) {
    const productIds = new Set<string>();
    const identifier = intent.identifier;
    const normalizedIdentifier = identifier.toLowerCase();

    const identMatches = await database.productIdentification
      .where('value')
      .equalsIgnoreCase(identifier)
      .toArray();

    const identPrefixMatches = await database.productIdentification
      .where('value')
      .startsWithIgnoreCase(identifier)
      .limit(50)
      .toArray();

    [...identMatches, ...identPrefixMatches].forEach((match) => productIds.add(match.productId));

    const directMatch = await database.products.get(identifier);
    if (directMatch?.productId) productIds.add(directMatch.productId);

    const nameMatches = await database.products
      .filter((product: any) => {
        const candidates = [
          product.productId,
          product.productName,
          product.parentProductName,
          product.internalName,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        const nameMatch = candidates.some((value) => value.includes(normalizedIdentifier));
        const identMatch = product.goodIdentifications?.some((ident: any) =>
          String(ident?.value || '')
            .toLowerCase()
            .includes(normalizedIdentifier)
        );
        return nameMatch || identMatch;
      })
      .limit(25)
      .toArray();

    nameMatches.forEach((product) => productIds.add(product.productId));

    if (productIds.size || nameMatches.length) {
      const products = productIds.size
        ? await database.products.bulkGet([...productIds])
        : nameMatches;
      data.productLookup = {
        identifier,
        products: products.filter(Boolean).map(mapProductSummary),
      };
    }
  }

  const localDbQuery = await buildLocalDbQuery(prompt, route, intent);
  if (localDbQuery) data.localDbQuery = localDbQuery;

  return data;
};

export async function buildAgentContext(route: RouteLocationNormalizedLoaded, prompt?: string) {
  const intent = detectAgentIntent(prompt);
  const productStore = useProductStore();
  const currentFacility = productStore.getCurrentFacility;
  const facilities = (productStore.getFacilities || []).map((facility: any) => ({
    facilityId: facility.facilityId,
    facilityName: facility.facilityName,
  }));

  const context: Record<string, unknown> = {
    app: 'inventory-count',
    generatedAt: new Date().toISOString(),
    route: {
      name: route.name,
      path: route.path,
    },
    intent,
    currentFacility: currentFacility
      ? {
          facilityId: currentFacility.facilityId,
          facilityName: currentFacility.facilityName,
        }
      : null,
    facilities,
  };

  const database = db;
  const intentData = await buildIntentData(route, intent, prompt);
  if (Object.keys(intentData).length) context.intentData = intentData;
  if (!database) return context;

  const inventoryCountImportId = route.params?.inventoryCountImportId as string | undefined;
  if (!inventoryCountImportId) return context;

  const baseQuery = database.inventoryCountRecords
    .where('inventoryCountImportId')
    .equals(inventoryCountImportId);

  const totalItems = await baseQuery.count();
  const countedItems = await baseQuery.and((item) => item.quantity > 0).count();
  const uncountedItems = await baseQuery.and((item) => item.quantity === 0).count();
  const unmatchedItems = await baseQuery.and((item) => !item.productId).count();
  const undirectedItems = await baseQuery.and((item) => item.isRequested === 'N').count();

  const sampleItems = await baseQuery.limit(SAMPLE_LIMIT).toArray();
  const unmatchedSample = await baseQuery
    .and((item) => !item.productId)
    .limit(SAMPLE_LIMIT)
    .toArray();

  const productsSample = await database.products.limit(PRODUCT_SAMPLE_LIMIT).toArray();

  context.inventoryCount = {
    inventoryCountImportId,
    totalItems,
    countedItems,
    uncountedItems,
    unmatchedItems,
    undirectedItems,
    sampleItems: sampleItems.map(mapInventoryItem),
    unmatchedSample: unmatchedSample.map(mapInventoryItem),
  };

  context.productsSample = productsSample.map(mapProductSummary);

  return context;
}
