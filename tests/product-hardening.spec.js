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

    await page.getByRole('button', { name: 'PRs', exact: true }).click();
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

    await page.getByRole('button', { name: 'Dados backup e documentos' }).click();
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
    await expect(page.getByText(/Conta reconhecida|Continuar neste aparelho/i)).toBeVisible();
    await expect(page.locator('[data-auth-password-shell]')).toBeHidden();
    await expect(page.getByRole('button', { name: /^Continuar$/i })).toBeVisible();

    await page.getByRole('button', { name: /^Continuar$/i }).click();
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
    await expect(page.getByRole('button', { name: /Fran/ })).toBeVisible();
    await expect(page.getByText(/Back Squat/i)).toBeVisible();

    await bottomNavButton(page, 'Conta').click();
    await page.waitForFunction(() => document.body?.dataset.page === 'account');
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' }).last()).toBeVisible();
  });

  test('mostra fila offline na conta e permite retry ou descarte por item', async ({ page, context }) => {
    test.setTimeout(90000);

    await installAthleteAuthenticatedRoutes(page);
    await waitForAthleteReady(page);

    await page.locator('button[data-modal="auth"]').first().click();
    await expect(page.locator('#auth-email')).toBeVisible();
    await page.locator('#auth-email').fill('athlete@example.com');
    await page.locator('#auth-password').fill('12345678');
    await page.locator('.auth-submitButton[data-mode="signin"]').click();
    await page.waitForFunction(() => !document.querySelector('.modal-overlay.isOpen'));

    await context.setOffline(true);
    await page.evaluate(() => {
      localStorage.setItem('ryxen-app-state-sync-v1', JSON.stringify({
        snapshot: {
          core: {
            currentDay: 'monday',
          },
        },
        updatedAt: '2026-05-02T09:00:00.000Z',
        pendingSync: true,
      }));
      localStorage.setItem('ryxen-sync-outbox-v1', JSON.stringify([
        {
          kind: 'pr_snapshot',
          payload: {
            squat: 145,
            deadlift: 190,
          },
          updatedAt: '2026-05-02T08:45:00.000Z',
          attempts: 3,
          lastFailedAt: '2026-05-02T08:55:00.000Z',
          lastFailureMessage: 'timeout',
        },
        {
          kind: 'measurement_snapshot',
          payload: [
            {
              type: 'weight',
              label: 'weight',
              value: 82,
              unit: 'kg',
            },
          ],
          updatedAt: '2026-05-02T08:50:00.000Z',
          attempts: 1,
          lastFailedAt: '2026-05-02T08:56:00.000Z',
          lastFailureMessage: 'gateway',
        },
      ]));
      window.dispatchEvent(new CustomEvent('ryxen:sync-status', { detail: {} }));
      window.dispatchEvent(new Event('offline'));
    });

    await bottomNavButton(page, 'Conta').click();
    await page.waitForFunction(() => document.body?.dataset.page === 'account');

    const syncSection = page.locator('.page-fold').filter({ hasText: 'Sincronização' }).first();
    await expect(syncSection).toContainText('Offline');
    await expect(syncSection).toContainText('Você está offline com 3 pendência(s) local(is).');
    await expect(syncSection).toContainText('PRs');
    await expect(syncSection).toContainText('Medidas');
    await expect(syncSection).toContainText('3 tentativa(s) falha(s)');
    await expect(syncSection).toContainText('timeout');
    await expect(syncSection).toContainText('já falhou várias vezes');
    await expect(syncSection).toContainText(/1 medida\(s\) aguardando sync/i);

    await page.getByRole('button', { name: 'Dados backup e documentos' }).click();
    const dataSummarySection = page.locator('.page-fold').filter({ hasText: 'Seus dados' }).first();
    await expect(dataSummarySection).toContainText('Offline');
    await expect(dataSummarySection).toContainText('3 item(ns) aguardando envio.');
    await expect(dataSummarySection.getByRole('button', { name: 'Sincronizar agora' })).toBeVisible();

    await page.getByRole('button', { name: 'Visão geral status e atividade' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await syncSection.getByRole('button', { name: 'Descartar este item' }).first().click();
    await expect(page.locator('.ui-toastShow')).toContainText(/Pendência removida da fila local/i);
    await expect(syncSection).toContainText('Você está offline com 2 pendência(s) local(is).');
    await expect(syncSection).not.toContainText('timeout');
    await expect(syncSection).not.toContainText('2 movimento(s) aguardando sync');
    await expect(syncSection).toContainText(/1 medida\(s\) aguardando sync/i);

    await context.setOffline(false);
    await expect(syncSection).toContainText('Tudo sincronizado');
    await expect(syncSection).toContainText('Sem itens pendentes na fila.');
    await page.evaluate(() => {
      localStorage.setItem('ryxen-sync-outbox-v1', JSON.stringify([
        {
          kind: 'measurement_snapshot',
          payload: [
            {
              type: 'weight',
              label: 'weight',
              value: 82,
              unit: 'kg',
            },
          ],
          updatedAt: '2026-05-02T09:05:00.000Z',
          attempts: 1,
          lastFailedAt: '2026-05-02T09:06:00.000Z',
          lastFailureMessage: 'sync unavailable',
        },
      ]));
      localStorage.setItem('ryxen-app-state-sync-v1', JSON.stringify({
        snapshot: {
          core: {
            currentDay: 'monday',
          },
        },
        updatedAt: '2026-05-02T09:00:00.000Z',
        pendingSync: false,
      }));
      window.dispatchEvent(new CustomEvent('ryxen:sync-status', { detail: {} }));
    });

    await expect(syncSection).toContainText('1 pendência(s) aguardando envio para a conta.');
    await expect(syncSection).toContainText('1 tentativa(s) falha(s)');
    await expect(syncSection).toContainText('sync unavailable');
    await expect(syncSection).toContainText('weight 82kg');

    await syncSection.getByRole('button', { name: 'Tentar só este item' }).first().click();
    await expect(page.locator('.ui-toastShow')).toContainText(/Item sincronizado/i);
    await expect(syncSection).toContainText('Tudo sincronizado');
    await expect(syncSection).toContainText('Última sincronização em');
    await expect(syncSection).toContainText('Sem itens pendentes na fila.');
    await expect(syncSection).not.toContainText('1 medida(s) aguardando sync');
  });

  test('Nyx conduz um tour real abrindo Hoje, Evolução e Conta passo a passo', async ({ page }) => {
    test.setTimeout(90000);

    await waitForAthleteReady(page);
    await importWorkoutAndSave(page, CLEAN_TEXT_IMPORT);
    await page.evaluate(() => {
      const root = document.getElementById('app') || document.body;
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.dataset.action = 'modal:open';
      trigger.dataset.modal = 'nyx-guide';
      trigger.dataset.guideStep = '0';
      trigger.hidden = true;
      root.appendChild(trigger);
      trigger.click();
    });
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
