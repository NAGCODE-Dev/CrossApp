// @ts-check
import { fulfillJson } from './playwrightFixtures.js';

function readRequestJson(request) {
  try {
    return request.postDataJSON();
  } catch {
    return {};
  }
}

function resolveAthleteApiMocks(pathname, request, state) {
  const sportType = new URL(request.url()).searchParams.get('sportType') || 'cross';

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
    const sportTitle =
      sportType === 'running'
        ? 'Longão Progressivo'
        : sportType === 'strength'
          ? 'Lower Strength'
          : 'Open Prep';
    const sportPayload =
      sportType === 'running'
        ? {
            session: {
              type: 'long',
              distanceKm: 12,
              durationMin: 68,
              targetPace: '5:40/km',
              zone: 'Z2',
              notes: 'Controle a respiração e mantenha a cadência.',
            },
            blocks: [{ type: 'RUNNING', lines: ['12 km progressivo'] }],
          }
        : sportType === 'strength'
          ? {
              strength: {
                focus: 'Lower',
                loadGuidance: 'Carga moderada',
                rir: 2,
                exercises: [
                  {
                    name: 'Back Squat',
                    sets: 5,
                    reps: '5',
                    load: '120 kg',
                    rir: 2,
                  },
                ],
              },
              blocks: [{ type: 'STRENGTH', lines: ['Back Squat | 5x5 | 120 kg'] }],
            }
          : undefined;
    return {
      workouts: [
        {
          id: 'feed-1',
          title: sportTitle,
          gym_name: 'Ryxen Remote',
          sport_type: sportType,
          payload: sportPayload,
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
    const recentTitle =
      sportType === 'running'
        ? 'Intervalado 6x400'
        : sportType === 'strength'
          ? 'Upper + Pull'
          : 'Lower + Engine';
    return {
      recentWorkouts: [
        {
          id: 'recent-workout-1',
          title: recentTitle,
          sport_type: sportType,
          scheduled_date: '2026-04-22',
        },
      ],
    };
  }

  if (pathname === '/athletes/me/running/history') {
    return {
      logs: [
        {
          id: 'run-log-1',
          title: 'Longão Progressivo',
          session_type: 'long',
          logged_at: '2026-04-21T09:00:00.000Z',
          distance_km: 12,
          duration_min: 68,
          avg_pace: '5:40/km',
          zone: 'Z2',
          completion_state: 'done',
        },
      ],
      summary: {
        total_sessions: 1,
        total_distance_km: 12,
        avg_duration_min: 68,
      },
    };
  }

  if (pathname === '/athletes/me/running/logs' && request.method() === 'POST') {
    const body = readRequestJson(request);
    return {
      ok: true,
      log: {
        id: 'run-log-created',
        ...body,
      },
    };
  }

  if (pathname === '/athletes/me/strength/history') {
    return {
      logs: [
        {
          id: 'strength-log-1',
          exercise: 'Back Squat',
          logged_at: '2026-04-21T09:00:00.000Z',
          sets_count: 5,
          reps_text: '5',
          load_value: 120,
          rir: 2,
          completion_state: 'done',
        },
      ],
    };
  }

  if (pathname === '/athletes/me/strength/logs' && request.method() === 'POST') {
    const body = readRequestJson(request);
    return {
      ok: true,
      log: {
        id: 'strength-log-created',
        ...body,
      },
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
