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

test('sync:retry atualiza o status visual e conclui o retry manual', async () => {
  const patches = [];
  const toasts = [];
  const uiState = {
    syncStatus: {
      online: true,
      isAuthenticated: true,
      pendingAppState: true,
      pendingOutboxCount: 1,
      pendingTotal: 2,
      pendingKinds: ['pr_snapshot'],
      lastSyncAt: '',
      lastError: '',
      flushing: false,
    },
  };

  const handled = await handleAthletePageSessionAction('sync:retry', {
    element: { dataset: {} },
    toast: (message) => toasts.push(message),
    getUiState: () => uiState,
    applyUiState: async () => {},
    applyUiPatch: async (updater, options = {}) => {
      Object.assign(uiState, updater(uiState));
      patches.push({ state: structuredClone(uiState), options });
    },
    finalizeUiChange: async () => {},
    hydratePage: () => {},
    shouldHydratePage: () => false,
    invalidateHydrationCache: () => {},
    getAppBridge: () => ({
      async retryPendingSync() {
        return { success: true };
      },
      async getPendingSyncStatus() {
        return {
          online: true,
          isAuthenticated: true,
          pendingAppState: false,
          pendingOutboxCount: 0,
          pendingTotal: 0,
          pendingKinds: [],
          lastSyncAt: '2026-05-02T09:00:00.000Z',
          lastError: '',
          flushing: false,
        };
      },
    }),
    maybeResumePendingCheckout: async () => false,
    emptyCoachPortal: () => ({}),
    emptyAthleteOverview: () => ({}),
    emptyAdmin: () => ({}),
  });

  assert.equal(handled, true);
  assert.equal(patches.length, 2);
  assert.equal(patches[0].state.syncStatus.flushing, true);
  assert.equal(patches[1].state.syncStatus.pendingTotal, 0);
  assert.equal(patches[1].options.toastMessage, 'Sincronização concluída');
  assert.deepEqual(toasts, []);
});

test('sync:item:dismiss remove uma pendência específica da fila local', async () => {
  const patches = [];
  const toasts = [];
  const uiState = {
    syncStatus: {
      online: false,
      isAuthenticated: true,
      pendingAppState: true,
      pendingOutboxCount: 2,
      pendingTotal: 3,
      pendingKinds: ['measurement_snapshot', 'pr_snapshot'],
      pendingItems: [],
      oldestPendingAt: '2026-05-02T08:45:00.000Z',
      lastSyncAt: '',
      lastError: '',
      flushing: false,
      activeItemKind: '',
      activeItemAction: '',
    },
  };
  const originalConfirm = globalThis.confirm;
  globalThis.confirm = () => true;

  try {
    const handled = await handleAthletePageSessionAction('sync:item:dismiss', {
      element: { dataset: { syncKind: 'pr_snapshot' } },
      toast: (message) => toasts.push(message),
      getUiState: () => uiState,
      applyUiState: async () => {},
      applyUiPatch: async (updater, options = {}) => {
        Object.assign(uiState, updater(uiState));
        patches.push({ state: structuredClone(uiState), options });
      },
      finalizeUiChange: async () => {},
      hydratePage: () => {},
      shouldHydratePage: () => false,
      invalidateHydrationCache: () => {},
      getAppBridge: () => ({
        dismissPendingSyncItem(kind) {
          assert.equal(kind, 'pr_snapshot');
          return { success: true, removed: 'pr_snapshot' };
        },
        async getPendingSyncStatus() {
          return {
            online: false,
            isAuthenticated: true,
            pendingAppState: true,
            pendingOutboxCount: 1,
            pendingTotal: 2,
            pendingKinds: ['measurement_snapshot'],
            pendingItems: [],
            oldestPendingAt: '2026-05-02T08:45:00.000Z',
            lastSyncAt: '',
            lastError: '',
            flushing: false,
          };
        },
      }),
      maybeResumePendingCheckout: async () => false,
      emptyCoachPortal: () => ({}),
      emptyAthleteOverview: () => ({}),
      emptyAdmin: () => ({}),
    });

    assert.equal(handled, true);
    assert.equal(patches.length, 2);
    assert.equal(patches[0].state.syncStatus.activeItemKind, 'pr_snapshot');
    assert.equal(patches[0].state.syncStatus.activeItemAction, 'dismiss');
    assert.equal(patches[1].state.syncStatus.pendingOutboxCount, 1);
    assert.equal(patches[1].state.syncStatus.activeItemKind, '');
    assert.equal(patches[1].options.toastMessage, 'Pendência removida da fila local');
    assert.deepEqual(toasts, []);
  } finally {
    globalThis.confirm = originalConfirm;
  }
});

test('sync:item:dismiss respeita cancelamento da confirmação', async () => {
  const originalConfirm = globalThis.confirm;
  globalThis.confirm = () => false;
  let called = false;

  try {
    const handled = await handleAthletePageSessionAction('sync:item:dismiss', {
      element: { dataset: { syncKind: 'pr_snapshot' } },
      toast: () => {},
      getUiState: () => ({ syncStatus: {} }),
      applyUiState: async () => {},
      applyUiPatch: async () => {
        throw new Error('não deveria aplicar patch');
      },
      finalizeUiChange: async () => {},
      hydratePage: () => {},
      shouldHydratePage: () => false,
      invalidateHydrationCache: () => {},
      getAppBridge: () => ({
        dismissPendingSyncItem() {
          called = true;
          return { success: true };
        },
      }),
      maybeResumePendingCheckout: async () => false,
      emptyCoachPortal: () => ({}),
      emptyAthleteOverview: () => ({}),
      emptyAdmin: () => ({}),
    });

    assert.equal(handled, true);
    assert.equal(called, false);
  } finally {
    globalThis.confirm = originalConfirm;
  }
});

test('sync:item:retry sincroniza uma pendência específica da fila local', async () => {
  const patches = [];
  const toasts = [];
  const uiState = {
    syncStatus: {
      online: true,
      isAuthenticated: true,
      pendingAppState: true,
      pendingOutboxCount: 2,
      pendingTotal: 3,
      pendingKinds: ['measurement_snapshot', 'pr_snapshot'],
      pendingItems: [],
      oldestPendingAt: '2026-05-02T08:45:00.000Z',
      lastSyncAt: '',
      lastError: '',
      flushing: false,
      activeItemKind: '',
      activeItemAction: '',
    },
  };

  const handled = await handleAthletePageSessionAction('sync:item:retry', {
    element: { dataset: { syncKind: 'pr_snapshot' } },
    toast: (message) => toasts.push(message),
    getUiState: () => uiState,
    applyUiState: async () => {},
    applyUiPatch: async (updater, options = {}) => {
      Object.assign(uiState, updater(uiState));
      patches.push({ state: structuredClone(uiState), options });
    },
    finalizeUiChange: async () => {},
    hydratePage: () => {},
    shouldHydratePage: () => false,
    invalidateHydrationCache: () => {},
    getAppBridge: () => ({
      async retryPendingSyncItem(kind) {
        assert.equal(kind, 'pr_snapshot');
        return { success: true, synced: 'pr_snapshot' };
      },
      async getPendingSyncStatus() {
        return {
          online: true,
          isAuthenticated: true,
          pendingAppState: true,
          pendingOutboxCount: 1,
          pendingTotal: 2,
          pendingKinds: ['measurement_snapshot'],
          pendingItems: [],
          oldestPendingAt: '2026-05-02T09:10:00.000Z',
          lastSyncAt: '2026-05-02T09:12:00.000Z',
          lastError: '',
          flushing: false,
        };
      },
    }),
    maybeResumePendingCheckout: async () => false,
    emptyCoachPortal: () => ({}),
    emptyAthleteOverview: () => ({}),
    emptyAdmin: () => ({}),
  });

  assert.equal(handled, true);
  assert.equal(patches.length, 2);
  assert.equal(patches[0].state.syncStatus.activeItemKind, 'pr_snapshot');
  assert.equal(patches[0].state.syncStatus.activeItemAction, 'retry');
  assert.equal(patches[1].state.syncStatus.pendingOutboxCount, 1);
  assert.equal(patches[1].state.syncStatus.activeItemKind, '');
  assert.equal(patches[1].options.toastMessage, 'Item sincronizado');
  assert.deepEqual(toasts, []);
});
