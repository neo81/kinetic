import { useMemo, useState } from 'react';
import { Award, CalendarDays, Clock3, Dumbbell, Repeat2, Trophy } from 'lucide-react';
import { formatAppDate, formatAppNumber } from '../../i18n/locale';
import type { AppLanguage, TranslationKey } from '../../i18n/translations';
import { getExerciseDisplayName } from '../../i18n/exerciseLocalization';
import type { ProgressActivityDay, ProgressEstimatedMax, ProgressRecord, ProgressRoutineDay, ProgressTrainingDistribution } from '../../types';

type Translator = (key: TranslationKey) => string;

const muscleTranslationKeys: Record<string, TranslationKey> = {
  hombros: 'muscle.hombros',
  pectorales: 'muscle.pectorales',
  biceps: 'muscle.biceps',
  abdomen: 'muscle.abdomen',
  oblicuos: 'muscle.oblicuos',
  antebrazo: 'muscle.antebrazo',
  abductores: 'muscle.abductores',
  aductores: 'muscle.aductores',
  cuadriceps: 'muscle.cuadriceps',
  trapecio: 'muscle.trapecio',
  triceps: 'muscle.triceps',
  dorsales: 'muscle.dorsales',
  lumbares: 'muscle.lumbares',
  gluteos: 'muscle.gluteos',
  isquiotibiales: 'muscle.isquiotibiales',
  pantorrillas: 'muscle.pantorrillas',
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ActivityHeatmap = ({
  activity,
  from,
  to,
  language,
  t,
}: {
  activity: ProgressActivityDay[];
  from: Date;
  to: Date;
  language: AppLanguage;
  t: Translator;
}) => {
  const activityByDate = useMemo(() => new Map(activity.map((day) => [day.date, day])), [activity]);
  const days = useMemo(() => {
    const values: Array<{ key: string; date: Date; activity?: ProgressActivityDay; placeholder?: boolean }> = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    const mondayOffset = (cursor.getDay() + 6) % 7;
    for (let index = 0; index < mondayOffset; index += 1) {
      values.push({ key: `placeholder-${index}`, date: cursor, placeholder: true });
    }
    while (cursor < end) {
      const key = dateKey(cursor);
      values.push({ key, date: new Date(cursor), activity: activityByDate.get(key) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return values;
  }, [activityByDate, from.getTime(), to.getTime()]);
  const [selectedKey, setSelectedKey] = useState(activity[activity.length - 1]?.date ?? '');
  const selected = activityByDate.get(selectedKey);

  return (
    <section className="rounded-[1.4rem] border theme-hairline-border bg-surface-container-high/70 p-4 shadow-lg backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-headline text-xl font-bold uppercase text-on-surface">{t('progress.activityMap')}</h3>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{t('progress.activityMapHint')}</p>
        </div>
        <CalendarDays size={20} className="shrink-0 text-primary" />
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="grid min-w-max grid-flow-col grid-rows-7 gap-1"
          style={{ gridAutoColumns: '0.78rem' }}
          aria-label={t('progress.activityMap')}
        >
          {days.map((day) => day.placeholder ? (
            <span key={day.key} className="h-3 w-3" />
          ) : (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedKey(day.key)}
              aria-label={`${formatAppDate(day.date, { day: 'numeric', month: 'long', year: 'numeric' }, language)}: ${day.activity?.sessions ?? 0}`}
              className={`h-3 w-3 rounded-[0.2rem] border transition-transform active:scale-125 ${
                day.activity
                  ? day.activity.sessions > 1
                    ? 'border-primary bg-primary shadow-md'
                    : 'border-primary/60 bg-primary/55'
                  : 'border-outline-variant/25 bg-surface-container'
              } ${selectedKey === day.key ? 'ring-1 ring-on-surface ring-offset-1 ring-offset-surface-container-high' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 min-h-10 rounded-xl bg-surface-container/65 px-3 py-2 text-xs text-on-surface-variant">
        {selected ? (
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold">{formatAppDate(new Date(`${selected.date}T00:00:00`), { day: 'numeric', month: 'long' }, language)}</span>
            <span>{selected.sessions} {t('progress.sessionsShort')} · {formatAppNumber(Math.round(selected.volumeKg), undefined, language)} kg</span>
          </div>
        ) : t('progress.selectActivityDay')}
      </div>
    </section>
  );
};

export const RoutineDaysPanel = ({
  routineDays,
  language,
  t,
}: {
  routineDays: ProgressRoutineDay[];
  language: AppLanguage;
  t: Translator;
}) => {
  if (routineDays.length === 0) {
    return <p className="rounded-[1.4rem] border border-dashed theme-hairline-border p-10 text-center text-sm text-on-surface-variant">{t('progress.noRoutineData')}</p>;
  }

  return (
    <div className="space-y-3">
      {routineDays.map((day) => {
        const dayLabel = day.dayType === 'core' ? 'CORE' : `${t('routines.day')} ${day.dayNumber ?? '-'}`;
        return (
          <article key={day.dayKey} className="rounded-[1.3rem] border theme-hairline-border bg-surface-container-high/70 p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.14em] text-on-surface-variant">{day.routineName}</p>
                <h3 className="mt-1 font-headline text-2xl font-bold uppercase text-primary">{dayLabel}</h3>
                {day.dayTitle && day.dayTitle.toLocaleUpperCase() !== dayLabel.toLocaleUpperCase() && (
                  <p className="mt-1 text-xs font-semibold text-on-surface-variant">{day.dayTitle}</p>
                )}
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-black text-primary">{day.sessions}×</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface-container p-2"><strong className="block font-headline text-lg text-on-surface">{day.sets}</strong><span className="text-[0.55rem] font-bold uppercase text-on-surface-variant">{t('progress.sets')}</span></div>
              <div className="rounded-xl bg-surface-container p-2"><strong className="block font-headline text-lg text-on-surface">{day.exercises}</strong><span className="text-[0.55rem] font-bold uppercase text-on-surface-variant">{t('progress.exercisesLogged')}</span></div>
              <div className="rounded-xl bg-surface-container p-2"><strong className="block font-headline text-lg text-secondary">{formatAppNumber(Math.round(day.volumeKg), undefined, language)}</strong><span className="text-[0.55rem] font-bold uppercase text-on-surface-variant">kg</span></div>
            </div>
            <p className="mt-3 text-right text-[0.6rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70">
              {t('progress.lastPerformed')}: {formatAppDate(new Date(day.lastPerformedAt), { day: 'numeric', month: 'short', year: 'numeric' }, language)}
            </p>
          </article>
        );
      })}
    </div>
  );
};

export const TrainingDistributionPanel = ({
  distribution,
  language,
  t,
}: {
  distribution: ProgressTrainingDistribution;
  language: AppLanguage;
  t: Translator;
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleMuscles = showAll ? distribution.muscleGroups : distribution.muscleGroups.slice(0, 6);
  const consistency = distribution.consistency;

  return (
    <section className="rounded-[1.4rem] border theme-hairline-border bg-surface-container-high/70 p-4 shadow-lg backdrop-blur-xl sm:p-5">
      <div>
        <h3 className="font-headline text-xl font-bold uppercase text-on-surface">{t('progress.trainingDistribution')}</h3>
        <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{t('progress.trainingDistributionHint')}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-container p-3">
          <strong className="block font-headline text-2xl font-semibold text-primary">{formatAppNumber(consistency.consistencyPercent, { maximumFractionDigits: 0 }, language)}%</strong>
          <span className="text-[0.55rem] font-bold uppercase text-on-surface-variant">{t('progress.consistency')}</span>
        </div>
        <div className="rounded-xl bg-surface-container p-3">
          <strong className="block font-headline text-2xl font-semibold text-on-surface">{consistency.activeWeeks}/{consistency.totalWeeks}</strong>
          <span className="text-[0.55rem] font-bold uppercase text-on-surface-variant">{t('progress.activeWeeks')}</span>
        </div>
        <div className="rounded-xl bg-surface-container p-3">
          <strong className="block font-headline text-2xl font-semibold text-secondary">{consistency.longestStreakWeeks}</strong>
          <span className="text-[0.55rem] font-bold uppercase text-on-surface-variant">{t('progress.longestStreak')}</span>
        </div>
      </div>

      {visibleMuscles.length > 0 ? (
        <div className="mt-5 space-y-3">
          {visibleMuscles.map((muscle) => (
            <div key={muscle.code}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-bold text-on-surface">{muscleTranslationKeys[muscle.code] ? t(muscleTranslationKeys[muscle.code]) : muscle.name}</span>
                <span className="shrink-0 text-xs font-bold text-on-surface-variant">{muscle.sets} {t('progress.setsShort')} · {formatAppNumber(muscle.sharePercent, { maximumFractionDigits: 1 }, language)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, muscle.sharePercent)}%` }} />
              </div>
            </div>
          ))}
          {distribution.muscleGroups.length > 6 && (
            <button type="button" onClick={() => setShowAll((current) => !current)} className="w-full rounded-full border theme-hairline-border py-2 text-[0.65rem] font-black uppercase tracking-[0.08em] text-on-surface-variant">
              {showAll ? t('progress.showLess') : t('progress.showAllMuscles')}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed theme-hairline-border p-6 text-center text-sm text-on-surface-variant">{t('progress.noMuscleData')}</p>
      )}

      <p className="mt-4 text-[0.6rem] leading-relaxed text-on-surface-variant/75">{t('progress.muscleDistributionMethod')}</p>
    </section>
  );
};

const recordIcon = (kind: ProgressRecord['kind']) => kind === 'longest_session'
  ? Clock3
  : kind === 'most_reps'
    ? Repeat2
    : kind === 'largest_session_volume'
      ? Dumbbell
      : Trophy;

const recordTitle = (kind: ProgressRecord['kind'], t: Translator) => {
  if (kind === 'heaviest_set') return t('progress.recordHeaviest');
  if (kind === 'most_reps') return t('progress.recordReps');
  if (kind === 'largest_session_volume') return t('progress.recordVolume');
  return t('progress.recordDuration');
};

const recordValue = (record: ProgressRecord, language: AppLanguage) => {
  if (record.unit === 'minutes') {
    const hours = Math.floor(record.value / 60);
    const minutes = Math.round(record.value % 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  return `${formatAppNumber(record.value, { maximumFractionDigits: 1 }, language)} ${record.unit}`;
};

export const RecordsPanel = ({
  records,
  estimatedMaxes,
  language,
  t,
}: {
  records: ProgressRecord[];
  estimatedMaxes: ProgressEstimatedMax[];
  language: AppLanguage;
  t: Translator;
}) => (
  <div className="space-y-5">
    {records.length === 0 ? (
      <p className="rounded-[1.4rem] border border-dashed theme-hairline-border p-10 text-center text-sm text-on-surface-variant">{t('progress.noRecords')}</p>
    ) : (
      <section className="grid grid-cols-2 gap-3">
        {records.map((record) => {
          const Icon = recordIcon(record.kind);
          const exerciseName = record.exerciseName
            ? getExerciseDisplayName({ name: record.exerciseName, nameEn: record.exerciseNameEn }, language)
            : null;
          return (
            <article key={record.kind} className="rounded-[1.2rem] border theme-hairline-border bg-surface-container-high/70 p-4">
              <Icon size={18} className="mb-4 text-primary" />
              <p className="font-headline text-2xl font-bold text-on-surface">{recordValue(record, language)}</p>
              <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-on-surface-variant">{recordTitle(record.kind, t)}</p>
              {exerciseName && <p className="mt-3 line-clamp-2 text-xs font-semibold text-primary">{exerciseName}</p>}
            </article>
          );
        })}
      </section>
    )}

    <section className="rounded-[1.4rem] border theme-hairline-border bg-surface-container-high/70 p-4 shadow-lg sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-headline text-xl font-bold uppercase text-on-surface">{t('progress.estimatedMax')}</h3>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{t('progress.estimatedMaxHint')}</p>
        </div>
        <Award size={21} className="text-secondary" />
      </div>
      <div className="space-y-2">
        {estimatedMaxes.length > 0 ? estimatedMaxes.map((estimate, index) => (
          <div key={estimate.exerciseId} className="flex items-center gap-3 rounded-xl bg-surface-container p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-headline text-lg font-bold text-primary">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-on-surface">{getExerciseDisplayName({ name: estimate.exerciseName, nameEn: estimate.exerciseNameEn }, language)}</p>
              <p className="text-[0.62rem] text-on-surface-variant">{formatAppNumber(estimate.weight, { maximumFractionDigits: 1 }, language)} kg × {estimate.reps}</p>
            </div>
            <strong className="font-headline text-xl text-secondary">{formatAppNumber(estimate.estimatedOneRepMax, { maximumFractionDigits: 1 }, language)} kg</strong>
          </div>
        )) : <p className="py-8 text-center text-sm text-on-surface-variant">{t('progress.noEstimatedMax')}</p>}
      </div>
    </section>
  </div>
);
