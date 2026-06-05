import { expect, test } from '@playwright/test';

test('la app carga sin pantalla en blanco ni errores criticos', async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('/');

  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('#root')).not.toBeEmpty();

  await page.waitForLoadState('networkidle');

  const rootBox = await page.locator('#root').boundingBox();
  expect(rootBox?.width ?? 0).toBeGreaterThan(300);
  expect(rootBox?.height ?? 0).toBeGreaterThan(300);

  const criticalErrors = consoleErrors.filter((error) => {
    const normalized = error.toLowerCase();
    return !normalized.includes('favicon') && !normalized.includes('manifest');
  });

  expect(criticalErrors).toEqual([]);
});
