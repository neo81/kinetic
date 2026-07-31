import React, { useEffect, useState } from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { formatAppTime } from '../i18n/locale';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  showDetails = false,
  compact = false 
}) => {
  const { status, triggerManualSync, isPending, isSyncing, hasError } = useSyncStatus();
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  if (compact && status.status === 'idle') {
    return null; // No mostrar nada si está sincronizado
  }

  const getStatusColor = () => {
    if (isSyncing) return 'bg-blue-500';
    if (hasError) return 'bg-red-500';
    if (isPending) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (isSyncing) return 'Sincronizando...';
    if (hasError) return 'Error de sincronización';
    if (isPending) return 'Pendiente de sincronizar';
    return 'Sincronizado';
  };

  const lastSyncText = status.lastSyncAt
    ? formatAppTime(status.lastSyncAt)
    : 'Nunca';

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1.5 text-xs">
        <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
        <span className="hidden text-on-surface-variant sm:inline">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-outline/30 bg-surface-container p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
            <span className="font-semibold text-on-surface">{getStatusText()}</span>
          </div>
          
          {showDetails && (
            <div className="mt-2 space-y-1 text-sm text-on-surface-variant">
              <div>
                📊 Items pendientes: <span className="font-mono">{status.totalPending}</span>
              </div>
              <div>
                ⏰ Último sync: <span className="font-mono">{lastSyncText}</span>
              </div>
              
              {status.lastError && (
                <div className="mt-2 rounded bg-error/10 p-2 text-error">
                  <div className="font-mono text-xs">{status.lastError}</div>
                  <div className="text-xs">
                    {currentTime ? (
                      <>Hace {Math.round((currentTime - status.lastErrorAt!) / 1000)}s</>
                    ) : (
                      <>—</>
                    )}
                  </div>
                </div>
              )}

              {status.totalPending > 0 && (
                <div className="mt-2 space-y-1 rounded bg-surface-container-high p-2 text-xs">
                  <div>Pendiente por tipo:</div>
                  <div className="font-mono ml-2">
                    {Object.entries(status.byType)
                      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
                      .map(([type, count]) => (
                        <div key={type}>
                          • {type}: {count}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isPending && (
          <button
            onClick={triggerManualSync}
            disabled={isSyncing}
            className="control-shell rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-surface-container-highest disabled:opacity-50"
          >
            {isSyncing ? 'Sincronizando...' : 'Resincronizar'}
          </button>
        )}
      </div>
    </div>
  );
};
