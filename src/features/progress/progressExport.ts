import type { AppLanguage } from '../../i18n/translations';
import type { ProgressInsights, ProgressOverview, ProgressTrainingDistribution } from '../../types';

const csvCell = (value: string | number | null | undefined) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
};

const csvRow = (...values: Array<string | number | null | undefined>) => values.map(csvCell).join(';');

const localizedLabel = (language: AppLanguage, spanish: string, english: string) => language === 'en' ? english : spanish;

const englishMuscleLabels: Record<string, string> = {
  hombros: 'Shoulders',
  pectorales: 'Chest',
  biceps: 'Biceps',
  abdomen: 'Abs',
  oblicuos: 'Obliques',
  antebrazo: 'Forearms',
  abductores: 'Abductors',
  aductores: 'Adductors',
  cuadriceps: 'Quadriceps',
  trapecio: 'Trapezius',
  triceps: 'Triceps',
  dorsales: 'Lats',
  lumbares: 'Lower back',
  gluteos: 'Glutes',
  isquiotibiales: 'Hamstrings',
  pantorrillas: 'Calves',
};

export function buildProgressCsv({
  overview,
  insights,
  distribution,
  language,
  periodLabel,
}: {
  overview: ProgressOverview;
  insights: ProgressInsights;
  distribution: ProgressTrainingDistribution;
  language: AppLanguage;
  periodLabel: string;
}) {
  const lines: string[] = [
    csvRow(localizedLabel(language, 'Informe de progreso Kinetic', 'Kinetic progress report')),
    csvRow(localizedLabel(language, 'Período', 'Period'), periodLabel),
    '',
    csvRow(localizedLabel(language, 'Resumen', 'Summary')),
    csvRow(
      localizedLabel(language, 'Sesiones', 'Sessions'),
      localizedLabel(language, 'Días entrenados', 'Training days'),
      localizedLabel(language, 'Duración (min)', 'Duration (min)'),
      localizedLabel(language, 'Series', 'Sets'),
      localizedLabel(language, 'Repeticiones', 'Repetitions'),
      localizedLabel(language, 'Volumen (kg)', 'Volume (kg)'),
      localizedLabel(language, 'Ejercicios únicos', 'Unique exercises'),
    ),
    csvRow(
      overview.summary.sessions,
      overview.summary.trainingDays,
      overview.summary.durationMinutes,
      overview.summary.sets,
      overview.summary.reps,
      overview.summary.volumeKg,
      overview.summary.uniqueExercises,
    ),
    '',
    csvRow(localizedLabel(language, 'Evolución por período', 'Progress over time')),
    csvRow(
      localizedLabel(language, 'Fecha', 'Date'),
      localizedLabel(language, 'Sesiones', 'Sessions'),
      localizedLabel(language, 'Duración (min)', 'Duration (min)'),
      localizedLabel(language, 'Series', 'Sets'),
      localizedLabel(language, 'Repeticiones', 'Repetitions'),
      localizedLabel(language, 'Volumen (kg)', 'Volume (kg)'),
    ),
    ...overview.series.map((point) => csvRow(
      point.bucketStart,
      point.sessions,
      point.durationMinutes,
      point.sets,
      point.reps,
      point.volumeKg,
    )),
    '',
    csvRow(localizedLabel(language, 'Consistencia', 'Consistency')),
    csvRow(
      localizedLabel(language, 'Semanas activas', 'Active weeks'),
      localizedLabel(language, 'Semanas del período', 'Weeks in period'),
      localizedLabel(language, 'Consistencia (%)', 'Consistency (%)'),
      localizedLabel(language, 'Mejor racha (semanas)', 'Longest streak (weeks)'),
      localizedLabel(language, 'Sesiones por semana activa', 'Sessions per active week'),
    ),
    csvRow(
      distribution.consistency.activeWeeks,
      distribution.consistency.totalWeeks,
      distribution.consistency.consistencyPercent,
      distribution.consistency.longestStreakWeeks,
      distribution.consistency.averageSessionsPerActiveWeek,
    ),
    '',
    csvRow(localizedLabel(language, 'Distribución muscular', 'Muscle distribution')),
    csvRow(
      localizedLabel(language, 'Grupo muscular', 'Muscle group'),
      localizedLabel(language, 'Sesiones', 'Sessions'),
      localizedLabel(language, 'Series', 'Sets'),
      localizedLabel(language, 'Repeticiones', 'Repetitions'),
      localizedLabel(language, 'Participación (%)', 'Share (%)'),
      localizedLabel(language, 'Volumen externo (kg)', 'External volume (kg)'),
    ),
    ...distribution.muscleGroups.map((muscle) => csvRow(
      language === 'en' ? englishMuscleLabels[muscle.code] || muscle.name : muscle.name,
      muscle.sessions,
      muscle.sets,
      muscle.reps,
      muscle.sharePercent,
      muscle.volumeKg,
    )),
    '',
    csvRow(localizedLabel(language, 'Rutinas y días', 'Routines and days')),
    csvRow(
      localizedLabel(language, 'Rutina', 'Routine'),
      localizedLabel(language, 'Día', 'Day'),
      localizedLabel(language, 'Sesiones', 'Sessions'),
      localizedLabel(language, 'Series', 'Sets'),
      localizedLabel(language, 'Ejercicios', 'Exercises'),
      localizedLabel(language, 'Volumen (kg)', 'Volume (kg)'),
      localizedLabel(language, 'Última vez', 'Last performed'),
    ),
    ...insights.routineDays.map((day) => csvRow(
      day.routineName,
      day.dayType === 'core' ? 'CORE' : day.dayTitle || `${localizedLabel(language, 'Día', 'Day')} ${day.dayNumber ?? '-'}`,
      day.sessions,
      day.sets,
      day.exercises,
      day.volumeKg,
      day.lastPerformedAt,
    )),
    '',
    csvRow(localizedLabel(language, 'Récords', 'Records')),
    csvRow(
      localizedLabel(language, 'Tipo', 'Type'),
      localizedLabel(language, 'Valor', 'Value'),
      localizedLabel(language, 'Unidad', 'Unit'),
      localizedLabel(language, 'Ejercicio', 'Exercise'),
      localizedLabel(language, 'Fecha', 'Date'),
    ),
    ...insights.records.map((record) => csvRow(
      record.kind,
      record.value,
      record.unit,
      language === 'en' ? record.exerciseNameEn || record.exerciseName : record.exerciseName,
      record.achievedAt,
    )),
    '',
    csvRow(localizedLabel(language, '1RM estimado', 'Estimated 1RM')),
    csvRow(
      localizedLabel(language, 'Ejercicio', 'Exercise'),
      localizedLabel(language, '1RM estimado (kg)', 'Estimated 1RM (kg)'),
      localizedLabel(language, 'Peso (kg)', 'Weight (kg)'),
      localizedLabel(language, 'Repeticiones', 'Repetitions'),
      localizedLabel(language, 'Fecha', 'Date'),
    ),
    ...insights.estimatedMaxes.map((estimate) => csvRow(
      language === 'en' ? estimate.exerciseNameEn || estimate.exerciseName : estimate.exerciseName,
      estimate.estimatedOneRepMax,
      estimate.weight,
      estimate.reps,
      estimate.achievedAt,
    )),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadProgressCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
