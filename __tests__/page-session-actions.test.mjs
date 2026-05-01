import test from 'node:test';
import assert from 'node:assert/strict';

import { handleAthletePageSessionAction } from '../apps/athlete/features/account/pageSessionActions.js';

test('auth:signout reseta a shell visual para o estado base', async () => {
  const applyCalls = [];

  const handled = await handleAthletePageSessionAction('auth:signout', {
    element: { dataset: {} },
    getUiState: () => ({ currentPage: 'account' }),
    applyUiState: async (next, options) => {
      applyCalls.push({ next, options });
    },
    applyUiPatch: async () => {},
    finalizeUiChange: async () => {},
    hydratePage: () => {},
    shouldHydratePage: () => false,
    invalidateHydrationCache: () => {},
    getAppBridge: () => ({
      signOut: async () => ({ success: true }),
    }),
    maybeResumePendingCheckout: async () => false,
    emptyCoachPortal: () => ({ gyms: [], entitlements: [], selectedGymId: null, status: 'idle', error: '' }),
    emptyAthleteOverview: () => ({ stats: null, recentResults: [], recentWorkouts: [], blocks: { summary: { status: 'idle', error: '' }, results: { status: 'idle', error: '' }, workouts: { status: 'idle', error: '' } } }),
    emptyAdmin: () => ({ overview: null, query: '' }),
  });

  assert.equal(handled, true);
  assert.equal(applyCalls.length, 1);
  assert.equal(applyCalls[0].next.currentPage, 'today');
  assert.equal(applyCalls[0].next.accountView, 'overview');
  assert.equal(applyCalls[0].next.modal, null);
  assert.equal(applyCalls[0].next.authMode, 'signin');
  assert.deepEqual(applyCalls[0].next.wod, {});
  assert.deepEqual(applyCalls[0].next.passwordReset, {});
  assert.deepEqual(applyCalls[0].next.signupVerification, {});
  assert.equal(applyCalls[0].next.importStatus.step, 'idle');
  assert.equal(applyCalls[0].options.toastMessage, 'Sessão encerrada');
});

test('history:benchmarks:search carrega biblioteca e seleciona o primeiro benchmark', async () => {
  const patches = [];
  const queries = [];
  const uiState = {
    athleteOverview: {
      benchmarkLibrary: [],
      selectedBenchmark: null,
    },
    coachPortal: {
      selectedGymId: 22,
    },
  };

  const originalDocument = globalThis.document;
  globalThis.document = {
    querySelector(selector) {
      queries.push(selector);
      return { value: 'fran' };
    },
  };

  try {
    const handled = await handleAthletePageSessionAction('history:benchmarks:search', {
      element: { dataset: {} },
      getUiState: () => uiState,
      applyUiState: async () => {},
      applyUiPatch: async (updater) => {
        const nextState = updater(uiState);
        patches.push(nextState);
        Object.assign(uiState, nextState);
      },
      finalizeUiChange: async () => {},
      hydratePage: () => {},
      shouldHydratePage: () => false,
      invalidateHydrationCache: () => {},
      getAppBridge: () => ({
        async getBenchmarks(params) {
          assert.equal(params.q, 'fran');
          return {
            data: {
              benchmarks: [
                { slug: 'fran', name: 'Fran' },
                { slug: 'murph', name: 'Murph' },
              ],
              pagination: { total: 2, page: 1, limit: 12, pages: 1 },
            },
          };
        },
        async getBenchmarkDetail(slug, params) {
          assert.equal(slug, 'fran');
          assert.equal(params.gymId, 22);
          return {
            data: {
              benchmark: { slug: 'fran', name: 'Fran' },
              leaderboard: [],
              viewerLatestResult: { score_display: '2:59' },
            },
          };
        },
      }),
      maybeResumePendingCheckout: async () => false,
      emptyCoachPortal: () => ({}),
      emptyAthleteOverview: () => ({}),
      emptyAdmin: () => ({}),
    });

    assert.equal(handled, true);
    assert.deepEqual(queries, ['#history-benchmark-query']);
    assert.equal(uiState.athleteOverview.benchmarkLibrary.length, 2);
    assert.equal(uiState.athleteOverview.benchmarkLibraryQuery, 'fran');
    assert.equal(uiState.athleteOverview.selectedBenchmark.benchmark.slug, 'fran');
    assert.equal(patches.length, 2);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('history:benchmark:open abre detalhe do benchmark selecionado', async () => {
  const uiState = {
    athleteOverview: {},
    coachPortal: {
      selectedGymId: null,
    },
  };

  const handled = await handleAthletePageSessionAction('history:benchmark:open', {
    element: { dataset: { benchmarkSlug: 'murph' } },
    getUiState: () => uiState,
    applyUiState: async () => {},
    applyUiPatch: async (updater) => {
      Object.assign(uiState, updater(uiState));
    },
    finalizeUiChange: async () => {},
    hydratePage: () => {},
    shouldHydratePage: () => false,
    invalidateHydrationCache: () => {},
    getAppBridge: () => ({
      async getBenchmarkDetail(slug, params) {
        assert.equal(slug, 'murph');
        assert.equal(params.gymId, null);
        return {
          data: {
            benchmark: { slug: 'murph', name: 'Murph' },
            leaderboard: [{ rank: 1, name: 'Atleta', score_display: '36:00' }],
            viewerLatestResult: null,
          },
        };
      },
    }),
    maybeResumePendingCheckout: async () => false,
    emptyCoachPortal: () => ({}),
    emptyAthleteOverview: () => ({}),
    emptyAdmin: () => ({}),
  });

  assert.equal(handled, true);
  assert.equal(uiState.athleteOverview.selectedBenchmark.benchmark.slug, 'murph');
  assert.equal(uiState.athleteOverview.selectedBenchmark.leaderboard.length, 1);
});
