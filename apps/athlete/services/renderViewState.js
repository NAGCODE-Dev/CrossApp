import { buildAthleteUiForRender } from '../state/uiState.js';
import {
  safeGetAthleteAppState,
  safeGetAthleteProfile,
} from './uiControllerHelpers.js';

export function buildAthleteRenderState({ getUiState, getUiBusy }) {
  const state = safeGetAthleteAppState();
  const uiState = getUiState();

  state.__ui = buildAthleteUiForRender({
    state,
    uiState,
    uiBusy: getUiBusy(),
    profile: safeGetAthleteProfile(),
  });

  return state;
}
