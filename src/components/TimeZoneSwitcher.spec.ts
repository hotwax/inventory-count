import { describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, reactive } from 'vue';

const state = vi.hoisted(() => ({ store: null as any }));
vi.mock('@common', () => ({ translate: (value: string) => value }));
vi.mock('@/stores/userProfileStore', () => ({ useUserProfile: () => state.store }));
import TimeZoneSwitcher from './TimeZoneSwitcher.vue';

describe('timezone loading across logout', () => {
  it('does not read a cleared profile when the timezone request finishes after logout', async () => {
    let finish!: () => void;
    state.store = reactive({
      getUserProfile: { timeZone: 'America/New_York' } as any,
      getTimeZones: [],
      getDxpAvailableTimeZones: () => new Promise<void>((resolve) => { finish = resolve; }),
    });
    const errors = vi.fn();
    const app = createApp(TimeZoneSwitcher);
    app.config.errorHandler = errors;
    const container = document.createElement('div');
    app.mount(container);
    state.store.getUserProfile = null;
    finish();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errors).not.toHaveBeenCalled();
    app.unmount();
  });
});
