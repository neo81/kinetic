import { expect, type Browser, type Page, test } from '@playwright/test';

type FinalizationUser = {
  email: string;
  password: string;
  routineName: string;
};

const users: FinalizationUser[] = Array.from({ length: 5 }, (_, index) => {
  const number = index + 1;
  return {
    email: process.env[number === 1 ? 'E2E_USER_EMAIL' : `E2E_USER${number}_EMAIL`] ?? '',
    password: process.env[number === 1 ? 'E2E_USER_PASSWORD' : `E2E_USER${number}_PASSWORD`] ?? '',
    routineName: `E2E Finalizacion Usuario ${number}`,
  };
});

const requiredEnvVars = [
  'E2E_USER_EMAIL', 'E2E_USER_PASSWORD',
  'E2E_USER2_EMAIL', 'E2E_USER2_PASSWORD',
  'E2E_USER3_EMAIL', 'E2E_USER3_PASSWORD',
  'E2E_USER4_EMAIL', 'E2E_USER4_PASSWORD',
  'E2E_USER5_EMAIL', 'E2E_USER5_PASSWORD',
];

const loginAndOpenRoutine = async (page: Page, user: FinalizationUser) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: /iniciar sesi/i }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: /ver todas/i }).click();
  await expect(page.getByText(user.routineName).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(user.routineName).first().click();
  await expect(page.getByRole('heading', { name: user.routineName })).toBeVisible({ timeout: 30_000 });
};

const startSession = async (page: Page) => {
  const dayButton = page.getByRole('button', { name: /01.*dia finalizacion/i });
  await expect(dayButton).toBeVisible();
  await dayButton.click();

  const startButton = page.getByRole('button', { name: /iniciar entrenamiento/i });
  await expect(startButton).toBeEnabled();
  await startButton.click();
  await expect(page.getByRole('button', { name: /finalizar entrenamiento/i })).toBeVisible({ timeout: 30_000 });
};

const captureAllSets = async (page: Page) => {
  const setButtons = page.getByRole('button', { name: /set \d+.*kg/i });
  await expect(setButtons).toHaveCount(50, { timeout: 30_000 });

  for (let index = 0; index < 50; index += 1) {
    await setButtons.nth(index).click();
    await expect(page.getByRole('button', { name: /^confirmar$/i })).toBeVisible();
    await page.getByRole('button', { name: /^confirmar$/i }).click();
  }

  await expect(page.getByText(/5\/5 sets/i)).toHaveCount(10, { timeout: 30_000 });
};

const finalizeAndVerifyHistory = async (page: Page, user: FinalizationUser) => {
  await page.getByRole('button', { name: /finalizar entrenamiento/i }).click();
  await page.getByRole('button', { name: /finalizar ahora/i }).click();

  await expect(page.getByText(/entrenamiento finalizado/i).first()).toBeVisible({ timeout: 90_000 });
  await page.getByRole('button', { name: 'HISTORIAL', exact: true }).click();
  await expect(page.getByRole('heading', { name: /historial/i })).toBeVisible({ timeout: 30_000 });

  const historyEntry = page.getByRole('button').filter({ hasText: user.routineName }).first();
  await expect(historyEntry).toBeVisible({ timeout: 60_000 });
  await expect(historyEntry).toContainText('10');
};

test.describe('finalizacion concurrente de rutinas grandes', () => {
  test.skip(
    requiredEnvVars.some((name) => !process.env[name]),
    `Configura ${requiredEnvVars.join(', ')} para ejecutar este test.`,
  );

  test('5 usuarios finalizan 50 series cada uno y ven el historial', async ({ browser }: { browser: Browser }) => {
    test.setTimeout(600_000);

    const contexts = await Promise.all(users.map(() => browser.newContext()));
    try {
      const pages = await Promise.all(contexts.map((context) => context.newPage()));

      await Promise.all(pages.map((page, index) => loginAndOpenRoutine(page, users[index])));
      await Promise.all(pages.map((page) => startSession(page)));
      await Promise.all(pages.map((page) => captureAllSets(page)));
      await Promise.all(pages.map((page, index) => finalizeAndVerifyHistory(page, users[index])));
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});
