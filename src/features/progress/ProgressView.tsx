import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CalendarDays, Clock3, Dumbbell, Expand, FileDown, RefreshCw, TrendingDown, TrendingUp, X } from 'lucide-react';
import { formatAppDate, formatAppNumber } from '../../i18n/locale';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';
import type {
  ExerciseProgressPoint,
  ExerciseSetProgressPoint,
  ProgressBucket,
  ProgressOverview,
  ProgressInsights,
  ProgressPeriod,
  ProgressSeriesPoint,
  ProgressSummary,
  ProgressTrainingDistribution,
} from '../../types';
import { getExerciseDisplayName } from '../../i18n/exerciseLocalization';
import { progressRepository } from './repository';
import { ActivityHeatmap, RecordsPanel, RoutineDaysPanel, TrainingDistributionPanel } from './ProgressInsightsPanels';

const ProgressExportDialog = lazy(() => import('./ProgressExportDialog').then((module) => ({
  default: module.ProgressExportDialog,
})));

type DateRange = { from: Date; to: Date; bucket: ProgressBucket };
type ChartDatum = { date: string; value: number };
type ExerciseMetric = 'weight' | 'reps' | 'volume' | 'oneRepMax' | 'sets' | 'adherence';
type ProgressSection = 'overview' | 'exercises' | 'routines' | 'records';

const progressSectionTranslation: Record<ProgressSection, TranslationKey> = {
  overview: 'progress.section.overview',
  exercises: 'progress.section.exercises',
  routines: 'progress.section.routines',
  records: 'progress.section.records',
};

const periodOptions: Array<{ id: ProgressPeriod; label: string }> = [
  { id: '30d', label: '30D' },
  { id: '60d', label: '60D' },
  { id: '90d', label: '90D' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: 'custom', label: '↔' },
];

const startOfLocalDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfLocalDay = (date: Date) => {
  const result = startOfLocalDay(date);
  result.setDate(result.getDate() + 1);
  return result;
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const rangeForPeriod = (period: ProgressPeriod, customFrom: string, customTo: string): DateRange | null => {
  const now = new Date();
  const to = endOfLocalDay(now);
  const from = startOfLocalDay(now);

  if (period === 'custom') {
    if (!customFrom || !customTo) return null;
    const customStart = startOfLocalDay(new Date(`${customFrom}T00:00:00`));
    const customEnd = endOfLocalDay(new Date(`${customTo}T00:00:00`));
    if (!Number.isFinite(customStart.getTime()) || !Number.isFinite(customEnd.getTime()) || customStart >= customEnd) return null;
    const days = Math.ceil((customEnd.getTime() - customStart.getTime()) / 86_400_000);
    return { from: customStart, to: customEnd, bucket: days <= 45 ? 'day' : days <= 210 ? 'week' : 'month' };
  }

  if (period === '6m') {
    from.setMonth(from.getMonth() - 6);
    return { from, to, bucket: 'week' };
  }
  if (period === '1y') {
    from.setFullYear(from.getFullYear() - 1);
    return { from, to, bucket: 'month' };
  }

  const days = period === '30d' ? 30 : period === '60d' ? 60 : 90;
  from.setDate(from.getDate() - (days - 1));
  return { from, to, bucket: days <= 30 ? 'day' : 'week' };
};

const formatDuration = (minutes: number) => {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
};

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const Trend = ({ current, previous }: { current: number; previous: number }) => {
  const change = percentageChange(current, previous);
  if (Math.abs(change) < 0.5) return <span className="text-[0.62rem] font-bold text-on-surface-variant/60">—</span>;
  const positive = change > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[0.62rem] font-black ${positive ? 'text-primary' : 'text-secondary'}`}>
      <Icon size={12} aria-hidden="true" />
      {Math.abs(Math.round(change))}%
    </span>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  current,
  previous,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  current: number;
  previous: number;
}) => (
  <article className="rounded-[1.1rem] border theme-hairline-border bg-surface-container-high/75 p-4">
    <div className="mb-4 flex items-center justify-between gap-2">
      <Icon size={17} className="text-primary" aria-hidden="true" />
      <Trend current={current} previous={previous} />
    </div>
    <p className="font-headline text-[1.55rem] font-bold leading-none text-on-surface">{value}</p>
    <p className="mt-2 text-[0.63rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{label}</p>
  </article>
);

const niceStep = (range: number, targetIntervals: number) => {
  const roughStep = Math.max(range / Math.max(targetIntervals, 1), Number.EPSILON);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
};

const buildAxisScale = (data: ChartDatum[], tickCount: number, includeZero: boolean, minimumStep: number) => {
  const values = data.map((item) => item.value).filter(Number.isFinite);
  const dataMin = values.length > 0 ? Math.min(...values) : 0;
  const dataMax = values.length > 0 ? Math.max(...values) : 0;
  const spread = Math.max(dataMax - dataMin, Math.abs(dataMax) * 0.1, 1);
  const paddedMin = includeZero ? 0 : Math.max(0, dataMin - spread * 0.12);
  const paddedMax = dataMax + spread * 0.12;
  const step = Math.max(niceStep(Math.max(paddedMax - paddedMin, 1), tickCount - 1), minimumStep);
  const min = includeZero ? 0 : Math.floor(paddedMin / step) * step;
  const max = Math.max(Math.ceil(paddedMax / step) * step, min + step);
  return {
    min,
    max,
    ticks: Array.from({ length: tickCount }, (_, index) => min + ((max - min) * index) / Math.max(tickCount - 1, 1)),
  };
};

const ChartCanvas = ({
  data,
  color,
  kind,
  valueFormatter,
  axisFormatter = valueFormatter,
  includeZero = kind === 'bar',
  minimumAxisStep = 0,
  expanded = false,
  selectedIndex: controlledSelectedIndex,
  onSelectedIndexChange,
  showXLabels = true,
}: {
  data: ChartDatum[];
  color: 'primary' | 'secondary';
  kind: 'line' | 'bar';
  valueFormatter: (value: number) => string;
  axisFormatter?: (value: number) => string;
  includeZero?: boolean;
  minimumAxisStep?: number;
  expanded?: boolean;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  showXLabels?: boolean;
}) => {
  const { language } = useLanguage();
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(Math.max(data.length - 1, 0));
  const selectedIndex = Math.min(controlledSelectedIndex ?? internalSelectedIndex, Math.max(data.length - 1, 0));
  const setSelectedIndex = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(data.length - 1, 0));
    if (controlledSelectedIndex === undefined) setInternalSelectedIndex(nextIndex);
    onSelectedIndexChange?.(nextIndex);
  };
  const width = 600;
  const height = expanded ? 300 : 220;
  const padding = { left: 76, right: 18, top: 18, bottom: showXLabels ? 36 : 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const scale = buildAxisScale(data, expanded ? 6 : 3, includeZero, minimumAxisStep);
  const xAt = (index: number) => data.length <= 1
    ? width / 2
    : padding.left + (index / (data.length - 1)) * chartWidth;
  const yAt = (value: number) => padding.top + chartHeight - ((value - scale.min) / (scale.max - scale.min)) * chartHeight;
  const path = data.map((item, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(item.value)}`).join(' ');
  const selected = data[selectedIndex] ?? data[data.length - 1];
  const strokeClass = color === 'primary' ? 'stroke-primary' : 'stroke-secondary';
  const fillClass = color === 'primary' ? 'fill-primary' : 'fill-secondary';
  const labelDate = (value: string) => formatAppDate(new Date(value), { day: 'numeric', month: 'short' }, language);
  const labelCount = expanded ? 5 : 3;
  const labelIndexes = Array.from(new Set(Array.from({ length: Math.min(labelCount, data.length) }, (_, index) => (
    Math.round((index / Math.max(Math.min(labelCount, data.length) - 1, 1)) * Math.max(data.length - 1, 0))
  ))));
  const selectFromPointer = (clientX: number, element: SVGSVGElement) => {
    const bounds = element.getBoundingClientRect();
    const viewBoxX = ((clientX - bounds.left) / Math.max(bounds.width, 1)) * width;
    const ratio = Math.min(1, Math.max(0, (viewBoxX - padding.left) / Math.max(chartWidth, 1)));
    setSelectedIndex(Math.round(ratio * Math.max(data.length - 1, 0)));
  };

  useEffect(() => {
    if (controlledSelectedIndex === undefined) setInternalSelectedIndex(Math.max(data.length - 1, 0));
  }, [controlledSelectedIndex, data]);

  if (data.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex min-h-9 items-end justify-between gap-4 px-1" aria-live="polite">
        <span className="font-headline text-2xl font-bold text-on-surface">{selected ? valueFormatter(selected.value) : '—'}</span>
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          {selected ? labelDate(selected.date) : ''}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full touch-pan-y overflow-visible ${expanded ? 'h-[19rem]' : 'h-[13rem]'}`}
        role="img"
        aria-label={selected ? `${valueFormatter(selected.value)} · ${labelDate(selected.date)}` : undefined}
        onPointerDown={(event) => selectFromPointer(event.clientX, event.currentTarget)}
        onPointerMove={(event) => {
          if (event.pointerType === 'touch' || event.buttons > 0) selectFromPointer(event.clientX, event.currentTarget);
        }}
      >
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              className="stroke-outline-variant/25"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={yAt(tick) + 5}
              textAnchor="end"
              className="fill-on-surface-variant text-[14px] font-bold"
            >
              {axisFormatter(tick)}
            </text>
          </g>
        ))}

        {kind === 'line' && data.length > 1 && (
          <path d={path} fill="none" className={strokeClass} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {kind === 'bar' && data.map((item, index) => {
          const available = chartWidth / Math.max(data.length, 1);
          const barWidth = Math.max(4, Math.min(22, available * 0.62));
          const x = data.length <= 1 ? width / 2 - barWidth / 2 : xAt(index) - barWidth / 2;
          const y = yAt(item.value);
          const baseline = yAt(scale.min);
          return (
            <rect
              key={`${item.date}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(2, baseline - y)}
              rx={barWidth / 2}
              className={`${fillClass} ${selectedIndex === index ? 'opacity-100' : 'opacity-45'}`}
            />
          );
        })}

        {kind === 'line' && data.map((item, index) => (
          <circle
            key={`${item.date}-${index}`}
            cx={xAt(index)}
            cy={yAt(item.value)}
            r={selectedIndex === index ? 7 : 4}
            className={`${fillClass} ${selectedIndex === index ? 'opacity-100' : 'opacity-65'}`}
          />
        ))}

        {showXLabels && labelIndexes.map((index) => (
          <text
            key={`label-${index}`}
            x={xAt(index)}
            y={height - 7}
            textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            className="fill-on-surface-variant text-[16px] font-bold"
          >
            {labelDate(data[index].date)}
          </text>
        ))}
      </svg>
    </div>
  );
};

const ChartCard = ({
  title,
  subtitle,
  data,
  color = 'primary',
  kind = 'line',
  valueFormatter,
  axisFormatter,
  includeZero,
  minimumAxisStep,
}: {
  title: string;
  subtitle: string;
  data: ChartDatum[];
  color?: 'primary' | 'secondary';
  kind?: 'line' | 'bar';
  valueFormatter: (value: number) => string;
  axisFormatter?: (value: number) => string;
  includeZero?: boolean;
  minimumAxisStep?: number;
}) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <article className="rounded-[1.4rem] border theme-hairline-border bg-surface-container-high/70 p-4 shadow-lg backdrop-blur-xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-headline text-xl font-bold uppercase text-on-surface">{title}</h3>
            <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t('progress.expandChart')}
            className="liquid-glass-contextual-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface"
          >
            <Expand size={17} />
          </button>
        </div>
        <ChartCanvas data={data} color={color} kind={kind} valueFormatter={valueFormatter} axisFormatter={axisFormatter} includeZero={includeZero} minimumAxisStep={minimumAxisStep} />
      </article>

      {expanded && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={title}>
          <div className="theme-elevated-surface w-full max-w-3xl rounded-[1.7rem] border theme-hairline-border p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-headline text-2xl font-bold uppercase text-on-surface">{title}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">{subtitle}</p>
              </div>
              <button type="button" onClick={() => setExpanded(false)} aria-label={t('common.close')} className="liquid-glass-contextual-button flex h-11 w-11 items-center justify-center rounded-full">
                <X size={20} />
              </button>
            </div>
            <ChartCanvas data={data} color={color} kind={kind} valueFormatter={valueFormatter} axisFormatter={axisFormatter} includeZero={includeZero} minimumAxisStep={minimumAxisStep} expanded />
          </div>
        </div>
      )}
    </>
  );
};

const getSeries = (series: ProgressSeriesPoint[], field: keyof ProgressSeriesPoint): ChartDatum[] => series.map((point) => ({
  date: point.bucketStart,
  value: Number(point[field] ?? 0),
}));

const getExerciseSeries = (series: ExerciseProgressPoint[], metric: ExerciseMetric): ChartDatum[] => series.flatMap((point) => {
  if (metric === 'sets') return [];
  if (metric === 'adherence' && point.adherencePercent === null) return [];
  const value = metric === 'weight'
    ? point.maxWeight
    : metric === 'reps'
      ? point.maxReps
      : metric === 'volume'
        ? point.volumeKg
        : metric === 'oneRepMax'
          ? point.estimatedOneRepMax
          : point.adherencePercent ?? 0;
  return [{ date: point.bucketStart, value }];
});

const ExerciseSetProgressCharts = ({
  points,
  expanded = false,
}: {
  points: ExerciseSetProgressPoint[];
  expanded?: boolean;
}) => {
  const { language, t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(Math.max(points.length - 1, 0));
  const selected = points[selectedIndex] ?? points[points.length - 1];
  const weightData = points.map((point) => ({ date: point.performedAt, value: point.weight }));
  const repsData = points.map((point) => ({ date: point.performedAt, value: point.reps }));
  const formatWeight = (value: number) => `${formatAppNumber(value, { maximumFractionDigits: 1 }, language)} kg`;
  const formatReps = (value: number) => `${formatAppNumber(value, { maximumFractionDigits: 0 }, language)} reps`;

  useEffect(() => {
    setSelectedIndex(Math.max(points.length - 1, 0));
  }, [points]);

  return (
    <div className="mt-3 space-y-5">
      <p className="px-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{t('progress.setEvolutionHint')}</p>
      {selected && (
        <div className="rounded-xl bg-surface-container/65 px-3 py-2 text-center text-[0.68rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant" aria-live="polite">
          {formatAppDate(new Date(selected.performedAt), { day: 'numeric', month: 'short' }, language)} · {t('progress.setNumber')} {selected.setNumber}
        </div>
      )}
      <section>
        <h4 className="px-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-primary">{t('progress.weightPerSet')}</h4>
        <ChartCanvas
          data={weightData}
          color="primary"
          kind="line"
          valueFormatter={formatWeight}
          axisFormatter={formatWeight}
          includeZero={false}
          expanded={expanded}
          selectedIndex={selectedIndex}
          onSelectedIndexChange={setSelectedIndex}
          showXLabels={false}
        />
      </section>
      <section className="border-t theme-hairline-border pt-4">
        <h4 className="px-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-secondary">{t('progress.repsPerSet')}</h4>
        <ChartCanvas
          data={repsData}
          color="secondary"
          kind="line"
          valueFormatter={formatReps}
          axisFormatter={(value) => formatAppNumber(value, { maximumFractionDigits: 0 }, language)}
          includeZero={false}
          minimumAxisStep={1}
          expanded={expanded}
          selectedIndex={selectedIndex}
          onSelectedIndexChange={setSelectedIndex}
        />
      </section>
    </div>
  );
};

export const ProgressView = () => {
  const { language, t } = useLanguage();
  const [period, setPeriod] = useState<ProgressPeriod>('30d');
  const initialFrom = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return toDateInputValue(date);
  }, []);
  const [customFrom, setCustomFrom] = useState(initialFrom);
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()));
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [insights, setInsights] = useState<ProgressInsights | null>(null);
  const [distribution, setDistribution] = useState<ProgressTrainingDistribution | null>(null);
  const [progressSection, setProgressSection] = useState<ProgressSection>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [exerciseMetric, setExerciseMetric] = useState<ExerciseMetric>('weight');
  const [exerciseSeries, setExerciseSeries] = useState<ExerciseProgressPoint[]>([]);
  const [exerciseSetSeries, setExerciseSetSeries] = useState<ExerciseSetProgressPoint[]>([]);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseSetLoading, setExerciseSetLoading] = useState(false);
  const [exerciseExpanded, setExerciseExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const overviewRequestRef = useRef(0);
  const range = useMemo(() => rangeForPeriod(period, customFrom, customTo), [period, customFrom, customTo]);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const closeReport = useCallback(() => setReportOpen(false), []);

  const loadOverview = async () => {
    if (!range) return;
    const requestId = overviewRequestRef.current + 1;
    overviewRequestRef.current = requestId;
    setLoading(true);
    setError(false);
    try {
      const [data, insightData, distributionData] = await Promise.all([
        progressRepository.getOverview({ ...range, timezone }),
        progressRepository.getInsights({ from: range.from, to: range.to, timezone }),
        progressRepository.getTrainingDistribution({ from: range.from, to: range.to, timezone }),
      ]);
      if (overviewRequestRef.current !== requestId) return;
      setOverview(data);
      setInsights(insightData);
      setDistribution(distributionData);
      setSelectedExerciseId((current) => data.exercises.some((exercise) => exercise.id === current)
        ? current
        : data.exercises[0]?.id ?? '');
    } catch (loadError) {
      if (overviewRequestRef.current !== requestId) return;
      console.error('Error loading progress report:', loadError);
      setError(true);
      setOverview(null);
      setInsights(null);
      setDistribution(null);
    } finally {
      if (overviewRequestRef.current === requestId) setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [range?.from.getTime(), range?.to.getTime(), range?.bucket, timezone]);

  useEffect(() => {
    if (!selectedExerciseId || !range) {
      setExerciseSeries([]);
      return;
    }
    let active = true;
    setExerciseLoading(true);
    progressRepository.getExerciseProgress({ exerciseId: selectedExerciseId, ...range, timezone })
      .then((data) => {
        if (active) setExerciseSeries(data);
      })
      .catch((loadError) => {
        console.error('Error loading exercise progress:', loadError);
        if (active) setExerciseSeries([]);
      })
      .finally(() => {
        if (active) setExerciseLoading(false);
      });
    return () => { active = false; };
  }, [selectedExerciseId, range?.from.getTime(), range?.to.getTime(), range?.bucket, timezone]);

  useEffect(() => {
    if (exerciseMetric !== 'sets') return;
    if (!selectedExerciseId || !range) {
      setExerciseSetSeries([]);
      return;
    }
    let active = true;
    setExerciseSetLoading(true);
    progressRepository.getExerciseSetProgress({ exerciseId: selectedExerciseId, from: range.from, to: range.to })
      .then((data) => {
        if (active) setExerciseSetSeries(data);
      })
      .catch((loadError) => {
        console.error('Error loading exercise set progress:', loadError);
        if (active) setExerciseSetSeries([]);
      })
      .finally(() => {
        if (active) setExerciseSetLoading(false);
      });
    return () => { active = false; };
  }, [exerciseMetric, selectedExerciseId, range?.from.getTime(), range?.to.getTime()]);

  const selectedExercise = overview?.exercises.find((exercise) => exercise.id === selectedExerciseId);
  const summary: ProgressSummary = overview?.summary ?? {
    sessions: 0,
    trainingDays: 0,
    durationMinutes: 0,
    averageDurationMinutes: 0,
    sets: 0,
    reps: 0,
    volumeKg: 0,
    timedMinutes: 0,
    uniqueExercises: 0,
  };
  const previous = overview?.previousSummary ?? summary;
  const exerciseMetricLabel = exerciseMetric === 'weight'
    ? t('progress.workingWeight')
    : exerciseMetric === 'reps'
      ? t('progress.repetitions')
      : exerciseMetric === 'volume'
        ? t('progress.exerciseVolume')
        : exerciseMetric === 'oneRepMax'
          ? t('progress.estimatedOneRepMax')
          : exerciseMetric === 'sets'
            ? t('progress.setEvolution')
            : t('progress.planAdherence');
  const exerciseMetricFormatter = (value: number) => exerciseMetric === 'weight'
    ? `${formatAppNumber(value, { maximumFractionDigits: 1 }, language)} kg`
    : exerciseMetric === 'reps'
      ? `${formatAppNumber(value, { maximumFractionDigits: 0 }, language)} reps`
      : exerciseMetric === 'adherence'
        ? `${formatAppNumber(value, { maximumFractionDigits: 0 }, language)}%`
        : `${formatAppNumber(value, { maximumFractionDigits: 1 }, language)} kg`;
  const exerciseAxisFormatter = (value: number) => exerciseMetric === 'weight'
    ? `${formatAppNumber(value, { maximumFractionDigits: 1 }, language)} kg`
    : exerciseMetric === 'reps'
      ? formatAppNumber(value, { maximumFractionDigits: 0 }, language)
      : exerciseMetric === 'adherence'
        ? `${formatAppNumber(value, { maximumFractionDigits: 0 }, language)}%`
        : `${formatAppNumber(value, { notation: 'compact', maximumFractionDigits: 1 }, language)} kg`;
  const exerciseIsLoading = exerciseMetric === 'sets' ? exerciseSetLoading : exerciseLoading;
  const exerciseHasData = exerciseMetric === 'sets'
    ? exerciseSetSeries.length > 0
    : getExerciseSeries(exerciseSeries, exerciseMetric).length > 0;

  return (
    <div className="space-y-5">
      <section className="rounded-[1.3rem] border theme-hairline-border bg-surface-container-high/60 p-3 backdrop-blur-xl">
        <div className="grid grid-cols-6 gap-1" aria-label={t('progress.period')}>
          {periodOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPeriod(option.id)}
              aria-label={option.id === 'custom' ? t('progress.custom') : option.label}
              className={`rounded-full px-1 py-2 text-[0.68rem] font-black uppercase transition-colors ${period === option.id ? 'bg-primary text-black' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              {option.id === 'custom' ? t('progress.customShort') : option.id === '1y' ? t('progress.yearShort') : option.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t theme-hairline-border pt-3">
            <label className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              {t('progress.from')}
              <input type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} className="mt-1 w-full rounded-xl border theme-hairline-border bg-surface-container px-3 py-2 text-sm text-on-surface" />
            </label>
            <label className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">
              {t('progress.to')}
              <input type="date" value={customTo} min={customFrom} max={toDateInputValue(new Date())} onChange={(event) => setCustomTo(event.target.value)} className="mt-1 w-full rounded-xl border theme-hairline-border bg-surface-container px-3 py-2 text-sm text-on-surface" />
            </label>
          </div>
        )}

        {!loading && overview && insights && range && (
          <div className="mt-3 flex justify-end border-t theme-hairline-border pt-3">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="liquid-glass-contextual-button inline-flex h-10 items-center gap-2 rounded-full px-4 font-headline text-sm font-semibold uppercase tracking-[0.05em] text-on-surface"
            >
              <FileDown size={16} /> {t('progress.openReport')}
            </button>
          </div>
        )}
      </section>

      {!range && <p className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 text-sm text-secondary">{t('progress.invalidRange')}</p>}

      {loading && (
        <div className="flex min-h-72 flex-col items-center justify-center gap-4" role="status">
          <div className="h-12 w-12 animate-pulse rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">{t('progress.loading')}</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-[1.4rem] border border-secondary/30 bg-secondary/5 p-6 text-center">
          <p className="text-sm font-bold text-secondary">{t('progress.loadError')}</p>
          <button type="button" onClick={loadOverview} className="inline-flex items-center gap-2 rounded-full border border-secondary/40 px-4 py-2 text-xs font-black uppercase text-secondary">
            <RefreshCw size={14} /> {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && !error && overview && (
        <>
          <nav className="grid grid-cols-4 gap-1 rounded-[1.1rem] border theme-hairline-border bg-surface-container-high/60 p-1" aria-label={t('progress.sections')}>
            {(['overview', 'exercises', 'routines', 'records'] as ProgressSection[]).map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setProgressSection(section)}
                aria-pressed={progressSection === section}
                className={`min-w-0 rounded-xl px-0.5 py-2.5 font-headline text-[0.72rem] font-semibold uppercase tracking-[0.02em] transition-colors ${progressSection === section ? 'bg-primary text-black' : 'text-on-surface-variant'}`}
              >
                <span className="block w-full truncate">{t(progressSectionTranslation[section])}</span>
              </button>
            ))}
          </nav>

          {progressSection === 'overview' && (
            <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3">
            <SummaryCard icon={Activity} label={t('progress.sessions')} value={formatAppNumber(summary.sessions, undefined, language)} current={summary.sessions} previous={previous.sessions} />
            <SummaryCard icon={CalendarDays} label={t('progress.trainingDays')} value={formatAppNumber(summary.trainingDays, undefined, language)} current={summary.trainingDays} previous={previous.trainingDays} />
            <SummaryCard icon={Dumbbell} label={t('progress.externalVolume')} value={`${formatAppNumber(Math.round(summary.volumeKg), undefined, language)} kg`} current={summary.volumeKg} previous={previous.volumeKg} />
            <SummaryCard icon={Clock3} label={t('progress.totalTime')} value={formatDuration(summary.durationMinutes)} current={summary.durationMinutes} previous={previous.durationMinutes} />
          </section>

          {insights && range && (
            <ActivityHeatmap activity={insights.activity} from={range.from} to={range.to} language={language} t={t} />
          )}

          {distribution && (
            <TrainingDistributionPanel distribution={distribution} language={language} t={t} />
          )}

          <section className="grid grid-cols-2 gap-2 rounded-[1.1rem] border theme-hairline-border bg-surface-container-high/55 p-3 text-center">
            <div className="rounded-xl bg-surface-container/60 p-3"><strong className="block font-headline text-xl text-on-surface">{formatAppNumber(summary.sets, undefined, language)}</strong><span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{t('progress.sets')}</span></div>
            <div className="rounded-xl bg-surface-container/60 p-3"><strong className="block font-headline text-xl text-on-surface">{formatAppNumber(summary.reps, undefined, language)}</strong><span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{t('progress.repetitions')}</span></div>
            <div className="rounded-xl bg-surface-container/60 p-3"><strong className="block font-headline text-xl text-on-surface">{formatDuration(summary.timedMinutes)}</strong><span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{t('progress.timedWork')}</span></div>
            <div className="rounded-xl bg-surface-container/60 p-3"><strong className="block font-headline text-xl text-on-surface">{formatAppNumber(summary.uniqueExercises, undefined, language)}</strong><span className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-on-surface-variant">{t('progress.uniqueExercises')}</span></div>
          </section>

          {summary.sessions === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed theme-hairline-border p-10 text-center">
              <p className="font-headline text-xl font-bold uppercase text-on-surface">{t('progress.empty')}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{t('progress.emptyHint')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <ChartCard
                title={t('progress.sessionFrequency')}
                subtitle={t('progress.tapChart')}
                data={getSeries(overview.series, 'sessions')}
                kind="bar"
                valueFormatter={(value) => `${formatAppNumber(value, undefined, language)} ${t('progress.sessionsShort')}`}
                axisFormatter={(value) => formatAppNumber(value, { maximumFractionDigits: 0 }, language)}
                includeZero
                minimumAxisStep={1}
              />
              <ChartCard
                title={t('progress.volumeTrend')}
                subtitle={t('progress.externalLoadOnly')}
                data={getSeries(overview.series, 'volumeKg')}
                color="secondary"
                valueFormatter={(value) => `${formatAppNumber(Math.round(value), undefined, language)} kg`}
                axisFormatter={(value) => `${formatAppNumber(value, { notation: 'compact', maximumFractionDigits: 1 }, language)} kg`}
                includeZero
              />
              <ChartCard
                title={t('progress.durationTrend')}
                subtitle={t('progress.totalPerPeriod')}
                data={getSeries(overview.series, 'durationMinutes')}
                valueFormatter={formatDuration}
                axisFormatter={formatDuration}
                includeZero
              />
            </div>
          )}
            </div>
          )}

          {progressSection === 'exercises' && overview.exercises.length > 0 && (
            <section className="rounded-[1.4rem] border theme-hairline-border bg-surface-container-high/70 p-4 shadow-lg backdrop-blur-xl sm:p-5">
              <div className="mb-4">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-primary">{t('progress.byExercise')}</p>
                <select
                  value={selectedExerciseId}
                  onChange={(event) => setSelectedExerciseId(event.target.value)}
                  className="mt-2 w-full rounded-xl border theme-hairline-border bg-surface-container px-3 py-3 font-headline text-lg font-bold text-on-surface"
                >
                  {overview.exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>{getExerciseDisplayName(exercise, language)}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-1 rounded-[1.1rem] bg-surface-container p-1">
                {(['weight', 'reps', 'volume', 'oneRepMax', 'sets', 'adherence'] as ExerciseMetric[]).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => setExerciseMetric(metric)}
                    className={`rounded-full px-2 py-2 text-[0.62rem] font-black uppercase ${exerciseMetric === metric ? 'bg-primary text-black' : 'text-on-surface-variant'}`}
                  >
                    {metric === 'weight'
                      ? t('progress.weight')
                      : metric === 'reps'
                        ? t('progress.reps')
                        : metric === 'volume'
                          ? t('progress.volume')
                          : metric === 'oneRepMax'
                            ? t('progress.oneRepMaxShort')
                            : metric === 'sets'
                              ? t('progress.seriesShort')
                              : t('progress.planShort')}
                  </button>
                ))}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-headline text-xl font-bold uppercase text-on-surface">{selectedExercise ? getExerciseDisplayName(selectedExercise, language) : ''}</h3>
                  <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{exerciseMetricLabel}</p>
                </div>
                {exerciseHasData && !exerciseIsLoading && (
                  <button type="button" onClick={() => setExerciseExpanded(true)} aria-label={t('progress.expandChart')} className="liquid-glass-contextual-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface">
                    <Expand size={17} />
                  </button>
                )}
              </div>
              {exerciseIsLoading ? (
                <div className="flex h-52 items-center justify-center"><div className="h-9 w-9 animate-pulse rounded-full border-2 border-primary/30 border-t-primary" /></div>
              ) : exerciseMetric === 'sets' && exerciseSetSeries.length > 0 ? (
                <ExerciseSetProgressCharts points={exerciseSetSeries} />
              ) : getExerciseSeries(exerciseSeries, exerciseMetric).length > 0 ? (
                <ChartCanvas
                  data={getExerciseSeries(exerciseSeries, exerciseMetric)}
                  color={exerciseMetric === 'volume' || exerciseMetric === 'oneRepMax' ? 'secondary' : 'primary'}
                  kind="line"
                  valueFormatter={exerciseMetricFormatter}
                  axisFormatter={exerciseAxisFormatter}
                  includeZero={exerciseMetric === 'volume' || exerciseMetric === 'adherence'}
                  minimumAxisStep={exerciseMetric === 'reps' ? 1 : 0}
                />
              ) : (
                <p className="py-12 text-center text-sm text-on-surface-variant">
                  {exerciseMetric === 'sets'
                    ? t('progress.noSetProgress')
                    : exerciseMetric === 'adherence'
                      ? t('progress.adherenceFutureOnly')
                      : t('progress.noExerciseData')}
                </p>
              )}
            </section>
          )}

          {progressSection === 'exercises' && overview.exercises.length === 0 && (
            <p className="rounded-[1.4rem] border border-dashed theme-hairline-border p-10 text-center text-sm text-on-surface-variant">{t('progress.noExerciseData')}</p>
          )}

          {progressSection === 'routines' && insights && (
            <RoutineDaysPanel routineDays={insights.routineDays} language={language} t={t} />
          )}

          {progressSection === 'records' && insights && (
            <RecordsPanel records={insights.records} estimatedMaxes={insights.estimatedMaxes} language={language} t={t} />
          )}

          {exerciseExpanded && selectedExercise && exerciseHasData && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={getExerciseDisplayName(selectedExercise, language)}>
              <div className="theme-elevated-surface max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.7rem] border theme-hairline-border p-5 shadow-2xl">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-headline text-2xl font-bold uppercase text-on-surface">{getExerciseDisplayName(selectedExercise, language)}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">{exerciseMetricLabel}</p>
                  </div>
                  <button type="button" onClick={() => setExerciseExpanded(false)} aria-label={t('common.close')} className="liquid-glass-contextual-button flex h-11 w-11 items-center justify-center rounded-full">
                    <X size={20} />
                  </button>
                </div>
                {exerciseMetric === 'sets' ? (
                  <ExerciseSetProgressCharts points={exerciseSetSeries} expanded />
                ) : (
                  <ChartCanvas
                    data={getExerciseSeries(exerciseSeries, exerciseMetric)}
                    color={exerciseMetric === 'volume' || exerciseMetric === 'oneRepMax' ? 'secondary' : 'primary'}
                    kind="line"
                    valueFormatter={exerciseMetricFormatter}
                    axisFormatter={exerciseAxisFormatter}
                    includeZero={exerciseMetric === 'volume' || exerciseMetric === 'adherence'}
                    minimumAxisStep={exerciseMetric === 'reps' ? 1 : 0}
                    expanded
                  />
                )}
              </div>
            </div>
          )}

          {reportOpen && insights && distribution && range && (
            <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90"><div className="h-12 w-12 animate-pulse rounded-full border-2 border-primary/30 border-t-primary" /></div>}>
              <ProgressExportDialog
                overview={overview}
                insights={insights}
                distribution={distribution}
                from={range.from}
                to={range.to}
                language={language}
                t={t}
                onClose={closeReport}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
};
