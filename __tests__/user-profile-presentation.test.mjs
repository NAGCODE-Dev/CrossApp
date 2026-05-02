import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderAccountProfileSection,
  renderAccountSyncSection,
} from '../apps/athlete/features/account/memberSections.js';
import { renderAthleteAccountPage } from '../apps/athlete/features/account/page.js';
import { getAttendanceDisplayLabel } from '../backend/src/userProfiles.js';

test('getAttendanceDisplayLabel respeita preferência de exibição', () => {
  assert.equal(getAttendanceDisplayLabel({
    display_name: 'Nikolas Alves',
    attendance_display: 'display_name',
  }), 'Nikolas Alves');

  assert.equal(getAttendanceDisplayLabel({
    display_name: 'Nikolas Alves',
    attendance_display: 'first_name',
  }), 'Nikolas');

  assert.equal(getAttendanceDisplayLabel({
    display_name: 'Nikolas Alves',
    attendance_display: 'anonymous',
  }), 'Participante');
});

test('renderAccountProfileSection mostra assinatura, gyms e coaches', () => {
  const html = renderAccountProfileSection(
    ({ content }) => content,
    {
      profile: { email: 'athlete@example.com' },
      planName: 'Athlete Plus',
      planStatus: 'active',
      escapeHtml: (value) => String(value),
      profileCard: {
        displayName: 'Nikolas',
        accountName: 'Nikolas Alves',
        email: 'athlete@example.com',
        handle: 'nikolas',
        avatarUrl: 'https://img.example.com/avatar.png',
        bio: 'Cross e corrida.',
        profileVisibility: 'members',
        attendanceDisplay: 'display_name',
        attendanceLabelPreview: 'Nikolas',
        gyms: [
          {
            gymName: 'Grupo RX',
            role: 'athlete',
            status: 'active',
            warning: null,
            coaches: [
              { displayName: 'Coach Ana' },
              { displayName: 'Coach Leo' },
            ],
          },
        ],
      },
    },
  );

  assert.match(html, /Athlete Plus • active/);
  assert.match(html, /Grupo RX/);
  assert.match(html, /Coach\(es\): Coach Ana, Coach Leo/);
  assert.match(html, /Salvar perfil/);
});

test('renderAccountSyncSection descreve fila offline e retry manual', () => {
  const html = renderAccountSyncSection(
    ({ content }) => content,
    {
      escapeHtml: (value) => String(value),
      syncStatus: {
        online: false,
        pendingAppState: true,
        pendingTotal: 3,
        pendingKinds: ['pr_snapshot', 'measurement_snapshot'],
        oldestPendingAt: '2026-05-02T08:45:00.000Z',
        activeItemKind: 'pr_snapshot',
        activeItemAction: 'retry',
        pendingItems: [
          {
            kind: 'pr_snapshot',
            label: 'PRs',
            count: 2,
            preview: 'squat, deadlift',
            detail: '2 movimento(s) aguardando sync: squat, deadlift',
            updatedAt: '2026-05-02T08:45:00.000Z',
            attempts: 3,
            lastFailedAt: '2026-05-02T09:00:00.000Z',
            lastFailureMessage: 'timeout',
            isOldest: true,
          },
          {
            kind: 'measurement_snapshot',
            label: 'Medidas',
            count: 1,
            preview: 'weight 82kg',
            detail: '1 medida(s) aguardando sync: weight 82kg',
            updatedAt: '2026-05-02T09:10:00.000Z',
            attempts: 0,
            lastFailedAt: '',
            lastFailureMessage: '',
            isOldest: false,
          },
        ],
        lastSyncAt: '2026-05-02T09:30:00.000Z',
        lastError: 'Timeout no backend',
        flushing: false,
      },
    },
  );

  assert.match(html, /Offline/);
  assert.match(html, /3 pendência\(s\) local\(is\)/);
  assert.match(html, /PRs pendentes • Medidas pendentes/);
  assert.match(html, /Na fila desde/);
  assert.match(html, /PRs • Mais antiga/);
  assert.match(html, /2 movimento\(s\) aguardando sync: squat, deadlift • na fila desde/);
  assert.match(html, /3 tentativa\(s\) falha\(s\)/);
  assert.match(html, /timeout/);
  assert.match(html, /já falhou várias vezes/);
  assert.match(html, /account-notificationCard is-danger/);
  assert.match(html, /1 medida\(s\) aguardando sync: weight 82kg • na fila desde/);
  assert.match(html, /Sincronizando item/);
  assert.match(html, /Descartar este item/);
  assert.match(html, /Timeout no backend/);
  assert.match(html, /Tentar sincronizar agora/);
});

test('renderAthleteAccountPage inclui a seção completa de sync na aba de dados', () => {
  const html = renderAthleteAccountPage({
    preferences: {},
    __ui: {
      accountView: 'data',
      auth: {
        profile: {
          email: 'athlete@example.com',
          name: 'Athlete Demo',
        },
      },
      coachPortal: {
        subscription: {
          plan: 'athlete_plus',
          status: 'active',
        },
        entitlements: [],
        gyms: [],
        gymAccess: [],
      },
      athleteOverview: {
        athleteBenefits: {
          source: 'personal',
          label: 'Liberado',
        },
        stats: {},
        recentResults: [],
        recentWorkouts: [],
        checkinSessions: [],
        measurements: [],
        runningHistory: [],
        strengthHistory: [],
        blocks: {},
      },
      syncStatus: {
        online: false,
        pendingAppState: true,
        pendingTotal: 3,
        pendingKinds: ['pr_snapshot', 'measurement_snapshot'],
        pendingItems: [],
        lastSyncAt: '',
        lastError: '',
        flushing: false,
      },
    },
  }, {
    renderPageHero: ({ eyebrow, title, description, actions }) => `${eyebrow}${title}${description}${actions || ''}`,
    renderPageFold: ({ title, subtitle, content }) => `<section><h2>${title}</h2><p>${subtitle}</p>${content}</section>`,
    formatDateShort: (value) => String(value || ''),
    escapeHtml: (value) => String(value ?? ''),
    platformVariant: 'native',
    describeAthleteBenefitSource: (value) => String(value?.label || value?.source || 'Conta local'),
    formatSubscriptionPlanName: (planKey) => String(planKey || 'Livre'),
    isDeveloperEmail: () => false,
    normalizeAthleteBenefits: (value) => value || {},
    getAthleteImportUsage: () => ({ unlimited: true, remaining: 0 }),
  });

  assert.match(html, /Seus dados/);
  assert.match(html, /Sincronizar agora/);
  assert.match(html, /Sincronização/);
  assert.match(html, /Rede, fila local e retry manual\./);
  assert.match(html, /Você está offline com 3 pendência\(s\) local\(is\)\./);
  assert.match(html, /PRs pendentes • Medidas pendentes/);
});
