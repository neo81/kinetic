import { expect, type Page, test } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

const loginAndOpenRoutine = async (page: Page) => {
  await page.goto('/');

  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.getByRole('button', { name: /iniciar sesi/i }).click();

  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'PANEL', exact: true }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /ver todas/i }).click();

  const routineCard = page.getByText('E2E Rutina Test').first();
  const noRoutines = page.getByText(/no tienes rutinas activas/i).first();

  await expect(routineCard.or(noRoutines)).toBeVisible({ timeout: 20_000 });
  test.skip(await noRoutines.isVisible(), 'El usuario E2E no tiene rutinas activas.');

  await routineCard.click();
  await expect(page.getByRole('heading', { name: 'E2E Rutina Test' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /iniciar entrenamiento|selecciona un d/i })).toBeVisible();
};

const startRoutineSession = async (page: Page) => {
  const startButton = page.getByRole('button', { name: /iniciar entrenamiento/i });
  if (!(await startButton.isEnabled().catch(() => false))) {
    const weekdayDay = page.getByRole('button', { name: /0[1-7].*dia/i }).first();
    await expect(weekdayDay).toBeVisible();
    await weekdayDay.click();
  }

  await expect(startButton).toBeEnabled();
  await startButton.click();
  await expect(page.getByRole('button', { name: /cancelar entrenamiento/i })).toBeVisible({ timeout: 20_000 });
};

const cancelRoutineSession = async (page: Page) => {
  await page.getByRole('button', { name: /cancelar entrenamiento/i }).click();
  await page.getByRole('button', { name: /cancelar/i }).last().click();
  await expect(page.getByRole('button', { name: /iniciar entrenamiento|selecciona un d/i })).toBeVisible({ timeout: 20_000 });
};

test.describe('flujo de rutina activa', () => {
  test.skip(!email || !password, 'Configura E2E_USER_EMAIL y E2E_USER_PASSWORD para ejecutar este flujo.');

  test('permite iniciar una rutina y marcar un ejercicio como salteado', async ({ page }) => {
    await loginAndOpenRoutine(page);
    await startRoutineSession(page);

    const skipButton = page.getByRole('button', { name: /^saltear$/i }).first();
    await expect(skipButton).toBeVisible({ timeout: 20_000 });
    await skipButton.click();

    await expect(page.getByRole('button', { name: /^salteado$/i }).first()).toBeVisible();

    await cancelRoutineSession(page);
  });

  test('permite capturar una serie realizada', async ({ page }) => {
    await loginAndOpenRoutine(page);
    await startRoutineSession(page);

    const setChip = page.getByRole('button', { name: /set 1/i }).first();
    await expect(setChip).toBeVisible({ timeout: 20_000 });
    await setChip.click();

    await expect(page.getByText(/set 1 de/i)).toBeVisible();

    const captureInputs = page.locator('input[inputmode="decimal"]');
    await expect(captureInputs).toHaveCount(2);
    await captureInputs.nth(0).fill('11');
    await captureInputs.nth(1).fill('21');
    await page.getByRole('button', { name: /confirmar/i }).click();

    await expect(page.getByText(/1\/2 sets/i)).toBeVisible({ timeout: 20_000 });

    await cancelRoutineSession(page);
  });
});
