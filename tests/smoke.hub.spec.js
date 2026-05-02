// @ts-check
import { test, expect } from '@playwright/test';

test('landing shows official wordmark and balanced product shots', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Ryxen/i);
  await expect(page.locator('img.hub-wordmark[alt="Ryxen"]')).toBeVisible();

  const coachShot = page.locator('img[alt*="Coach Portal do Ryxen"]');
  await expect(coachShot).toBeVisible();
  await expect.poll(async () => coachShot.evaluate((img) => img.naturalWidth)).toBeGreaterThan(1000);
  await expect.poll(async () => coachShot.evaluate((img) => img.naturalHeight)).toBeGreaterThan(700);

  const coachSize = await coachShot.evaluate((img) => ({
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  }));

  expect(coachSize.naturalWidth).toBeGreaterThan(1000);
  expect(coachSize.naturalHeight).toBeGreaterThan(700);
});
