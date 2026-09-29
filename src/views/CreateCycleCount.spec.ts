import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

/**
 * Behaviour tests for the facet driven Create Cycle Count page. The Solr, facet and upload calls
 * are stubbed, everything else (filtering, paging, selection, CSV assembly) is the real code.
 */

const searchProducts = vi.fn();
const fetchFacetOptions = vi.fn();
const createCycleCountFromProducts = vi.fn();
const getWorkEfforts = vi.fn();
const showToast = vi.fn();

vi.mock('@common', () => ({
  translate: (value: string) => value,
  logger: { error: vi.fn(), info: vi.fn() },
  commonUtil: {
    hasError: (resp: any) => !!resp?.data?.errors,
    showToast: (...args: any[]) => showToast(...args)
  },
  useSolrSearch: () => ({ searchProducts }),
  api: vi.fn()
}));

vi.mock('@/router', () => ({ default: { push: vi.fn() } }));

// There is no IonRouterOutlet in the test, so the Ionic view lifecycle never fires. Map the two
// hooks the page uses onto the Vue equivalents so mount/unmount behaves like a real navigation.
vi.mock('@ionic/vue', async () => {
  const actual: any = await vi.importActual('@ionic/vue');
  const { onMounted, onUnmounted } = await vi.importActual<any>('vue');
  return { ...actual, onIonViewDidEnter: onMounted, onIonViewWillLeave: onUnmounted };
});

vi.mock('@/composables/useProductFacets', async () => {
  const actual: any = await vi.importActual('@/composables/useProductFacets');
  return { ...actual, useProductFacets: () => ({ fetchFacetOptions, quoteFacetValue: actual.useProductFacets().quoteFacetValue }) };
});

vi.mock('@/composables/useInventoryCountImport', () => ({
  useInventoryCountImport: () => ({ createCycleCountFromProducts })
}));

vi.mock('@/composables/useInventoryCountRun', () => ({
  useInventoryCountRun: () => ({ getWorkEfforts })
}));

vi.mock('@/stores/productStore', () => ({
  useProductStore: () => ({
    getFacilities: [{ facilityId: 'STORE_1', facilityName: 'Store One', facilityTimeZone: 'America/New_York' }],
    getCurrentFacility: { facilityId: 'STORE_1' }
  })
}));

vi.mock('@/components/Image.vue', () => ({ default: { template: '<img />' } }));

import CreateCycleCount from './CreateCycleCount.vue';
import { PRODUCT_FACET_FILTERS, FacetFilterConfig } from '@/composables/useProductFacets';

// Derived from the real config so the tests break if a field is renamed there
const CATEGORY_FACET = PRODUCT_FACET_FILTERS
  .find((facet: FacetFilterConfig) => facet.field === 'productCategoryNames') as FacetFilterConfig;
const FEATURE_FACET = PRODUCT_FACET_FILTERS
  .find((facet: FacetFilterConfig) => facet.field === 'productFeatures') as FacetFilterConfig;

function makeProducts(count: number, offset = 0) {
  return Array.from({ length: count }, (unused, index) => ({
    productId: `P${offset + index}`,
    internalName: `SKU-${offset + index}`,
    productName: `Product ${offset + index}`,
    primaryProductCategoryName: 'Shirts'
  }));
}

function mountPage() {
  return mount(CreateCycleCount, {
    global: {
      stubs: {
        // Ionic components are not registered in jsdom, render them as transparent wrappers so the
        // real template structure (v-if / v-for) is still exercised.
        transition: false
      },
      renderStubDefaultSlot: true
    },
    shallow: false
  });
}

describe('CreateCycleCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchProducts.mockResolvedValue({ products: [], total: 0 });
    fetchFacetOptions.mockResolvedValue([
      { id: 'COLOR/Red', label: 'Red', value: 'COLOR/Red', groupLabel: 'COLOR', count: 12 },
      { id: 'COLOR/Blue', label: 'Blue', value: 'COLOR/Blue', groupLabel: 'COLOR', count: 7 }
    ]);
    createCycleCountFromProducts.mockResolvedValue({ status: 200, data: {} });
    getWorkEfforts.mockResolvedValue({ status: 200, data: { cycleCounts: [] } });
  });

  it('does not query Solr until a filter is applied', async () => {
    mountPage();
    await flushPromises();
    expect(searchProducts).not.toHaveBeenCalled();
  });

  it('loads and renders the first page when a facet filter is applied', async () => {
    searchProducts.mockResolvedValue({ products: makeProducts(20), total: 500 });
    const wrapper = mountPage();
    await flushPromises();

    // openFacetModal is what sets activeFacet in the app
    await (wrapper.vm as any).openFacetModal(CATEGORY_FACET);
    await (wrapper.vm as any).applyFacetSelection(['Shirts']);
    await flushPromises();

    expect(searchProducts).toHaveBeenCalledTimes(1);
    expect(searchProducts.mock.calls[0][0]).toMatchObject({
      viewIndex: 0,
      filters: { productCategoryNames: { value: ['"Shirts"'], op: 'OR' } }
    });
    expect((wrapper.vm as any).products).toHaveLength(20);
    expect((wrapper.vm as any).totalProducts).toBe(500);

    // The reported symptom was a populated total with no rows on screen, so assert the DOM
    const rows = wrapper.findAll('[data-testid^="create-count-product-row-"]');
    expect(rows).toHaveLength(20);
    expect(rows[0].text()).toContain('SKU-0');
    expect(wrapper.find('[data-testid="create-count-empty-state"]').exists()).toBe(false);
  });

  it('shows the filter prompt and no rows before any filter is applied', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAll('[data-testid^="create-count-product-row-"]')).toHaveLength(0);
    expect(wrapper.find('[data-testid="create-count-empty-state"]').text())
      .toContain('Please select filters to view items');
  });

  it('quotes facet values so slashes and spaces are not parsed as query syntax', async () => {
    searchProducts.mockResolvedValue({ products: makeProducts(1), total: 1 });
    const wrapper = mountPage();
    await flushPromises();

    (wrapper.vm as any).activeFacet = FEATURE_FACET;
    await (wrapper.vm as any).applyFacetSelection(['COLOR/Red', 'SIZE/Extra Large']);
    await flushPromises();

    expect(searchProducts.mock.calls[0][0].filters).toEqual({
      isVariant: { value: 'true' },
      productFeatures: { value: ['"COLOR/Red"', '"SIZE/Extra Large"'], op: 'OR' }
    });
  });

  it('restricts every query to variants', async () => {
    searchProducts.mockResolvedValue({ products: makeProducts(20), total: 40 });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.openFacetModal(FEATURE_FACET);
    await vm.applyFacetSelection(['COLOR/Red']);
    await flushPromises();

    // Paging and select-all build their filters the same way, so they must carry it too
    await vm.loadMoreProducts({ target: { complete: vi.fn() } });
    await flushPromises();
    await vm.selectAllMatches();
    await flushPromises();

    expect(searchProducts.mock.calls.length).toBeGreaterThanOrEqual(3);
    searchProducts.mock.calls.forEach((call: any[]) => {
      expect(call[0].filters.isVariant).toEqual({ value: 'true' });
    });
  });

  it('does not run viewIndex away when the list is still empty', async () => {
    // The regression: infinite scroll firing over an empty list used to page past numFound
    searchProducts.mockResolvedValue({ products: [], total: 500 });
    const wrapper = mountPage();
    await flushPromises();

    (wrapper.vm as any).activeFacet = FEATURE_FACET;
    await (wrapper.vm as any).applyFacetSelection(['COLOR/Red']);
    await flushPromises();

    expect((wrapper.vm as any).hasMoreProducts).toBe(false);

    const complete = vi.fn();
    await (wrapper.vm as any).loadMoreProducts({ target: { complete } });
    await flushPromises();

    expect(complete).toHaveBeenCalled();
    expect(searchProducts).toHaveBeenCalledTimes(1);
  });

  it('appends the next page on scroll and stops at the total', async () => {
    searchProducts.mockResolvedValueOnce({ products: makeProducts(20), total: 30 });
    const wrapper = mountPage();
    await flushPromises();
    (wrapper.vm as any).activeFacet = FEATURE_FACET;
    await (wrapper.vm as any).applyFacetSelection(['COLOR/Red']);
    await flushPromises();
    expect((wrapper.vm as any).hasMoreProducts).toBe(true);

    searchProducts.mockResolvedValueOnce({ products: makeProducts(10, 20), total: 30 });
    await (wrapper.vm as any).loadMoreProducts({ target: { complete: vi.fn() } });
    await flushPromises();

    expect((wrapper.vm as any).products).toHaveLength(30);
    expect((wrapper.vm as any).hasMoreProducts).toBe(false);
    expect(searchProducts.mock.calls[1][0].viewIndex).toBe(1);
  });

  it('clears the list when the last filter is removed', async () => {
    searchProducts.mockResolvedValue({ products: makeProducts(5), total: 5 });
    const wrapper = mountPage();
    await flushPromises();
    (wrapper.vm as any).activeFacet = FEATURE_FACET;
    await (wrapper.vm as any).applyFacetSelection(['COLOR/Red']);
    await flushPromises();
    expect((wrapper.vm as any).products).toHaveLength(5);

    await (wrapper.vm as any).applyFacetSelection([]);
    await flushPromises();

    expect((wrapper.vm as any).products).toHaveLength(0);
    expect(searchProducts).toHaveBeenCalledTimes(1);
  });

  it('blocks submit until name, facility, due date and items are set', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.createCycleCount();
    expect(vm.showNameError).toBe(true);
    expect(vm.showDueDateError).toBe(true);
    expect(vm.showItemsError).toBe(true);
    expect(createCycleCountFromProducts).not.toHaveBeenCalled();
  });

  it('rejects a start date after the due date', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as any;

    vm.countName = 'Weekly audit';
    vm.dueDate = Date.UTC(2026, 7, 10);
    vm.startDate = Date.UTC(2026, 7, 20);
    vm.selectedProductsMap['P0'] = { productId: 'P0', internalName: 'SKU-0' };
    await flushPromises();

    await vm.createCycleCount();
    expect(vm.showStartDateError).toBe(true);
    expect(createCycleCountFromProducts).not.toHaveBeenCalled();
  });

  it('submits the selected products with facility local dates', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as any;

    vm.countName = '  Weekly audit  ';
    vm.purposeType = 'HARD_COUNT';
    vm.dueDate = Date.UTC(2026, 7, 10, 12);
    vm.selectedProductsMap['P0'] = { productId: 'P0', internalName: 'SKU-0' };
    vm.selectedProductsMap['P1'] = { productId: 'P1', internalName: 'SKU-1' };
    await flushPromises();

    await vm.submitCycleCount('Weekly audit');
    await flushPromises();

    expect(createCycleCountFromProducts).toHaveBeenCalledTimes(1);
    const payload = createCycleCountFromProducts.mock.calls[0][0];
    expect(payload.countName).toBe('Weekly audit');
    expect(payload.purposeType).toBe('HARD_COUNT');
    expect(payload.facilityId).toBe('STORE_1');
    expect(payload.products.map((product: any) => product.productId)).toEqual(['P0', 'P1']);
    // MM-dd-yyyy HH:mm:ss, the format import#InventoryCount parses
    expect(payload.dueDate).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/);
    expect(payload.startDate).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/);
    // End of day in the facility zone, not UTC midnight
    expect(payload.dueDate).toBe('08-10-2026 23:59:59');
  });

  it('loads facet options once and hands them to the modal', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.openFacetModal(FEATURE_FACET);
    await flushPromises();

    expect(fetchFacetOptions).toHaveBeenCalledWith(FEATURE_FACET);
    expect(vm.facetOptions.productFeatures).toHaveLength(2);
    // The modal reads options through this prop, an empty array here is the bug that hid them
    const modal = wrapper.findComponent({ name: 'FacetFilterModal' });
    expect(modal.props('options')).toHaveLength(2);

    // Reopening must not refetch, the options are cached for the session
    await vm.openFacetModal(FEATURE_FACET);
    await flushPromises();
    expect(fetchFacetOptions).toHaveBeenCalledTimes(1);
  });

  it('shows the feature description and keeps the raw value for filtering', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.openFacetModal(FEATURE_FACET);
    await flushPromises();
    await vm.applyFacetSelection(['COLOR/Red']);
    await flushPromises();

    expect(vm.getFacetChipLabel('productFeatures')).toBe('Red');
    expect(searchProducts.mock.calls[0][0].filters.productFeatures.value).toEqual(['"COLOR/Red"']);
  });

  it('selects every loaded row and switches to the selected only view', async () => {
    searchProducts.mockResolvedValue({ products: makeProducts(20), total: 20 });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.openFacetModal(FEATURE_FACET);
    await vm.applyFacetSelection(['COLOR/Red']);
    await flushPromises();

    vm.toggleAllRows(true);
    expect(vm.selectedRowsCount).toBe(20);

    vm.showSelectedOnly = true;
    await flushPromises();
    expect(vm.visibleProducts).toHaveLength(20);

    // Deselecting everything must drop back out of the selected only view
    vm.toggleAllRows(false);
    await flushPromises();
    expect(vm.selectedRowsCount).toBe(0);
    expect(vm.showSelectedOnly).toBe(false);
  });

  it('caps the selection at the configured maximum', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as any;

    searchProducts.mockResolvedValue({ products: makeProducts(20), total: 999999 });
    vm.activeFacet = FEATURE_FACET;
    await vm.applyFacetSelection(['COLOR/Red']);
    await flushPromises();

    await vm.selectAllMatches();
    await flushPromises();

    expect(showToast).toHaveBeenCalled();
    expect(Object.keys(vm.selectedProductsMap)).toHaveLength(0);
  });
});
