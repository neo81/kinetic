import { expect, test } from '@playwright/test';

test('la app carga sin pantalla en blanco ni errores criticos', async ({ page }) => {
  const consoleErrors: string[] = [];
  const externalFonts: string[] = [];
  page.on('request', request => {
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request.url())) externalFonts.push(request.url());
  });

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
  await page.evaluate(() => document.fonts.ready);
  expect(externalFonts).toEqual([]);

  const rootBox = await page.locator('#root').boundingBox();
  expect(rootBox?.width ?? 0).toBeGreaterThan(300);
  expect(rootBox?.height ?? 0).toBeGreaterThan(300);

  const criticalErrors = consoleErrors.filter((error) => {
    const normalized = error.toLowerCase();
    return !normalized.includes('favicon') && !normalized.includes('manifest');
  });

  expect(criticalErrors).toEqual([]);
});
