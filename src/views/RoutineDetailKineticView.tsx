import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Dumbbell,
  Edit2,
  Play,
  RotateCcw,
  Trash2,
  X,
  Timer,
  Check
} from 'lucide-react';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { PageShell } from '../components/layout/PageShell';
import type { ActiveSession, Exercise, Routine, View, RoutineDayExercise, SessionExerciseGroup } from '../types';

const DEFAULT_REST_SECONDS = 0;

const formatClock = (value: number) => String(value).padStart(2, '0');

const formatStopwatch = (elapsedMs: number) => {
  const safeMs = Math.max(elapsedMs, 0);
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const milliseconds = safeMs % 1000;
  return `${formatClock(minutes)}:${formatClock(seconds)}:${String(milliseconds).padStart(3, '0')}`;
};

const formatCountdown = (totalSeconds: number) => {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${formatClock(minutes)}:${formatClock(seconds)}`;
};

const getExerciseCompletedSetCount = (activeSession: ActiveSession | null, exerciseId: string) =>
  Object.values(activeSession?.performanceData[exerciseId] || {}).filter((set) => set?.captured).length;

const isExerciseFullyCompleted = (
  activeSession: ActiveSession | null,
  dayExercise: RoutineDayExercise,
) => getExerciseCompletedSetCount(activeSession, dayExercise.id) >= dayExercise.exercise.sets.length && dayExercise.exercise.sets.length > 0;

const getGroupLabel = (exerciseCount: number) => {
  if (exerciseCount === 2) return 'Superset';
  if (exerciseCount === 3) return 'Triserie';
  return 'Circuito';
};

const getSetPreviewValue = (exercise: Exercise, setIndex: number) => {
  const set = exercise.sets[setIndex];
  if (!set) return '-';
  if (exercise.measureUnit === 'min') return `${set.durationMinutes ?? 0} min`;
  if (exercise.measureUnit === 'sec') return `${set.durationSeconds ?? 0} seg`;
  return `${set.weight ?? 0} kg`;
};

type DayRenderItem =
  | { type: 'single'; exercise: RoutineDayExercise }
  | { type: 'group'; group: SessionExerciseGroup; exercises: RoutineDayExercise[] };

const playAlertTone = async () => {
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  const audioContext = new AudioContextConstructor();
  const sequence = [880, 1174, 1568];

  sequence.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startAt = audioContext.currentTime + index * 0.18;
    const endAt = startAt + 0.12;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt);
  });

  window.setTimeout(() => {
    audioContext.close().catch(() => undefined);
  }, 900);
};

const triggerCompletionFeedback = async () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([220, 120, 220, 120, 420]);
  }

  await playAlertTone();
};

const PopupShell = ({
  title,
  accent,
  onClose,
  children,
}: {
  title: string;
  accent: 'primary' | 'secondary';
  onClose: () => void;
  children: ReactNode;
}) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
    <div className="relative w-full max-w-[22rem] overflow-hidden rounded-[1.6rem] border border-white/6 bg-[#101318] shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
      <div className={`absolute left-0 top-0 h-1 w-16 ${accent === 'primary' ? 'bg-primary' : 'bg-secondary'}`}></div>
      <div className={`absolute bottom-0 right-0 h-1 w-16 ${accent === 'primary' ? 'bg-primary' : 'bg-secondary'}`}></div>
      <div className="p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-on-surface-variant">{title}</p>
            <div className={`mt-3 h-1 w-14 rounded-full ${accent === 'primary' ? 'bg-primary' : 'bg-secondary'}`}></div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </div>
    </div>
  </div>
);

const RestTimerModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_REST_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setIsRunning(false);
      completedRef.current = false;
      return;
    }

    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, open]);

  useEffect(() => {
    if (!open || remainingSeconds !== 0 || completedRef.current) {
      return;
    }

    completedRef.current = true;
    setIsRunning(false);
    triggerCompletionFeedback().catch(() => undefined);
  }, [open, remainingSeconds]);

  const closeAndReset = () => {
    setIsRunning(false);
    setRemainingSeconds(DEFAULT_REST_SECONDS);
    completedRef.current = false;
    onClose();
  };

  const adjustTimer = (secondsToAdd: number) => {
    completedRef.current = false;
    setRemainingSeconds((current) => Math.max(current + secondsToAdd, 0));
  };

  if (!open) {
    return null;
  }

  return (
    <PopupShell title="Reloj de descanso" accent="primary" onClose={closeAndReset}>
      <div className="text-center">
        <div className="font-headline text-[5rem] font-semibold leading-none tracking-[0.02em] text-primary drop-shadow-[0_0_22px_rgba(212,255,0,0.42)]">
          {formatCountdown(remainingSeconds)}
        </div>
        <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.3em] text-primary/55">
          {remainingSeconds > 0 ? 'Descanso activo' : 'Descanso finalizado'}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: '-10s', value: -10 },
          { label: '-30s', value: -30 },
          { label: '-1m', value: -60 },
          { label: '+10s', value: 10 },
          { label: '+30s', value: 30 },
          { label: '+1m', value: 60 },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => adjustTimer(item.value)}
            className="rounded-[0.85rem] bg-surface-container-high px-2 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:text-on-surface hover:bg-white/5 active:scale-95"
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setIsRunning((current) => !current)}
        className="neon-button mt-8 flex w-full items-center justify-center rounded-[0.95rem] py-4 font-headline text-[1.6rem] font-semibold uppercase tracking-[0.16em]"
      >
        {isRunning ? 'Pausar' : remainingSeconds === 0 ? 'Reiniciar' : 'Iniciar'}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setIsRunning(false);
            setRemainingSeconds(0);
          }}
          className="rounded-[0.95rem] border border-white/12 py-4 text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
        >
          Omitir
        </button>
        <button
          onClick={closeAndReset}
          className="rounded-[0.95rem] border border-secondary/40 py-4 text-sm font-bold uppercase tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/10"
        >
          Cancelar
        </button>
      </div>
    </PopupShell>
  );
};

const SessionStopwatchModal = ({
  open,
  onClose,
  elapsedMs,
  isRunning,
  onToggleRunning,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  elapsedMs: number;
  isRunning: boolean;
  onToggleRunning: () => void;
  onReset: () => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <PopupShell title="Cronometro de sesion" accent="secondary" onClose={onClose}>
      <div className="text-center">
        <div className="font-headline text-[4.2rem] font-semibold leading-none tracking-[0.02em] text-primary drop-shadow-[0_0_18px_rgba(212,255,0,0.38)] sm:text-[4.8rem]">
          {formatStopwatch(elapsedMs)}
        </div>
        <div className="mt-3 grid grid-cols-3 text-[0.62rem] font-bold uppercase tracking-[0.32em] text-on-surface-variant/60">
          <span>MIN</span>
          <span>SEG</span>
          <span>MS</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          onClick={onToggleRunning}
          className="neon-button flex items-center justify-center gap-3 rounded-[0.95rem] py-4 font-headline text-[1.2rem] font-semibold uppercase tracking-[0.16em]"
        >
          <Play size={16} fill="currentColor" />
          {isRunning ? 'Pausar' : 'Iniciar'}
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-[0.95rem] border border-white/12 py-4 text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <RotateCcw size={15} />
          Reiniciar
        </button>
      </div>
    </PopupShell>
  );
};

const SetCaptureOverlay = ({
  open,
  onClose,
  exercise,
  setNumber,
  plannedReps,
  plannedWeight,
  totalSets,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  exercise: { name: string; measureUnit?: 'kg' | 'min' | 'sec' };
  setNumber: number;
  plannedReps: number | null;
  plannedWeight: number | null;
  totalSets: number;
  onCapture: (reps: number | null, weight: number | null) => void;
}) => {
  const [actualReps, setActualReps] = useState<string>(String(plannedReps ?? ''));
  const [actualWeight, setActualWeight] = useState<string>(String(plannedWeight ?? ''));

  useEffect(() => {
    setActualReps(String(plannedReps ?? ''));
    setActualWeight(String(plannedWeight ?? ''));
  }, [plannedReps, plannedWeight, setNumber, open]);

  const normalizeInput = (value: string) => value.replace(',', '.');

  const handleConfirm = () => {
    const reps = actualReps ? parseFloat(actualReps) : null;
    const weight = actualWeight ? parseFloat(actualWeight) : null;
    onCapture(reps, weight);
    // No cerrar aquí - dejar que handleSetCapture maneje el cierre del modal
  };

  if (!open) {
    return null;
  }

  return (
    <PopupShell
      title={`Set ${setNumber} - ${exercise.name}`}
      accent="primary"
      onClose={onClose}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(setNumber / totalSets) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
            Set {setNumber} de {totalSets}
          </p>
        </div>
      </div>

      <div
        key={`set-${setNumber}`}
        className="space-y-6 animate-fade-in"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2">
              Reps Realizadas
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={actualReps}
              onChange={(e) => {
                const normalized = normalizeInput(e.target.value);
                if (normalized === '' || /^\d*([.]\d*)?$/.test(normalized)) {
                  setActualReps(normalized);
                }
              }}
              placeholder={String(plannedReps ?? '0')}
              className="w-full rounded-lg bg-surface-container p-3 text-center font-headline text-xl font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2">
              {exercise.measureUnit === 'min'
                ? 'Minutos Realizados'
                : exercise.measureUnit === 'sec'
                  ? 'Segundos Realizados'
                  : 'Peso / Kg Realizado'}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={actualWeight}
              onChange={(e) => {
                const normalized = normalizeInput(e.target.value);
                if (normalized === '' || /^\d*([.]\d*)?$/.test(normalized)) {
                  setActualWeight(normalized);
                }
              }}
              placeholder={String(plannedWeight ?? '0')}
              className="w-full rounded-lg bg-surface-container p-3 text-center font-headline text-xl font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="neon-button w-full flex items-center justify-center gap-2 rounded-[0.95rem] py-4 font-headline text-[1.2rem] font-semibold uppercase tracking-[0.16em]"
        >
          <Check size={18} strokeWidth={2.5} />
          Confirmar
        </button>

        <button
          onClick={onClose}
          className="w-full rounded-[0.95rem] border border-white/12 py-4 text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
        >
          Cancelar
        </button>
      </div>
    </PopupShell>
  );
};

const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-6 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-[1.8rem] border border-white/10 bg-[#12151a] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.7)]">
        <div className="absolute left-0 top-0 h-1.5 w-20 bg-secondary"></div>
        <h3 className="font-headline text-[1.8rem] font-bold uppercase tracking-tight text-white leading-tight">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant/85">
          {message}
        </p>
        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="flex w-full items-center justify-center rounded-[1rem] bg-secondary py-4 font-headline text-[1.1rem] font-bold uppercase tracking-widest text-black transition-transform active:scale-95"
          >
            Confirmar
          </button>
          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center rounded-[1rem] border border-white/12 py-4 font-headline text-[0.9rem] font-bold uppercase tracking-[0.2em] text-on-surface-variant transition-colors hover:bg-white/5 active:scale-95"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export const RoutineDetailKineticView = ({
  setView,
  routine,
  onDeleteRoutine,
  onDeleteRoutineDay,
  onDeleteExercise,
  onEditExercise,
  onEditRoutine,
  onSelectRoutineDay,
  openDayId,
  onOpenDayChange,
  activeSession,
  onStartSession,
  onEndSession,
  onCaptureSetPerformance,
  onClearCapturedSetPerformance,
  onSwitchSessionDay,
  onCreateExerciseGroup,
  onRemoveExerciseGroup,
}: {
  setView: (v: View) => void;
  routine: Routine | null;
  onDeleteRoutine: (id: string) => void;
  onDeleteRoutineDay: (dayId: string) => void;
  onDeleteExercise: (exerciseId: string, dayId?: string) => void;
  onEditExercise: (exercise: Exercise, instanceId: string, dayId: string) => void;
  onEditRoutine: (routine: Routine) => void;
  onSelectRoutineDay: (dayId: string | null) => void;
  openDayId: string | null;
  onOpenDayChange: (dayId: string | null) => void;
  activeSession: ActiveSession | null;
  onStartSession: (routineId: string, routineName: string, routineDayIds: string | string[]) => Promise<void>;
  onEndSession: () => Promise<void>;
  onCaptureSetPerformance: (exerciseId: string, setNumber: number, reps: number | null, weight: number | null, durationMin: number | null, durationSec: number | null, totalSets?: number) => void;
  onClearCapturedSetPerformance: (exerciseId: string, setNumber: number, totalSets?: number) => void;
  onSwitchSessionDay: (dayId: string) => void;
  onCreateExerciseGroup: (dayId: string, exerciseIds: string[]) => void;
  onRemoveExerciseGroup: (dayId: string, groupId: string) => void;
}) => {
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [isSessionTimerOpen, setIsSessionTimerOpen] = useState(false);
  const [elapsedSessionMs, setElapsedSessionMs] = useState(0);
  const [isSessionTimerRunning, setIsSessionTimerRunning] = useState(false);

  // Estados de confirmación
  const [confirmRoutineDelete, setConfirmRoutineDelete] = useState(false);
  const [confirmDayDeleteId, setConfirmDayDeleteId] = useState<string | null>(null);
  const [confirmExerciseDelete, setConfirmExerciseDelete] = useState<{ exId: string; dayId: string } | null>(null);
  const [confirmEndSession, setConfirmEndSession] = useState(false);
  const [isGroupingMode, setIsGroupingMode] = useState(false);
  const [selectedGroupExerciseIds, setSelectedGroupExerciseIds] = useState<string[]>([]);

  // Estado para captura de set
  const [setCapturePending, setSetCapturePending] = useState<{ exerciseId: string; setNumber: number; reps: number | null; weight: number | null } | null>(null);
  const [allExerciseSets, setAllExerciseSets] = useState<Exercise | null>(null);

  useEffect(() => {
    // Solo scrollear al inicio al montar
    window.scrollTo(0, 0);
  }, []);

  // Mantener CORE abierto cuando está en sesión activa, y cambiar el día abierto cuando el día activo cambia
  useEffect(() => {
    if (!activeSession || activeSession.routineId !== routine?.id) {
      return;
    }

    // Si hay sesión activa, mantener abierto el día activo
    if (openDayId !== activeSession.activeRoutineDayId) {
      onOpenDayChange(activeSession.activeRoutineDayId);
    }
  }, [activeSession?.activeRoutineDayId, activeSession?.routineId, routine?.id, openDayId, onOpenDayChange]);

  // Auto-avanzar al siguiente día si el actual está completado
  useEffect(() => {
    if (!activeSession || activeSession.routineId !== routine?.id) {
      return;
    }

    // Obtener el día actualmente abierto
    const currentDay = routine.dayEntries?.find(d => d.id === activeSession.activeRoutineDayId);
    if (!currentDay) return;

    // Verificar si todos los ejercicios de este día están completados
    const allExercisesInDay = currentDay.exercises;
    const dayExercisesCompleted = allExercisesInDay.every((dayEx) =>
      isExerciseFullyCompleted(activeSession, dayEx)
    );

    if (dayExercisesCompleted && allExercisesInDay.length > 0) {
      // Encontrar el próximo día en la sesión
      const currentIndex = activeSession.routineDayIds.indexOf(activeSession.activeRoutineDayId);
      const nextDayId = activeSession.routineDayIds[currentIndex + 1];

      if (nextDayId) {
        onSwitchSessionDay(nextDayId);
      }
    }
  }, [activeSession, routine?.dayEntries, onSwitchSessionDay]);

  useEffect(() => {
    if (!isSessionTimerRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSessionMs((current) => current + 10);
    }, 10);

    return () => window.clearInterval(timer);
  }, [isSessionTimerRunning]);

  useEffect(() => {
    resetGroupingMode();
  }, [openDayId, activeSession?.activeRoutineDayId]);

  const handleSetCaptureClose = () => {
    setSetCapturePending(null);
    setAllExerciseSets(null);
  };

  const handleSetCapture = (reps: number | null, weight: number | null) => {
    if (!setCapturePending || !allExerciseSets) return;

    // Guardar los datos del set actual
    onCaptureSetPerformance(
      setCapturePending.exerciseId,
      setCapturePending.setNumber,
      reps,
      weight,
      null,
      null,
      allExerciseSets.sets.length
    );
    handleSetCaptureClose();
  };

  const handleSetChipClick = (dayEx: RoutineDayExercise, setIndex: number) => {
    const targetSet = dayEx.exercise.sets[setIndex];
    if (!targetSet) return;

    const setNumber = targetSet.setNumber || setIndex + 1;
    const isCaptured = !!activeSession?.performanceData[dayEx.id]?.[setNumber]?.captured;

    if (isCaptured) {
      onClearCapturedSetPerformance(dayEx.id, setNumber, dayEx.exercise.sets.length);
      return;
    }

    let value: number | null = null;
    if (dayEx.exercise.measureUnit === 'min') {
      value = targetSet.durationMinutes ?? null;
    } else if (dayEx.exercise.measureUnit === 'sec') {
      value = targetSet.durationSeconds ?? null;
    } else {
      value = targetSet.weight ?? null;
    }

    setAllExerciseSets(dayEx.exercise);
    setSetCapturePending({
      exerciseId: dayEx.id,
      setNumber,
      reps: targetSet.reps ?? null,
      weight: value,
    });
  };

  const toggleExerciseGroupSelection = (exerciseId: string) => {
    setSelectedGroupExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((id) => id !== exerciseId)
        : [...current, exerciseId]
    );
  };

  const resetGroupingMode = () => {
    setIsGroupingMode(false);
    setSelectedGroupExerciseIds([]);
  };

  const handleCreateGroup = (dayId: string) => {
    if (selectedGroupExerciseIds.length < 2) return;
    onCreateExerciseGroup(dayId, selectedGroupExerciseIds);
    resetGroupingMode();
  };

  if (!routine) {
    return (
      <>
        <PageShell
          activeView="routine-detail"
          setView={setView}
          onProfileClick={() => setView('settings')}
          onSettingsClick={() => setView('settings')}
          contentClassName=""
          headerChildren={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRestTimerOpen(true)}
                className="flex items-center gap-2 rounded-full border border-secondary/25 bg-surface-container-high/90 px-3 py-2 text-secondary shadow-[0_12px_32px_rgba(255,92,0,0.15)] hover:bg-surface-bright transition-colors"
                title="Reloj de Descanso"
              >
                <AlarmClock size={15} strokeWidth={2.4} />
                <span className="font-headline text-[1rem] font-semibold uppercase tracking-[0.08em] text-secondary">Descanso</span>
              </button>
              <button
                onClick={() => setIsSessionTimerOpen(true)}
                className="flex items-center justify-center p-2.5 rounded-full border border-white/10 bg-surface-container-high text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
                title="Cronómetro temporal"
              >
                <Timer size={18} />
              </button>
            </div>
          }
        >
          <section className="space-y-6 text-center">
            <h2 className="font-headline text-[2.4rem] font-semibold uppercase text-on-surface">Sin rutina activa</h2>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              No hay una rutina seleccionada para mostrar detalles.
            </p>
            <button
              onClick={() => setView('routine-creator')}
              className="neon-button mx-auto rounded-[0.9rem] px-6 py-3 font-headline text-[1.1rem] font-semibold uppercase"
            >
              Crear rutina
            </button>
          </section>
        </PageShell>
        <RestTimerModal open={isRestTimerOpen} onClose={() => setIsRestTimerOpen(false)} />
      </>
    );
  }

  const volume = routine.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.reduce((setsTotal, set) => setsTotal + set.weight * set.reps, 0),
    0,
  );

  const getSetDisplayValue = (ex: Exercise) => {
    const firstSet = ex.sets[0];
    if (!firstSet) return '-';
    if (ex.measureUnit === 'min') return `${firstSet.durationMinutes || 0} min`;
    if (ex.measureUnit === 'sec') return `${firstSet.durationSeconds || 0} seg`;
    return `${firstSet.weight || 0} kg`;
  };

  const getDayExerciseGroups = (dayId: string) => activeSession?.exerciseGroupsByDay[dayId] || [];

  const buildDayRenderItems = (dayExercises: RoutineDayExercise[], groups: SessionExerciseGroup[]): DayRenderItem[] => {
    const groupByExerciseId = new Map<string, SessionExerciseGroup>();

    groups.forEach((group) => {
      group.exerciseIds.forEach((exerciseId) => {
        groupByExerciseId.set(exerciseId, group);
      });
    });

    const renderedGroups = new Set<string>();

    const items: DayRenderItem[] = [];

    dayExercises.forEach((exercise) => {
      const group = groupByExerciseId.get(exercise.id);
      if (!group) {
        items.push({ type: 'single', exercise });
        return;
      }

      if (renderedGroups.has(group.id)) {
        return;
      }

      renderedGroups.add(group.id);
      const groupedExercises = dayExercises.filter((dayExercise) => group.exerciseIds.includes(dayExercise.id));
      if (groupedExercises.length > 1) {
        items.push({ type: 'group', group, exercises: groupedExercises });
        return;
      }

      items.push({ type: 'single', exercise });
    });

    return items;
  };

  const renderExerciseCard = (day: NonNullable<Routine['dayEntries']>[number], dayEx: RoutineDayExercise, index: number, totalCount: number, grouped = false) => {
    const isCompleted = activeSession?.routineId === routine.id && isExerciseFullyCompleted(activeSession, dayEx);
    const completedSetCount = getExerciseCompletedSetCount(activeSession, dayEx.id);
    const groupSelectionEnabled = isGroupingMode && activeSession?.routineId === routine.id;
    const isSelectedForGroup = selectedGroupExerciseIds.includes(dayEx.id);
    const isAlreadyGrouped = getDayExerciseGroups(day.id).some((group) => group.exerciseIds.includes(dayEx.id));

    return (
      <div key={dayEx.id || dayEx.exercise.name} className={`transition-all duration-300 ${isCompleted ? 'opacity-60 scale-[0.99]' : 'opacity-100 scale-100'}`}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {groupSelectionEnabled && (
              <button
                onClick={() => toggleExerciseGroupSelection(dayEx.id)}
                disabled={isAlreadyGrouped}
                className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  isAlreadyGrouped
                    ? 'cursor-not-allowed border-white/8 bg-surface-container-high text-on-surface-variant/35'
                    : isSelectedForGroup
                    ? 'border-primary bg-primary text-black'
                    : 'border-white/15 bg-black/30 text-on-surface-variant hover:border-primary/45'
                }`}
                title={isAlreadyGrouped ? 'Este ejercicio ya está dentro de un bloque' : isSelectedForGroup ? 'Quitar de la selección' : 'Seleccionar para agrupar'}
              >
                {isSelectedForGroup ? <Check size={14} strokeWidth={3} /> : null}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h4 className={`font-sans text-[1.15rem] font-semibold leading-tight text-on-surface ${isCompleted ? 'line-through' : ''}`}>{dayEx.exercise.name}</h4>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">{dayEx.exercise.muscleGroup || dayEx.exercise.muscle}</p>
              {activeSession?.routineId === routine.id && (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">
                  {completedSetCount}/{dayEx.exercise.sets.length} sets
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {activeSession?.routineId !== routine.id && (
              <>
                <button
                  onClick={() => {
                    onSelectRoutineDay(day.id);
                    onEditExercise(dayEx.exercise, dayEx.id, day.id);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/10"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setConfirmExerciseDelete({ exId: dayEx.id, dayId: day.id })}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Sets</p>
            <p className="font-headline text-[1.6rem] font-semibold leading-none text-on-surface">{dayEx.exercise.sets.length}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Reps</p>
            <p className="font-headline text-[1.6rem] font-semibold leading-none text-on-surface">{dayEx.exercise.sets[0]?.reps || '-'}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Peso / Tiempo</p>
            <p className="font-headline text-[1.6rem] font-semibold leading-none text-secondary">
              {getSetDisplayValue(dayEx.exercise)}
            </p>
          </div>
        </div>

        {activeSession?.routineId === routine.id && (
          <div className="mt-4">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Sets realizados</p>
            <div className="flex flex-wrap gap-2">
              {dayEx.exercise.sets.map((set, setIndex) => {
                const setNumber = set.setNumber || setIndex + 1;
                const isCaptured = !!activeSession.performanceData[dayEx.id]?.[setNumber]?.captured;
                return (
                  <button
                    key={`${dayEx.id}-set-${setNumber}`}
                    onClick={() => handleSetChipClick(dayEx, setIndex)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-all ${
                      isCaptured
                        ? 'border-primary bg-primary text-black shadow-[0_0_15px_rgba(209,252,0,0.28)]'
                        : 'border-white/10 bg-surface-container-high text-on-surface-variant hover:border-primary/45 hover:text-on-surface'
                    }`}
                    title={isCaptured ? 'Quitar set realizado' : 'Registrar set'}
                  >
                    {`Set ${setNumber} · ${getSetPreviewValue(dayEx.exercise, setIndex)}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {dayEx.exercise.sets[0]?.notes && (
          <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3">
            <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-primary/70">Notas de entrenamiento</p>
            <p className="text-xs italic leading-relaxed text-on-surface-variant/90">"{dayEx.exercise.sets[0].notes}"</p>
          </div>
        )}

        {!grouped && index < totalCount - 1 && <div className="mt-4 h-px bg-white/6"></div>}
      </div>
    );
  };

  return (
    <>
      <PageShell
        activeView="routine-detail"
        setView={setView}
        onProfileClick={() => setView('settings')}
        onSettingsClick={() => setView('settings')}
        contentClassName=""
        headerChildren={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRestTimerOpen(true)}
                className="flex items-center gap-2 rounded-full border border-secondary/25 bg-surface-container-high/90 px-3 py-2 text-secondary shadow-[0_12px_32px_rgba(255,92,0,0.15)] hover:bg-surface-bright transition-colors"
                title="Reloj de Descanso"
              >
                <AlarmClock size={15} strokeWidth={2.4} />
                <span className="font-headline text-[1rem] font-semibold uppercase tracking-[0.08em] text-secondary">Descanso</span>
              </button>
              <button
                onClick={() => setIsSessionTimerOpen(true)}
                className="flex items-center justify-center p-2.5 rounded-full border border-white/10 bg-surface-container-high text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
                title="Cronómetro temporal"
              >
                <Timer size={18} />
              </button>
            </div>
        }
      >
        <section className="mb-6 space-y-5">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-3 text-on-surface-variant transition-colors hover:text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-all group-hover:bg-primary/20">
              <ArrowLeft size={16} strokeWidth={2.5} />
            </div>
            <span className="font-headline text-[0.72rem] font-black uppercase italic tracking-[0.22em]">Volver al panel</span>
          </button>

          <header className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">DETALLE DE RUTINA</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-on-surface">
                {routine.name}
              </h1>
              {routine.syncPending ? <RoutineSyncPendingBadge className="self-start sm:self-center" /> : null}
            </div>
          </header>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[1rem] border-l-2 border-primary bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Dias</p>
            <p className="mt-1 font-headline text-[1.8rem] font-semibold leading-none text-on-surface">{String(routine.dayEntries?.length || 0).padStart(2, '0')}</p>
          </div>
          <div className="rounded-[1rem] bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Ejercicios</p>
            <p className="mt-1 font-headline text-[1.8rem] font-semibold leading-none text-on-surface">{routine.exercises.length}</p>
          </div>
          <div className="relative col-span-2 overflow-hidden rounded-[1rem] bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Volumen</p>
            <p className="mt-1 font-headline text-[1.8rem] font-semibold leading-none text-on-surface">
              {volume.toFixed(0)} <span className="text-xs font-medium text-on-surface-variant">kg totales</span>
            </p>
            <Dumbbell className="absolute -bottom-4 right-0 h-14 w-14 text-white/8" />
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 rounded-[1rem] bg-surface-container-high p-4 sm:col-span-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Enfoque principal</p>
              <p className="font-headline text-[1.15rem] font-semibold uppercase italic tracking-[0.02em] text-primary sm:text-[1.3rem]">
                {routine.focus || 'Sin definir'}
              </p>
            </div>
            <div className="flex -space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-high bg-secondary text-black">
                <Play size={14} fill="currentColor" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-high bg-primary text-black">
                <ArrowRight size={14} strokeWidth={3} />
              </div>
            </div>
          </div>
        </section>

        {activeSession?.routineId === routine.id && activeSession.routineDayIds.length > 1 && (
          <section className="mb-6">
            <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">Días activos en esta sesión</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {activeSession.routineDayIds.map((dayId) => {
                const day = routine.dayEntries?.find(d => d.id === dayId);
                if (!day) return null;
                const isActive = activeSession.activeRoutineDayId === dayId;
                return (
                  <button
                    key={dayId}
                    onClick={() => {
                      onSwitchSessionDay(dayId);
                      onOpenDayChange(dayId);
                    }}
                    className={`shrink-0 rounded-full px-4 py-2 font-headline text-sm font-semibold uppercase tracking-wide transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-primary text-black shadow-[0_0_15px_rgba(212,255,0,0.4)]'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-white/10'
                    }`}
                  >
                    {day.dayType === 'core' ? '⚡ Core' : `Día ${day.dayNumber}`}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-4">
          {routine.dayEntries?.map((day) => {
            // Si hay sesión activa, solo mostrar días que son parte de la sesión
            if (activeSession?.routineId === routine.id && !activeSession.routineDayIds.includes(day.id)) {
              return null;
            }

            const isOpen = openDayId === day.id;
            return (
              <div key={day.id} className={`overflow-hidden rounded-[1.2rem] ${isOpen ? 'border-l-4 border-primary bg-surface-container' : 'bg-surface-container'}`}>
                <div className="flex items-center bg-surface-container-high/30 pr-3">
                  <button
                    onClick={() => {
                      if (activeSession?.routineId === routine.id) return; // Bloquear cierre si hay sesión
                      onOpenDayChange(isOpen ? null : day.id);
                    }}
                    disabled={!!activeSession}
                    className={`flex flex-1 items-center justify-between gap-3 p-4 text-left transition-colors sm:p-5 ${isOpen ? 'bg-surface-container-high/55' : 'hover:bg-surface-bright/35'} ${activeSession ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span className={`font-headline text-[1.4rem] font-semibold sm:text-[1.6rem] ${isOpen ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {day.dayType === 'core' ? 'CO' : String(day.dayNumber).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-sans text-[0.95rem] font-bold uppercase text-on-surface sm:text-[1rem]">{day.title}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{day.exercises.length} ejercicios</p>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`shrink-0 text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      if (!activeSession) setConfirmDayDeleteId(day.id);
                    }}
                    disabled={!!activeSession}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant/40 transition-colors hover:bg-secondary/10 hover:text-secondary active:scale-95 ${activeSession ? 'opacity-30 cursor-not-allowed' : ''}`}
                    title={activeSession ? 'No disponible durante entrenamiento' : 'Eliminar este día'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-6 px-4 pb-4 sm:px-5 sm:pb-5">
                    {activeSession?.routineId === routine.id && (
                      <div className="rounded-[1rem] border border-white/8 bg-surface-container-low p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Bloques del día</p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              Agrupa ejercicios solo dentro de {day.dayType === 'core' ? 'CORE' : day.title}.
                            </p>
                          </div>
                          {!isGroupingMode ? (
                            <button
                              onClick={() => {
                                setIsGroupingMode(true);
                                setSelectedGroupExerciseIds([]);
                              }}
                              className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/15"
                            >
                              Agrupar ejercicios
                            </button>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={resetGroupingMode}
                                className="rounded-full border border-white/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleCreateGroup(day.id)}
                                disabled={selectedGroupExerciseIds.length < 2}
                                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors ${
                                  selectedGroupExerciseIds.length >= 2
                                    ? 'bg-primary text-black'
                                    : 'bg-surface-container-high text-on-surface-variant'
                                }`}
                              >
                                Crear bloque
                              </button>
                            </div>
                          )}
                        </div>
                        {isGroupingMode && (
                          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">
                            Seleccionados: {selectedGroupExerciseIds.length}
                          </p>
                        )}
                      </div>
                    )}
                    {day.exercises.length > 0 ? (
                      buildDayRenderItems(day.exercises, getDayExerciseGroups(day.id)).map((item, index, items) => {
                        if (item.type === 'group') {
                          const totalSets = item.exercises.reduce((sum, exercise) => sum + exercise.exercise.sets.length, 0);
                          const completedSets = item.exercises.reduce((sum, exercise) => sum + getExerciseCompletedSetCount(activeSession, exercise.id), 0);

                          return (
                            <div key={item.group.id} className="rounded-[1.1rem] border border-primary/18 bg-primary/5 p-4">
                              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">
                                    Bloque {index + 1} · {getGroupLabel(item.exercises.length)}
                                  </p>
                                  <p className="mt-1 text-sm text-on-surface-variant">
                                    {completedSets}/{totalSets} sets completados
                                  </p>
                                </div>
                                <button
                                  onClick={() => onRemoveExerciseGroup(day.id, item.group.id)}
                                  className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
                                >
                                  Desagrupar
                                </button>
                              </div>
                              <div className="space-y-4">
                                {item.exercises.map((exercise, exerciseIndex) => (
                                  <div key={exercise.id}>
                                    {renderExerciseCard(day, exercise, exerciseIndex, item.exercises.length, true)}
                                    {exerciseIndex < item.exercises.length - 1 && <div className="mt-4 h-px bg-white/8"></div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        return renderExerciseCard(day, item.exercise, index, items.length);
                      })
                    ) : (
                      <p className="py-2 text-sm text-on-surface-variant">Este día todavía no tiene ejercicios cargados.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="mt-8 space-y-3 pb-20">
          <button
            onClick={() => !activeSession && onEditRoutine(routine)}
            disabled={!!activeSession}
            className={`neon-button flex w-full items-center justify-center gap-2 rounded-[0.9rem] py-4 font-sans text-sm font-bold uppercase tracking-[0.22em] transition-all active:scale-[0.985] ${activeSession ? 'opacity-40 cursor-not-allowed brightness-50' : ''}`}
          >
            <Edit2 size={16} strokeWidth={2.5} />
            Editar rutina
          </button>
          <button
            onClick={() => !activeSession && setConfirmRoutineDelete(true)}
            disabled={!!activeSession}
            className={`flex w-full items-center justify-center gap-2 rounded-[0.9rem] border border-secondary/18 bg-surface-container-low py-4 font-sans text-sm font-bold uppercase tracking-[0.22em] text-secondary transition-all hover:bg-secondary/10 active:scale-[0.985] ${activeSession ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <Trash2 size={16} strokeWidth={2.5} />
            Eliminar Rutina
          </button>
        </section>

        <div className="fixed bottom-[8.5rem] sm:bottom-36 left-0 right-0 z-[60] px-4 pointer-events-none flex justify-center pb-safe">
          {activeSession?.routineId === routine.id ? (
            <button
               onClick={() => setConfirmEndSession(true)}
               className="pointer-events-auto w-full max-w-md h-[4.5rem] rounded-[1.2rem] bg-secondary text-black shadow-[0_20px_40px_rgba(209,252,0,0.25),_0_-10px_30px_rgba(0,0,0,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 font-headline text-[1.15rem] leading-none font-bold uppercase tracking-[0.15em] border border-secondary/50"
            >
               <X strokeWidth={3} size={22} className="mt-0.5" />
               Finalizar Entrenamiento
            </button>
          ) : (
            <button
              onClick={() => {
                if (openDayId && routine) {
                  // Find CORE day if it exists
                  const coreDay = routine.dayEntries?.find(d => d.dayType === 'core');
                  // Prepare day IDs: include CORE if exists, then the selected day
                  const dayIds = coreDay ? [coreDay.id, openDayId] : [openDayId];
                  onStartSession(routine.id, routine.name, dayIds);
                }
              }}
              disabled={!openDayId}
              className={`pointer-events-auto w-full max-w-md h-[4.5rem] rounded-[1.2rem] bg-primary text-black shadow-[0_20px_40px_rgba(255,107,0,0.3),_0_-10px_30px_rgba(0,0,0,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 font-headline text-[1.15rem] leading-none font-bold uppercase tracking-[0.15em] border border-primary/20 ${!openDayId ? 'opacity-50 grayscale' : ''}`}
            >
              <Play fill="currentColor" size={22} className="mt-0.5" />
              {openDayId ? 'Iniciar Entrenamiento' : 'Selecciona un día'}
            </button>
          )}
        </div>
      </PageShell>

      <RestTimerModal open={isRestTimerOpen} onClose={() => setIsRestTimerOpen(false)} />
      <SessionStopwatchModal
        open={isSessionTimerOpen}
        onClose={() => setIsSessionTimerOpen(false)}
        elapsedMs={elapsedSessionMs}
        isRunning={isSessionTimerRunning}
        onToggleRunning={() => setIsSessionTimerRunning((current) => !current)}
        onReset={() => {
          setElapsedSessionMs(0);
          setIsSessionTimerRunning(false);
        }}
      />

      {setCapturePending && allExerciseSets && (
        <SetCaptureOverlay
          open={!!setCapturePending}
          onClose={handleSetCaptureClose}
          exercise={allExerciseSets}
          setNumber={setCapturePending.setNumber}
          plannedReps={setCapturePending.reps}
          plannedWeight={setCapturePending.weight}
          totalSets={allExerciseSets.sets.length}
          onCapture={handleSetCapture}
        />
      )}

      {/* Confirmación para Eliminar Rutina */}
      <ConfirmDialog
        open={confirmRoutineDelete}
        title="¿Eliminar rutina?"
        message="Esta acción borrará toda la rutina y sus ejercicios de forma permanente."
        onConfirm={() => {
          onDeleteRoutine(routine.id);
          setView('dashboard');
        }}
        onCancel={() => setConfirmRoutineDelete(false)}
      />

      {/* Confirmación para Eliminar Día */}
      <ConfirmDialog
        open={!!confirmDayDeleteId}
        title="¿Eliminar este día?"
        message="Se borrarán todos los ejercicios configurados para este día de entrenamiento."
        onConfirm={() => {
          if (confirmDayDeleteId) {
            onDeleteRoutineDay(confirmDayDeleteId);
            setConfirmDayDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDayDeleteId(null)}
      />

      {/* Confirmación para Eliminar Ejercicio */}
      <ConfirmDialog
        open={!!confirmExerciseDelete}
        title="¿Eliminar ejercicio?"
        message="¿Estás seguro de que quieres quitar este ejercicio de la rutina?"
        onConfirm={() => {
          if (confirmExerciseDelete) {
            onDeleteExercise(confirmExerciseDelete.exId, confirmExerciseDelete.dayId);
            setConfirmExerciseDelete(null);
          }
        }}
        onCancel={() => setConfirmExerciseDelete(null)}
      />
      <ConfirmDialog
        open={confirmEndSession}
        title="¿Finalizar entrenamiento?"
        message="¿Estás seguro de que deseas terminar tu sesión actual? Se guardará el progreso de los ejercicios marcados."
        onConfirm={() => {
          onEndSession();
          setConfirmEndSession(false);
        }}
        onCancel={() => setConfirmEndSession(false)}
      />
    </>
  );
};
