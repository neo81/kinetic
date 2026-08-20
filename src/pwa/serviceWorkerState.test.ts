import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activatePwaUpdate,
  dismissPwaStatus,
  getPwaServiceWorkerState,
  setPwaUpdateActivator,
  subscribeToPwaServiceWorker,
  updatePwaServiceWorkerState,
} from './serviceWorkerState';

describe('PWA service worker state', () => {
  beforeEach(() => {
    updatePwaServiceWorkerState({ offlineReady: false, updateAvailable: false });
  });

  it('notifies subscribers when a PWA status changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToPwaServiceWorker(listener);

    updatePwaServiceWorkerState({ updateAvailable: true });

    expect(listener).toHaveBeenCalledOnce();
    expect(getPwaServiceWorkerState().updateAvailable).toBe(true);

    unsubscribe();
  });

  it('dismisses individual statuses without clearing the other one', () => {
    updatePwaServiceWorkerState({ offlineReady: true, updateAvailable: true });

    dismissPwaStatus('offlineReady');

    expect(getPwaServiceWorkerState()).toEqual({
      offlineReady: false,
      updateAvailable: true,
    });
  });

  it('activates the waiting worker and requests a page reload', async () => {
    const activate = vi.fn(async () => undefined);
    setPwaUpdateActivator(activate);

    await activatePwaUpdate();

    expect(activate).toHaveBeenCalledWith(true);
  });
});
