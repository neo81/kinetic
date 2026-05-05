/**
 * GUÍA DE INTEGRACIÓN: Sistema de Sincronización Visible en PWA
 * 
 * Para mostrar el estado de sincronización en tu app de iOS/Android PWA
 */

// ============================================================================
// OPCIÓN 1: Badge Compacto en la Barra de Navegación (RECOMENDADO)
// ============================================================================

// En tu layout/navbar/header component:
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';

export const AppHeader = () => {
  return (
    <header>
      {/* Tu contenido normal */}
      <nav>
        {/* ... */}
      </nav>
      
      {/* Agregar esto: mostrar badge solo cuando hay pendencias */}
      <SyncStatusIndicator compact={true} />
    </header>
  );
};

// ============================================================================
// OPCIÓN 2: Panel Completo en Settings (RECOMENDADO)
// ============================================================================

// En tu SettingsView.tsx:
import { SyncDiagnosticsPanel } from '../components/SyncDiagnosticsPanel';

export const SettingsView = () => {
  return (
    <div className="space-y-6">
      {/* Otros settings */}
      
      <section>
        <h2>Sincronización y Diagnóstico</h2>
        <SyncDiagnosticsPanel />
      </section>
    </div>
  );
};

// ============================================================================
// OPCIÓN 3: Modal de Sincronización (para casos críticos)
// ============================================================================

import { useSyncStatus } from '../hooks/useSyncStatus';

export const SyncStatusModal = () => {
  const { status, triggerManualSync, hasError } = useSyncStatus();

  if (!hasError && status.totalPending === 0) {
    return null; // No mostrar si todo está bien
  }

  return (
    <dialog className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-surface-container p-6">
        <h2 className="mb-4 text-xl font-semibold text-on-surface">
          {hasError ? '⚠️ Error de Sincronización' : '⏱️ Datos Pendientes'}
        </h2>
        
        <p className="mb-4 text-on-surface-variant">
          {hasError 
            ? 'Hay un problema sincronizando tus datos. Intenta nuevamente.'
            : `Tienes ${status.totalPending} item(s) pendiente(s) de guardar.`}
        </p>

        <button
          onClick={triggerManualSync}
          className="w-full rounded bg-primary px-4 py-2 text-on-primary font-semibold"
        >
          Sincronizar Ahora
        </button>
      </div>
    </dialog>
  );
};

// ============================================================================
// OPCIÓN 4: Hook para Usar en Cualquier Componente
// ============================================================================

import { useSyncStatus } from '../hooks/useSyncStatus';

export const MyComponent = () => {
  const { status, triggerManualSync, isPending, hasError } = useSyncStatus();

  if (isPending) {
    return (
      <div className="bg-amber-100 p-4 rounded">
        <p>Se están sincronizando {status.totalPending} cambios...</p>
        <button onClick={triggerManualSync}>
          Resincronizar ahora
        </button>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-red-100 p-4 rounded">
        <p>Error: {status.lastError}</p>
        <button onClick={triggerManualSync}>
          Reintentar
        </button>
      </div>
    );
  }

  return <div>✓ Todo sincronizado</div>;
};

// ============================================================================
// FLUJO DE USO EN PWA (iOS/Android)
// ============================================================================

/**
 * ESCENARIO 1: Usuario termina sesión larga
 * 1. App cierra sesión y la intenta guardar
 * 2. Si hay error → se añade a la cola
 * 3. SyncStatusIndicator muestra "Pendiente de sincronizar"
 * 4. Usuario abre Settings y ve SyncDiagnosticsPanel
 * 5. Usuario hace clic en "Resincronizar Ahora"
 * 6. Sistema reintenta y muestra éxito
 * 
 * ESCENARIO 2: Conexión intermitente
 * 1. Usuario sin conexión intenta guardar algo
 * 2. Va a queue automáticamente
 * 3. Badge compacto aparece en navbar
 * 4. Cuando regresa conexión, SyncProcessor automáticamente reintenta
 * 5. Badge desaparece cuando termina
 * 
 * ESCENARIO 3: Error persistente
 * 1. Algo falla múltiples veces
 * 2. SyncDiagnosticsPanel muestra error
 * 3. Usuario puede exportar diagnóstico
 * 4. Usuario puede compartir archivo JSON para debugging
 */

// ============================================================================
// FUNCIONES ÚTILES DE useSyncStatus()
// ============================================================================

/**
const { 
  status,                    // Objeto con detalles de sincronización
  triggerManualSync,        // Función para resincronizar manualmente
  isPending,               // boolean: hay items pendientes
  isSyncing,               // boolean: está sincronizando ahora
  hasError,                // boolean: hay error
} = useSyncStatus();

// status contiene:
// - status: 'idle' | 'syncing' | 'pending' | 'error'
// - totalPending: número total de items en cola
// - readyToSync: items listos para sincronizar ahora
// - lastSyncAt: timestamp del último sync exitoso
// - lastError: mensaje del último error
// - lastErrorAt: timestamp del último error
// - byType: desglose por tipo (session_end, routine_save, etc)
// - stats: datos detallados del procesador
*/
