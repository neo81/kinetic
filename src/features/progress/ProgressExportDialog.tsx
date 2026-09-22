import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer, X } from 'lucide-react';
import { formatAppDate, formatAppNumber } from '../../i18n/locale';
import type { AppLanguage, TranslationKey } from '../../i18n/translations';
import type { ProgressInsights, ProgressOverview, ProgressSeriesPoint, ProgressTrainingDistribution } from '../../types';
import { buildProgressCsv, downloadProgressCsv } from './progressExport';

type Translator = (key: TranslationKey) => string;

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const durationLabel = (minutes: number) => {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
};

const reportRecordTitle = (kind: string, t: Translator) => {
  if (kind === 'heaviest_set') return t('progress.recordHeaviest');
  if (kind === 'most_reps') return t('progress.recordReps');
  if (kind === 'largest_session_volume') return t('progress.recordVolume');
  return t('progress.recordDuration');
};

const ReportChart = ({
  title,
  series,
  field,
  color,
  language,
}: {
  title: string;
  series: ProgressSeriesPoint[];
  field: 'sessions' | 'volumeKg' | 'durationMinutes';
  color: 'primary' | 'secondary';
  language: AppLanguage;
}) => {
  const width = 420;
  const height = 140;
  const padding = 12;
  const values = series.map((point) => Number(point[field] ?? 0));
  const maximum = Math.max(...values, 1);
  const xAt = (index: number) => series.length <= 1
    ? width / 2
    : padding + (index / (series.length - 1)) * (width - padding * 2);
  const yAt = (value: number) => padding + (height - padding * 2) - (value / maximum) * (height - padding * 2);
  const path = values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(value)}`).join(' ');
  const lastValue = values.at(-1) ?? 0;

  return (
    <article className="progress-report-chart rounded-2xl border theme-hairline-border bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-headline text-lg font-semibold uppercase text-on-surface">{title}</h3>
        <strong className={color === 'primary' ? 'text-primary' : 'text-secondary'}>
          {formatAppNumber(lastValue, { maximumFractionDigits: 0 }, language)}
        </strong>
      </div>
      {series.length > 0 ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-28 w-full overflow-visible" aria-hidden="true">
          {[0, 0.5, 1].map((ratio) => (
            <line key={ratio} x1={padding} x2={width - padding} y1={padding + ratio * (height - padding * 2)} y2={padding + ratio * (height - padding * 2)} className="stroke-outline-variant/35" />
          ))}
          {series.length > 1 && <path d={path} fill="none" className={color === 'primary' ? 'stroke-primary' : 'stroke-secondary'} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
          {values.map((value, index) => <circle key={`${series[index].bucketStart}-${index}`} cx={xAt(index)} cy={yAt(value)} r="4" className={color === 'primary' ? 'fill-primary' : 'fill-secondary'} />)}
        </svg>
      ) : <div className="h-28" />}
    </article>
  );
};

export const ProgressExportDialog = ({
  overview,
  insights,
  distribution,
  from,
  to,
  language,
  t,
  onClose,
}: {
  overview: ProgressOverview;
  insights: ProgressInsights;
  distribution: ProgressTrainingDistribution;
  from: Date;
  to: Date;
  language: AppLanguage;
  t: Translator;
  onClose: () => void;
}) => {
  const periodLabel = `${formatAppDate(from, { day: 'numeric', month: 'short', year: 'numeric' }, language)} — ${formatAppDate(new Date(to.getTime() - 1), { day: 'numeric', month: 'short', year: 'numeric' }, language)}`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const exportCsv = () => {
    const csv = buildProgressCsv({ overview, insights, distribution, language, periodLabel });
    const suffix = `${localDateKey(from)}_${localDateKey(new Date(to.getTime() - 1))}`;
    downloadProgressCsv(csv, `kinetic-progreso_${suffix}.csv`);
  };

  return createPortal(
    <div className="progress-report-overlay fixed inset-0 z-[100] overflow-y-auto bg-background/95 p-3 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-label={t('progress.reportPreview')}>
      <div className="progress-report-print-root mx-auto max-w-6xl rounded-[1.5rem] border theme-hairline-border bg-surface p-5 shadow-2xl sm:p-8">
        <div className="progress-report-controls mb-7 flex flex-wrap items-center justify-between gap-3 border-b theme-hairline-border pb-5">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">Kinetic Performance Engine</p>
            <h2 className="mt-1 font-headline text-3xl font-semibold uppercase text-on-surface">{t('progress.reportPreview')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportCsv} className="liquid-glass-contextual-button inline-flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase text-on-surface">
              <Download size={17} /> CSV
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-xs font-black uppercase text-black">
              <Printer size={17} /> {t('progress.printPdf')}
            </button>
            <button type="button" onClick={onClose} aria-label={t('common.close')} className="liquid-glass-contextual-button flex h-11 w-11 items-center justify-center rounded-full text-on-surface">
              <X size={19} />
            </button>
          </div>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">Kinetic Performance Engine</p>
            <h1 className="mt-1 font-headline text-4xl font-semibold uppercase text-on-surface">{t('progress.reportTitle')}</h1>
          </div>
          <p className="text-sm font-semibold text-on-surface-variant">{periodLabel}</p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [t('progress.sessions'), formatAppNumber(overview.summary.sessions, undefined, language)],
            [t('progress.trainingDays'), formatAppNumber(overview.summary.trainingDays, undefined, language)],
            [t('progress.externalVolume'), `${formatAppNumber(Math.round(overview.summary.volumeKg), undefined, language)} kg`],
            [t('progress.totalTime'), durationLabel(overview.summary.durationMinutes)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl bg-surface-container-high p-4">
              <strong className="block font-headline text-3xl font-semibold text-on-surface">{value}</strong>
              <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{label}</span>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-3 lg:grid-cols-3">
          <ReportChart title={t('progress.sessionFrequency')} series={overview.series} field="sessions" color="primary" language={language} />
          <ReportChart title={t('progress.volumeTrend')} series={overview.series} field="volumeKg" color="secondary" language={language} />
          <ReportChart title={t('progress.durationTrend')} series={overview.series} field="durationMinutes" color="primary" language={language} />
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="font-headline text-2xl font-semibold uppercase text-on-surface">{t('progress.consistency')}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <article className="rounded-2xl bg-surface-container-high p-4">
                <strong className="font-headline text-3xl font-semibold text-primary">{formatAppNumber(distribution.consistency.consistencyPercent, { maximumFractionDigits: 0 }, language)}%</strong>
                <p className="text-[0.62rem] font-bold uppercase text-on-surface-variant">{t('progress.consistency')}</p>
              </article>
              <article className="rounded-2xl bg-surface-container-high p-4">
                <strong className="font-headline text-3xl font-semibold text-secondary">{distribution.consistency.longestStreakWeeks}</strong>
                <p className="text-[0.62rem] font-bold uppercase text-on-surface-variant">{t('progress.longestStreak')}</p>
              </article>
            </div>
          </div>
          <div>
            <h2 className="font-headline text-2xl font-semibold uppercase text-on-surface">{t('progress.muscleDistribution')}</h2>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
              {distribution.muscleGroups.slice(0, 10).map((muscle) => (
                <div key={muscle.code}>
                  <div className="flex justify-between gap-2 text-xs"><span className="truncate font-semibold text-on-surface">{t(`muscle.${muscle.code}` as TranslationKey)}</span><span className="text-on-surface-variant">{formatAppNumber(muscle.sharePercent, { maximumFractionDigits: 1 }, language)}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, muscle.sharePercent)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <section>
            <h2 className="font-headline text-2xl font-semibold uppercase text-on-surface">{t('progress.section.routines')}</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border theme-hairline-border">
              {insights.routineDays.slice(0, 12).map((day) => (
                <div key={day.dayKey} className="grid grid-cols-[1fr_auto] gap-4 border-b theme-hairline-border px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">{day.routineName}</p>
                    <p className="text-xs text-on-surface-variant">{day.dayType === 'core' ? 'CORE' : day.dayTitle || `${t('routines.day')} ${day.dayNumber ?? '-'}`}</p>
                  </div>
                  <div className="text-right text-xs text-on-surface-variant"><strong className="block text-sm text-primary">{day.sessions}×</strong>{formatAppNumber(Math.round(day.volumeKg), undefined, language)} kg</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-headline text-2xl font-semibold uppercase text-on-surface">{t('progress.section.records')}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {insights.records.map((record) => (
                <article key={record.kind} className="rounded-2xl border theme-hairline-border bg-surface-container-high p-4">
                  <strong className="font-headline text-2xl font-semibold text-secondary">{formatAppNumber(record.value, { maximumFractionDigits: 1 }, language)} {record.unit === 'minutes' ? 'min' : record.unit}</strong>
                  <p className="mt-1 text-[0.62rem] font-bold uppercase text-on-surface-variant">{reportRecordTitle(record.kind, t)}</p>
                </article>
              ))}
            </div>
            {insights.estimatedMaxes.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-black uppercase tracking-[0.12em] text-on-surface-variant">{t('progress.estimatedMax')}</h3>
                <div className="mt-2 space-y-2">
                  {insights.estimatedMaxes.slice(0, 6).map((estimate) => (
                    <div key={estimate.exerciseId} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-high px-3 py-2">
                      <span className="truncate text-sm font-semibold text-on-surface">{language === 'en' ? estimate.exerciseNameEn || estimate.exerciseName : estimate.exerciseName}</span>
                      <strong className="shrink-0 text-secondary">{formatAppNumber(estimate.estimatedOneRepMax, { maximumFractionDigits: 1 }, language)} kg</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};
