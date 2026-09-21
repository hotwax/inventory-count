import { describe, it, expect, vi, beforeEach } from 'vitest';

const runSolrQuery = vi.fn();

const loggerWarn = vi.fn();

vi.mock('@common', () => ({
  logger: { error: vi.fn(), warn: (...args: any[]) => loggerWarn(...args) },
  commonUtil: { hasError: (resp: any) => !!resp?.data?.errors },
  useSolrSearch: () => ({ runSolrQuery })
}));

import { useProductFacets, PRODUCT_FACET_FILTERS, PRODUCT_FACET_BASE_FILTERS, FacetFilterConfig } from './useProductFacets';

const { fetchFacetOptions, quoteFacetValue } = useProductFacets();

/** Options are cached per field for the session, so each test uses its own field name */
function config(field: string, extra: Partial<FacetFilterConfig> = {}): FacetFilterConfig {
  return { field, label: field, modalTitle: field, searchPlaceholder: field, ...extra };
}

function facetResponse(field: string, buckets: any[]) {
  return { data: { facets: { [`${field}Facet`]: { buckets } } } };
}

describe('fetchFacetOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('asks Solr for a terms facet on any field, with rows 0', async () => {
    const field = 'brandName';
    runSolrQuery.mockResolvedValue(facetResponse(field, [{ val: 'Nike', count: 4 }]));

    const options = await fetchFacetOptions(config(field));

    expect(runSolrQuery).toHaveBeenCalledTimes(1);
    const payload = runSolrQuery.mock.calls[0][0];
    // run#SolrQuery rejects a body without a query
    expect(payload.json.query).toBe('*:*');
    expect(payload.json.params.rows).toBe(0);
    expect(payload.json.filter).toEqual(PRODUCT_FACET_BASE_FILTERS);
    expect(payload.json.facet).toEqual({
      brandNameFacet: {
        type: 'terms',
        field: 'brandName',
        mincount: 1,
        limit: 1000,
        offset: 0,
        sort: 'index'
      }
    });

    expect(options).toEqual([
      { id: 'Nike', label: 'Nike', value: 'Nike', groupLabel: '', count: 4 }
    ]);
  });

  it('offers only options from products the list can return', async () => {
    // The facet must be restricted the same way the product search is, or it lists dead options
    expect(PRODUCT_FACET_BASE_FILTERS).toEqual(
      expect.arrayContaining(['docType: PRODUCT', 'isVariant: true', 'isVirtual: false'])
    );
  });

  it('splits prefixed values for display but keeps the raw value', async () => {
    const field = 'featureLike';
    runSolrQuery.mockResolvedValue(facetResponse(field, [
      { val: 'COLOR/Red', count: 3 },
      { val: 'SIZE/Extra Large', count: 1 },
      { val: 'NoSlash', count: 2 }
    ]));

    const options = await fetchFacetOptions(config(field, { splitOnSlash: true }));

    expect(options[0]).toEqual({ id: 'COLOR/Red', label: 'Red', value: 'COLOR/Red', groupLabel: 'COLOR', count: 3 });
    expect(options[1]).toEqual({ id: 'SIZE/Extra Large', label: 'Extra Large', value: 'SIZE/Extra Large', groupLabel: 'SIZE', count: 1 });
    // A value without the separator is left alone
    expect(options[2]).toEqual({ id: 'NoSlash', label: 'NoSlash', value: 'NoSlash', groupLabel: '', count: 2 });
  });

  it('pages on offset until a short page comes back', async () => {
    const field = 'pagedField';
    const fullPage = Array.from({ length: 1000 }, (unused, index) => ({ val: `V${index}`, count: 1 }));
    runSolrQuery
      .mockResolvedValueOnce(facetResponse(field, fullPage))
      .mockResolvedValueOnce(facetResponse(field, [{ val: 'LAST', count: 1 }]));

    const options = await fetchFacetOptions(config(field));

    expect(runSolrQuery).toHaveBeenCalledTimes(2);
    expect(runSolrQuery.mock.calls[0][0].json.facet[`${field}Facet`].offset).toBe(0);
    expect(runSolrQuery.mock.calls[1][0].json.facet[`${field}Facet`].offset).toBe(1000);
    expect(options).toHaveLength(1001);
    expect(options[1000].value).toBe('LAST');
  });

  it('drops blank and repeated values', async () => {
    const field = 'dupField';
    runSolrQuery.mockResolvedValue(facetResponse(field, [
      { val: 'Shirts', count: 2 },
      { val: 'Shirts', count: 2 },
      { val: '', count: 9 }
    ]));

    const options = await fetchFacetOptions(config(field));

    expect(options.map((option: any) => option.value)).toEqual(['Shirts']);
  });

  it('never returns more options than VITE_MAX_FACETS, and says so', async () => {
    vi.stubEnv('VITE_MAX_FACETS', '5');
    const field = 'cappedField';
    const buckets = Array.from({ length: 5 }, (unused, index) => ({ val: `V${index}`, count: 1 }));
    runSolrQuery.mockResolvedValue(facetResponse(field, buckets));

    const options = await fetchFacetOptions(config(field));

    expect(options).toHaveLength(5);
    // A silent subset in a filter picker is misleading, the truncation has to be reported
    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining('cappedField'));
    expect(loggerWarn.mock.calls[0][0]).toContain('5');
  });

  it('does not request more buckets than the cap allows', async () => {
    vi.stubEnv('VITE_MAX_FACETS', '3');
    const field = 'smallCapField';
    runSolrQuery.mockResolvedValue(facetResponse(field, [{ val: 'A', count: 1 }]));

    await fetchFacetOptions(config(field));

    // Not the 1000 page default
    expect(runSolrQuery.mock.calls[0][0].json.facet[`${field}Facet`].limit).toBe(3);
  });

  it('counts distinct options against the cap, not raw buckets', async () => {
    vi.stubEnv('VITE_MAX_FACETS', '3');
    const field = 'dupCapField';
    runSolrQuery
      .mockResolvedValueOnce(facetResponse(field, [
        { val: 'A', count: 1 }, { val: 'A', count: 1 }, { val: 'B', count: 1 }
      ]))
      .mockResolvedValueOnce(facetResponse(field, [{ val: 'C', count: 1 }]));

    const options = await fetchFacetOptions(config(field));

    expect(options.map((option: any) => option.value)).toEqual(['A', 'B', 'C']);
    // Two distinct of three requested, so one slot remains and Solr pages on raw bucket offset
    expect(runSolrQuery.mock.calls[1][0].json.facet[`${field}Facet`]).toMatchObject({ limit: 1, offset: 3 });
  });

  it('does not report truncation when the options simply run out', async () => {
    vi.stubEnv('VITE_MAX_FACETS', '100');
    const field = 'shortField';
    runSolrQuery.mockResolvedValue(facetResponse(field, [{ val: 'A', count: 1 }]));

    const options = await fetchFacetOptions(config(field));

    expect(options).toHaveLength(1);
    expect(loggerWarn).not.toHaveBeenCalled();
  });

  it('caches per field so reopening the modal does not refetch', async () => {
    const field = 'cachedField';
    runSolrQuery.mockResolvedValue(facetResponse(field, [{ val: 'A', count: 1 }]));

    await fetchFacetOptions(config(field));
    await fetchFacetOptions(config(field));

    expect(runSolrQuery).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when the facet query fails', async () => {
    runSolrQuery.mockRejectedValue(new Error('undefined field'));

    const options = await fetchFacetOptions(config('brokenField'));

    expect(options).toEqual([]);
  });

  it('treats a Solr error payload as a failure', async () => {
    runSolrQuery.mockResolvedValue({ data: { errors: 'undefined field bogus' } });

    const options = await fetchFacetOptions(config('erroredField'));

    expect(options).toEqual([]);
  });

  it('configures category and feature filters out of the box', () => {
    expect(PRODUCT_FACET_FILTERS.map((facet: FacetFilterConfig) => facet.field))
      .toEqual(['productCategoryNames', 'productFeatures']);
    expect(PRODUCT_FACET_FILTERS.find((facet: FacetFilterConfig) => facet.field === 'productFeatures')?.splitOnSlash)
      .toBe(true);
  });
});

describe('quoteFacetValue', () => {
  it('phrase quotes values so slashes and spaces are literal', () => {
    expect(quoteFacetValue('COLOR/Red')).toBe('"COLOR/Red"');
    expect(quoteFacetValue('Extra Large')).toBe('"Extra Large"');
  });

  it('escapes embedded quotes and backslashes', () => {
    expect(quoteFacetValue('7" pipe')).toBe('"7\\" pipe"');
    expect(quoteFacetValue('a\\b')).toBe('"a\\\\b"');
  });
});
