import { useRef, useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Edit2, Play, Plus, Trash2, Upload, X } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { PageShell } from '../components/layout/PageShell';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { downloadRoutineAsJson } from '../utils/routineExport';
import { importRoutineFromJson, RoutineImportError, type RoutineImportWarning } from '../utils/routineImport';
import type { Routine, View, UserProfile } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

const importErrorKeys: Record<RoutineImportError['code'], TranslationKey> = {
  invalidJson: 'routines.import.invalidJson',
  invalidFormat: 'routines.import.invalidFormat',
  unsupportedVersion: 'routines.import.unsupportedVersion',
  invalidRoutineData: 'routines.import.invalidRoutineData',
  noConnection: 'routines.import.noConnection',
  muscleGroupMissing: 'routines.import.muscleGroupMissing',
  customCreateFailed: 'routines.import.customCreateFailed',
  noSession: 'routines.import.noSession',
  routineSaveFailed: 'routines.import.routineSaveFailed',
  daySaveFailed: 'routines.import.daySaveFailed',
  exerciseSaveFailed: 'routines.import.exerciseSaveFailed',
  setsSaveFailed: 'routines.import.setsSaveFailed',
  authenticationRequired: 'routines.import.authenticationRequired',
};

const importWarningKeys: Record<RoutineImportWarning['code'], TranslationKey> = {
  matchedByName: 'routines.import.warning.matchedByName',
  customReused: 'routines.import.warning.customReused',
  customCreated: 'routines.import.warning.customCreated',
};

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
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [routineToTrash, setRoutineToTrash] = useState<Routine | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    routineName?: string;
    warnings?: RoutineImportWarning[];
    error?: string;
  } | null>(null);

  const formatImportError = (error: RoutineImportError) => {
    const base = t(importErrorKeys[error.code]);
    if (error.context.exerciseName) return `${base} "${error.context.exerciseName}".`;
    if (error.context.dayTitle) return `${base} "${error.context.dayTitle}".`;
    if (error.code === 'unsupportedVersion' && error.context.version) {
      return `${base} (${t('common.version')} ${error.context.version})`;
    }
    return base;
  };

  const formatImportWarning = (warning: RoutineImportWarning) =>
    `"${warning.exerciseName}": ${t(importWarningKeys[warning.code])}`;

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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
          ? formatImportError(err)
          : t('routines.unexpectedImportError');
      setImportResult({ success: false, error: message });
    } finally {
      setIsImporting(false);
    }
  };

  const totalExercises = routines.reduce((count, routine) => count + (routine.exercises?.length || 0), 0);
  const getRoutineFrequency = (routine: Routine) => {
    const entryCount = routine.dayEntries?.filter((day) => day.dayType === 'weekday').length ?? 0;
    const legacyCount = routine.days?.filter((day) => typeof day === 'number').length ?? 0;
    const weekdayCount = entryCount > 0 ? entryCount : legacyCount;
    const count = Math.max(weekdayCount, 1);
    return `${count} ${t(count === 1 ? 'routines.frequencyOnce' : 'routines.frequencyMany')}`;
  };

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
            <span className="font-headline text-[0.72rem] font-black uppercase italic tracking-[0.22em]">{t('routines.backDashboard')}</span>
          </button>
        </section>

        {/* Título y Cabecera de Contenido */}
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">{t('routines.planManagement')}</span>
          </div>
          <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-on-surface">{t('routines.myRoutines')}</h1>
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
            <span className="font-headline text-xl font-black uppercase italic tracking-wider">{t('routines.create')}</span>
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
              {isImporting ? t('routines.importing') : t('routines.import')}
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
            <h3 className="text-[10px] font-black uppercase italic tracking-[0.4em] text-on-surface-variant/60">{t('routines.activeLibrary')}</h3>
          </div>

          {routines.length === 0 ? (
            <div className="rounded-[3rem] border border-dashed theme-hairline-border bg-surface-container-low/35 p-12 text-center backdrop-blur-xl">
              <p className="font-headline text-2xl font-black uppercase italic text-on-surface opacity-40 leading-tight">{t('routines.empty')}</p>
              <p className="mt-3 text-sm text-on-surface-variant/60">{t('routines.emptyHint')}</p>
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
                        <div className="mb-3 flex min-w-0 items-start gap-3">
                          <h4 className="min-w-0 flex-1 break-words pb-1 pr-1 font-headline text-3xl font-black uppercase italic leading-[0.95] tracking-tight text-on-background transition-colors [overflow-wrap:anywhere] group-hover:text-primary sm:text-4xl">
                            {routine.name}
                          </h4>
                          {routine.syncPending && <RoutineSyncPendingBadge />}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/40"></div>
                          <span className="text-[10px] font-black uppercase italic tracking-widest text-on-surface-variant/40">{getRoutineFrequency(routine)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-10">
                        <div className="flex flex-col">
                          <span className="mb-1 text-[8px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant/20">{t('routines.last')}</span>
                          <span className="text-[11px] font-black uppercase text-on-surface">{routine.lastSession || '-- / --'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="mb-1 text-[8px] font-black uppercase italic tracking-[0.3em] text-on-surface-variant/20">{t('routines.focus')}</span>
                      <span className="theme-primary-text text-[11px] font-black uppercase italic">{routine.focus || t('routines.general')}</span>
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
                      title={t('routines.export')}
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
                      {t('routines.edit')}
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
            {totalExercises} {t(totalExercises === 1 ? 'routines.exerciseSingular' : 'routines.exercisePlural')} • {routines.length} {t(routines.length === 1 ? 'routines.routineSingular' : 'routines.routinePlural')}
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!routineToTrash}
        title={t('routines.deleteRoutine')}
        message={`${t('routines.deleteRoutinePrefix')} "${routineToTrash?.name}" ${t('routines.deleteRoutineSuffix')}`}
        confirmText={t('routines.delete')}
        cancelText={t('common.cancel')}
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
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-5 py-[calc(env(safe-area-inset-top)+1.25rem)] backdrop-blur-sm"
            onClick={() => setImportResult(null)}
          >
            <motion.div
              initial={{ y: 16, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.97, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="routine-import-result-title"
              className="max-h-[calc(100dvh-2.5rem)] w-full max-w-sm overflow-y-auto rounded-[2rem] border theme-hairline-border bg-surface-container p-6 shadow-2xl"
            >
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                importResult.success
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {importResult.success
                  ? <CheckCircle2 size={28} />
                  : <AlertTriangle size={28} />}
              </div>

              <h3 id="routine-import-result-title" className="text-center font-headline text-2xl font-black uppercase italic leading-tight text-on-surface">
                {importResult.success ? t('routines.imported') : t('routines.importError')}
              </h3>

              {importResult.success && importResult.routineName && (
                <div className="mt-4 rounded-2xl bg-surface-container-high px-4 py-3 text-center">
                  <p className="text-base font-black text-primary">{importResult.routineName}</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-on-surface-variant">
                    {t('routines.importSuccessHint')}
                  </p>
                </div>
              )}

              {importResult.error && (
                <p className="mt-3 text-sm text-red-400">{importResult.error}</p>
              )}

              {/* Advertencias */}
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div className="mt-4 space-y-2 rounded-2xl bg-amber-500/10 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">{t('routines.warnings')}</p>
                  {importResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-300/80 leading-snug">{formatImportWarning(w)}</p>
                  ))}
                </div>
              )}

              <button
                onClick={() => setImportResult(null)}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-widest text-black transition-all hover:opacity-90 active:scale-95"
              >
                {importResult.success ? <CheckCircle2 size={18} /> : <X size={18} />}
                {importResult.success ? t('common.done') : t('common.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
