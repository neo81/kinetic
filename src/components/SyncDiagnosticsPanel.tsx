import React, { useState } from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { syncQueue } from '../services/syncQueue';

export const SyncDiagnosticsPanel: React.FC = () => {
  const { status, triggerManualSync, isPending, isSyncing, hasError } = useSyncStatus();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const handleExportState = () => {
    try {
      const allData = {
        timestamp: new Date().toISOString(),
        syncStatus: status,
        queueItems: syncQueue.getAll(),
        localStorage: {
          syncQueue: localStorage.getItem('kinetic:sync-queue'),
          activeSession: localStorage.getItem('kinetic.activeSession'),
          routines: localStorage.getItem('kinetic:v1:routines-local-cache'),
        },
      };

      const json = JSON.stringify(allData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kinetic-debug-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportMessage('Datos exportados correctamente');
      setTimeout(() => setExportMessage(null), 3000);
    } catch (error) {
      console.error('Error exporting state:', error);
      setExportMessage('Error al exportar datos');
    }
  };

  const handleClearQueue = () => {
    if (confirm('¿Descartar todos los items pendientes de sincronización? Esto no se puede deshacer.')) {
      syncQueue.clear();
      setExportMessage('Cola de sincronización limpiada');
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  const getStatusIcon = () => {
    if (isSyncing) return '⟳';
    if (hasError) return '⚠️';
    if (isPending) return '⏱️';
    return '✓';
  };

  const getStatusColor = () => {
    if (isSyncing) return 'text-blue-500';
    if (hasError) return 'text-red-500';
    if (isPending) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4 rounded-lg border border-outline/30 bg-surface-container p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline/20 pb-3">
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${getStatusColor()}`}>{getStatusIcon()}</span>
          <div>
            <h3 className="font-semibold text-on-surface">Estado de Sincronización</h3>
            <p className="text-xs text-on-surface-variant">
              {isSyncing && 'Sincronizando datos...'}
              {hasError && 'Hay errores de sincronización'}
              {isPending && 'Datos pendientes de guardar'}
              {!isSyncing && !hasError && !isPending && 'Todo está sincronizado'}
            </p>
          </div>
        </div>

        {isPending && (
          <button
            onClick={triggerManualSync}
            disabled={isSyncing}
            className="control-shell rounded px-3 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-surface-container-highest disabled:opacity-50"
          >
            {isSyncing ? 'Sincronizando...' : 'Resincronizar Ahora'}
          </button>
        )}
      </div>

      {/* Status Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Items pendientes:</span>
          <span className="font-mono font-semibold text-on-surface">{status.totalPending}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-on-surface-variant">Último sincronizado:</span>
          <span className="font-mono text-on-surface">
            {status.lastSyncAt
              ? new Date(status.lastSyncAt).toLocaleString('es-ES')
              : 'Aún no se sincroniza'}
          </span>
        </div>

        {status.lastError && (
          <div className="rounded bg-error/10 p-2 text-error">
            <div className="text-xs font-semibold">Último error:</div>
            <div className="font-mono text-xs">{status.lastError}</div>
            <div className="text-xs">
              Hace {Math.round((Date.now() - (status.lastErrorAt ?? 0)) / 1000)}s
            </div>
          </div>
        )}
      </div>

      {/* Queue Breakdown */}
      {status.totalPending > 0 && (
        <div className="rounded bg-surface-container-high p-2">
          <div className="mb-1 text-xs font-semibold text-on-surface">Detalles por tipo:</div>
          <div className="font-mono text-xs text-on-surface-variant">
            {Object.entries(status.byType)
              .filter(([, count]) => count > 0)
              .map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span>• {type}:</span>
                  <span>{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Message */}
      {exportMessage && (
        <div className="rounded bg-primary/10 p-2 text-xs text-primary">
          {exportMessage}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleExportState}
          className="control-shell flex-1 rounded px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-surface-container-highest"
        >
          📥 Exportar Diagnóstico
        </button>

        <button
          onClick={() => setShowDebugInfo(!showDebugInfo)}
          className="control-shell flex-1 rounded px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-surface-container-highest"
        >
          {showDebugInfo ? '🔍 Ocultar' : '🔍 Detalles'}
        </button>

        {status.totalPending > 0 && (
          <button
            onClick={handleClearQueue}
            className="control-shell rounded px-3 py-2 text-xs font-semibold uppercase tracking-wide text-error hover:bg-error/10"
          >
            🗑️ Limpiar
          </button>
        )}
      </div>

      {/* Debug Info */}
      {showDebugInfo && (
        <div className="space-y-2 rounded bg-surface-container-high p-2 font-mono text-xs text-on-surface-variant">
          <div className="text-on-surface font-semibold">Información Técnica:</div>
          <div>Versión de cola: {status.stats?.totalPending ?? 0}</div>
          <div>Items listos: {status.stats?.readyToProcess ?? 0}</div>
          <div>
            Prioridad alta: {status.stats?.byPriority?.high ?? 0} | Normal:{' '}
            {status.stats?.byPriority?.normal ?? 0}
          </div>
          <div className="mt-2 break-words">
            {status.lastSyncAt && (
              <>Último sync: {status.lastSyncAt}</>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
