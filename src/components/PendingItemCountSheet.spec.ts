import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

vi.mock('@common', () => ({ translate: (value: string) => value }));
vi.mock('@/components/Image.vue', () => ({ default: { template: '<img />' } }));

import PendingItemCountSheet from './PendingItemCountSheet.vue';

const IonModalStub = defineComponent({
  name: 'IonModal',
  props: { isOpen: Boolean, breakpoints: Array, initialBreakpoint: Number },
  emits: ['didDismiss'],
  template: '<div v-if="isOpen"><slot /></div>',
});

const IonInputStub = defineComponent({
  name: 'IonInput',
  props: { autofocus: Boolean },
  template: '<input v-bind="$attrs" :autofocus="autofocus" />',
});

function mountSheet(props: Record<string, unknown> = {}) {
  return mount(PendingItemCountSheet, {
    props: {
      isOpen: true,
      item: {
        primary: 'MH09-L-Red',
        productIdentifier: 'MH09LRED',
        quantityOnHand: 5,
      },
      saveCount: vi.fn().mockResolvedValue(true),
      ...props,
    },
    global: { stubs: { IonModal: IonModalStub, IonInput: IonInputStub } },
  });
}

describe('PendingItemCountSheet', () => {
  it('uses a native Ionic sheet modal and saves the entered quantity as a scan event', async () => {
    const saveCount = vi.fn().mockResolvedValue(true);
    const wrapper = mountSheet({ canViewQuantityOnHand: true, saveCount });

    const modal = wrapper.findComponent(IonModalStub);
    expect(modal.props('breakpoints')).toEqual([0, 1]);
    expect(modal.props('initialBreakpoint')).toBe(1);
    expect(wrapper.findComponent(IonInputStub).props('autofocus')).toBe(true);
    expect(wrapper.get('[data-testid="pending-item-count-sheet-qoh"]').text()).toContain('5 Units');

    wrapper.findComponent(IonInputStub).vm.$emit('ionInput', { detail: { value: '3' } });
    await flushPromises();
    await wrapper.get('[data-testid="pending-item-count-sheet-save-btn"]').trigger('click');
    await flushPromises();

    expect(saveCount).toHaveBeenCalledWith(expect.objectContaining({ productIdentifier: 'MH09LRED' }), 3);
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not disclose quantity on hand without the permission', () => {
    const wrapper = mountSheet({ canViewQuantityOnHand: false });
    expect(wrapper.find('[data-testid="pending-item-count-sheet-qoh"]').exists()).toBe(false);
  });
});
