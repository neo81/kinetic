import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Info, Plus, Trash2 } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PageShell } from '../components/layout/PageShell';
import type { Exercise, ExerciseLoadType, ExerciseTargetType, UserProfile, View } from '../types';

type EditableSet = {
  id: string;
  reps: string;
  value: string;
  syncReps: boolean;
  syncValue: boolean;
  targetType: ExerciseTargetType;
};

export const ExerciseEditorView = ({
  setView,
  exercise,
  onSave,
  onBack,
  profile,
}: {
  setView: (v: View) => void;
  exercise: Exercise | null;
  onSave: (e: Exercise & { notes?: string; measureUnit?: 'kg' | 'min' | 'sec'; loadType?: ExerciseLoadType }) => void;
  onBack: () => void;
  profile?: UserProfile | null;
}) => {
  const prefersReducedMotion = useReducedMotion();
  const normalizeInput = (value: string) => value.replace(',', '.');
  const getSetMetricValue = (
    measureUnit: 'kg' | 'min' | 'sec',
    base?: {
      weight?: number | string | null;
      durationMinutes?: number | string | null;
      durationSeconds?: number | string | null;
    },
  ) => {
    if (measureUnit === 'min') {
      return base?.durationMinutes !== undefined && base.durationMinutes !== null ? String(base.durationMinutes) : '';
    }
    if (measureUnit === 'sec') {
      return base?.durationSeconds !== undefined && base.durationSeconds !== null ? String(base.durationSeconds) : '';
    }
    return base?.weight !== undefined && base.weight !== null ? String(base.weight) : '';
  };
  const createSetState = (
    index: number,
    measureUnit: 'kg' | 'min' | 'sec',
    base?: {
      reps?: number | string;
      weight?: number | string;
      durationMinutes?: number | string;
      durationSeconds?: number | string;
    },
  ): EditableSet => ({
    id: String(index + 1),
    reps: base?.reps !== undefined && base.reps !== null ? String(base.reps) : '',
    value: getSetMetricValue(measureUnit, base),
    syncReps: index !== 0,
    syncValue: index !== 0,
    targetType: (base as { targetType?: ExerciseTargetType } | undefined)?.targetType ?? 'fixed_reps',
  });

  const initialUnit = exercise?.measureUnit || 'kg';
  const initialSets = exercise?.sets?.length
    ? exercise.sets.map((set, index) => createSetState(index, initialUnit, set))
    : [createSetState(0, initialUnit), createSetState(1, initialUnit), createSetState(2, initialUnit)];

  const [sets, setSets] = useState<EditableSet[]>(initialSets);
  const [unit, setUnit] = useState<'kg' | 'min' | 'sec'>(initialUnit);
  const defaultLoadType: ExerciseLoadType = exercise?.loadType === 'bodyweight' ? 'bodyweight' : 'external';
  const [loadType, setLoadType] = useState<ExerciseLoadType>(defaultLoadType);
  const [localNotes, setLocalNotes] = useState(exercise?.sets?.[0]?.notes || exercise?.notes || '');
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const addSet = () => {
    setSets((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        reps: prev[0]?.reps || '',
        value: prev[0]?.value || '',
        syncReps: true,
        syncValue: true,
        targetType: prev[0]?.targetType || 'fixed_reps',
      },
    ]);
  };

  const renumberSets = (items: EditableSet[]) => items.map((item, index) => ({ ...item, id: String(index + 1) }));

  const updateSet = (id: string, field: 'reps' | 'value', nextValue: string) => {
    const sanitized = normalizeInput(nextValue);
    if (!/^\d*([.]\d*)?$/.test(sanitized) && sanitized !== '') return;

    setSets((prev) => {
      const nextSets = prev.map((set) => ({ ...set }));
      const targetIndex = nextSets.findIndex((set) => set.id === id);
      if (targetIndex === -1) return prev;

      nextSets[targetIndex][field] = sanitized;

      if (targetIndex === 0) {
        const syncKey = field === 'reps' ? 'syncReps' : 'syncValue';
        for (let index = 1; index < nextSets.length; index += 1) {
          if (nextSets[index][syncKey]) {
            nextSets[index][field] = sanitized;
          }
        }
      } else {
        const syncKey = field === 'reps' ? 'syncReps' : 'syncValue';
        nextSets[targetIndex][syncKey] = false;
      }

      return nextSets;
    });
  };

  const updateTargetType = (id: string, targetType: ExerciseTargetType) => {
    setSets((prev) => {
      const nextSets = prev.map((set) => ({ ...set }));
      const targetIndex = nextSets.findIndex((set) => set.id === id);
      if (targetIndex === -1) return prev;

      nextSets[targetIndex].targetType = targetType;
      if (targetType === 'failure') {
        nextSets[targetIndex].reps = '';
      }

      if (targetIndex === 0) {
        for (let index = 1; index < nextSets.length; index += 1) {
          if (nextSets[index].syncReps) {
            nextSets[index].targetType = targetType;
            if (targetType === 'failure') {
              nextSets[index].reps = '';
            }
          }
        }
      } else {
        nextSets[targetIndex].syncReps = false;
      }

      return nextSets;
    });
  };

  const handleRemoveSet = (id: string) => {
    if (sets.length > 1) {
      setSets((prev) => renumberSets(prev.filter((set) => set.id !== id)));
    }
  };

  const handleSave = () => {
    if (!exercise) {
      return;
    }

    const parsedSets = sets.map((set) => ({
      reps: set.targetType === 'failure' ? null : (parseFloat(set.reps || '0') || 0),
      weight: unit === 'kg' && loadType === 'external' ? (parseFloat(set.value || '0') || 0) : null,
      durationMinutes: unit === 'min' ? parseFloat(set.value || '0') || 0 : 0,
      durationSeconds: unit === 'sec' ? parseFloat(set.value || '0') || 0 : 0,
      notes: localNotes,
      targetType: set.targetType,
    }));

    onSave({ ...exercise, sets: parsedSets, measureUnit: unit, loadType: unit === 'kg' ? loadType : 'external', notes: localNotes });
  };

  if (!exercise) {
    return (
      <PageShell
        activeView="exercise-selector"
        setView={setView}
        onProfileClick={() => setView('settings')}
        onSettingsClick={() => setView('settings')}
        profile={profile}
        contentClassName="pb-8"
      >
        <section className="space-y-6 text-center">
          <h2 className="font-headline text-[2.4rem] font-semibold uppercase text-on-surface">Sin ejercicio seleccionado</h2>
          <p className="text-sm text-on-surface-variant">Selecciona un ejercicio desde la biblioteca para comenzar a cargar series.</p>
        </section>
      </PageShell>
    );
  }

  const metricLabel = unit === 'kg' ? 'Peso' : unit === 'min' ? 'Minutos' : 'Segundos';
  const metricHint = unit === 'kg' ? 'kg' : unit === 'min' ? 'min' : 'seg';

  return (
    <PageShell
      activeView="exercise-selector"
      setView={setView}
      onProfileClick={() => setView('settings')}
      onSettingsClick={() => setView('settings')}
      profile={profile}
      contentClassName="pb-8"
    >
      <section className="mb-6 space-y-5">
        <button onClick={onBack} className="flex items-center gap-3 text-on-surface-variant transition-colors hover:text-primary">
          <div className="theme-muted-surface flex h-8 w-8 items-center justify-center rounded-full transition-all group-hover:bg-primary/20">
            <ArrowLeft size={16} strokeWidth={2.5} />
          </div>
          <span className="font-headline text-[0.72rem] font-black uppercase italic tracking-[0.22em]">Volver</span>
        </button>

        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-12 rounded-full bg-secondary/80"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">SESION ACTIVA</span>
          </div>
          <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-primary">
            Editor
          </h1>
        </header>
      </section>

      <section className="mb-6 rounded-[1.2rem] border theme-hairline-border bg-surface-container-low p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Ejercicio actual</p>
            <h2 className="line-clamp-2 text-[1.85rem] font-semibold leading-tight text-on-surface">{exercise.name}</h2>
          </div>
          <button 
            onClick={() => setShowDescription(!showDescription)} 
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all shadow-lg active:scale-90 ${
              showDescription ? 'bg-primary text-black' : 'bg-surface-container-highest text-primary hover:bg-primary/20'
            }`}
          >
            <Info size={18} strokeWidth={2.5} />
          </button>
        </div>
        
        <AnimatePresence>
          {showDescription && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="text-sm text-on-surface-variant border-l-2 border-primary/30 pl-3 py-2 font-medium leading-relaxed bg-primary/5 rounded-r-lg">
                {exercise.description || 'Este ejercicio no tiene descripción técnica disponible.'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          {(['kg', 'min', 'sec'] as const).map((item) => (
            <button
              key={item}
              onClick={() => {
                setUnit(item);
                if (item !== 'kg') {
                  setLoadType('external');
                }
              }}
              className={`rounded-lg px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${
                unit === item ? 'bg-primary text-black' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        {unit === 'kg' && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[0.85rem] bg-surface-container-highest px-3 py-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Peso corporal</p>
              <p className="mt-0.5 text-[9px] text-on-surface-variant/60">
                {profile?.bodyWeightKg ? `${profile.bodyWeightKg} kg desde perfil` : 'Usa el peso registrado en perfil'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLoadType((current) => (current === 'bodyweight' ? 'external' : 'bodyweight'))}
              className={`flex h-7 w-12 items-center rounded-full border px-1 transition-all ${
                loadType === 'bodyweight'
                  ? 'justify-end border-secondary bg-secondary'
                  : 'justify-start border-outline-variant/30 bg-surface-container'
              }`}
              aria-pressed={loadType === 'bodyweight'}
            >
              <span className={`h-5 w-5 rounded-full shadow ${loadType === 'bodyweight' ? 'bg-black' : 'bg-on-surface-variant/45'}`} />
            </button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-secondary">Series de trabajo</h3>
          <div className="flex gap-1.5">
            {sets.slice(0, 3).map((set, index) => (
              <div key={set.id} className={`h-3 w-1 rounded-full ${index < sets.length ? 'bg-primary' : 'bg-surface-container-highest'}`}></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2 px-2">
          <span className="text-[9px] uppercase tracking-widest text-on-surface-variant">Set</span>
          <span className="text-center text-[9px] uppercase tracking-widest text-on-surface-variant">Reps</span>
          <span className="text-center text-[9px] uppercase tracking-widest text-on-surface-variant">{metricLabel}</span>
          <span></span>
        </div>

        <div className="space-y-2">
          {sets.map((set, index) => (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2 rounded-xl border theme-hairline-border bg-surface-container-high/40 p-2"
            >
              <span className="pl-2 font-headline text-sm font-semibold text-on-surface-variant">{String(index + 1).padStart(2, '0')}</span>

              <div className="min-w-0 space-y-1.5">
                <div className="grid h-8 grid-cols-2 rounded-lg bg-surface-container-highest p-0.5">
                  <button
                    type="button"
                    onClick={() => updateTargetType(set.id, 'fixed_reps')}
                    className={`rounded-md text-[10px] font-black uppercase tracking-[0.14em] ${
                      set.targetType === 'fixed_reps' ? 'bg-primary text-black' : 'text-on-surface-variant'
                    }`}
                  >
                    Reps
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTargetType(set.id, 'failure')}
                    className={`rounded-md text-[10px] font-black uppercase tracking-[0.14em] ${
                      set.targetType === 'failure' ? 'bg-secondary text-black' : 'text-on-surface-variant'
                    }`}
                  >
                    Fallo
                  </button>
                </div>
                {set.targetType === 'failure' ? (
                  <div className="flex h-11 w-full items-center justify-center rounded-lg border border-secondary/30 bg-secondary/10 text-center font-headline text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Al fallo
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={set.reps}
                    onChange={(e) => updateSet(set.id, 'reps', e.target.value)}
                    placeholder="reps"
                    className="h-11 w-full rounded-lg border-none bg-surface-container-highest text-center font-headline text-base font-semibold text-on-surface focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>

              <div className="relative min-w-0">
                {unit === 'kg' && loadType === 'bodyweight' ? (
                  <div className="flex h-[5rem] w-full items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-center font-headline text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    Corporal
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={set.value}
                      onChange={(e) => updateSet(set.id, 'value', e.target.value)}
                      placeholder={metricHint}
                      className="h-[5rem] w-full rounded-lg border-none bg-surface-container-highest text-center font-headline text-lg font-semibold text-on-surface focus:ring-1 focus:ring-primary"
                    />
                    <span className="pointer-events-none absolute bottom-1.5 right-2 text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/55">{metricHint}</span>
                  </>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => handleRemoveSet(set.id)}
                  disabled={sets.length === 1}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                    sets.length === 1
                      ? 'cursor-not-allowed border-outline-variant/20 text-outline-variant/40'
                      : 'border-outline-variant/30 text-on-surface-variant hover:border-secondary/45 hover:text-secondary'
                  }`}
                >
                  <Trash2 size={14} strokeWidth={2.3} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={addSet}
          className="w-full rounded-xl border-2 border-dashed border-outline-variant/25 py-4 text-on-surface-variant transition-all hover:border-primary/40 hover:text-primary active:scale-[0.99]"
        >
          <span className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]">
            <Plus size={16} strokeWidth={2.7} />
            Anadir serie
          </span>
        </button>

        <div className="rounded-xl border theme-hairline-border bg-surface-container-highest/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest text-secondary font-bold">Notas de entrenamiento</span>
          </div>
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Escribe observaciones de la serie o del ejercicio."
            className="h-16 w-full resize-none border-none bg-transparent p-0 text-sm text-on-surface-variant placeholder:text-outline-variant/40 focus:ring-0"
          />
        </div>

        <button
          onClick={handleSave}
                className="neon-button theme-primary-shadow-strong mt-6 flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-black transition-all active:scale-[0.98]"
        >
          <span className="font-headline text-lg font-bold uppercase tracking-tight">Guardar ejercicio</span>
          <ArrowRight size={20} strokeWidth={2.8} />
        </button>
      </section>
    </PageShell>
  );
};
