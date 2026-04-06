import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Info, Plus, Trash2 } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import type { Exercise, View } from '../types';

type EditableSet = {
  id: string;
  reps: string;
  value: string;
  syncReps: boolean;
  syncValue: boolean;
};

export const ExerciseEditorView = ({
  setView,
  exercise,
  onSave,
  onBack,
}: {
  setView: (v: View) => void;
  exercise: Exercise | null;
  onSave: (e: Exercise & { notes?: string; measureUnit?: 'kg' | 'min' | 'sec' }) => void;
  onBack: () => void;
}) => {
  const normalizeInput = (value: string) => value.replace(',', '.');
  const getSetMetricValue = (
    measureUnit: 'kg' | 'min' | 'sec',
    base?: {
      weight?: number | string;
      durationMinutes?: number | string;
      durationSeconds?: number | string;
    },
  ) => {
    if (measureUnit === 'min') {
      return base?.durationMinutes !== undefined ? String(base.durationMinutes) : '';
    }
    if (measureUnit === 'sec') {
      return base?.durationSeconds !== undefined ? String(base.durationSeconds) : '';
    }
    return base?.weight !== undefined ? String(base.weight) : '';
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
    reps: base?.reps !== undefined ? String(base.reps) : '',
    value: getSetMetricValue(measureUnit, base),
    syncReps: index !== 0,
    syncValue: index !== 0,
  });

  const initialUnit = exercise?.measureUnit || 'kg';
  const initialSets = exercise?.sets?.length
    ? exercise.sets.map((set, index) => createSetState(index, initialUnit, set))
    : [createSetState(0, initialUnit), createSetState(1, initialUnit), createSetState(2, initialUnit)];

  const [sets, setSets] = useState<EditableSet[]>(initialSets);
  const [unit, setUnit] = useState<'kg' | 'min' | 'sec'>(initialUnit);
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
      reps: parseFloat(set.reps || '0') || 0,
      weight: unit === 'kg' ? parseFloat(set.value || '0') || 0 : 0,
      durationMinutes: unit === 'min' ? parseFloat(set.value || '0') || 0 : 0,
      durationSeconds: unit === 'sec' ? parseFloat(set.value || '0') || 0 : 0,
      notes: localNotes,
    }));

    onSave({ ...exercise, sets: parsedSets, measureUnit: unit, notes: localNotes });
  };

  if (!exercise) {
    return (
      <PageShell
        activeView="exercise-selector"
        setView={setView}
        onProfileClick={() => setView('settings')}
        onSettingsClick={() => setView('settings')}
        contentClassName="max-w-md pb-8"
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
      contentClassName="max-w-md pb-8"
    >
      <section className="mb-6">
        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-primary shadow-xl transition-all hover:bg-primary/10 active:scale-90"
          >
            <ArrowLeft size={20} strokeWidth={3} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <div className="flex flex-col">
            <span className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-secondary"></span>
              Sesion activa
            </span>
            <h1 className="font-headline text-[2.5rem] font-semibold uppercase leading-none text-primary">Editor</h1>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-[1.2rem] border border-white/6 bg-surface-container-low p-5 shadow-xl">
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
              onClick={() => setUnit(item)}
              className={`rounded-lg px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${
                unit === item ? 'bg-primary text-black' : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
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

        <div className="grid grid-cols-[3rem_1fr_1fr_2.5rem] gap-2 px-2">
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
              className="grid grid-cols-[3rem_1fr_1fr_2.5rem] items-center gap-2 rounded-xl border border-white/6 bg-surface-container-high/40 p-2"
            >
              <span className="pl-2 font-headline text-sm font-semibold text-on-surface-variant">{String(index + 1).padStart(2, '0')}</span>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={set.reps}
                  onChange={(e) => updateSet(set.id, 'reps', e.target.value)}
                  placeholder="reps"
                  className="w-full rounded-lg border-none bg-surface-container-highest py-3 text-center font-headline text-lg font-semibold text-on-surface focus:ring-1 focus:ring-primary"
                />
                <span className="pointer-events-none absolute bottom-1.5 right-2 text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/55">reps</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={set.value}
                  onChange={(e) => updateSet(set.id, 'value', e.target.value)}
                  placeholder={metricHint}
                  className="w-full rounded-lg border-none bg-surface-container-highest py-3 text-center font-headline text-lg font-semibold text-on-surface focus:ring-1 focus:ring-primary"
                />
                <span className="pointer-events-none absolute bottom-1.5 right-2 text-[9px] uppercase tracking-[0.12em] text-on-surface-variant/55">{metricHint}</span>
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

        <div className="rounded-xl border border-white/5 bg-surface-container-highest/20 p-4">
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
          className="neon-button mt-6 flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-black shadow-[0_20px_40px_rgba(212,255,0,0.15)] transition-all active:scale-[0.98]"
        >
          <span className="font-headline text-lg font-bold uppercase tracking-tight">Guardar ejercicio</span>
          <ArrowRight size={20} strokeWidth={2.8} />
        </button>
      </section>
    </PageShell>
  );
};
