import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlarmClock,
  ChevronDown,
  Edit2,
  Play,
  RotateCcw,
  Trash2,
  X,
  Timer,
  Check,
  Loader2,
  BookmarkPlus,
  MoreHorizontal,
} from 'lucide-react';
import { RoutineSyncPendingBadge } from '../components/RoutineSyncPendingBadge';
import { PageShell } from '../components/layout/PageShell';
import { buildSessionDayIds } from '../features/routines/sessionDays';
import type { ActiveSession, Exercise, Routine, View, RoutineDayExercise, SessionExerciseGroup, UserProfile } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { getExerciseDisplayName } from '../i18n/exerciseLocalization';
import { SessionElapsedPill } from '../components/SessionElapsedPill';
import { formatRestTimerPreset, MAX_REST_TIMER_PRESETS } from '../features/restTimer/presets';

type Translator = (key: TranslationKey) => string;

const SessionTimerControls = ({
  sessionStartTimeMs,
  onOpenRestTimer,
  onOpenStopwatch,
  t,
}: {
  sessionStartTimeMs?: number;
  onOpenRestTimer: () => void;
  onOpenStopwatch: () => void;
  t: Translator;
}) => (
  <div className="theme-hairline-border flex h-11 shrink-0 items-center gap-1 rounded-full border bg-surface-container-high/95 p-1 shadow-[0_8px_24px_color-mix(in_srgb,var(--strong-foreground)_10%,transparent)] backdrop-blur-xl">
    {sessionStartTimeMs !== undefined ? (
      <SessionElapsedPill
        startTimeMs={sessionStartTimeMs}
        tone="embedded"
        compact
        className="px-1.5 min-[390px]:px-2"
      />
    ) : null}
    <button
      type="button"
      onClick={onOpenRestTimer}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary transition-colors hover:bg-secondary/20 active:scale-95"
      title={t('session.restTimer')}
      aria-label={t('session.restTimer')}
    >
      <AlarmClock size={17} strokeWidth={2.4} />
    </button>
    <button
      type="button"
      onClick={onOpenStopwatch}
      className="theme-interactive-hover flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant transition-colors hover:text-on-surface active:scale-95"
      title={t('session.temporaryStopwatch')}
      aria-label={t('session.temporaryStopwatch')}
    >
      <Timer size={18} />
    </button>
  </div>
);

const DEFAULT_REST_SECONDS = 0;
const TIMER_WHEEL_ITEM_HEIGHT = 48;
const TIMER_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);
const TIMER_SECOND_OPTIONS = Array.from({ length: 12 }, (_, index) => index * 5);

const formatClock = (value: number) => String(value).padStart(2, '0');

const formatStopwatch = (elapsedMs: number) => {
  const safeMs = Math.max(elapsedMs, 0);
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const milliseconds = Math.floor((safeMs % 1000) / 10);
  return `${formatClock(minutes)}:${formatClock(seconds)}:${String(milliseconds).padStart(2, '0')}`;
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

const isExerciseSkipped = (
  activeSession: ActiveSession | null,
  exerciseId: string,
) => (activeSession?.skippedExercises ?? []).includes(exerciseId);

const isExerciseDoneForSession = (
  activeSession: ActiveSession | null,
  dayExercise: RoutineDayExercise,
) => isExerciseSkipped(activeSession, dayExercise.id) || isExerciseFullyCompleted(activeSession, dayExercise);

const getGroupLabel = (exerciseCount: number, t: Translator) => {
  if (exerciseCount === 2) return t('session.superset');
  if (exerciseCount === 3) return t('session.triset');
  return t('session.circuit');
};

type CapturedSetPerformance = ActiveSession['performanceData'][string][number];

const joinSetValues = (values: Array<string | null>) => values.filter((value): value is string => !!value).join(' · ');

const getPlannedSetDisplayValue = (exercise: Exercise, setIndex: number, t: Translator) => {
  const set = exercise.sets[setIndex];
  if (!set) return '-';
  if (exercise.measureUnit === 'min') return `${set.durationMinutes ?? 0} min`;
  if (exercise.measureUnit === 'sec') return `${set.durationSeconds ?? 0} ${t('exerciseEditor.secondsShort')}`;
  const reps = set.targetType === 'failure' ? t('exerciseEditor.toFailure') : set.reps != null ? `${set.reps} reps` : null;
  const load = exercise.loadType === 'bodyweight'
    ? t('exerciseEditor.bodyweight')
    : set.weight != null
      ? `${set.weight} kg`
      : null;
  return joinSetValues([reps, load]) || '-';
};

const getCapturedSetDisplayValue = (exercise: Exercise, performance: CapturedSetPerformance, t: Translator) => {
  if (exercise.measureUnit === 'min') {
    const minutes = performance.actualDurationMinutes ?? performance.actualWeight;
    return minutes != null ? `${minutes} min` : t('session.noData');
  }
  if (exercise.measureUnit === 'sec') {
    const seconds = performance.actualDurationSeconds ?? performance.actualWeight;
    return seconds != null ? `${seconds} ${t('exerciseEditor.secondsShort')}` : t('session.noData');
  }

  const reps = performance.actualReps != null ? `${performance.actualReps} reps` : null;
  const load = exercise.loadType === 'bodyweight'
    ? performance.actualWeight != null
      ? `${performance.actualWeight} ${t('session.bodyweightKg')}`
      : t('exerciseEditor.bodyweight')
    : performance.actualWeight != null
      ? `${performance.actualWeight} kg`
      : null;
  return joinSetValues([reps, load]) || t('session.noDataPlural');
};

type DayRenderItem =
  | { type: 'single'; exercise: RoutineDayExercise }
  | { type: 'group'; group: SessionExerciseGroup; exercises: RoutineDayExercise[] };

let alertAudioContext: AudioContext | null = null;

const getAlertAudioContext = () => {
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  if (!alertAudioContext || alertAudioContext.state === 'closed') {
    alertAudioContext = new AudioContextConstructor();
  }

  return alertAudioContext;
};

const prepareAlertAudio = () => {
  const audioContext = getAlertAudioContext();
  if (!audioContext) return;

  if (audioContext.state !== 'running') {
    void audioContext.resume().catch(() => undefined);
  }

  // Reproducir una muestra inaudible dentro del gesto del usuario desbloquea
  // Web Audio en Safari/iOS para el aviso que se ejecutará más tarde.
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.02);
};

const playAlertTone = async () => {
  const audioContext = getAlertAudioContext();
  if (!audioContext) return;

  if (audioContext.state !== 'running') {
    try {
      await Promise.race([
        audioContext.resume(),
        new Promise<void>((resolve) => window.setTimeout(resolve, 500)),
      ]);
    } catch {
      return;
    }
  }

  if (audioContext.state !== 'running') return;

  const sequence = [880, 1320, 880, 1320, 880, 1320, 880, 1320];

  sequence.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startAt = audioContext.currentTime + index * 0.3;
    const endAt = startAt + 0.22;

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.72, startAt + 0.025);
    gain.gain.setValueAtTime(0.72, endAt - 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt);
  });

};

const triggerCompletionFeedback = async () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([220, 120, 220, 120, 420]);
    } catch (e) {
      // ignore
    }
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
  <div className="theme-overlay fixed inset-0 z-[70] flex items-center justify-center px-4 backdrop-blur-sm">
    <div className="theme-elevated-surface relative max-h-[calc(100dvh-2rem)] w-full max-w-[22rem] overflow-y-auto rounded-[1.6rem]">
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

const TimerWheelColumn = ({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: number[];
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastEmittedValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastEmittedValueRef.current === value) return;
    const selectedIndex = Math.max(options.indexOf(value), 0);
    lastEmittedValueRef.current = value;
    scrollRef.current?.scrollTo({ top: selectedIndex * TIMER_WHEEL_ITEM_HEIGHT });
  }, [options, value]);

  return (
    <div className="min-w-0">
      <p className="mb-2 text-center text-[0.62rem] font-black uppercase tracking-[0.2em] text-on-surface-variant">
        {label}
      </p>
      <div className="relative overflow-hidden rounded-2xl border theme-hairline-border bg-surface-container-low">
        <div
          ref={scrollRef}
          role="listbox"
          aria-label={label}
          aria-disabled={disabled}
          onScroll={(event) => {
            if (disabled) return;
            const index = Math.max(0, Math.min(options.length - 1, Math.round(event.currentTarget.scrollTop / TIMER_WHEEL_ITEM_HEIGHT)));
            const nextValue = options[index];
            if (lastEmittedValueRef.current !== nextValue) {
              lastEmittedValueRef.current = nextValue;
              onChange(nextValue);
            }
          }}
          className="h-36 snap-y snap-mandatory overflow-y-auto overscroll-contain py-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              disabled={disabled}
              onClick={() => {
                const optionIndex = options.indexOf(option);
                lastEmittedValueRef.current = option;
                scrollRef.current?.scrollTo({
                  top: optionIndex * TIMER_WHEEL_ITEM_HEIGHT,
                  behavior: 'smooth',
                });
                onChange(option);
              }}
              className={`flex h-12 w-full snap-center items-center justify-center font-mono text-2xl font-black tabular-nums transition-colors ${
                option === value ? 'text-primary' : 'text-on-surface-variant/45'
              } disabled:cursor-not-allowed`}
            >
              {String(option).padStart(2, '0')}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-surface-container-low to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-container-low to-transparent" />
        <div className="pointer-events-none absolute inset-x-2 top-12 h-12 rounded-xl border-y border-primary/25 bg-primary/5" />
      </div>
    </div>
  );
};

type RestTimerStatus = 'idle' | 'running' | 'paused' | 'finished';

const RestTimerModal = ({
  open,
  onClose,
  presets,
  onPresetsChange,
}: {
  open: boolean;
  onClose: () => void;
  presets: number[];
  onPresetsChange: (values: number[]) => Promise<void>;
}) => {
  const { t } = useLanguage();
  const [selectedSeconds, setSelectedSeconds] = useState(DEFAULT_REST_SECONDS);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_REST_SECONDS);
  const [status, setStatus] = useState<RestTimerStatus>('idle');
  const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isSavingPresets, setIsSavingPresets] = useState(false);
  const completedRef = useRef(false);
  const previousSecondsRef = useRef(remainingSeconds);
  const pausedRemainingMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      completedRef.current = false;
      setIsFlashing(false);
      return;
    }

    if (status !== 'running' || endsAtMs === null) {
      return;
    }

    const updateRemainingTime = () => {
      const nextRemainingSeconds = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
      setRemainingSeconds(nextRemainingSeconds);
      if (nextRemainingSeconds === 0) {
        pausedRemainingMsRef.current = null;
        setStatus('finished');
        setEndsAtMs(null);
      }
    };

    updateRemainingTime();
    const timer = window.setInterval(updateRemainingTime, 250);
    document.addEventListener('visibilitychange', updateRemainingTime);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', updateRemainingTime);
    };
  }, [endsAtMs, open, status]);

  useEffect(() => {
    if (!open) {
      previousSecondsRef.current = DEFAULT_REST_SECONDS;
      return;
    }

    if (
      status === 'finished'
      && remainingSeconds === 0
      && previousSecondsRef.current > 0
      && !completedRef.current
    ) {
      completedRef.current = true;
      triggerCompletionFeedback().catch(() => undefined);
      
      setIsFlashing(true);
      const flashTimer = setTimeout(() => setIsFlashing(false), 3000);
      return () => clearTimeout(flashTimer);
    }

    previousSecondsRef.current = remainingSeconds;
  }, [open, remainingSeconds, status]);

  const closeAndReset = () => {
    setStatus('idle');
    setEndsAtMs(null);
    pausedRemainingMsRef.current = null;
    setSelectedSeconds(DEFAULT_REST_SECONDS);
    setRemainingSeconds(DEFAULT_REST_SECONDS);
    completedRef.current = false;
    setIsFlashing(false);
    onClose();
  };

  const selectDuration = (totalSeconds: number) => {
    completedRef.current = false;
    setSelectedSeconds(totalSeconds);
    setRemainingSeconds(totalSeconds);
    setEndsAtMs(null);
    pausedRemainingMsRef.current = null;
    setStatus('idle');
  };

  const toggleTimer = () => {
    if (status === 'running') {
      const exactRemainingMs = Math.max(0, (endsAtMs ?? Date.now()) - Date.now());
      pausedRemainingMsRef.current = exactRemainingMs;
      setRemainingSeconds(Math.ceil(exactRemainingMs / 1000));
      setStatus('paused');
      setEndsAtMs(null);
      return;
    }

    const durationToRunMs = status === 'paused'
      ? pausedRemainingMsRef.current ?? remainingSeconds * 1000
      : selectedSeconds * 1000;
    if (durationToRunMs <= 0) return;

    prepareAlertAudio();
    completedRef.current = false;
    previousSecondsRef.current = Math.ceil(durationToRunMs / 1000);
    setRemainingSeconds(Math.ceil(durationToRunMs / 1000));
    pausedRemainingMsRef.current = null;
    setEndsAtMs(Date.now() + durationToRunMs);
    setStatus('running');
  };

  const saveSelectedPreset = async () => {
    if (
      selectedSeconds <= 0
      || presets.includes(selectedSeconds)
      || presets.length >= MAX_REST_TIMER_PRESETS
    ) return;

    setIsSavingPresets(true);
    try {
      await onPresetsChange([...presets, selectedSeconds]);
    } finally {
      setIsSavingPresets(false);
    }
  };

  const removePreset = async (preset: number) => {
    setIsSavingPresets(true);
    try {
      await onPresetsChange(presets.filter((value) => value !== preset));
    } finally {
      setIsSavingPresets(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      {isFlashing && (
        <div className="pointer-events-none fixed inset-0 z-[100] animate-pulse bg-primary/80 backdrop-brightness-150" />
      )}
      <PopupShell title={t('session.restTimer')} accent="primary" onClose={closeAndReset}>
      <div className="text-center">
        <div className="theme-primary-text font-headline text-[4.5rem] font-semibold leading-none tracking-[0.02em]">
          {formatCountdown(remainingSeconds)}
        </div>
        <p className="theme-primary-text-soft mt-2 text-[0.68rem] font-bold uppercase tracking-[0.3em]">
          {status === 'finished'
            ? t('session.restFinished')
            : status === 'running'
              ? t('session.activeRest')
              : status === 'paused'
                ? t('session.restPaused')
                : t('session.chooseRestTime')}
        </p>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-on-surface-variant">
            {t('session.savedTimes')}
          </p>
          <span className="text-[0.62rem] font-bold tabular-nums text-on-surface-variant/55">
            {presets.length}/{MAX_REST_TIMER_PRESETS}
          </span>
        </div>
        {presets.length === 0 ? (
          <p className="rounded-xl border border-dashed theme-hairline-border px-3 py-2.5 text-center text-xs text-on-surface-variant/65">
            {t('session.noSavedTimes')}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset) => (
              <div key={preset} className="relative min-w-0">
                <button
                  type="button"
                  disabled={status === 'running' || status === 'paused' || isSavingPresets}
                  onClick={() => selectDuration(preset)}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl border border-primary/25 bg-primary/8 px-1.5 pr-4 font-mono text-xs font-black tabular-nums text-primary disabled:opacity-45"
                >
                  {formatRestTimerPreset(preset)}
                </button>
                <button
                  type="button"
                  disabled={isSavingPresets}
                  onClick={() => void removePreset(preset)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-surface-container bg-surface-container-highest text-on-surface-variant transition-colors hover:bg-secondary hover:text-black disabled:opacity-45"
                  aria-label={`${t('session.removeSavedTime')} ${formatRestTimerPreset(preset)}`}
                  title={t('session.removeSavedTime')}
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {(status === 'idle' || status === 'finished') && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <TimerWheelColumn
              label={t('session.minutes')}
              options={TIMER_MINUTE_OPTIONS}
              value={Math.floor(selectedSeconds / 60)}
              disabled={false}
              onChange={(minutes) => selectDuration(minutes * 60 + selectedSeconds % 60)}
            />
            <TimerWheelColumn
              label={t('session.seconds')}
              options={TIMER_SECOND_OPTIONS}
              value={selectedSeconds % 60}
              disabled={false}
              onChange={(seconds) => selectDuration(Math.floor(selectedSeconds / 60) * 60 + seconds)}
            />
          </div>

          <button
            type="button"
            onClick={() => void saveSelectedPreset()}
            disabled={
              selectedSeconds <= 0
              || presets.includes(selectedSeconds)
              || presets.length >= MAX_REST_TIMER_PRESETS
              || isSavingPresets
            }
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-4 text-xs font-black uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isSavingPresets ? <Loader2 size={16} className="animate-spin" /> : <BookmarkPlus size={16} />}
            {presets.includes(selectedSeconds) ? t('session.timeAlreadySaved') : t('session.saveTime')}
          </button>
        </>
      )}

      <button
        onClick={toggleTimer}
        disabled={selectedSeconds <= 0 && remainingSeconds <= 0}
        className="neon-button mt-6 flex w-full items-center justify-center rounded-[0.95rem] py-4 font-headline text-[1.6rem] font-semibold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-35 disabled:grayscale"
      >
        {status === 'running'
          ? t('session.pause')
          : status === 'paused'
            ? t('session.resume')
            : status === 'finished'
              ? t('session.restart')
              : t('session.start')}
      </button>

      <button
        onClick={closeAndReset}
        className="mt-4 w-full rounded-[0.95rem] border border-secondary/40 py-4 text-sm font-bold uppercase tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/10"
      >
        {t('common.cancel')}
      </button>
    </PopupShell>
    </>
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
  const { t } = useLanguage();
  if (!open) {
    return null;
  }

  return (
    <PopupShell title={t('session.stopwatch')} accent="secondary" onClose={onClose}>
      <div className="text-center">
<div className="theme-primary-text font-headline text-[4.2rem] font-semibold leading-none tracking-[0.02em] sm:text-[4.8rem]">
          {formatStopwatch(elapsedMs)}
        </div>
        <div className="mt-3 grid grid-cols-3 text-[0.62rem] font-bold uppercase tracking-[0.32em] text-on-surface-variant/60">
          <span>MIN</span>
          <span>{t('exerciseEditor.secondsShort')}</span>
          <span>MS</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          onClick={onToggleRunning}
          className="neon-button flex items-center justify-center gap-3 rounded-[0.95rem] py-4 font-headline text-[1.2rem] font-semibold uppercase tracking-[0.16em]"
        >
          <Play size={16} fill="currentColor" />
          {isRunning ? t('session.pause') : t('session.start')}
        </button>
        <button
          onClick={onReset}
          className="theme-hairline-border flex items-center justify-center gap-2 rounded-[0.95rem] border py-4 text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <RotateCcw size={15} />
          {t('session.restart')}
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
  bodyWeightKg,
  targetType,
  totalSets,
  isEditing,
  onCapture,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  exercise: Pick<Exercise, 'name' | 'nameEn' | 'measureUnit' | 'loadType'>;
  setNumber: number;
  plannedReps: number | null;
  plannedWeight: number | null;
  bodyWeightKg: number | null;
  targetType: 'fixed_reps' | 'failure';
  totalSets: number;
  isEditing?: boolean;
  onCapture: (reps: number | null, weight: number | null) => void;
  onClear?: () => void;
}) => {
  const { language, t } = useLanguage();
  const [actualReps, setActualReps] = useState<string>(String(plannedReps ?? ''));
  const [actualWeight, setActualWeight] = useState<string>(
    String(exercise.loadType === 'bodyweight' ? (bodyWeightKg ?? '') : (plannedWeight ?? '')),
  );

  useEffect(() => {
    setActualReps(String(plannedReps ?? ''));
    setActualWeight(String(exercise.loadType === 'bodyweight' ? (bodyWeightKg ?? '') : (plannedWeight ?? '')));
  }, [plannedReps, plannedWeight, bodyWeightKg, exercise.loadType, setNumber, open]);

  const normalizeInput = (value: string) => value.replace(',', '.');

  const handleConfirm = () => {
    const reps = actualReps ? parseFloat(actualReps) : null;
    const weight = exercise.loadType === 'bodyweight'
      ? bodyWeightKg
      : actualWeight
        ? parseFloat(actualWeight)
        : null;
    onCapture(reps, weight);
    // No cerrar aquí - dejar que handleSetCapture maneje el cierre del modal
  };

  if (!open) {
    return null;
  }

  return (
    <PopupShell
      title={`${isEditing ? t('session.editSet') : t('session.captureSet')} ${setNumber} - ${getExerciseDisplayName(exercise, language)}`}
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
            {t('exerciseEditor.set')} {setNumber} {t('session.setOf')} {totalSets}
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
              {targetType === 'failure' ? t('session.failureRepsDone') : t('session.repsDone')}
            </label>
            {targetType === 'failure' && (
              <p className="mb-2 rounded-lg border border-secondary/25 bg-secondary/10 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {t('session.failureGoal')}
              </p>
            )}
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
              placeholder={targetType === 'failure' ? t('session.repsAchieved') : String(plannedReps ?? '0')}
              className="w-full rounded-lg bg-surface-container p-3 text-center font-headline text-xl font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2">
              {exercise.measureUnit === 'min'
                ? t('session.minutesDone')
                : exercise.measureUnit === 'sec'
                  ? t('session.secondsDone')
                  : exercise.loadType === 'bodyweight'
                    ? t('session.bodyweightUsed')
                    : t('session.weightDone')}
            </label>
            {exercise.loadType === 'bodyweight' ? (
              <div className="rounded-lg bg-surface-container p-3 text-center font-headline text-xl font-semibold text-primary">
                {bodyWeightKg ? `${bodyWeightKg} kg` : t('session.noProfileWeight')}
              </div>
            ) : (
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
            )}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="neon-button w-full flex items-center justify-center gap-2 rounded-[0.95rem] py-4 font-headline text-[1.2rem] font-semibold uppercase tracking-[0.16em]"
        >
          <Check size={18} strokeWidth={2.5} />
          {isEditing ? t('settings.saveChanges') : t('common.confirm')}
        </button>

        {isEditing && onClear && (
          <button
            onClick={onClear}
            className="w-full rounded-[0.95rem] border border-secondary/35 bg-secondary/10 py-4 text-sm font-bold uppercase tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/15"
          >
            {t('session.clearSet')}
          </button>
        )}

        <button
          onClick={onClose}
          className="theme-hairline-border w-full rounded-[0.95rem] border py-4 text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
        >
          {t('common.cancel')}
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
  confirmLabel,
  cancelLabel,
  isConfirming = false,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
}) => {
  const { t } = useLanguage();
  if (!open) return null;

  return (
    <div className="theme-overlay fixed inset-0 z-[100] flex items-center justify-center px-6 backdrop-blur-md">
      <div className="theme-elevated-surface relative w-full max-w-sm rounded-[1.8rem] p-8">
        <div className="absolute left-0 top-0 h-1.5 w-20 bg-secondary"></div>
        <h3 className="font-headline text-[1.8rem] font-bold uppercase leading-tight tracking-tight text-on-surface">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant/85">
          {message}
        </p>
        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex w-full items-center justify-center rounded-[1rem] bg-secondary py-4 font-headline text-[1.1rem] font-bold uppercase tracking-widest text-black transition-transform active:scale-95 ${isConfirming ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            {isConfirming ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                {t('settings.saving')}
              </>
            ) : (
              confirmLabel ?? t('common.confirm')
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className={`theme-hairline-border theme-interactive-hover flex w-full items-center justify-center rounded-[1rem] border py-4 font-headline text-[0.9rem] font-bold uppercase tracking-[0.2em] text-on-surface-variant transition-colors active:scale-95 ${isConfirming ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const RoutineDetailKineticView = ({
  setView,
  routine,
  profile,
  onDeleteRoutine,
  onDeleteRoutineDay,
  onDeleteExercise,
  onEditExercise,
  onEditRoutine,
  onSelectRoutineDay,
  openDayId,
  onOpenDayChange,
  activeSession,
  restTimerPresets,
  onStartSession,
  onEndSession,
  onCancelSession,
  onRestTimerPresetsChange,
  onToggleExerciseComplete,
  onCaptureSetPerformance,
  onClearCapturedSetPerformance,
  onSwitchSessionDay,
  onCreateExerciseGroup,
  onRemoveExerciseGroup,
}: {
  setView: (v: View) => void;
  routine: Routine | null;
  profile?: UserProfile | null;
  onDeleteRoutine: (id: string) => void;
  onDeleteRoutineDay: (dayId: string) => void;
  onDeleteExercise: (exerciseId: string, dayId?: string) => void;
  onEditExercise: (exercise: Exercise, instanceId: string, dayId: string) => void;
  onEditRoutine: (routine: Routine) => void;
  onSelectRoutineDay: (dayId: string | null) => void;
  openDayId: string | null;
  onOpenDayChange: (dayId: string | null) => void;
  activeSession: ActiveSession | null;
  restTimerPresets: number[];
  onStartSession: (routineId: string, routineName: string, routineDayIds: string | string[]) => Promise<void>;
  onEndSession: () => Promise<void>;
  onCancelSession: () => Promise<void>;
  onRestTimerPresetsChange: (values: number[]) => Promise<void>;
  onToggleExerciseComplete: (exerciseInstanceId: string) => void;
  onCaptureSetPerformance: (exerciseId: string, setNumber: number, reps: number | null, weight: number | null, durationMin: number | null, durationSec: number | null, totalSets?: number) => void;
  onClearCapturedSetPerformance: (exerciseId: string, setNumber: number, totalSets?: number) => void;
  onSwitchSessionDay: (dayId: string) => void;
  onCreateExerciseGroup: (dayId: string, exerciseIds: string[]) => void;
  onRemoveExerciseGroup: (dayId: string, groupId: string) => void;
}) => {
  const { language, t } = useLanguage();
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [isSessionTimerOpen, setIsSessionTimerOpen] = useState(false);
  const [elapsedSessionMs, setElapsedSessionMs] = useState(0);
  const [isSessionTimerRunning, setIsSessionTimerRunning] = useState(false);

  // Estados de confirmación
  const [confirmRoutineDelete, setConfirmRoutineDelete] = useState(false);
  const [confirmDayDeleteId, setConfirmDayDeleteId] = useState<string | null>(null);
  const [confirmExerciseDelete, setConfirmExerciseDelete] = useState<{ exId: string; dayId: string } | null>(null);
  const [confirmEndSession, setConfirmEndSession] = useState(false);
  const [confirmCancelSession, setConfirmCancelSession] = useState(false);
  const [isRoutineActionsOpen, setIsRoutineActionsOpen] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isGroupingMode, setIsGroupingMode] = useState(false);
  const [selectedGroupExerciseIds, setSelectedGroupExerciseIds] = useState<string[]>([]);
  const lastOpenedSessionDayRef = useRef<string | null>(null);
  const daySectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Estado para captura de set
  const [setCapturePending, setSetCapturePending] = useState<{ exerciseId: string; setNumber: number; reps: number | null; weight: number | null; targetType: 'fixed_reps' | 'failure'; isEditing?: boolean } | null>(null);
  const [allExerciseSets, setAllExerciseSets] = useState<Exercise | null>(null);

  useEffect(() => {
    // Solo scrollear al inicio al montar
    window.scrollTo(0, 0);
  }, []);

  // Abrir el día activo cuando comienza la sesión o cambia manualmente.
  // No depende de openDayId para permitir que el usuario cierre el acordeón.
  useEffect(() => {
    if (!activeSession || activeSession.routineId !== routine?.id) {
      lastOpenedSessionDayRef.current = null;
      return;
    }

    const sessionDayKey = `${activeSession.id}:${activeSession.activeRoutineDayId}`;
    if (lastOpenedSessionDayRef.current !== sessionDayKey) {
      lastOpenedSessionDayRef.current = sessionDayKey;
      onOpenDayChange(activeSession.activeRoutineDayId);

      // Esperar a que aparezcan los controles de sesión y se abra el acordeón
      // antes de posicionar la vista en el encabezado del día activo.
      let secondFrame: number | null = null;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          daySectionRefs.current[activeSession.activeRoutineDayId]?.scrollIntoView({
            behavior: 'auto',
            block: 'start',
          });
        });
      });

      return () => {
        window.cancelAnimationFrame(firstFrame);
        if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
      };
    }
  }, [activeSession?.id, activeSession?.activeRoutineDayId, activeSession?.routineId, routine?.id, onOpenDayChange]);

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

  const handleClearSetCapture = () => {
    if (!setCapturePending || !allExerciseSets) return;

    onClearCapturedSetPerformance(
      setCapturePending.exerciseId,
      setCapturePending.setNumber,
      allExerciseSets.sets.length,
    );
    handleSetCaptureClose();
  };

  const handleSetChipClick = (dayEx: RoutineDayExercise, setIndex: number) => {
    if (isExerciseSkipped(activeSession, dayEx.id)) return;

    const targetSet = dayEx.exercise.sets[setIndex];
    if (!targetSet) return;

    const setNumber = targetSet.setNumber || setIndex + 1;
    const capturedSet = activeSession?.performanceData[dayEx.id]?.[setNumber] ?? null;
    const isCaptured = !!capturedSet?.captured;

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
      reps: isCaptured ? capturedSet.actualReps : targetSet.reps ?? null,
      weight: isCaptured ? capturedSet.actualWeight : value,
      targetType: targetSet.targetType ?? 'fixed_reps',
      isEditing: isCaptured,
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
          profile={profile}
          contentClassName=""
          headerChildren={
            <SessionTimerControls
              onOpenRestTimer={() => setIsRestTimerOpen(true)}
              onOpenStopwatch={() => setIsSessionTimerOpen(true)}
              t={t}
            />
          }
        >
          <section className="space-y-6 text-center">
            <h2 className="font-headline text-[2.4rem] font-semibold uppercase text-on-surface">{t('session.noRoutine')}</h2>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              {t('session.noRoutineHint')}
            </p>
            <button
              onClick={() => setView('routine-creator')}
              className="neon-button mx-auto rounded-[0.9rem] px-6 py-3 font-headline text-[1.1rem] font-semibold uppercase"
            >
              {t('routines.create')}
            </button>
          </section>
        </PageShell>
        <RestTimerModal
          open={isRestTimerOpen}
          onClose={() => setIsRestTimerOpen(false)}
          presets={restTimerPresets}
          onPresetsChange={onRestTimerPresetsChange}
        />
      </>
    );
  }

  const volume = routine.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.reduce((setsTotal, set) => setsTotal + (set.weight ?? 0) * (set.reps ?? 0), 0),
    0,
  );

  const getSetDisplayValue = (ex: Exercise) => {
    const firstSet = ex.sets[0];
    if (!firstSet) return '-';
    if (ex.measureUnit === 'min') return `${firstSet.durationMinutes || 0} min`;
    if (ex.measureUnit === 'sec') return `${firstSet.durationSeconds || 0} ${t('exerciseEditor.secondsShort')}`;
    if (ex.loadType === 'bodyweight') return t('exerciseEditor.bodyweight');
    return `${firstSet.weight || 0} kg`;
  };

  const getDayExerciseGroups = (dayId: string) => activeSession?.exerciseGroupsByDay[dayId] || [];
  const selectedStartDay = routine.dayEntries?.find((day) => day.id === openDayId) ?? null;
  const selectedStartWeekdayId = selectedStartDay?.dayType === 'weekday' ? selectedStartDay.id : null;

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
    const isSkipped = activeSession?.routineId === routine.id && isExerciseSkipped(activeSession, dayEx.id);
    const isCompleted = activeSession?.routineId === routine.id && isExerciseDoneForSession(activeSession, dayEx);
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
                                ? 'theme-hairline-border cursor-not-allowed bg-surface-container-high text-on-surface-variant/35'
                    : isSelectedForGroup
                    ? 'border-primary bg-primary text-black'
                                : 'theme-hairline-border theme-input-surface text-on-surface-variant hover:border-primary/45'
                }`}
                title={isAlreadyGrouped ? t('session.alreadyGrouped') : isSelectedForGroup ? t('session.removeSelection') : t('session.selectToGroup')}
              >
                {isSelectedForGroup ? <Check size={14} strokeWidth={3} /> : null}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h4 className={`font-sans text-[1.15rem] font-semibold leading-tight text-on-surface ${isCompleted ? 'line-through' : ''}`}>{getExerciseDisplayName(dayEx.exercise, language)}</h4>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">{dayEx.exercise.muscleGroup || dayEx.exercise.muscle}</p>
              {activeSession?.routineId === routine.id && (
<p className={`mt-2 text-[10px] font-bold uppercase tracking-[0.18em] ${isSkipped ? 'text-secondary' : 'theme-primary-text-soft'}`}>
                  {isSkipped ? t('session.skipped') : `${completedSetCount}/${dayEx.exercise.sets.length} ${t('routines.setPlural')}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {activeSession?.routineId === routine.id ? (
              <button
                onClick={() => onToggleExerciseComplete(dayEx.id)}
                className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] transition-colors ${
                  isSkipped
                    ? 'border-secondary bg-secondary text-black shadow-[0_0_15px_color-mix(in_srgb,var(--color-secondary)_35%,transparent)]'
                    : 'theme-hairline-border bg-surface-container-high text-on-surface-variant hover:border-secondary/50 hover:text-secondary'
                }`}
                title={isSkipped ? t('session.unskip') : t('session.markSkipped')}
              >
                {isSkipped ? t('session.skipped') : t('session.skipAction')}
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    onSelectRoutineDay(day.id);
                    onEditExercise(dayEx.exercise, dayEx.id, day.id);
                  }}
                    className="theme-interactive-hover flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors"
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
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{t('routines.setPlural')}</p>
            <p className="font-headline text-[1.6rem] font-semibold leading-none text-on-surface">{dayEx.exercise.sets.length}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{t('exerciseEditor.reps')}</p>
            <p className="font-headline text-[1.6rem] font-semibold leading-none text-on-surface">
              {dayEx.exercise.sets[0]?.targetType === 'failure' ? t('exerciseEditor.failure') : dayEx.exercise.sets[0]?.reps || '-'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{t('session.weightOrTime')}</p>
            <p className="font-headline text-[1.6rem] font-semibold leading-none text-secondary">
              {getSetDisplayValue(dayEx.exercise)}
            </p>
          </div>
        </div>

        {activeSession?.routineId === routine.id && (
          <div className="mt-4">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{t('session.completedSetsTitle')}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {dayEx.exercise.sets.map((set, setIndex) => {
                const setNumber = set.setNumber || setIndex + 1;
                const capturedSet = activeSession.performanceData[dayEx.id]?.[setNumber];
                const isCaptured = !!capturedSet?.captured;
                return (
                  <button
                    key={`${dayEx.id}-set-${setNumber}`}
                    onClick={() => handleSetChipClick(dayEx, setIndex)}
                    disabled={isSkipped}
                    className={`rounded-[0.9rem] border px-3.5 py-3 text-left transition-all ${
                      isSkipped
                        ? 'theme-hairline-border cursor-not-allowed bg-surface-container-high text-on-surface-variant/30'
                        : isCaptured
                          ? 'theme-primary-shadow-soft border-primary/70 bg-primary/10'
                          : 'theme-hairline-border bg-surface-container-high hover:border-primary/45'
                    }`}
                    title={isSkipped ? t('session.skippedExercise') : isCaptured ? t('session.viewEditSet') : t('session.captureSetAction')}
                  >
                    <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">
                      {t('exerciseEditor.set')} {setNumber}
                      {isCaptured && <Check size={13} strokeWidth={3} className="shrink-0 text-primary" />}
                    </span>
                    {isCaptured && capturedSet ? (
                      <span className="mt-2.5 grid grid-cols-1 gap-3">
                        <span className="flex min-w-0 items-baseline justify-between gap-3">
                          <span className="block text-[10px] font-black uppercase tracking-[0.13em] text-primary">{t('session.recorded')}</span>
                          <span className="block break-words text-right text-[1.05rem] font-black leading-snug text-on-surface">
                            {getCapturedSetDisplayValue(dayEx.exercise, capturedSet, t)}
                          </span>
                        </span>
                        <span className="flex min-w-0 items-baseline justify-between gap-3 border-t border-on-surface/10 pt-2">
                          <span className="block text-[10px] font-black uppercase tracking-[0.13em] text-on-surface-variant/70">{t('session.planned')}</span>
                          <span className="block break-words text-right text-sm font-bold leading-snug text-on-surface-variant">
                            {getPlannedSetDisplayValue(dayEx.exercise, setIndex, t)}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="mt-2 block">
                        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-on-surface-variant/70">{t('session.planned')}</span>
                        <span className="mt-1 block text-left text-[1.05rem] font-black leading-snug text-on-surface">
                        {getPlannedSetDisplayValue(dayEx.exercise, setIndex, t)}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {dayEx.exercise.sets[0]?.notes && (
                          <div className="theme-hairline-border theme-muted-surface mt-4 rounded-lg border p-3">
<p className="theme-primary-text-soft mb-1 text-[8px] font-bold uppercase tracking-widest">{t('exerciseEditor.notes')}</p>
            <p className="text-xs italic leading-relaxed text-on-surface-variant/90">"{dayEx.exercise.sets[0].notes}"</p>
          </div>
        )}

                        {!grouped && index < totalCount - 1 && <div className="theme-divider mt-4 h-px"></div>}
      </div>
    );
  };

  return (
    <>
      <PageShell
        activeView="routine-detail"
        setView={setView}
        profile={profile}
        contentClassName=""
        headerChildren={
          <SessionTimerControls
            sessionStartTimeMs={activeSession?.routineId === routine.id ? activeSession.startTimeMs : undefined}
            onOpenRestTimer={() => setIsRestTimerOpen(true)}
            onOpenStopwatch={() => setIsSessionTimerOpen(true)}
            t={t}
          />
        }
      >
        <section className="mb-6">
          <header className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-12 rounded-full bg-primary/80"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">{t('session.routineDetail')}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="font-headline text-[3.2rem] font-bold uppercase italic leading-none tracking-tight text-on-surface">
                {routine.name}
              </h1>
              {routine.syncPending ? <RoutineSyncPendingBadge className="self-start sm:self-center" /> : null}
            </div>
            {!activeSession ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onEditRoutine(routine)}
                  className="theme-hairline-border theme-interactive-hover flex h-11 items-center gap-2 rounded-full border bg-surface-container-high px-4 text-[0.68rem] font-black uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:text-primary active:scale-95"
                >
                  <Edit2 size={15} strokeWidth={2.5} />
                  {t('session.editRoutine')}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRoutineActionsOpen((current) => !current)}
                    aria-label={t('session.routineActions')}
                    aria-expanded={isRoutineActionsOpen}
                    aria-haspopup="menu"
                    className="theme-hairline-border theme-interactive-hover flex h-11 w-11 items-center justify-center rounded-full border bg-surface-container-high text-on-surface-variant transition-colors hover:text-on-surface active:scale-95"
                  >
                    <MoreHorizontal size={19} strokeWidth={2.5} />
                  </button>
                  {isRoutineActionsOpen ? (
                    <>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden="true"
                        onClick={() => setIsRoutineActionsOpen(false)}
                        className="fixed inset-0 z-20 cursor-default"
                      />
                      <div
                        role="menu"
                        className="theme-elevated-surface absolute right-0 top-[3.25rem] z-30 w-52 rounded-2xl border theme-hairline-border p-2 shadow-2xl"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsRoutineActionsOpen(false);
                            setConfirmRoutineDelete(true);
                          }}
                          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[0.7rem] font-black uppercase tracking-[0.12em] text-secondary transition-colors hover:bg-secondary/10"
                        >
                          <Trash2 size={16} strokeWidth={2.4} />
                          {t('session.deleteRoutine')}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </header>
        </section>

        <section className="mb-6 grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-[0.9rem] border-l-2 border-primary bg-surface-container-low px-3 py-3">
            <p className="truncate text-[0.52rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{t('session.days')}</p>
            <p className="mt-1 font-headline text-[1.4rem] font-semibold leading-none text-on-surface">{String(routine.dayEntries?.length || 0).padStart(2, '0')}</p>
          </div>
          <div className="min-w-0 rounded-[0.9rem] bg-surface-container-low px-3 py-3">
            <p className="truncate text-[0.52rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{t('routines.exercisePlural')}</p>
            <p className="mt-1 font-headline text-[1.4rem] font-semibold leading-none text-on-surface">{routine.exercises.length}</p>
          </div>
          <div className="min-w-0 rounded-[0.9rem] bg-surface-container-low px-3 py-3">
            <p className="truncate text-[0.52rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{t('settings.volume')}</p>
            <p className="mt-1 truncate font-headline text-[1.4rem] font-semibold leading-none text-on-surface">
              {volume.toFixed(0)} <span className="text-[0.55rem] font-medium lowercase text-on-surface-variant">kg</span>
            </p>
          </div>
        </section>

        {activeSession?.routineId === routine.id && activeSession.routineDayIds.length > 1 && (
          <section className="mb-6">
            <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-on-surface-variant">{t('session.activeDays')}</p>
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
? 'theme-primary-shadow-soft bg-primary text-black'
                        : 'bg-surface-container-high text-on-surface-variant theme-interactive-hover'
                    }`}
                  >
                    {day.dayType === 'core' ? '⚡ Core' : `${t('routines.day')} ${day.dayNumber}`}
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
            const isCurrentSessionDay = activeSession?.routineId === routine.id
              && activeSession.routineDayIds.includes(day.id);
            const isBlockedByOtherSession = !!activeSession && !isCurrentSessionDay;
            return (
              <div
                key={day.id}
                ref={(element) => {
                  daySectionRefs.current[day.id] = element;
                }}
                className={`scroll-mt-[calc(env(safe-area-inset-top)+7rem)] overflow-hidden rounded-[1.2rem] ${isOpen ? 'border-l-4 border-primary bg-surface-container' : 'bg-surface-container'}`}
              >
                <div className="flex items-center bg-surface-container-high/30 pr-3">
                  <button
                    onClick={() => {
                      if (isCurrentSessionDay) {
                        if (isOpen) {
                          onOpenDayChange(null);
                        } else {
                          onSwitchSessionDay(day.id);
                          onOpenDayChange(day.id);
                        }
                        return;
                      }
                      onOpenDayChange(isOpen ? null : day.id);
                    }}
                    disabled={isBlockedByOtherSession}
                    className={`flex flex-1 items-center justify-between gap-3 p-4 text-left transition-colors sm:p-5 ${isOpen ? 'bg-surface-container-high/55' : 'hover:bg-surface-bright/35'} ${isBlockedByOtherSession ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span className={`font-headline text-[1.4rem] font-semibold sm:text-[1.6rem] ${isOpen ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {day.dayType === 'core' ? 'CO' : String(day.dayNumber).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-sans text-[0.95rem] font-bold uppercase text-on-surface sm:text-[1rem]">{day.title}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{day.exercises.length} {t(day.exercises.length === 1 ? 'routines.exerciseSingular' : 'routines.exercisePlural')}</p>
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
                    title={activeSession ? t('session.unavailableTraining') : t('routines.deleteDay')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-6 px-4 pb-4 sm:px-5 sm:pb-5">
                    {activeSession?.routineId === routine.id && (
                      <div className="theme-hairline-border rounded-[1rem] border bg-surface-container-low p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('session.dayBlocks')}</p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {t('session.groupWithin')} {day.dayType === 'core' ? 'CORE' : day.title}.
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
                              {t('session.groupExercises')}
                            </button>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={resetGroupingMode}
                                className="theme-hairline-border rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
                              >
                                {t('common.cancel')}
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
                                {t('session.createBlock')}
                              </button>
                            </div>
                          )}
                        </div>
                        {isGroupingMode && (
<p className="theme-primary-text-soft mt-3 text-[10px] font-bold uppercase tracking-[0.18em]">
                            {t('session.selected')}: {selectedGroupExerciseIds.length}
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
<p className="theme-primary-text-soft text-[10px] font-bold uppercase tracking-[0.22em]">
                                    {t('session.block')} {index + 1} · {getGroupLabel(item.exercises.length, t)}
                                  </p>
                                  <p className="mt-1 text-sm text-on-surface-variant">
                                    {completedSets}/{totalSets} {t('session.completedSets')}
                                  </p>
                                </div>
                                <button
                                  onClick={() => onRemoveExerciseGroup(day.id, item.group.id)}
                                  className="theme-hairline-border rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-surface"
                                >
                                  {t('session.ungroup')}
                                </button>
                              </div>
                              <div className="space-y-4">
                                {item.exercises.map((exercise, exerciseIndex) => (
                                  <div key={exercise.id}>
                                    {renderExerciseCard(day, exercise, exerciseIndex, item.exercises.length, true)}
                                    {exerciseIndex < item.exercises.length - 1 && <div className="theme-divider mt-4 h-px"></div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        return renderExerciseCard(day, item.exercise, index, items.length);
                      })
                    ) : (
                      <p className="py-2 text-sm text-on-surface-variant">{t('session.emptyDay')}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <div aria-hidden="true" className="h-20" />

        <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] left-0 right-0 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md">
            {activeSession?.routineId === routine.id ? (
              <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                <button
                  type="button"
                  onClick={() => !isEndingSession && setConfirmCancelSession(true)}
                  disabled={isEndingSession}
                  aria-label={t('session.cancelWorkout')}
                  className={`flex h-14 items-center justify-center gap-2 rounded-[1rem] border border-secondary bg-secondary px-3 text-black shadow-[0_8px_24px_color-mix(in_srgb,var(--color-secondary)_24%,transparent)] transition-all font-headline text-[0.72rem] leading-none font-semibold uppercase tracking-[0.08em] ${isEndingSession ? 'cursor-not-allowed opacity-60' : 'hover:brightness-105 active:scale-[0.98]'}`}
                >
                  <X size={17} strokeWidth={2.8} />
                  {t('session.cancelShort')}
                </button>
                <button
                  type="button"
                  onClick={() => !isEndingSession && setConfirmEndSession(true)}
                  disabled={isEndingSession}
                  aria-label={t('session.finishWorkout')}
                  className={`theme-primary-shadow-strong flex h-14 items-center justify-center gap-2 rounded-[1rem] border border-primary/20 bg-primary px-3 font-headline text-[0.78rem] font-bold uppercase leading-none tracking-[0.09em] text-black transition-all ${isEndingSession ? 'cursor-not-allowed opacity-70' : 'hover:scale-[1.01] active:scale-[0.98]'}`}
                >
                  {isEndingSession ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Check size={18} strokeWidth={3} />
                  )}
                  {isEndingSession ? t('session.saving') : t('session.finishShort')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (selectedStartWeekdayId && routine) {
                    // Find CORE day if it exists
                    const coreDay = routine.dayEntries?.find(d => d.dayType === 'core');
                    // Start on the selected weekday and keep CORE available as an optional day.
                    const dayIds = buildSessionDayIds(selectedStartWeekdayId, coreDay?.id);
                    onStartSession(routine.id, routine.name, dayIds);
                  }
                }}
                disabled={!selectedStartWeekdayId}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] border px-4 font-headline text-[0.9rem] font-bold uppercase leading-none tracking-[0.1em] transition-all ${selectedStartWeekdayId ? 'theme-primary-shadow-strong border-primary/20 bg-primary text-black hover:scale-[1.01] active:scale-[0.98]' : 'cursor-not-allowed border-outline-variant/60 bg-surface-container-highest text-on-surface-variant shadow-none'}`}
              >
                <Play fill="currentColor" size={18} />
                {selectedStartWeekdayId ? t('session.startWorkout') : t('session.selectDay')}
              </button>
            )}
          </div>
        </div>
      </PageShell>

      <RestTimerModal
        open={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
        presets={restTimerPresets}
        onPresetsChange={onRestTimerPresetsChange}
      />
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
          bodyWeightKg={profile?.bodyWeightKg ?? null}
          targetType={setCapturePending.targetType}
          totalSets={allExerciseSets.sets.length}
          isEditing={setCapturePending.isEditing}
          onCapture={handleSetCapture}
          onClear={setCapturePending.isEditing ? handleClearSetCapture : undefined}
        />
      )}

      {/* Confirmación para Eliminar Rutina */}
      <ConfirmDialog
        open={confirmRoutineDelete}
        title={t('session.deleteRoutineTitle')}
        message={t('session.deleteRoutineMessage')}
        onConfirm={() => {
          onDeleteRoutine(routine.id);
          setView('dashboard');
        }}
        onCancel={() => setConfirmRoutineDelete(false)}
      />

      {/* Confirmación para Eliminar Día */}
      <ConfirmDialog
        open={!!confirmDayDeleteId}
        title={t('session.deleteDayTitle')}
        message={t('session.deleteDayMessage')}
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
        title={t('session.deleteExerciseTitle')}
        message={t('session.deleteExerciseMessage')}
        onConfirm={() => {
          if (confirmExerciseDelete) {
            onDeleteExercise(confirmExerciseDelete.exId, confirmExerciseDelete.dayId);
            setConfirmExerciseDelete(null);
          }
        }}
        onCancel={() => setConfirmExerciseDelete(null)}
      />
      <ConfirmDialog
        open={confirmCancelSession}
        title={t('session.cancelTitle')}
        message={t('session.cancelMessage')}
        confirmLabel={t('session.confirmCancel')}
        cancelLabel={t('session.back')}
        onConfirm={async () => {
          await onCancelSession();
          setConfirmCancelSession(false);
        }}
        onCancel={() => setConfirmCancelSession(false)}
      />
      <ConfirmDialog
        open={confirmEndSession}
        title={t('session.finishTitle')}
        message={t('session.finishMessage')}
        confirmLabel={t('session.finishNow')}
        cancelLabel={t('session.back')}
        isConfirming={isEndingSession}
        onConfirm={async () => {
          if (isEndingSession) return;
          setIsEndingSession(true);
          try {
            await onEndSession();
            setConfirmEndSession(false);
          } finally {
            setIsEndingSession(false);
          }
        }}
        onCancel={() => !isEndingSession && setConfirmEndSession(false)}
      />
      {isEndingSession && (
        <div className="theme-overlay fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-sm">
          <div className="theme-elevated-surface rounded-[1.2rem] px-6 py-5 text-center shadow-xl">
            <Loader2 size={26} className="mx-auto animate-spin text-primary" />
            <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-on-surface">
              {t('session.saving')}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">
              {t('session.keepOpen')}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
