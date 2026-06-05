import { expect, type Browser, type Page, test } from '@playwright/test';

type LoadUser = {
  email: string;
  password: string;
  routineName: string;
  forbiddenRoutineNames: string[];
};

const users: LoadUser[] = Array.from({ length: 5 }, (_, index) => {
  const userNumber = index + 1;
  const emailEnvName = userNumber === 1 ? 'E2E_USER_EMAIL' : `E2E_USER${userNumber}_EMAIL`;
  const passwordEnvName = userNumber === 1 ? 'E2E_USER_PASSWORD' : `E2E_USER${userNumber}_PASSWORD`;

  return {
    email: process.env[emailEnvName] ?? '',
    password: process.env[passwordEnvName] ?? '',
    routineName: `E2E Carga Usuario ${userNumber}`,
    forbiddenRoutineNames: Array.from({ length: 5 }, (_, forbiddenIndex) => forbiddenIndex + 1)
      .filter((forbiddenNumber) => forbiddenNumber !== userNumber)
      .map((forbiddenNumber) => `E2E Carga Usuario ${forbiddenNumber}`),
  };
});

const requiredEnvVars = [
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_USER2_EMAIL',
  'E2E_USER2_PASSWORD',
  'E2E_USER3_EMAIL',
  'E2E_USER3_PASSWORD',
  'E2E_USER4_EMAIL',
  'E2E_USER4_PASSWORD',
  'E2E_USER5_EMAIL',
  'E2E_USER5_PASSWORD',
];

const login = async (page: Page, user: LoadUser) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: /iniciar sesi/i }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 25_000 });
};

const exerciseGeneralNavigation = async (page: Page) => {
  await page.getByRole('button', { name: 'PANEL', exact: true }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /ver todas/i }).click();
  await expect(page.getByText(/rutinas|crear nueva rutina/i).first()).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /historial/i }).click();
  await expect(page.locator('main')).toBeVisible();

  await page.getByRole('button', { name: 'PANEL', exact: true }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 20_000 });
};

const openLargeRoutine = async (page: Page, user: LoadUser) => {
  await expect(page.getByText(user.routineName).first()).toBeVisible({ timeout: 25_000 });
  for (const forbiddenName of user.forbiddenRoutineNames) {
    await expect(page.getByText(forbiddenName)).toHaveCount(0);
  }

  await page.getByText(user.routineName).first().click();
  await expect(page.getByRole('heading', { name: user.routineName })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('24').first()).toBeVisible();
};

const startWorkoutAndUseSession = async (page: Page) => {
  const startButton = page.getByRole('button', { name: /iniciar entrenamiento/i });

  if (!(await startButton.isEnabled().catch(() => false))) {
    const dayButton = page.getByRole('button', { name: /01.*dia/i }).first();
    await expect(dayButton).toBeVisible();
    await dayButton.click();
  }

  await expect(startButton).toBeEnabled();
  await startButton.click();

  const firstSet = page.getByRole('button', { name: /set 1/i }).first();
  await expect(firstSet).toBeVisible({ timeout: 25_000 });
  await firstSet.click();

  const inputs = page.locator('input[inputmode="decimal"]');
  await expect(inputs).toHaveCount(2);
  await inputs.nth(0).fill('10');
  await inputs.nth(1).fill('25');
  await page.getByRole('button', { name: /confirmar/i }).click();

  await expect(page.getByText(/1\/3 sets/i).first()).toBeVisible({ timeout: 20_000 });

  const skipButton = page.getByRole('button', { name: /^saltear$/i }).first();
  await expect(skipButton).toBeVisible();
  await skipButton.click();
  await expect(page.getByRole('button', { name: /^salteado$/i }).first()).toBeVisible();

  await page.getByRole('button', { name: /cancelar entrenamiento/i }).click();
  await page.getByRole('button', { name: /s.*cancelar/i }).click();
  await expect(page.getByRole('button', { name: /iniciar entrenamiento|selecciona un d/i })).toBeVisible({ timeout: 20_000 });
};

test.describe('concurrencia de 5 usuarios', () => {
  test.skip(
    requiredEnvVars.some((name) => !process.env[name]),
    `Configura ${requiredEnvVars.join(', ')} para ejecutar este test.`,
  );

  test('5 usuarios usan la app e inician entrenamientos en simultaneo', async ({ browser }: { browser: Browser }) => {
    test.setTimeout(120_000);

    const contexts = await Promise.all(users.map(() => browser.newContext()));

    try {
      const pages = await Promise.all(contexts.map((context) => context.newPage()));

      await Promise.all(pages.map((page, index) => login(page, users[index])));
      await Promise.all(pages.map((page) => exerciseGeneralNavigation(page)));
      await Promise.all(pages.map((page, index) => openLargeRoutine(page, users[index])));
      await Promise.all(pages.map((page) => startWorkoutAndUseSession(page)));
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});
