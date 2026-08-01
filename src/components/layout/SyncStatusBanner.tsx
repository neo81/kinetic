import type { SyncState } from '../../services/syncQueue/SyncStateManager';
import { useLanguage } from '../../i18n/LanguageContext';

type SyncStatusBannerProps = {
  syncState: SyncState;
};

export const SyncStatusBanner = ({ syncState }: SyncStatusBannerProps) => {
  const { t } = useLanguage();
  const presentation = (() => {
    switch (syncState.status) {
      case 'syncing': return { message: t('common.syncing'), color: 'info' as const, spinner: true };
      case 'pending': return { message: `${syncState.pendingCount} ${t(syncState.pendingCount === 1 ? 'sync.pendingOperation' : 'sync.pendingOperations')}`, color: 'warning' as const, spinner: true };
      case 'error': return { message: syncState.lastError?.message || t('sync.retrying'), color: 'error' as const, spinner: true };
      case 'degraded': return { message: t('sync.weakConnection'), color: 'warning' as const, spinner: false };
      default: return { message: '', color: 'info' as const, spinner: false };
    }
  })();

  // Only show banner if there's an active sync state to display
  const shouldShow = syncState.status !== 'idle';

  const colorClasses = {
    info: 'border-secondary/60 text-secondary',
    warning: 'border-warning/60 text-warning',
    error: 'border-error/60 text-error'
  };

  return (
    <>
      {shouldShow && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[95] flex justify-center px-3 sm:top-24 sm:px-4">
          <div
            className={`pointer-events-auto w-full max-w-screen-md rounded-xl border bg-surface-container-high/98 px-3 py-2 text-on-surface shadow-xl backdrop-blur sm:px-4 sm:py-3 ${
              colorClasses[presentation.color]
            }`}
          >
            <div className="flex items-center gap-2">
              {presentation.spinner && (
                <div className="inline-block">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </div>
              )}
              <p className="text-xs font-medium text-current sm:text-sm">
                {presentation.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
