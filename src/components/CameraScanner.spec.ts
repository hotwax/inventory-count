import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';

let decodeCallback: ((result: { getText: () => string }) => void) | undefined;

vi.mock('@common', () => ({
  translate: (value: string, params?: Record<string, string | number>) =>
    value.replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? `{${key}}`)),
}));

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    async decodeFromConstraints(_constraints: unknown, _video: HTMLVideoElement, callback: typeof decodeCallback) {
      decodeCallback = callback;
      return { stop: vi.fn() };
    }
  },
}));

vi.mock('@/components/Image.vue', () => ({ default: { template: '<img />' } }));

import CameraScanner from './CameraScanner.vue';

const IonModalStub = defineComponent({
  name: 'IonModal',
  props: { isOpen: Boolean },
  emits: ['didPresent', 'didDismiss'],
  async mounted() {
    if (this.isOpen) {
      await nextTick();
      this.$emit('didPresent');
    }
  },
  template: '<div><slot /></div>',
});

const IonPopoverStub = defineComponent({
  name: 'IonPopover',
  props: { isOpen: Boolean },
  emits: ['didDismiss'],
  template: '<div v-if="isOpen"><slot /></div>',
});

function mountScanner(props: Record<string, unknown> = {}) {
  return mount(CameraScanner, {
    props: {
      isOpen: true,
      recordScan: vi.fn().mockResolvedValue({ saved: true, savedScanCount: 1 }),
      ...props,
    },
    global: {
      stubs: { IonModal: IonModalStub, IonPopover: IonPopoverStub },
      renderStubDefaultSlot: true,
    },
  });
}

describe('CameraScanner rapid scan feedback', () => {
  it('shows the saved scan count and visible cooldown after a rapid scan', async () => {
    const wrapper = mountScanner();
    await flushPromises();

    decodeCallback?.({ getText: () => 'MH09LBLUE' });
    await flushPromises();

    expect(wrapper.get('[data-testid="camera-scanner-rapid-scan-result"]').text()).toContain('1 saved');
    expect(wrapper.find('[data-testid="camera-scanner-cooldown-progress"]').exists()).toBe(true);
  });

  it('opens the pending list over the camera without closing the scanner', async () => {
    const wrapper = mountScanner({
      pendingItems: [
        { primary: 'MH09-L-Blue', secondary: 'Product L / Blue.' },
        { primary: 'MH09-L-Red', secondary: 'Product L / Red.' },
      ],
    });
    await flushPromises();

    await wrapper.get('[data-testid="camera-scanner-nextup"]').trigger('click');

    expect(wrapper.find('[data-testid="camera-scanner-pending-list"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('MH09-L-Red');
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('replaces the success feedback with one clear cooldown message for a repeated barcode', async () => {
    const wrapper = mountScanner();
    await flushPromises();

    decodeCallback?.({ getText: () => 'MH09LBLUE' });
    await flushPromises();
    decodeCallback?.({ getText: () => 'MH09LBLUE' });
    await flushPromises();

    expect(wrapper.find('[data-testid="camera-scanner-duplicate"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="camera-scanner-cooldown"]').exists()).toBe(false);
  });
});
