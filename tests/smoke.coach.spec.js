// @ts-check
import { test, expect } from '@playwright/test';
import { installCoachDashboardRoutes } from './helpers/coachApiMocks.js';

test('coach login shell renders cleanly', async ({ page }) => {
  await page.goto('/coach/', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/Ryxen Coach/i);
  await expect(page.getByRole('heading', { name: /Coach Portal/i })).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Senha')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continuar com Google/i })).toBeVisible();
});

test('coach workspace smoke navega entre visão geral e operação', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ryxen-auth-token', 'coach-token');
    localStorage.setItem('ryxen-user-profile', JSON.stringify({
      id: 'coach-smoke-1',
      email: 'admin@example.com',
      name: 'Coach Admin',
      isAdmin: true,
    }));
  });
  await installCoachDashboardRoutes(page, { startsActive: true });

  await page.goto('/coach/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Coach Admin')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Operação de BSB Strong' })).toBeVisible();
  await expect(page.getByText(/Acesso coach ativo/i)).toBeVisible();

  const nav = page.getByLabel('Seções do portal');
  await expect(nav.getByRole('button', { name: 'Visão geral' })).toBeVisible();
  await nav.getByRole('button', { name: 'Operação' }).click();
  await expect(page.getByRole('heading', { name: 'Estrutura do box' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar gym' })).toBeVisible();
});

test('coach workspace smoke mostra erro amigável para HTML inesperado da API', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ryxen-auth-token', 'coach-token');
    localStorage.setItem('ryxen-user-profile', JSON.stringify({
      id: 'coach-smoke-2',
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
