// @ts-check
import { fulfillJson } from './playwrightFixtures.js';

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
