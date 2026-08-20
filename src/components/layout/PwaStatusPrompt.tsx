import { CloudDownload, WifiOff, X } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  activatePwaUpdate,
  dismissPwaStatus,
  getPwaServiceWorkerState,
  subscribeToPwaServiceWorker,
  type PwaServiceWorkerState,
} from '../../pwa/serviceWorkerState';
import { ConfirmDialog } from './ConfirmDialog';

const serverState: PwaServiceWorkerState = {
  offlineReady: false,
  updateAvailable: false,
};

type PwaStatusPromptProps = {
  hasActiveSession: boolean;
  suppressed?: boolean;
};

export const PwaStatusPrompt = ({
  hasActiveSession,
  suppressed = false,
}: PwaStatusPromptProps) => {
  const { t } = useLanguage();
  const serviceWorkerState = useSyncExternalStore(
    subscribeToPwaServiceWorker,
    getPwaServiceWorkerState,
    () => serverState,
  );
  const [hideDeferredUpdate, setHideDeferredUpdate] = useState(false);

  useEffect(() => {
    if (hasActiveSession && serviceWorkerState.updateAvailable) {
      setHideDeferredUpdate(false);
    }
  }, [hasActiveSession, serviceWorkerState.updateAvailable]);

  if (suppressed) return null;

  const showDeferredUpdate = serviceWorkerState.updateAvailable
    && hasActiveSession
    && !hideDeferredUpdate;
  const showOfflineReady = serviceWorkerState.offlineReady
    && !serviceWorkerState.updateAvailable;

  return (
    <>
      {(showDeferredUpdate || showOfflineReady) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] z-[120] flex justify-center px-4">
          <div
            role="status"
            aria-live="polite"
            className="theme-elevated-surface pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-primary/25 px-4 py-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {showDeferredUpdate ? <CloudDownload size={19} /> : <WifiOff size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface">
                {t(showDeferredUpdate ? 'pwa.updateDeferredTitle' : 'pwa.offlineReadyTitle')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                {t(showDeferredUpdate ? 'pwa.updateDeferredMessage' : 'pwa.offlineReadyMessage')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showDeferredUpdate) {
                  setHideDeferredUpdate(true);
                } else {
                  dismissPwaStatus('offlineReady');
                }
              }}
              aria-label={t('common.close')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={serviceWorkerState.updateAvailable && !hasActiveSession}
        title={t('pwa.updateTitle')}
        message={t('pwa.updateMessage')}
        confirmText={t('pwa.updateNow')}
        cancelText={t('pwa.updateLater')}
        variant="warning"
        onCancel={() => dismissPwaStatus('updateAvailable')}
        onConfirm={() => {
          void activatePwaUpdate();
        }}
      />
    </>
  );
};
