import { reactive } from 'vue';
import { api, commonUtil, logger } from '@common';

/**
 * PRODUCT facet options from the enterpriseSearch Solr collection.
 *
 * `facetToSelect` is the facet name defined in the OMS component's solr Facets.json and is only
 * valid for the admin/solrFacets endpoint. `field` is the queryable Solr field the selected
 * values have to be filtered on - filtering on the facet name returns an "undefined field" 400.
 */
export const PRODUCT_FACETS = {
  productCategoryNames: {
    facetToSelect: 'productCategoryNamesFacet',
    field: 'productCategoryNames'
  },
  productFeatures: {
    facetToSelect: 'productFeaturesFacet',
    field: 'productFeatures'
  }
} as const;

export type ProductFacetKey = keyof typeof PRODUCT_FACETS;

export interface FacetOption {
  id: string;
  /** Value shown to the user. For features this is the description without the feature type. */
  label: string;
  /** Raw indexed value, this is what the Solr filter has to match. */
  value: string;
  /** Secondary text, the productFeatureTypeId for features. Empty for categories. */
  groupLabel: string;
}

const FACET_PAGE_LIMIT = 1000;
const DEFAULT_MAX_FACETS = 5000;

const optionsCache = reactive<Record<string, FacetOption[]>>({});

/**
 * productFeatures values are indexed as "{productFeatureTypeId}/{description}". Split them for
 * display but keep the raw value intact, filters are matched against the raw value.
 */
function toFacetOption(key: ProductFacetKey, entry: any): FacetOption {
  const value = String(entry?.value ?? entry?.id ?? '');
  if (key === 'productFeatures') {
    const separatorIndex = value.indexOf('/');
    if (separatorIndex !== -1) {
      return {
        id: value,
        label: value.substring(separatorIndex + 1).trim() || value,
        value,
        groupLabel: value.substring(0, separatorIndex).trim()
      };
    }
  }
  return { id: value, label: String(entry?.label || value), value, groupLabel: '' };
}

/**
 * Fetch every option of a PRODUCT facet, paginating until a page comes back empty or the
 * VITE_MAX_FACETS ceiling is reached. Results of an unfiltered fetch are cached for the session.
 */
async function fetchFacetOptions(key: ProductFacetKey, term = ''): Promise<FacetOption[]> {
  const facet = PRODUCT_FACETS[key];
  const searchTerm = term.trim();

  if (!searchTerm && optionsCache[key]?.length) return optionsCache[key];

  const maxFacets = Number(import.meta.env.VITE_MAX_FACETS) || DEFAULT_MAX_FACETS;
  let options: FacetOption[] = [];
  let offset = 0;
  let page: any[] = [];

  try {
    do {
      const resp = await api({
        url: 'admin/solrFacets',
        method: 'GET',
        params: {
          facetToSelect: facet.facetToSelect,
          docType: 'PRODUCT',
          coreName: 'enterpriseSearch',
          jsonQuery: '{"query":"*:*","filter":["docType:PRODUCT"]}',
          noConditionFind: 'Y',
          limit: FACET_PAGE_LIMIT,
          offset,
          searchfield: facet.field,
          term: searchTerm,
          q: searchTerm
        }
      }) as any;

      if (commonUtil.hasError(resp)) throw resp.data;

      page = resp.data?.facetResponse ? resp.data.facetResponse.response : resp.data?.response;
      page = Array.isArray(page) ? page : [];
      options = options.concat(page.map((entry: any) => toFacetOption(key, entry)));
      offset += FACET_PAGE_LIMIT;
    } while (page.length && options.length < maxFacets);
  } catch (err) {
    logger.error(err);
    return searchTerm ? [] : (optionsCache[key] || []);
  }

  // Drop blanks and duplicates, the same value can surface across pages of a multi valued field
  const seen = new Set<string>();
  options = options.filter((option: FacetOption) => {
    if (!option.value || seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });

  if (!searchTerm) optionsCache[key] = options;
  return options;
}

/**
 * Quote a facet value for a Solr filter. Category names and feature descriptions carry spaces
 * and slashes, so they are matched as a phrase with only the backslash and quote escaped.
 * An unquoted slash would start a regex query.
 */
function quoteFacetValue(value: string): string {
  return `"${String(value).replace(/([\\"])/g, '\\$1')}"`;
}

export function useProductFacets() {
  return {
    fetchFacetOptions,
    quoteFacetValue
  };
}
