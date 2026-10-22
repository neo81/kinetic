import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

test('restored login and repeated history visits under controlled latency', async ({ page }) => {
  const userId = '00000000-0000-4000-8000-000000000001';
  let historyRequests = 0;
  const historyRanges: string[] = [];
  let dashboardFiltered = false;
  const externalFonts: string[] = [];
  page.on('request', request => {
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request.url())) externalFonts.push(request.url());
  });
  await page.route('**/*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').at(-1);
    let body: unknown = [];
    if (table === 'profiles') body = { id: userId, full_name: 'Performance fixture', unit_system: 'kg' };
    if (table === 'user_preferences') body = { user_id: userId, theme: 'dark', language: 'es' };
    if (table === 'routine_sessions' && url.searchParams.has('id')) {
      body = { id: 'active-fixture', routine_id: 'routine-fixture', status: 'in_progress' };
    } else if (table === 'routine_sessions') {
      if (!url.searchParams.get('select')?.includes('routine_name_snapshot')) {
        body = [];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        return;
      }
      const offset = url.searchParams.get('offset');
      const limit = url.searchParams.get('limit');
      const range = offset !== null && limit !== null ? `${offset}-${Number(offset) + Number(limit) - 1}` : undefined;
      if (url.searchParams.has('ended_at')) {
        dashboardFiltered = true;
      } else {
        historyRequests++;
        historyRanges.push(range ?? 'missing');
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
      const allSessions = Array.from({ length: 26 }, (_, index) => ({
        id: `fixture-session-${index}`,
        started_at: '2026-10-20T10:00:00Z',
        ended_at: '2026-10-20T11:00:00Z',
        routine_name_snapshot: `Performance fixture history ${index}`,
        session_day_logs: index === 0 ? [{
          id: 'day-log-0', day_type_snapshot: 'weekday', day_number_snapshot: 1,
          day_title_snapshot: 'Day 1', routine_days: null,
          session_exercise_logs: [{
            id: 'exercise-log-0', position: 1, notes: null,
            exercise_name_snapshot: 'Performance Press', exercise_name_en_snapshot: null,
            exercises: null,
            session_set_logs: [{
              id: 'set-log-0', set_number: 1, reps: 10, weight: 20,
              duration_minutes: null, duration_seconds: null,
              load_type: 'external', target_type: 'fixed_reps', body_weight_kg_snapshot: null,
            }],
          }],
        }] : [],
      }));
      if (range) {
        const [from, to] = range.split('-').map(Number);
        body = allSessions.slice(from, to + 1);
      } else {
        body = allSessions;
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, table === 'profiles' ? 3500 : 300));
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
    localStorage.setItem('kinetic.activeSession', JSON.stringify({
      id: 'active-fixture', routineId: 'routine-fixture', routineName: 'Active fixture',
      routineDayIds: ['day'], activeRoutineDayId: 'day', startTimeMs: Date.now(),
      completedExercises: ['exercise'], completedDayIds: [],
      performanceData: { exercise: { 1: { captured: true, actualReps: 8, actualWeight: 20, actualDurationMinutes: null, actualDurationSeconds: null } } },
    }));
    (window as any).loginFlashed = false;
    setInterval(() => {
      const input = document.querySelector('input[type="password"]');
      if (!input) return;
      const box = input.getBoundingClientRect();
      if (box.width && document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === input) (window as any).loginFlashed = true;
    }, 20);
  }, { userId });
  const start = Date.now();
  await page.goto('/');
  const history = page.getByRole('navigation').getByRole('button', { name: 'Historial', exact: true });
  await history.click();
  await expect(page.getByText(/Performance fixture history 0(?!\d)/)).toBeVisible();
  await page.getByRole('button').filter({ hasText: /Performance fixture history 0(?!\d)/ }).first().click();
  await expect(page.getByText('Performance Press')).toBeVisible();
  await expect(page.getByText('10 reps · 20 kg')).toBeVisible();
  await expect(page.getByText(/Performance fixture history 20(?!\d)/)).toHaveCount(0);
  const initialMs = Date.now() - start;
  const baselineRequests = historyRequests;
  const repeats: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.getByRole('navigation').getByRole('button', { name: 'Panel', exact: true }).click();
    const started = Date.now();
    await history.click();
    await expect(page.getByText(/Performance fixture history 0(?!\d)/)).toBeVisible();
    repeats.push(Date.now() - started);
  }
  expect(historyRequests).toBe(baselineRequests);
  expect(historyRanges).toEqual(['0-20']);
  expect(dashboardFiltered).toBe(true);
  await page.getByRole('button', { name: 'Cargar sesiones anteriores' }).click();
  await expect(page.getByText(/Performance fixture history 20(?!\d)/)).toBeVisible();
  expect(historyRanges).toEqual(['0-20', '20-40']);
  await expect(page.getByRole('button', { name: 'Cargar sesiones anteriores' })).toHaveCount(0);
  await page.getByRole('navigation').getByRole('button', { name: 'Panel', exact: true }).click();
  await history.click();
  await expect(page.getByText(/Performance fixture history 20(?!\d)/)).toBeVisible();
  expect(historyRanges).toEqual(['0-20', '20-40']);
  expect(externalFonts).toEqual([]);
  expect(await page.getByRole('navigation').locator('svg').count()).toBeGreaterThanOrEqual(4);
  expect(await page.evaluate(() => (window as any).loginFlashed)).toBe(false);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kinetic.activeSession')!).performanceData.exercise[1])).toMatchObject({ captured: true, actualReps: 8, actualWeight: 20 });
  console.log(JSON.stringify({ initialMs, repeatHistoryMs: repeats, pageRanges: historyRanges, latency: '1500ms simulated history response' }));
});
