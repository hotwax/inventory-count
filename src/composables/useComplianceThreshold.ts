import { computed, reactive, ref } from 'vue';
import { translate } from '@/i18n';
import { showToast } from '@/services/uiUtils';

export type ComplianceFilterOption = 'all' | 'acceptable' | 'rejectable' | 'configure';
export type ComplianceThresholdUnit = 'units' | 'percent' | 'cost';

const THRESHOLD_STORAGE_KEY = 'cyclecount_compliance_threshold';

export interface ComplianceThresholdConfig {
  unit: ComplianceThresholdUnit;
  value: number;
}

export function useComplianceThreshold(storageKey: string = THRESHOLD_STORAGE_KEY) {
  const complianceFilter = ref<ComplianceFilterOption>('all');

  const thresholdConfig = reactive<ComplianceThresholdConfig>({
    unit: 'units',
    value: 2
  });

  const isConfigureThresholdModalOpen = ref(false);

  function loadThresholdConfig() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const config = JSON.parse(stored);
        thresholdConfig.unit = config.unit ?? 'units';
        thresholdConfig.value = config.value ?? 2;
      }
    } catch (error) {
      console.error('Error loading threshold config:', error);
    }
  }

  function saveThresholdConfig() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        unit: thresholdConfig.unit,
        value: thresholdConfig.value
      }));
      showToast(translate('Threshold saved successfully'));
      closeConfigureThresholdModal();
    } catch (error) {
      console.error('Error saving threshold config:', error);
      showToast(translate('Failed to save threshold'));
    }
  }

  function handleComplianceChange(event: CustomEvent) {
    if (event.detail.value === 'configure') {
      openConfigureThresholdModal();
    }
  }

  function openConfigureThresholdModal() {
    isConfigureThresholdModalOpen.value = true;
    complianceFilter.value = 'all';
  }

  function closeConfigureThresholdModal() {
    isConfigureThresholdModalOpen.value = false;
  }

  function isItemCompliant(item: { proposedVarianceQuantity: number; quantityOnHand: number }): boolean {
    const variance = Math.abs(item.proposedVarianceQuantity);

    if (thresholdConfig.unit === 'units') {
      return variance <= thresholdConfig.value;
    } else if (thresholdConfig.unit === 'percent') {
      if (item.quantityOnHand === 0) return item.proposedVarianceQuantity === 0;
      const percentVariance = Math.abs((item.proposedVarianceQuantity / item.quantityOnHand) * 100);
      return percentVariance <= thresholdConfig.value;
    } else if (thresholdConfig.unit === 'cost') {
      // Cost filtering not implemented yet, show all items
      return true;
    }
    return true;
  }

  const complianceLabel = computed(() => {
    const unitText = thresholdConfig.unit === 'percent' ? '%' : ` ${thresholdConfig.unit}`;
    return `${translate('Compliance')} (${thresholdConfig.value}${unitText})`;
  });

  return {
    complianceFilter,
    thresholdConfig,
    isConfigureThresholdModalOpen,
    complianceLabel,
    handleComplianceChange,
    openConfigureThresholdModal,
    closeConfigureThresholdModal,
    saveThresholdConfig,
    loadThresholdConfig,
    isItemCompliant
  };
}
