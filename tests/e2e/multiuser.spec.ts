import { expect, type Browser, type Page, test } from '@playwright/test';

const userOne = {
  email: process.env.E2E_USER_EMAIL,
  password: process.env.E2E_USER_PASSWORD,
  ownRoutine: 'E2E Rutina Test',
  otherRoutine: 'E2E Rutina Usuario 2',
};

const userTwo = {
  email: process.env.E2E_USER2_EMAIL,
  password: process.env.E2E_USER2_PASSWORD,
  ownRoutine: 'E2E Rutina Usuario 2',
  otherRoutine: 'E2E Rutina Test',
};

type E2EUser = {
  email?: string;
  password?: string;
  ownRoutine: string;
  otherRoutine: string;
};

const login = async (page: Page, user: E2EUser) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(user.email!);
  await page.locator('input[type="password"]').fill(user.password!);
  await page.getByRole('button', { name: /iniciar sesi/i }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 20_000 });
};

const openOwnRoutine = async (page: Page, user: E2EUser) => {
  await page.getByRole('button', { name: 'PANEL', exact: true }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /ver todas/i }).click();
  await expect(page.getByText(user.ownRoutine).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(user.otherRoutine)).toHaveCount(0);
  await page.getByText(user.ownRoutine).first().click();
  await expect(page.getByRole('heading', { name: user.ownRoutine })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(user.otherRoutine)).toHaveCount(0);
};

const startAndCancelSession = async (page: Page) => {
  const startButton = page.getByRole('button', { name: /iniciar entrenamiento/i });

  if (!(await startButton.isEnabled().catch(() => false))) {
    const weekdayDay = page.getByRole('button', { name: /0[1-7].*dia/i }).first();
    await expect(weekdayDay).toBeVisible();
    await weekdayDay.click();
  }

  await expect(startButton).toBeEnabled();
  await startButton.click();

  await expect(page.getByRole('button', { name: /^saltear$/i }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /cancelar entrenamiento/i }).click();
  await page.getByRole('button', { name: /cancelar/i }).last().click();
  await expect(page.getByRole('button', { name: /iniciar entrenamiento|selecciona un d/i })).toBeVisible({ timeout: 20_000 });
};

test.describe('multiusuario', () => {
  test.skip(
    !userOne.email || !userOne.password || !userTwo.email || !userTwo.password,
    'Configura E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_USER2_EMAIL y E2E_USER2_PASSWORD.',
  );

  test('mantiene rutinas y sesiones aisladas entre dos usuarios concurrentes', async ({ browser }: { browser: Browser }) => {
    const [contextOne, contextTwo] = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);

    try {
      const [pageOne, pageTwo] = await Promise.all([
        contextOne.newPage(),
        contextTwo.newPage(),
      ]);

      await Promise.all([
        login(pageOne, userOne),
        login(pageTwo, userTwo),
      ]);

      await Promise.all([
        openOwnRoutine(pageOne, userOne),
        openOwnRoutine(pageTwo, userTwo),
      ]);

      await Promise.all([
        startAndCancelSession(pageOne),
        startAndCancelSession(pageTwo),
      ]);
    } finally {
      await Promise.all([
        contextOne.close(),
        contextTwo.close(),
      ]);
    }
  });
});
