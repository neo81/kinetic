import { describe, expect, it } from 'vitest';
import type { ProgressInsights, ProgressOverview, ProgressTrainingDistribution } from '../../types';
import { buildProgressCsv } from './progressExport';

const overview: ProgressOverview = {
  summary: {
    sessions: 2,
    trainingDays: 2,
    durationMinutes: 120,
    averageDurationMinutes: 60,
    sets: 8,
    reps: 80,
    volumeKg: 2450.5,
    timedMinutes: 0,
    uniqueExercises: 3,
  },
  previousSummary: {
    sessions: 1,
    trainingDays: 1,
    durationMinutes: 50,
    averageDurationMinutes: 50,
    sets: 4,
    reps: 40,
    volumeKg: 1000,
    timedMinutes: 0,
    uniqueExercises: 2,
  },
  series: [{ bucketStart: '2026-09-01', sessions: 2, durationMinutes: 120, sets: 8, reps: 80, volumeKg: 2450.5, timedMinutes: 0 }],
  exercises: [],
};

const insights: ProgressInsights = {
  activity: [],
  routineDays: [{
    routineId: 'routine-1',
    routineName: 'Rutina; "Fuerza"',
    dayKey: 'day-1',
    dayType: 'weekday',
    dayNumber: 1,
    dayTitle: 'Día 1',
    sessions: 2,
    sets: 8,
    exercises: 3,
    volumeKg: 2450.5,
    lastPerformedAt: '2026-09-02T12:00:00Z',
  }],
  records: [],
  estimatedMaxes: [],
};

const distribution: ProgressTrainingDistribution = {
  muscleGroups: [{
    code: 'pectorales',
    name: 'Pectorales',
    sessions: 2,
    sets: 8,
    reps: 80,
    volumeKg: 2450.5,
    sharePercent: 100,
    lastPerformedAt: '2026-09-02T12:00:00Z',
  }],
  consistency: {
    activeWeeks: 2,
    totalWeeks: 4,
    consistencyPercent: 50,
    longestStreakWeeks: 2,
    averageSessionsPerActiveWeek: 1,
  },
};

describe('buildProgressCsv', () => {
  it('exports all report sections using semicolon-delimited escaped cells', () => {
    const csv = buildProgressCsv({ overview, insights, distribution, language: 'es-419', periodLabel: '1–30 sep 2026' });

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Informe de progreso Kinetic"');
    expect(csv).toContain('"Rutina; ""Fuerza"""');
    expect(csv).toContain('"2450.5"');
    expect(csv).toContain('"Distribución muscular"');
  });

  it('localizes structural labels without translating user content', () => {
    const csv = buildProgressCsv({ overview, insights, distribution, language: 'en', periodLabel: 'Sep 1–30, 2026' });

    expect(csv).toContain('"Kinetic progress report"');
    expect(csv).toContain('"Routines and days"');
    expect(csv).toContain('"Muscle distribution"');
    expect(csv).toContain('"Rutina; ""Fuerza"""');
  });
});
