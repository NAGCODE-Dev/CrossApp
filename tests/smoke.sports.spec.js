// @ts-check
import { test, expect } from '@playwright/test';
import { installAthleteAuthenticatedRoutes } from './helpers/athleteApiMocks.js';

test('running shell renderiza login limpo', async ({ page }) => {
  await page.goto('/sports/running/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/Ryxen Running/i);
  await expect(page.getByRole('heading', { name: /Corrida com feed do coach/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Entrar no Running/i })).toBeVisible();
});

test('running shell autenticada renderiza feed e histórico da modalidade', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ryxen-auth-token', 'athlete-token');
    localStorage.setItem(
      'ryxen-user-profile',
      JSON.stringify({
        id: 'athlete-running-1',
        email: 'athlete@example.com',
        name: 'Athlete Demo',
      }),
    );
  });
  await installAthleteAuthenticatedRoutes(page);

  await page.goto('/sports/running/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Sessão: Athlete Demo')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Corrida com feed do coach/i })).toBeVisible();
  await expect(page.getByText(/Longão Progressivo/i).first()).toBeVisible();
  await expect(page.getByText(/12 km/i).first()).toBeVisible();

  await page.getByRole('button', { name: /Registrar este treino/i }).first().click();
  await expect(page.locator('#running-logForm [name="title"]')).toHaveValue(/Longão Progressivo/);
  await expect(page.locator('#running-logForm [name="sessionType"]')).toHaveValue(/long/i);
  await expect(page.getByText(/Treino do coach carregado no formulário/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Registrar treino do coach/i })).toBeVisible();
  await page.getByRole('button', { name: /Registrar treino do coach/i }).click();
  await expect(page.getByText(/Sessão de corrida registrada/i)).toBeVisible();
});

test('strength shell autenticada renderiza feed e histórico da modalidade', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ryxen-auth-token', 'athlete-token');
    localStorage.setItem(
      'ryxen-user-profile',
      JSON.stringify({
        id: 'athlete-strength-1',
        email: 'athlete@example.com',
        name: 'Athlete Demo',
      }),
    );
  });
  await installAthleteAuthenticatedRoutes(page);

  await page.goto('/sports/strength/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/Ryxen Strength/i);
  await expect(page.getByText('Sessão: Athlete Demo')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Força e musculação com feed do coach/i })).toBeVisible();
  await expect(page.getByText(/Back Squat/i).first()).toBeVisible();
  await expect(page.getByText(/120 kg/i).first()).toBeVisible();

  await page.getByRole('button', { name: /Registrar este treino/i }).first().click();
  await expect(page.locator('#strength-logForm [name="exercise"]')).toHaveValue(/Back Squat/);
  await expect(page.locator('#strength-logForm [name="repsText"]')).toHaveValue('5');
  await expect(page.getByText(/Treino do coach carregado no formulário/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Registrar treino do coach/i })).toBeVisible();
  await page.getByRole('button', { name: /Registrar treino do coach/i }).click();
  await expect(page.getByText(/Sessão de força registrada/i)).toBeVisible();
});
