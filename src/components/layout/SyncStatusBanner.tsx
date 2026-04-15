import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import type { SyncState } from '../../services/syncQueue/SyncStateManager';

type SyncStatusBannerProps = {
  syncState: SyncState;
};

export const SyncStatusBanner = ({ syncState }: SyncStatusBannerProps) => {
  const [displayMessage, setDisplayMessage] = useState<string>('');
  const [displayColor, setDisplayColor] = useState<'info' | 'warning' | 'error'>('info');
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    switch (syncState.status) {
      case 'syncing':
        setDisplayMessage(`Sincronizando...`);
        setDisplayColor('info');
        setShowSpinner(true);
        break;
      case 'pending':
        setDisplayMessage(`${syncState.pendingCount} operación${syncState.pendingCount !== 1 ? 'es' : ''} pendiente${syncState.pendingCount !== 1 ? 's' : ''}`);
        setDisplayColor('warning');
        setShowSpinner(true);
        break;
      case 'error':
        setDisplayMessage(
          syncState.lastError?.message || 'Error al sincronizar. Reintentando...'
        );
        setDisplayColor('error');
        setShowSpinner(true);
        break;
      case 'degraded':
        setDisplayMessage('Conexión débil. Algunos cambios pueden no guardarse.');
        setDisplayColor('warning');
        setShowSpinner(false);
        break;
      case 'idle':
      default:
        setDisplayMessage('');
        setDisplayColor('info');
        setShowSpinner(false);
        break;
    }
  }, [syncState]);

  // Only show banner if there's an active sync state to display
  const shouldShow = syncState.status !== 'idle';

  const colorClasses = {
    info: 'border-secondary/60 text-secondary',
    warning: 'border-warning/60 text-warning',
    error: 'border-error/60 text-error'
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed inset-x-0 top-20 z-[95] flex justify-center px-3 sm:top-24 sm:px-4"
        >
          <div
            className={`pointer-events-auto w-full max-w-screen-md rounded-xl border bg-surface-container-high/98 px-3 py-2 text-on-surface shadow-xl backdrop-blur sm:px-4 sm:py-3 ${
              colorClasses[displayColor]
            }`}
          >
            <div className="flex items-center gap-2">
              {showSpinner && (
                <div className="inline-block">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </div>
              )}
              <p className="text-xs font-medium text-current sm:text-sm">
                {displayMessage}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
