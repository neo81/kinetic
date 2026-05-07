import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Edit2, Play, Plus, Trash2, Upload, X } from 'lucide-react';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { PageShell } from '../components/layout/PageShell';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { downloadRoutineAsJson } from '../utils/routineExport';
import { importRoutineFromJson, RoutineImportError } from '../utils/routineImport';
import type { Routine, View, UserProfile } from '../types';

interface RoutinesListViewProps {
  setView: (view: View) => void;
  routines: Routine[];
  onNewRoutine: () => void;
  setCurrentRoutine: (routine: Routine | null) => void;
  onDeleteRoutine: (routineId: string) => void;
  onImportRoutine?: (routine: Routine) => void;
  profile?: UserProfile | null;
}

export const RoutinesListView = ({
  setView,
  routines,
  onNewRoutine,
  setCurrentRoutine,
  onDeleteRoutine,
  onImportRoutine,
  profile,
}: RoutinesListViewProps) => {
  const [routineToTrash, setRoutineToTrash] = useState<Routine | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    routineName?: string;
    warnings?: string[];
    error?: string;
  } | null>(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-imported
    e.target.value = '';

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = await importRoutineFromJson(text);
      setImportResult({
        success: true,
        routineName: result.routine.name,
        warnings: result.warnings,
      });
      onImportRoutine?.(result.routine);
    } catch (err) {
      const message =
        err instanceof RoutineImportError
          ? err.message
          : 'Error inesperado al importar la rutina.';
      setImportResult({ success: false, error: message });
    } finally {
      setIsImporting(false);
    }
  };

  const totalExercises = routines.reduce((count, routine) => count + (routine.exercises?.length || 0), 0);

  return (
    <PageShell
      activeView="routines-list"
      setView={setView}
      onProfileClick={() => setView('settings')}
      onSettingsClick={() => setView('settings')}
      profile={profile}
    >
      <div className="space-y-10 pb-32">
        {/* Botón Volver Estándar */}
        <section>
          <button 
            onClick={() => setView('dashboard')} 
            className="flex items-center gap-3 text-on-surface-variant transition-colors hover:text-primary group"
          >
            <div className="theme-muted-surface flex h-8 w-8 items-center justify-center rounded-full transition-all group-hover:bg-primary/20">
              <ArrowLeft size={16} strokeWidth={2.5} />
            </div>
            <span className="font-headline text-[0.72rem] font-black uppercase italic tracking-[0.22em]">Volver al panel</span>
          </button>
        </section>

        {/* Título y Cabecera de Contenido */}
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">GESTIÓN DE PLANES</span>
          </div>
          <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-on-surface">MIS RUTINAS</h1>
        </header>

        {/* Acciones: Crear + Importar */}
        <section className="flex flex-col gap-3">
          <button
            onClick={onNewRoutine}
            className="theme-primary-shadow-strong flex w-full items-center justify-center gap-4 rounded-[2rem] bg-primary p-6 text-black transition-all hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="theme-inverted-surface flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:rotate-90">
              <Plus size={24} strokeWidth={3} />
            </div>
            <span className="font-headline text-xl font-black uppercase italic tracking-wider">Crear Nueva Rutina</span>
          </button>

          {/* Botón Importar */}
          <button
            id="import-routine-btn"
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex w-full items-center justify-center gap-3 rounded-[2rem] border theme-hairline-border bg-surface-container-low/50 p-4 text-on-surface-variant transition-all hover:border-primary/40 hover:bg-surface-container hover:text-primary active:scale-[0.98] disabled:opacity-50"
          >
            <Upload size={18} strokeWidth={2} />
            <span className="text-sm font-black uppercase tracking-widest">
              {isImporting ? 'Importando…' : 'Importar rutina (.kinetic.json)'}
            </span>
          </button>

          {/* Input oculto para el archivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.kinetic.json"
            className="hidden"
            onChange={handleFileChange}
          />
        </section>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="theme-primary-indicator-glow h-6 w-1 rounded-full bg-primary/40"></div>
            <h3 className="text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">BIBLIOTECA ACTIVA</h3>
          </div>

          {routines.length === 0 ? (
            <div className="rounded-[3rem] border border-dashed theme-hairline-border bg-surface-container-low/35 p-12 text-center backdrop-blur-xl">
              <p className="font-headline text-2xl font-black uppercase italic text-on-surface opacity-40 leading-tight">Sin rutinas cargadas</p>
              <p className="mt-3 text-sm text-on-surface-variant/60">Usa el botón superior para crear tu primer plan de entrenamiento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {routines.map((routine, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={routine.id}
                  onClick={() => {
                    setCurrentRoutine(routine);
                    setView('routine-detail');
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border theme-hairline-border bg-surface-container-low/40 p-8 shadow-2xl backdrop-blur-xl transition-all active:scale-[0.985] theme-interactive-hover"
                >
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-6">
                      <div>
                        <div className="mb-3 flex items-center gap-3">
                          <h4 className="min-w-0 truncate font-headline text-3xl font-black uppercase italic leading-none tracking-tight text-on-background transition-colors group-hover:text-primary sm:text-4xl">
                            {routine.name}
                          </h4>
                          {routine.syncPending && <RoutineSyncPendingBadge />}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/40"></div>
                          <span className="text-[10px] font-black uppercase italic tracking-widest text-on-surface-variant/40">{routine.frequency}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                          <span className="mb-1 text-[8px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant/20">ULTIMA</span>
                          <span className="text-[11px] font-black uppercase text-on-surface">{routine.lastSession || '-- / --'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="mb-1 text-[8px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant/20">ENFOQUE</span>
                      <span className="theme-primary-text text-[11px] font-black uppercase italic">{routine.focus || 'GENERAL'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="theme-muted-surface flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border theme-hairline-border shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:border-primary group-hover:bg-primary group-hover:text-black">
                      <Play size={24} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                  
                  <div className="mt-8 flex items-center justify-end gap-2 relative z-20">
                    {/* Botón Exportar */}
                    <button
                      id={`export-routine-${routine.id}`}
                      title="Exportar rutina"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadRoutineAsJson(routine, profile?.username ?? null);
                      }}
                      className="theme-muted-surface flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant transition-all hover:bg-primary/20 hover:text-primary active:scale-90"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentRoutine(routine);
                        setView('routine-creator');
                      }}
                      className="theme-muted-surface flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:bg-primary hover:text-black active:scale-90"
                    >
                      <Edit2 size={14} />
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoutineToTrash(routine);
                      }}
                      className="theme-muted-surface flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant transition-all hover:bg-red-500/20 hover:text-red-500 active:scale-90"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-8 text-center opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant">
            {totalExercises} ejercicios en total • {routines.length} rutinas activas
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!routineToTrash}
        title="Eliminar rutina"
        message={`¿Estás seguro de que quieres eliminar la rutina "${routineToTrash?.name}" permanentemente? Se perderá todo el historial.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (routineToTrash) {
            onDeleteRoutine(routineToTrash.id);
          }
          setRoutineToTrash(null);
        }}
        onCancel={() => setRoutineToTrash(null)}
      />

      {/* Modal de resultado de importación */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-8 bg-black/60 backdrop-blur-sm"
            onClick={() => setImportResult(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[2.5rem] border theme-hairline-border bg-surface-container p-8 shadow-2xl"
            >
              {/* Icono */}
              <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
                importResult.success
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {importResult.success
                  ? <CheckCircle2 size={28} />
                  : <AlertTriangle size={28} />}
              </div>

              <h3 className="font-headline text-2xl font-black uppercase italic leading-tight text-on-surface">
                {importResult.success ? '¡Rutina importada!' : 'Error al importar'}
              </h3>

              {importResult.success && importResult.routineName && (
                <p className="mt-2 text-sm font-bold text-primary">{importResult.routineName}</p>
              )}

              {importResult.error && (
                <p className="mt-3 text-sm text-red-400">{importResult.error}</p>
              )}

              {/* Advertencias */}
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="mt-4 space-y-2 rounded-2xl bg-amber-500/10 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Avisos</p>
                  {importResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-300/80 leading-snug">{w}</p>
                  ))}
                </div>
              )}

              <button
                onClick={() => setImportResult(null)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-black uppercase tracking-widest text-black transition-all hover:opacity-90 active:scale-95"
              >
                <X size={16} />
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
