import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

test('restored login and repeated history visits under controlled latency', async ({ page }) => {
  const userId = '00000000-0000-4000-8000-000000000001';
  let historyRequests = 0;
  await page.route('**/*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').at(-1);
    let body: unknown = [];
    if (table === 'profiles') body = { id: userId, full_name: 'Performance fixture', unit_system: 'kg' };
    if (table === 'user_preferences') body = { user_id: userId, theme: 'dark', language: 'es' };
    if (table === 'routine_sessions' && url.searchParams.has('id')) {
      body = { id: 'active-fixture', routine_id: 'routine-fixture', status: 'in_progress' };
    } else if (table === 'routine_sessions') {
      historyRequests++;
      await new Promise(resolve => setTimeout(resolve, 1500));
      body = [{ id: 'fixture-session', started_at: '2026-10-20T10:00:00Z', ended_at: '2026-10-20T11:00:00Z', routine_name_snapshot: 'Performance fixture history', session_day_logs: [] }];
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
  await expect(page.getByText('Performance fixture history', { exact: false })).toBeVisible();
  const initialMs = Date.now() - start;
  const baselineRequests = historyRequests;
  const repeats: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.getByRole('navigation').getByRole('button', { name: 'Panel', exact: true }).click();
    const started = Date.now();
    await history.click();
    await expect(page.getByText('Performance fixture history', { exact: false })).toBeVisible();
    repeats.push(Date.now() - started);
  }
  expect(historyRequests).toBe(baselineRequests);
  expect(await page.evaluate(() => (window as any).loginFlashed)).toBe(false);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kinetic.activeSession')!).performanceData.exercise[1])).toMatchObject({ captured: true, actualReps: 8, actualWeight: 20 });
  console.log(JSON.stringify({ initialMs, repeatHistoryMs: repeats, extraHistoryRequests: historyRequests - baselineRequests, latency: '1500ms simulated history response' }));
});
