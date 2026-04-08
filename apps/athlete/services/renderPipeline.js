import { buildAthleteUiForRender } from '../state/uiState.js';
import {
  safeGetAthleteAppState,
  safeGetAthleteProfile,
} from './uiControllerHelpers.js';
import { applyAthleteRenderLayout } from './renderLayoutUpdates.js';

export function createAthleteRenderPipeline({
  refs,
  getUiState,
  getUiBusy,
  renderHeaderAccount,
  renderMainContent,
  renderBottomNav,
  renderModals,
  setLayoutHtml,
  setLayoutText,
  lastRendered,
  buildHeaderSignature,
  buildBottomSignature,
  buildModalSignature,
  buildMainSignature,
}) {
  return async function performRender() {
    const state = safeGetAthleteAppState();
    const uiState = getUiState();

    state.__ui = buildAthleteUiForRender({
      state,
      uiState,
      uiBusy: getUiBusy(),
      profile: safeGetAthleteProfile(),
    });

    document.body.dataset.page = state.__ui.currentPage || 'today';
    applyAthleteRenderLayout({
      state,
      refs,
      lastRendered,
      buildHeaderSignature,
      buildMainSignature,
      buildBottomSignature,
      buildModalSignature,
      renderHeaderAccount,
      renderMainContent,
      renderBottomNav,
      renderModals,
      setLayoutHtml,
      setLayoutText,
    });
  };
}
