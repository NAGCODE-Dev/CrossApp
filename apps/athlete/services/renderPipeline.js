import { applyAthleteRenderLayout } from './renderLayoutUpdates.js';
import { buildAthleteRenderState } from './renderViewState.js';

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
    const state = buildAthleteRenderState({ getUiState, getUiBusy });

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
