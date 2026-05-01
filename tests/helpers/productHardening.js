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

function readRequestJson(request) {
  try {
    return request.postDataJSON();
  } catch {
    return {};
  }
}

export async function waitForAthleteReady(page) {
  await page.goto('/sports/cross/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body?.dataset.page === 'today');
  await page.waitForFunction(() => {
    const loading = document.getElementById('loading-screen');
    return !!loading && (loading.hidden === true || loading.getAttribute('aria-hidden') === 'true');
  }, null, { timeout: 8000 });
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
  await page.getByRole('button', { name: /Imagem, vídeo, planilha ou texto/i }).click();
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

function resolveAthleteApiMocks(pathname, request, state) {
  if (pathname === '/billing/status') {
    return {
      plan: state.subscription.plan,
      status: state.subscription.status,
      renewAt: state.subscription.renewAt,
    };
  }

  if (pathname === '/billing/entitlements') {
    return {
      entitlements: state.entitlements,
      gymAccess: [],
    };
  }

  if (pathname === '/gyms/me') {
    return { gyms: [] };
  }

  if (pathname === '/workouts/feed') {
    return {
      workouts: [
        {
          id: 'feed-1',
          title: 'Open Prep',
          gym_name: 'Ryxen Remote',
          sport_type: 'cross',
        },
      ],
    };
  }

  if (pathname === '/athletes/me/summary') {
    return {
      stats: {
        resultsLogged: 3,
      },
      athleteBenefits: {
        tier: 'athlete_plus',
        coachPlan: 'athlete_plus',
        source: 'personal',
        label: 'Liberado',
        planLabel: 'Atleta liberado',
        importsPerMonth: null,
        historyDays: null,
        premiumFeatures: true,
        inherited: false,
        personal: true,
        accessBlocked: false,
      },
      personalSubscription: {
        planId: 'athlete_plus',
        status: 'active',
        renewAt: state.subscription.renewAt,
      },
      gymAccess: [],
    };
  }

  if (pathname === '/athletes/me/results/summary') {
    return {
      recentResults: [
        {
          id: 'result-fran-latest',
          benchmark_slug: 'fran',
          benchmark_name: 'Fran',
          score_display: '02:59',
          score_value: 179,
          created_at: '2026-04-18T12:00:00.000Z',
        },
      ],
      benchmarkHistory: [
        {
          slug: 'fran',
          name: 'Fran',
          scoreType: 'for_time',
          points: [
            {
              label: '03:05',
              value: 185,
              createdAt: '2026-04-10T12:00:00.000Z',
            },
            {
              label: '02:59',
              value: 179,
              createdAt: '2026-04-18T12:00:00.000Z',
            },
          ],
          latestLabel: '02:59',
          latestValue: 179,
          delta: -6,
          improvement: 6,
        },
      ],
      prHistory: [
        {
          exercise: 'Back Squat',
          unit: 'kg',
          points: [
            {
              value: 120,
              source: 'manual',
              createdAt: '2026-04-11T12:00:00.000Z',
            },
            {
              value: 125,
              source: 'manual',
              createdAt: '2026-04-19T12:00:00.000Z',
            },
          ],
          latestValue: 125,
          delta: 5,
        },
      ],
      prCurrent: {
        'BACK SQUAT': 125,
      },
      measurements: [
        {
          type: 'body_weight',
          value: 79.5,
          unit: 'kg',
          recordedAt: '2026-04-19T12:00:00.000Z',
        },
      ],
      runningHistory: [],
      strengthHistory: [],
    };
  }

  if (pathname === '/athletes/me/workouts/recent') {
    return {
      recentWorkouts: [
        {
          id: 'recent-workout-1',
          title: 'Lower + Engine',
          sport_type: 'cross',
          scheduled_date: '2026-04-22',
        },
      ],
    };
  }

  if (pathname === '/athletes/me/imported-plan' && request.method() === 'GET') {
    return { importedPlan: null };
  }

  if (pathname === '/athletes/me/app-state' && request.method() === 'GET') {
    return { appState: null };
  }

  if (pathname === '/athletes/me/app-state' && request.method() === 'PUT') {
    const body = readRequestJson(request);
    return {
      appState: {
        snapshot: body?.snapshot || {},
        updatedAt: body?.updatedAt || new Date().toISOString(),
      },
    };
  }

  return {};
}

export async function installAthleteAuthenticatedRoutes(page) {
  const state = {
    token: 'athlete-token',
    user: {
      id: 'athlete-1',
      email: 'athlete@example.com',
      name: 'Athlete Demo',
    },
    subscription: {
      plan: 'athlete_plus',
      status: 'active',
      renewAt: '2026-05-15T12:00:00.000Z',
    },
    entitlements: ['athlete_app', 'athlete_plus'],
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api/, '');

    if (pathname === '/auth/signin' && request.method() === 'POST') {
      const body = readRequestJson(request);
      return fulfillJson(route, {
        token: state.token,
        user: state.user,
        trustedDevice: {
          deviceId: String(body?.deviceId || 'device-playwright-athlete'),
          trustedToken: 'trusted-token-athlete-demo',
          expiresAt: '2099-01-01T00:00:00.000Z',
          label: 'browser:playwright',
        },
      });
    }

    if (pathname === '/auth/refresh' && request.method() === 'POST') {
      return fulfillJson(route, {
        token: state.token,
        user: state.user,
      });
    }

    if (pathname === '/auth/signout' && request.method() === 'POST') {
      return fulfillJson(route, { ok: true });
    }

    return fulfillJson(route, resolveAthleteApiMocks(pathname, request, state));
  });
}

function resolveCoachApiMocks(pathname, state) {
  if (pathname === '/billing/status') {
    return {
      plan: state.subscription.plan,
      status: state.subscription.status,
      renewAt: state.subscription.renewAt,
    };
  }

  if (pathname === '/billing/entitlements') {
    return {
      entitlements: state.entitlements,
      gymAccess: [
        {
          gymId: 'gym-1',
          gymName: 'BSB Strong',
          role: 'owner',
          status: 'active',
          canCoachManage: state.entitlements.includes('coach_portal'),
          canAthletesUseApp: true,
          warning: '',
        },
      ],
    };
  }

  if (pathname === '/gyms/me') {
    return {
      gyms: [
        { id: 'gym-1', name: 'BSB Strong', role: 'owner', access: { warning: '' } },
      ],
    };
  }

  if (pathname === '/workouts/feed') {
    return { workouts: [] };
  }

  if (pathname === '/benchmarks') {
    return {
      benchmarks: [
        { slug: 'fran', name: 'Fran', category: 'girls', official_source: 'benchmark', year: 2003 },
        { slug: 'murph', name: 'Murph', category: 'hero', official_source: 'hero', year: 2005 },
        { slug: 'fight-gone-bad', name: 'Fight Gone Bad', category: 'classic', official_source: 'benchmark', year: 2004 },
      ],
      pagination: { total: 3, page: 1, limit: 30, pages: 1 },
    };
  }

  if (pathname === '/gyms/gym-1/memberships') {
    return { memberships: [] };
  }

  if (pathname === '/gyms/gym-1/groups') {
    return { groups: [] };
  }

  if (pathname === '/gyms/gym-1/insights') {
    return {
      stats: {
        athletes: 14,
        results: 28,
        activePrs: 9,
        athletesWithPrs: 7,
      },
    };
  }

  return {};
}

export async function installCoachDashboardRoutes(page, {
  failWithHtml = false,
  allowSignin = false,
  startsActive = false,
} = {}) {
  const state = {
    profile: {
      id: 'coach-1',
      email: 'admin@example.com',
      name: 'Coach Admin',
      isAdmin: true,
    },
    subscription: {
      plan: 'coach',
      status: startsActive ? 'active' : 'inactive',
      renewAt: startsActive ? '2026-05-11T12:00:00.000Z' : null,
    },
    entitlements: startsActive ? ['athlete_app', 'coach_portal', 'advanced_analytics'] : [],
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api/, '');

    if (allowSignin && pathname === '/auth/signin' && request.method() === 'POST') {
      return fulfillJson(route, {
        token: 'coach-token-from-login',
        user: state.profile,
      });
    }

    if (failWithHtml && pathname === '/gyms/me') {
      return route.fulfill({
        status: 502,
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><body>bad gateway</body></html>',
      });
    }

    if (pathname === '/billing/mock/activate' && request.method() === 'POST') {
      state.subscription = {
        plan: 'coach',
        status: 'active',
        renewAt: '2026-05-11T12:00:00.000Z',
      };
      state.entitlements = ['athlete_app', 'coach_portal', 'advanced_analytics'];
      return fulfillJson(route, { ok: true });
    }

    if (
      pathname.startsWith('/competitions/')
      || pathname === '/competitions/calendar'
    ) {
      return fulfillJson(route, { error: 'not_found' }, 404);
    }

    return fulfillJson(route, resolveCoachApiMocks(pathname, state));
  });
}
