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
