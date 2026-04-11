import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAthleteModalAction } from '../apps/athlete/actions/modalActions.js';

test('nyx:step hidrata history quando o guia troca de página', async () => {
  let uiState = {
    currentPage: 'today',
    accountView: 'overview',
    guide: { step: 0 },
    coachPortal: { selectedGymId: 'gym-1' },
  };
  const hydrateCalls = [];

  await handleAthleteModalAction('nyx:step', {
    element: { dataset: { guideStep: '4' } },
    applyUiPatch: async (updater) => {
      uiState = updater(uiState);
    },
    getUiState: () => uiState,
    hydratePage: (...args) => hydrateCalls.push(args),
    getAppBridge: () => ({
      getProfile: () => ({ data: { email: 'athlete@ryxen.app' } }),
    }),
  });

  assert.equal(uiState.currentPage, 'history');
  assert.equal(uiState.guide.step, 4);
  assert.equal(hydrateCalls.length, 1);
  assert.equal(hydrateCalls[0][1], 'history');
  assert.equal(hydrateCalls[0][2], 'gym-1');
});
