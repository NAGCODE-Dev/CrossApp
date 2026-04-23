// @ts-check
import { test, expect } from '@playwright/test';

import {
  BSB_ACCEPTED_IMPORTS,
  BSB_IMPOSSIBLE_IMPORT,
  CLEAN_TEXT_IMPORT,
  PIXEL_7_PROFILE,
  REAL_PRS_FIXTURE,
  bottomNavButton,
  fulfillJson,
  importWorkoutAndSave,
  installAthleteAuthenticatedRoutes,
  installCoachDashboardRoutes,
  openAthleteImportModal,
  uploadFromUniversalPicker,
  waitForAthleteReady,
} from './helpers/productHardening.js';

test.describe('athlete hardening', () => {
  test.use(PIXEL_7_PROFILE);

  test('navega, importa treino, abre vídeo uma vez, importa/exporta PRs e exporta backup', async ({ page, context }) => {
    test.setTimeout(90000);

    await waitForAthleteReady(page);

    const bootMetrics = await page.evaluate(() => window.__RYXEN_BOOT_METRICS__);
    expect(bootMetrics?.summary?.ui_mounted ?? 99999).toBeLessThan(3500);
    expect(bootMetrics?.summary?.loading_hidden ?? 99999).toBeLessThan(4000);

    await importWorkoutAndSave(page, CLEAN_TEXT_IMPORT);

    const workoutBlockCount = await page.locator('.workout-block').count();
    expect(workoutBlockCount).toBeGreaterThan(0);

    const popupPromise = context.waitForEvent('page');
    await expect(page.locator('.exercise-helpBtn').first()).toBeVisible();
    await page.locator('.exercise-helpBtn').first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    expect(popup.url()).toContain('youtube.com');
    await page.waitForTimeout(600);
    expect(context.pages().filter((entry) => entry !== page).length).toBe(1);
    expect(page.url()).toContain('/sports/cross/index.html');
    await popup.close().catch(() => {});

    for (let step = 0; step < 12; step += 1) {
      await page.mouse.wheel(0, 1800);
    }
    for (let step = 0; step < 12; step += 1) {
      await page.mouse.wheel(0, -1800);
    }

    await bottomNavButton(page, 'Evolução').click();
    await page.waitForFunction(() => document.body?.dataset.page === 'history');
    await expect(page.getByRole('heading', { name: 'Evolução' })).toBeVisible();

    await page.getByRole('button', { name: 'PRs' }).click();
    const prsModal = page.locator('.modal-overlay.isOpen');
    await expect(prsModal.getByPlaceholder('Buscar exercício...')).toBeVisible();

    const prsChooserPromise = page.waitForEvent('filechooser');
    await prsModal.getByRole('button', { name: /Importar arquivo/i }).click();
    const prsChooser = await prsChooserPromise;
    await prsChooser.setFiles(REAL_PRS_FIXTURE);

    const backSquatInput = prsModal.locator('input[data-exercise="BACK SQUAT"]');
    await expect(backSquatInput).toHaveValue('146');

    const prDownloadPromise = page.waitForEvent('download');
    await prsModal.getByRole('button', { name: /^Exportar$/ }).click();
    const prDownload = await prDownloadPromise;
    expect(prDownload.suggestedFilename()).toMatch(/\.json$/i);

    await prsModal.getByRole('button', { name: /Salvar tudo/i }).click();
    await expect(page.locator('.ui-toastShow')).toContainText(/PRs salvos|salvos/i);

    await bottomNavButton(page, 'Conta').click();
    await page.waitForFunction(() => document.body?.dataset.page === 'account');

    await page.getByRole('button', { name: 'Dados' }).click();
    const backupDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Fazer backup/i }).click();
    const backupDownload = await backupDownloadPromise;
    expect(backupDownload.suggestedFilename()).toMatch(/backup/i);
  });

  test('aceita screenshots difíceis, rejeita impossível com recuperação da UI e segue navegável', async ({ page }) => {
    test.setTimeout(120000);

    await waitForAthleteReady(page);

    for (const fixture of BSB_ACCEPTED_IMPORTS) {
      await openAthleteImportModal(page);
      await uploadFromUniversalPicker(page, fixture);
      await expect(page.getByText('Preview da importação')).toBeVisible({ timeout: 25000 });
      await page.getByRole('button', { name: /Descartar preview/i }).click();
      await page.waitForFunction(() => !document.querySelector('.import-reviewCard'));
    }

    await openAthleteImportModal(page);
    await uploadFromUniversalPicker(page, BSB_IMPOSSIBLE_IMPORT);
    await page.waitForTimeout(2500);
    await page.waitForFunction(() => {
      const loading = document.getElementById('loading-screen');
      return !!loading && (loading.hidden === true || loading.getAttribute('aria-hidden') === 'true');
    }, null, { timeout: 8000 });

    const openModal = page.locator('.modal-overlay.isOpen');
    if (await openModal.count()) {
      await openModal.locator('.modal-close').click();
    }

    await bottomNavButton(page, 'Conta').click();
    await page.waitForFunction(() => document.body?.dataset.page === 'account');
    await expect(page.getByRole('button', { name: 'Preferências' })).toBeVisible();
  });

  test('entra sem senha com grant confiável salvo no aparelho', async ({ page }) => {
    await page.addInitScript(() => {
      const deviceId = 'device-playwright-trusted';
      const email = 'trusted@example.com';
      localStorage.setItem('ryxen-trusted-device-id', deviceId);
      localStorage.setItem('ryxen-last-auth-email', email);
      localStorage.setItem('ryxen-trusted-device-map', JSON.stringify({
        [email]: {
          deviceId,
          trustedToken: 'trusted-token-demo',
          expiresAt: '2099-01-01T00:00:00.000Z',
          label: 'browser:playwright',
        },
      }));
    });

    await page.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname.replace(/^\/api/, '');
      if (pathname === '/auth/trusted-device/signin') {
        return fulfillJson(route, {
          token: 'token-trusted',
          user: {
            id: 'user-trusted',
            email: 'trusted@example.com',
            name: 'Trusted User',
          },
        });
      }
      return fulfillJson(route, {});
    });

    await waitForAthleteReady(page);
    await page.locator('button[data-modal="auth"]').first().click();

    await expect(page.locator('#auth-email')).toHaveValue('trusted@example.com');
    await expect(page.getByRole('button', { name: /Entrar sem senha neste aparelho/i })).toBeVisible();

    await page.getByRole('button', { name: /Entrar sem senha neste aparelho/i }).click();
    await page.waitForFunction(() => !document.querySelector('.modal-overlay.isOpen'));

    await expect(page.locator('.header-account-btn.isActive')).toContainText(/Trusted User|trusted@example\.com/i);
  });

  test('faz login com email, hidrata conta e histórico, atualiza sessão e sai sem quebrar o app', async ({ page }) => {
    test.setTimeout(90000);

    await installAthleteAuthenticatedRoutes(page);
    await waitForAthleteReady(page);

    await page.locator('button[data-modal="auth"]').first().click();
    await expect(page.locator('#auth-email')).toBeVisible();

    await page.locator('#auth-email').fill('athlete@example.com');
    await page.locator('#auth-password').fill('12345678');
    await page.locator('.auth-submitButton[data-mode="signin"]').click();
    await page.waitForFunction(() => !document.querySelector('.modal-overlay.isOpen'));
    await expect(page.locator('.header-account-btn.isActive')).toContainText(/Athlete Demo|athlete@example\.com/i);

    await bottomNavButton(page, 'Conta').click();
    await page.waitForFunction(() => document.body?.dataset.page === 'account');
    await expect(page.getByRole('heading', { name: 'Athlete Demo' })).toBeVisible();
    await expect(page.getByText(/athlete@example\.com/i)).toBeVisible();
    await expect(page.getByText(/liberado na conta do atleta/i)).toBeVisible();

    await page.getByRole('button', { name: 'Atualizar' }).click();
    await expect(page.locator('.ui-toastShow')).toContainText(/Sessão atualizada/i);

    await bottomNavButton(page, 'Evolução').click();
    await page.waitForFunction(() => document.body?.dataset.page === 'history');
    await expect(page.getByRole('heading', { name: 'Evolução' })).toBeVisible();
    await expect(page.getByText('Fran')).toBeVisible();
    await expect(page.getByText(/Back Squat/i)).toBeVisible();

    await bottomNavButton(page, 'Conta').click();
    await page.waitForFunction(() => document.body?.dataset.page === 'account');
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' }).last()).toBeVisible();
  });

  test('Nyx conduz um tour real abrindo Hoje, Evolução e Conta passo a passo', async ({ page }) => {
    test.setTimeout(90000);

    await waitForAthleteReady(page);
    await importWorkoutAndSave(page, CLEAN_TEXT_IMPORT);

    const consentBanner = page.locator('#consent-banner');
    if (await consentBanner.isVisible().catch(() => false)) {
      await consentBanner.getByRole('button', { name: /Aceitar|Recusar/i }).first().click();
    }

    await page.getByRole('button', { name: /Tour com Nyx/i }).click();
    await expect(page.locator('#nyx-guide-shell')).toBeVisible();
    await expect(page.locator('.guide-progressLabel')).toContainText('Passo 1');

    await page.getByRole('button', { name: 'Começar' }).click();
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'today-overview');
    await page.waitForFunction(() => document.body?.dataset.page === 'today');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'today-workout');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'today-import');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.page === 'history');
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'history-benchmarks');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'history-prs');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.page === 'account');
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'account-access');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'account-coach');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'account-preferences');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'account-data');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForFunction(() => document.body?.dataset.guideTarget === 'today-overview');
    await page.getByRole('button', { name: /Entrar no app/i }).click();
    await page.waitForFunction(() => !document.querySelector('.modal-overlay.isOpen'));
    await expect(page.locator('[data-guide-target="today-overview"]')).toBeVisible();
  });
});

test.describe('coach hardening', () => {
  test('coach entra pelo formulário, carrega o workspace e pode sair com segurança', async ({ page }) => {
    await installCoachDashboardRoutes(page, { allowSignin: true, startsActive: true });

    await page.goto('/coach/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Ryxen Coach/i);
    await expect(page.getByRole('heading', { name: /Coach Portal/i })).toBeVisible();

    await page.getByPlaceholder('Email').fill('admin@example.com');
    await page.getByPlaceholder('Senha').fill('12345678');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Coach Admin')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Operação de BSB Strong' })).toBeVisible();
    await expect(page.getByText(/Acesso coach ativo/i)).toBeVisible();
    await expect(page.getByLabel('Seções do portal').getByRole('button', { name: 'Visão geral' })).toBeVisible();

    await page.getByLabel('Seções do portal').getByRole('button', { name: 'Operação' }).click();
    await expect(page.getByRole('heading', { name: 'Estrutura do box' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar gym' })).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('heading', { name: /Coach Portal/i })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
  });

  test('portal do coach trata HTML inválido sem quebrar o parse JSON', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ryxen-auth-token', 'coach-token');
      localStorage.setItem('ryxen-user-profile', JSON.stringify({
        id: 'coach-1',
        email: 'admin@example.com',
        name: 'Coach Admin',
        isAdmin: true,
      }));
    });

    await installCoachDashboardRoutes(page, { failWithHtml: true });

    await page.goto('/coach/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Ryxen Coach/i);
    await expect(page.getByText(/Resposta inesperada do servidor/i)).toBeVisible();
  });

  test('coach aceita ativação local para admin e lê link coach a partir do plano pro da Kiwify', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ryxen-auth-token', 'coach-token');
      localStorage.setItem('ryxen-user-profile', JSON.stringify({
        id: 'coach-2',
        email: 'admin@example.com',
        name: 'Coach Admin',
        isAdmin: true,
      }));
      localStorage.setItem('ryxen-runtime-config', JSON.stringify({
        billing: {
          provider: 'kiwify_link',
          links: {
            starter: 'https://example.com/starter-plan',
            pro: 'https://example.com/pro-plan',
            performance: 'https://example.com/performance-plan',
          },
        },
      }));
    });

    await installCoachDashboardRoutes(page, { failWithHtml: false });

    await page.goto('/coach/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Ativar local' })).toBeVisible();

    await page.locator('.billing-bannerActions').getByRole('button', { name: 'Abrir cobrança', exact: true }).click();
    await page.waitForURL('https://example.com/pro-plan', { timeout: 10000 });

    await page.goto('/coach/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Ativar local' })).toBeVisible();

    await page.getByRole('button', { name: 'Ativar local' }).click();
    await expect(page.getByText(/Acesso local liberado/i)).toBeVisible();
    await expect(page.getByText(/Acesso coach ativo/i)).toBeVisible();
  });
});
