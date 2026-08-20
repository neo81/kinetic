import { registerSW } from 'virtual:pwa-register';

export type PwaServiceWorkerState = {
  offlineReady: boolean;
  updateAvailable: boolean;
};

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

let state: PwaServiceWorkerState = {
  offlineReady: false,
  updateAvailable: false,
};
let activateUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

const updateState = (nextState: Partial<PwaServiceWorkerState>) => {
  state = { ...state, ...nextState };
  listeners.forEach((listener) => listener());
};

export const getPwaServiceWorkerState = () => state;

export const subscribeToPwaServiceWorker = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const activatePwaUpdate = async () => {
  if (!activateUpdate) return;
  await activateUpdate(true);
};

export const dismissPwaStatus = (status: keyof PwaServiceWorkerState) => {
  updateState({ [status]: false });
};

export const registerServiceWorker = () => {
  activateUpdate = registerSW({
    immediate: true,
    onOfflineReady() {
      updateState({ offlineReady: true });
    },
    onNeedRefresh() {
      updateState({ updateAvailable: true });
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      window.setInterval(async () => {
        if (registration.installing || !navigator.onLine) return;

        try {
          const response = await fetch(swUrl, {
            cache: 'no-store',
            headers: {
              'cache': 'no-store',
              'cache-control': 'no-cache',
            },
          });

          if (response.ok) {
            await registration.update();
          }
        } catch {
          // A failed check is expected while offline; the next interval retries it.
        }
      }, UPDATE_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.error('No se pudo registrar el service worker:', error);
    },
  });
};
