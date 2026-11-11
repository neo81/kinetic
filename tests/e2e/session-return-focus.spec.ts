import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

test('active-session shortcut opens the exercise in progress, not skipped or completed exercises', async ({ page }) => {
  const userId = '00000000-0000-4000-8000-000000000002';
  const makeExercise = (id: string, name: string, position: number, dayId = 'day-1') => ({
    id,
    routine_day_id: dayId,
    exercise_id: id,
    position,
    measure_unit: 'kg',
    load_type: 'external',
    notes: null,
    rest_seconds: null,
    exercises: { id, name, name_en: name, muscle_groups: { code: 'pectorales', name: 'Pectorales' } },
    exercise_sets: [1, 2].map(setNumber => ({
      set_number: setNumber, reps: 10, weight: 20,
      duration_minutes: null, duration_seconds: null, target_type: 'fixed_reps',
    })),
  });
  const routine = {
    id: 'routine-focus',
    user_id: userId,
    name: 'Rutina de prueba',
    notes: null,
    is_active: true,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    routine_days: [{
      id: 'day-1', routine_id: 'routine-focus', day_type: 'weekday', day_number: 1,
      title: 'Dia de prueba', position: 1, created_at: '2026-11-01T00:00:00Z',
      routine_day_exercises: [
        makeExercise('entry-1', 'Salteado', 1),
        makeExercise('entry-2', 'Completo', 2),
        makeExercise('entry-3', 'Pendiente anterior', 3),
        makeExercise('entry-4', 'Objetivo en curso', 4),
        makeExercise('entry-5', 'Pendiente posterior', 5),
      ],
    }, {
      id: 'day-2', routine_id: 'routine-focus', day_type: 'weekday', day_number: 2,
      title: 'Otro dia', position: 2, created_at: '2026-11-01T00:00:00Z',
      routine_day_exercises: [makeExercise('entry-6', 'Siguiente ejercicio', 1, 'day-2')],
    }],
  };

  await page.route('**/*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').at(-1);
    let body: unknown = [];
    if (table === 'profiles') body = { id: userId, full_name: 'Prueba', unit_system: 'kg', height_cm: null, body_weight_kg: null };
    if (table === 'user_preferences') body = { user_id: userId, theme: 'dark', language: 'es' };
    if (table === 'routines') body = [routine];
    if (table === 'routine_sessions' && url.searchParams.has('id')) {
      body = { id: 'session-focus', routine_id: routine.id, status: 'in_progress' };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.addInitScript(({ userId }) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: userId, exp, role: 'authenticated' }))}.fixture`;
    localStorage.setItem('sb-inbfezuypeneqjjusuug-auth-token', JSON.stringify({
      access_token: token, refresh_token: 'fixture', expires_at: exp, expires_in: 3600, token_type: 'bearer',
      user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
    }));
    const capturedSet = { captured: true, actualReps: 10, actualWeight: 20, actualDurationMinutes: null, actualDurationSeconds: null };
    if (!localStorage.getItem('kinetic.activeSession')) {
      localStorage.setItem('kinetic.activeSession', JSON.stringify({
        id: 'session-focus', routineId: 'routine-focus', routineName: 'Rutina de prueba',
        routineDayIds: ['day-1', 'day-2'], activeRoutineDayId: 'day-1', startTimeMs: Date.now(),
        completedExercises: ['entry-2'], skippedExercises: ['entry-1'], completedDayIds: [],
        performanceData: { 'entry-2': { 1: capturedSet, 2: capturedSet }, 'entry-4': { 1: capturedSet } },
      }));
    }
  }, { userId });

  await page.goto('/');
  await page.getByRole('button', { name: /Entrenamiento activo/ }).click();
  const target = page.getByRole('heading', { name: 'Objetivo en curso' });
  await expect(target).toBeVisible();
  await expect.poll(async () => (await target.boundingBox())?.y ?? 1000).toBeLessThan(360);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kinetic.activeSession')!).skippedExercises)).toEqual(['entry-1']);

  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('kinetic.activeSession')!);
    session.skippedExercises = ['entry-1', 'entry-3', 'entry-4', 'entry-5'];
    localStorage.setItem('kinetic.activeSession', JSON.stringify(session));
  });
  await page.reload();
  await page.getByRole('button', { name: /Entrenamiento activo/ }).click();
  const nextDayTarget = page.getByRole('heading', { name: 'Siguiente ejercicio' });
  await expect(nextDayTarget).toBeVisible();
  await expect.poll(async () => (await nextDayTarget.boundingBox())?.y ?? 1000).toBeLessThan(360);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kinetic.activeSession')!).activeRoutineDayId)).toBe('day-2');
});
