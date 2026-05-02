// @ts-check
import path from 'node:path';
import { devices, expect } from '@playwright/test';

const IMPORT_FIXTURES_DIR = path.join(process.cwd(), '__tests__', 'fixtures', 'imports');

export const CLEAN_TEXT_IMPORT = path.join(IMPORT_FIXTURES_DIR, 'treino-exemplo.txt');
export const BSB_ACCEPTED_IMPORTS = [
  path.join(IMPORT_FIXTURES_DIR, 'treino-bsb-clean.png'),
  path.join(IMPORT_FIXTURES_DIR, 'treino-bsb-cropped.png'),
  path.join(IMPORT_FIXTURES_DIR, 'treino-bsb-low-contrast.png'),
  path.join(IMPORT_FIXTURES_DIR, 'treino-bsb-tilted.png'),
];
export const BSB_IMPOSSIBLE_IMPORT = path.join(IMPORT_FIXTURES_DIR, 'treino-bsb-impossivel.png');
export const REAL_PRS_FIXTURE = path.join(IMPORT_FIXTURES_DIR, 'prs-real-legacy.json');
export const PIXEL_7_PROFILE = (({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, colorScheme }) => ({
  viewport,
  userAgent,
  deviceScaleFactor,
  isMobile,
  hasTouch,
  colorScheme,
}))(devices['Pixel 7']);

export function fulfillJson(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function dismissOptionalConsentBanner(page) {
  const banner = page.locator('#consent-banner');
  const isVisible = await banner.isVisible().catch(() => false);
  if (!isVisible) return;

  const dismissButton = banner.getByRole('button', { name: /Recusar|Aceitar/i }).first();
  await dismissButton.click();
  await expect(banner).toBeHidden();
}

export async function waitForAthleteReady(page) {
  await page.addInitScript(() => {
    localStorage.setItem('ryxen-consent', JSON.stringify({ telemetry: true }));
  });
  await page.goto('/sports/cross/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body?.dataset.page === 'today');
  await page.waitForFunction(() => {
    const loading = document.getElementById('loading-screen');
    return !!loading && (loading.hidden === true || loading.getAttribute('aria-hidden') === 'true');
  }, null, { timeout: 8000 });
  await dismissOptionalConsentBanner(page);
}

export async function openAthleteImportModal(page) {
  const existingHeading = page.getByRole('heading', { name: /Adicionar treino/i });
  if (await existingHeading.count()) {
    const isVisible = await existingHeading.first().isVisible().catch(() => false);
    if (isVisible) return;
  }
  const trigger = page.locator('button[data-modal="import"]').first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole('heading', { name: /Adicionar treino/i })).toBeVisible();
}

export async function uploadFromUniversalPicker(page, filePath) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Imagem(, vídeo, planilha)? ou texto/i }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(filePath);
}

export async function importWorkoutAndSave(page, filePath) {
  await openAthleteImportModal(page);
  await uploadFromUniversalPicker(page, filePath);
  await expect(page.getByText('Preview da importação')).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: /Salvar importação/i }).click();
  await page.waitForFunction(() => !document.querySelector('.modal-overlay.isOpen'));
  await page.waitForFunction(() => document.body?.dataset.page === 'today');
}

export function bottomNavButton(page, label) {
  return page.locator('.bottom-nav .nav-btn').filter({ hasText: label }).first();
}
