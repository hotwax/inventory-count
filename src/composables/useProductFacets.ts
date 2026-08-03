import { reactive } from 'vue';
import { commonUtil, logger, useSolrSearch } from '@common';

/**
 * PRODUCT facet options read straight off a Solr JSON terms facet, so any indexed field can be
 * used as a filter without a matching named facet having to exist in the OMS component's
 * Facets.json. Bucket counts come back too, which the admin/solrFacets endpoint discards.
 */

export interface FacetFilterConfig {
  /** Indexed Solr field, also the key the selections are held under */
  field: string;
  /** Row label and modal copy */
  label: string;
  modalTitle: string;
  searchPlaceholder: string;
  /**
   * Values indexed as "{prefix}/{description}" (productFeatures) show the description with the
   * prefix as secondary text. The raw value is always what the filter matches.
   */
  splitOnSlash?: boolean;
}

/** Add a row here to expose another facet field as a filter, nothing else has to change. */
export const PRODUCT_FACET_FILTERS: FacetFilterConfig[] = [
  {
    field: 'productCategoryNames',
    label: 'Category',
    modalTitle: 'Select categories',
    searchPlaceholder: 'Search categories'
  },
  {
    field: 'productFeatures',
    label: 'Feature',
    modalTitle: 'Select features',
    searchPlaceholder: 'Search features',
    splitOnSlash: true
  }
];

/**
 * Base filters for the facet query. These mirror the product search so the offered options only
 * come from products the list can actually return - searchProducts contributes docType and
 * isVirtual, the view adds isVariant.
 */
export const PRODUCT_FACET_BASE_FILTERS = ['docType: PRODUCT', 'isVariant: true', 'isVirtual: false'];

export interface FacetOption {
  id: string;
  /** Shown to the user, the description alone for a split value */
  label: string;
  /** Raw indexed value, this is what the Solr filter has to match */
  value: string;
  /** Secondary text, the prefix of a split value. Empty otherwise. */
  groupLabel: string;
  /** Number of matching products */
  count: number;
}

const FACET_PAGE_LIMIT = 1000;
const DEFAULT_MAX_FACETS = 5000;

const optionsCache = reactive<Record<string, FacetOption[]>>({});

function toFacetOption(bucket: any, config: FacetFilterConfig): FacetOption {
  const value = String(bucket?.val ?? '');
  const count = Number(bucket?.count ?? 0);

  if (config.splitOnSlash) {
    const separatorIndex = value.indexOf('/');
    if (separatorIndex !== -1) {
      return {
        id: value,
        label: value.substring(separatorIndex + 1).trim() || value,
        value,
        groupLabel: value.substring(0, separatorIndex).trim(),
        count
      };
    }
  }
  return { id: value, label: value, value, groupLabel: '', count };
}

/**
 * Fetch every bucket of a terms facet, paging on offset until a short page comes back or the
 * VITE_MAX_FACETS ceiling is reached. Results are cached for the session.
 */
async function fetchFacetOptions(config: FacetFilterConfig): Promise<FacetOption[]> {
  if (optionsCache[config.field]?.length) return optionsCache[config.field];

  const maxFacets = Number(import.meta.env.VITE_MAX_FACETS) || DEFAULT_MAX_FACETS;
  const facetName = `${config.field}Facet`;
  const options: FacetOption[] = [];
  // Deduped as we go so the cap bounds distinct options, not raw buckets
  const seen = new Set<string>();
  let offset = 0;
  let pageLimit = 0;
  let buckets: any[] = [];

  try {
    do {
      // Never request more than the remaining room under the cap
      pageLimit = Math.min(FACET_PAGE_LIMIT, maxFacets - options.length);
      if (pageLimit <= 0) break;

      const resp = await useSolrSearch().runSolrQuery({
        json: {
          params: { rows: 0 },
          query: '*:*',
          filter: [...PRODUCT_FACET_BASE_FILTERS],
          facet: {
            [facetName]: {
              type: 'terms',
              field: config.field,
              mincount: 1,
              limit: pageLimit,
              offset,
              // Alphabetical by term, which also keeps offset paging stable
              sort: 'index'
            }
          }
        }
      }) as any;

      if (commonUtil.hasError(resp)) throw resp.data;

      buckets = resp?.data?.facets?.[facetName]?.buckets || [];
      buckets = Array.isArray(buckets) ? buckets : [];

      // Drop blanks, a multi valued field can also repeat a value across pages
      buckets.forEach((bucket: any) => {
        const option = toFacetOption(bucket, config);
        if (!option.value || seen.has(option.value)) return;
        seen.add(option.value);
        options.push(option);
      });

      // Solr pages over buckets, so advance by what was asked for, not by what survived dedup
      offset += pageLimit;
    } while (buckets.length === pageLimit && options.length < maxFacets);
  } catch (err) {
    logger.error(`Failed to fetch ${config.field} facet options`, err);
    return [];
  }

  // A full last page means Solr had more to give, so the picker is showing a subset
  if (buckets.length === pageLimit && options.length >= maxFacets) {
    logger.warn(`Facet [${config.field}] truncated at the VITE_MAX_FACETS limit of ${maxFacets}, more options exist`);
  }

  optionsCache[config.field] = options;
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
