import {
  createObjectIdentityTracker,
  createRenderSignatures,
  createRenderStateCache,
} from './renderControllerHelpers.js';
import { createAthleteRenderPipeline } from './renderPipeline.js';
import { createRenderScheduler } from './renderScheduler.js';

export function createAthleteRenderController({
  refs,
  getUiState,
  getUiBusy,
  renderHeaderAccount,
  renderMainContent,
  renderBottomNav,
  renderModals,
  setLayoutHtml,
  setLayoutText,
}) {
  const lastRendered = createRenderStateCache();
  const { getObjectIdentity } = createObjectIdentityTracker();
  const {
    buildHeaderSignature,
    buildBottomSignature,
    buildModalSignature,
    buildMainSignature,
  } = createRenderSignatures({ getObjectIdentity });

  const performRender = createAthleteRenderPipeline({
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
  });
  return createRenderScheduler({ performRender });
}
