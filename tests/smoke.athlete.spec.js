// @ts-check
import { test, expect } from '@playwright/test';

test('athlete react shell renders today pilot cleanly', async ({ page }) => {
  await page.goto('/athlete/', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/Ryxen Athlete/i);
  await expect(page.getByText('Editorial Today')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Importar plano/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: /Abrir legado/i })).toBeVisible({ timeout: 15000 });
});
