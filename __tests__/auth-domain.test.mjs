import test from 'node:test';
import assert from 'node:assert/strict';

import { createAuthDomain } from '../src/app/authDomain.js';

test('handleSignIn limpa sessão local e restaura dados quando muda a conta autenticada', async () => {
  const state = {
    ui: { activeScreen: 'account' },
  };
  const calls = {
    clearLocalUserData: [],
    clearCoachWorkoutFeed: 0,
    restoreAppStateFromAccount: [],
    restoreImportedPlanFromAccount: [],
    flushPendingAppStateSync: 0,
    flushPendingSyncOutbox: 0,
    updateCurrentDay: 0,
    applyPreferredWorkout: [],
    getWorkoutFeed: 0,
  };

  const domain = createAuthDomain({
    getState: () => state,
    setState: (patch) => {
      Object.assign(state, patch);
    },
    remoteHandlers: {
      handleSignIn: async () => ({ user: { email: 'new@ryxen.app' } }),
      handleGetWorkoutFeed: async () => {
        calls.getWorkoutFeed += 1;
      },
      handleStartGoogleRedirect: () => ({}),
      handleSignOut: async () => ({}),
    },
    handleGetProfile: () => ({ data: { email: 'old@ryxen.app' } }),
    restoreAppStateFromAccount: async (options) => {
      calls.restoreAppStateFromAccount.push(options);
    },
    restoreImportedPlanFromAccount: async (options) => {
      calls.restoreImportedPlanFromAccount.push(options);
    },
    flushPendingAppStateSync: async () => {
      calls.flushPendingAppStateSync += 1;
    },
    flushPendingSyncOutbox: async () => {
      calls.flushPendingSyncOutbox += 1;
    },
    clearLocalUserData: async (options) => {
      calls.clearLocalUserData.push(options);
    },
    clearCoachWorkoutFeed: async () => {
      calls.clearCoachWorkoutFeed += 1;
    },
    updateCurrentDay: async () => {
      calls.updateCurrentDay += 1;
    },
    applyPreferredWorkout: async (options) => {
      calls.applyPreferredWorkout.push(options);
    },
  });

  const result = await domain.handleSignIn({ email: 'new@ryxen.app', password: 'secret' });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(result, { user: { email: 'new@ryxen.app' } });
  assert.deepEqual(calls.clearLocalUserData, [{ preserveAuth: true }]);
  assert.equal(calls.clearCoachWorkoutFeed, 1);
  assert.deepEqual(calls.restoreAppStateFromAccount, [{ force: true }]);
  assert.deepEqual(calls.restoreImportedPlanFromAccount, [{ force: true }]);
  assert.equal(calls.flushPendingAppStateSync, 1);
  assert.equal(calls.flushPendingSyncOutbox, 1);
  assert.equal(calls.updateCurrentDay, 1);
  assert.deepEqual(calls.applyPreferredWorkout, [{ fallbackToWelcome: true }]);
  assert.equal(calls.getWorkoutFeed, 1);
  assert.equal(state.ui.activeScreen, 'welcome');
});

test('handleRefreshSession não limpa estado local ao apenas restaurar sessão existente', async () => {
  const state = {
    prs: { 'BACK SQUAT': 155 },
    preferences: { theme: 'light', accentTone: 'rose' },
    ui: { activeScreen: 'today' },
  };
  const calls = {
    clearLocalUserData: [],
    clearCoachWorkoutFeed: 0,
    restoreAppStateFromAccount: [],
    restoreImportedPlanFromAccount: [],
    flushPendingAppStateSync: 0,
    flushPendingSyncOutbox: 0,
    updateCurrentDay: 0,
    applyPreferredWorkout: [],
    getWorkoutFeed: 0,
  };

  const domain = createAuthDomain({
    getState: () => state,
    setState: (patch) => {
      Object.assign(state, patch);
    },
    remoteHandlers: {
      handleRefreshSession: async () => ({ user: { email: 'athlete@ryxen.app' } }),
      handleGetWorkoutFeed: async () => {
        calls.getWorkoutFeed += 1;
      },
      handleStartGoogleRedirect: () => ({}),
      handleSignOut: async () => ({}),
    },
    handleGetProfile: () => ({ data: null }),
    restoreAppStateFromAccount: async (options) => {
      calls.restoreAppStateFromAccount.push(options);
    },
    restoreImportedPlanFromAccount: async (options) => {
      calls.restoreImportedPlanFromAccount.push(options);
    },
    flushPendingAppStateSync: async () => {
      calls.flushPendingAppStateSync += 1;
    },
    flushPendingSyncOutbox: async () => {
      calls.flushPendingSyncOutbox += 1;
    },
    clearLocalUserData: async (options) => {
      calls.clearLocalUserData.push(options);
    },
    clearCoachWorkoutFeed: async () => {
      calls.clearCoachWorkoutFeed += 1;
    },
    updateCurrentDay: async () => {
      calls.updateCurrentDay += 1;
    },
    applyPreferredWorkout: async (options) => {
      calls.applyPreferredWorkout.push(options);
    },
  });

  const result = await domain.handleRefreshSession();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(result, { user: { email: 'athlete@ryxen.app' } });
  assert.deepEqual(calls.clearLocalUserData, []);
  assert.equal(calls.clearCoachWorkoutFeed, 0);
  assert.deepEqual(calls.restoreAppStateFromAccount, [{ force: false }]);
  assert.deepEqual(calls.restoreImportedPlanFromAccount, [{ force: false }]);
  assert.equal(calls.flushPendingAppStateSync, 1);
  assert.equal(calls.flushPendingSyncOutbox, 1);
  assert.equal(calls.getWorkoutFeed, 1);
  assert.deepEqual(state.prs, { 'BACK SQUAT': 155 });
  assert.deepEqual(state.preferences, { theme: 'light', accentTone: 'rose' });
  assert.equal(state.ui.activeScreen, 'today');
});

test('handleSignOut limpa o estado da sessão e volta a UI base do app', async () => {
  const state = {
    weeks: [{ weekNumber: 1 }],
    prs: { 'BACK SQUAT': 155 },
    activeWeekNumber: 1,
    currentDay: 'Quarta',
    workout: { day: 'Quarta', blocks: [{ type: 'wod', lines: ['row 10 min'] }] },
    workoutOfDay: { day: 'Quarta', blocks: [{ type: 'wod', lines: ['row 10 min'] }] },
    workoutMeta: { source: 'manual' },
    workoutContext: { activeSource: 'manual' },
    preferences: { theme: 'light', accentTone: 'rose' },
    ui: {
      activeScreen: 'workout',
      activeModal: 'auth',
      hasWarnings: true,
      isLoading: true,
      sessionRestore: 'ready',
    },
  };
  const calls = {
    clearLocalUserData: [],
    clearCoachWorkoutFeed: 0,
    updateCurrentDay: 0,
    applyPreferredWorkout: [],
    signOut: 0,
  };

  const domain = createAuthDomain({
    getState: () => state,
    setState: (patch) => {
      Object.assign(state, patch);
    },
    remoteHandlers: {
      handleSignOut: async () => {
        calls.signOut += 1;
        return {};
      },
      handleGetWorkoutFeed: async () => {},
      handleStartGoogleRedirect: () => ({}),
    },
    handleGetProfile: () => ({ data: { email: 'athlete@ryxen.app' } }),
    restoreAppStateFromAccount: async () => {},
    restoreImportedPlanFromAccount: async () => {},
    flushPendingAppStateSync: async () => {},
    flushPendingSyncOutbox: async () => {},
    clearLocalUserData: async (options) => {
      calls.clearLocalUserData.push(options);
    },
    clearCoachWorkoutFeed: async () => {
      calls.clearCoachWorkoutFeed += 1;
    },
    updateCurrentDay: async () => {
      calls.updateCurrentDay += 1;
      state.currentDay = 'Terça';
    },
    applyPreferredWorkout: async (options) => {
      calls.applyPreferredWorkout.push(options);
    },
  });

  const result = await domain.handleSignOut();

  assert.deepEqual(result, { success: true });
  assert.equal(calls.signOut, 1);
  assert.deepEqual(calls.clearLocalUserData, [{ preserveAuth: false }]);
  assert.equal(calls.clearCoachWorkoutFeed, 1);
  assert.equal(calls.updateCurrentDay, 1);
  assert.deepEqual(calls.applyPreferredWorkout, [{ fallbackToWelcome: true }]);
  assert.deepEqual(state.weeks, []);
  assert.deepEqual(state.prs, {});
  assert.equal(state.activeWeekNumber, null);
  assert.equal(state.workout, null);
  assert.equal(state.workoutOfDay, null);
  assert.equal(state.workoutMeta, null);
  assert.equal(state.ui.activeScreen, 'welcome');
  assert.equal(state.ui.activeModal, null);
  assert.equal(state.ui.hasWarnings, false);
  assert.equal(state.ui.isLoading, false);
  assert.equal(state.ui.sessionRestore, 'idle');
  assert.equal(state.currentDay, 'Terça');
});
