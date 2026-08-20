import { registerSW } from 'virtual:pwa-register';
import {
  setPwaUpdateActivator,
  updatePwaServiceWorkerState,
} from './serviceWorkerState';

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

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
  setPwaUpdateActivator(activateUpdate);
};
