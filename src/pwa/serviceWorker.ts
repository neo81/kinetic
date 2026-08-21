import { registerSW } from 'virtual:pwa-register';
import {
  setPwaUpdateActivator,
  updatePwaServiceWorkerState,
} from './serviceWorkerState';

const UPDATE_INTERVAL_MS = 15 * 60 * 1000;
const MIN_UPDATE_CHECK_GAP_MS = 60 * 1000;

export const registerServiceWorker = () => {
  const activateUpdate = registerSW({
    immediate: true,
    onOfflineReady() {
      updatePwaServiceWorkerState({ offlineReady: true });
    },
    onNeedRefresh() {
      updatePwaServiceWorkerState({ updateAvailable: true });
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      let lastUpdateCheckAt = 0;
      let updateCheckInFlight: Promise<void> | null = null;

      const checkForUpdate = (force = false) => {
        if (updateCheckInFlight) return updateCheckInFlight;
        if (registration.installing || !navigator.onLine) return Promise.resolve();

        const now = Date.now();
        if (!force && now - lastUpdateCheckAt < MIN_UPDATE_CHECK_GAP_MS) {
          return Promise.resolve();
        }

        lastUpdateCheckAt = now;

        const currentCheck = (async () => {
          if (registration.waiting) {
            updatePwaServiceWorkerState({ updateAvailable: true });
            return;
          }

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
            // A failed check is expected while offline; a later trigger retries it.
          }
        })();

        updateCheckInFlight = currentCheck;
        void currentCheck.finally(() => {
          if (updateCheckInFlight === currentCheck) {
            updateCheckInFlight = null;
          }
        });

        return currentCheck;
      };

      const checkWhenVisible = () => {
        if (document.visibilityState === 'visible') {
          void checkForUpdate();
        }
      };

      void checkForUpdate(true);
      window.setInterval(() => void checkForUpdate(), UPDATE_INTERVAL_MS);
      document.addEventListener('visibilitychange', checkWhenVisible);
      window.addEventListener('pageshow', checkWhenVisible);
      window.addEventListener('focus', checkWhenVisible);
      window.addEventListener('online', checkWhenVisible);
    },
    onRegisterError(error) {
      console.error('No se pudo registrar el service worker:', error);
    },
  });
  setPwaUpdateActivator(activateUpdate);
};
