import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorkoutDomain } from '../src/app/workoutDomain.js';

test('applyPreferredWorkout prioriza treino do coach quando ele está disponível e não há plano multi-dia local', async () => {
  const state = {
    currentDay: 'Segunda',
    activeWeekNumber: null,
    weeks: [],
    workout: null,
    workoutMeta: null,
    workoutContext: {},
    preferences: {
      autoConvertLbs: false,
      workoutPriority: 'uploaded',
    },
    prs: {},
    ui: { activeScreen: 'welcome' },
  };
  const emitted = [];

  const coachEntry = {
    id: 'coach-1',
    title: 'Coach WOD',
    gymId: 'gym-1',
    gymName: 'Ryxen Club',
    scheduledDate: '2026-04-06',
    payload: {
      blocks: [
        { type: 'warmup', lines: ['bike 5 min'] },
      ],
    },
  };

  const domain = createWorkoutDomain({
    getState: () => state,
    setState: (patch) => {
      Object.assign(state, patch);
    },
    emit: (name, payload) => emitted.push([name, payload]),
    logDebug: () => {},
    getWorkoutFromWeek: () => null,
    getCoachWorkoutForCurrentDay: async () => coachEntry,
    prepareWorkoutEntity: (workout) => ({
      isValid: true,
      issues: [],
      entity: {
        ...workout,
        transformTrace: ['prepared'],
      },
    }),
    summarizeWorkoutIssues: () => '',
    createDefensiveWorkoutSnapshot: () => ({}),
    captureAppError: () => {},
    trackError: () => {},
  });

  const result = await domain.applyPreferredWorkout();

  assert.deepEqual(result, { success: true, source: 'coach' });
  assert.equal(state.workoutMeta.source, 'coach');
  assert.equal(state.workoutMeta.coachWorkoutId, 'coach-1');
  assert.equal(state.workoutContext.activeSource, 'coach');
  assert.equal(state.ui.activeScreen, 'workout');
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0][0], 'workout:loaded');
  assert.equal(emitted[0][1].source, 'coach');
  assert.equal(emitted[0][1].coachWorkoutId, 'coach-1');
  assert.equal(emitted[0][1].workout.title, 'Coach WOD');
});

test('applyPreferredWorkout carrega treino de domingo quando a planilha realmente tem domingo', async () => {
  const state = {
    currentDay: 'Domingo',
    activeWeekNumber: 1,
    weeks: [{ weekNumber: 1 }],
    workout: null,
    workoutMeta: null,
    workoutContext: {},
    preferences: {
      autoConvertLbs: false,
      workoutPriority: 'uploaded',
    },
    prs: {},
    ui: { activeScreen: 'welcome' },
  };

  const sundayWorkout = {
    day: 'Domingo',
    title: 'Sunday Grind',
    blocks: [{ type: 'wod', lines: ['run 5k'] }],
  };

  const domain = createWorkoutDomain({
    getState: () => state,
    setState: (patch) => {
      Object.assign(state, patch);
    },
    emit: () => {},
    logDebug: () => {},
    getWorkoutFromWeek: () => sundayWorkout,
    getCoachWorkoutForCurrentDay: async () => null,
    prepareWorkoutEntity: (workout) => ({
      isValid: true,
      issues: [],
      entity: {
        ...workout,
        transformTrace: ['prepared'],
      },
    }),
    summarizeWorkoutIssues: () => '',
    createDefensiveWorkoutSnapshot: () => ({}),
    captureAppError: () => {},
    trackError: () => {},
  });

  const result = await domain.applyPreferredWorkout({ fallbackToWelcome: true });

  assert.deepEqual(result, { success: true, source: 'local' });
  assert.equal(state.workoutMeta.source, 'local');
  assert.equal(state.workout.day, 'Domingo');
  assert.equal(state.ui.activeScreen, 'workout');
});
