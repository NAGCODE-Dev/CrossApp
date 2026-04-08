import { normalizeCheckoutPlan } from '../account/services.js';
import {
  routeAthleteAuthClick,
  routeAthleteBillingClick,
  routeAthleteModalClick,
  routeAthletePageClick,
  routeAthleteTodayClick,
} from './clickRoutes.js';
import { readAthleteAppState } from './setupUiHelpers.js';

export function createAthleteClickContext({
  root,
  toast,
  getUiState,
  applyUiState,
  applyUiPatch,
  finalizeUiChange,
  renderUi,
  setUiState,
  invalidateHydrationCache,
  shouldHydratePage,
  hydratePage,
  hydrateAthleteSummary,
  hydrateAthleteResultsBlock,
  syncAthletePrIfAuthenticated,
  resumePendingCheckout,
  isImportBusy,
  guardAthleteImport,
  emptyCoachPortal,
  emptyAthleteOverview,
  emptyAdmin,
  handleExerciseHelpAction,
  handleAthleteModalAction,
  handleAthleteAuthAction,
  handleAthleteBillingAction,
  handleAthleteAccountHistoryAction,
  handleAthleteTodayAction,
  isDeveloperEmail,
  isDeveloperProfile,
  idleImportStatus,
  prepareImportFileForClientUse,
  pickJsonFile,
  pickPdfFile,
  pickUniversalFile,
  explainImportFailure,
  formatBytes,
  IMPORT_HARD_MAX_BYTES,
  IMAGE_COMPRESS_THRESHOLD_BYTES,
  IMAGE_TARGET_MAX_BYTES,
  IMAGE_MAX_DIMENSION,
  workoutKeyFromAppState,
  getActiveLineIdFromUi,
  getLineIdsFromDOM,
  pickNextId,
  pickPrevId,
  scrollToLine,
  cssEscape,
  startRestTimer,
  consumeAthleteImport,
}) {
  return {
    root,
    toast,
    getUiState,
    applyUiState,
    applyUiPatch,
    finalizeUiChange,
    renderUi,
    setUiState,
    invalidateHydrationCache,
    shouldHydratePage,
    hydratePage,
    hydrateAthleteSummary,
    hydrateAthleteResultsBlock,
    syncAthletePrIfAuthenticated,
    resumePendingCheckout,
    isImportBusy,
    guardAthleteImport,
    emptyCoachPortal,
    emptyAthleteOverview,
    emptyAdmin,
    handleExerciseHelpAction,
    handleAthleteModalAction,
    handleAthleteAuthAction,
    handleAthleteBillingAction,
    handleAthleteAccountHistoryAction,
    handleAthleteTodayAction,
    isDeveloperEmail,
    isDeveloperProfile,
    normalizeCheckoutPlan,
    idleImportStatus,
    prepareImportFileForClientUse,
    pickJsonFile,
    pickPdfFile,
    pickUniversalFile,
    explainImportFailure,
    formatBytes,
    IMPORT_HARD_MAX_BYTES,
    IMAGE_COMPRESS_THRESHOLD_BYTES,
    IMAGE_TARGET_MAX_BYTES,
    IMAGE_MAX_DIMENSION,
    workoutKeyFromAppState,
    getActiveLineIdFromUi,
    getLineIdsFromDOM,
    pickNextId,
    pickPrevId,
    scrollToLine,
    cssEscape,
    startRestTimer,
    consumeAthleteImport,
  };
}

export async function routeAthleteClickAction(action, context) {
  const {
    element,
    root,
    toast,
    getUiState,
    applyUiState,
    applyUiPatch,
    finalizeUiChange,
    renderUi,
    setUiState,
    invalidateHydrationCache,
    shouldHydratePage,
    hydratePage,
    hydrateAthleteSummary,
    hydrateAthleteResultsBlock,
    syncAthletePrIfAuthenticated,
    resumePendingCheckout,
    isImportBusy,
    guardAthleteImport,
    emptyCoachPortal,
    emptyAthleteOverview,
    emptyAdmin,
  } = context;

  if (action === 'exercise:help') {
    context.handleExerciseHelpAction(element);
    return true;
  }

  const handledByAthleteModal = await routeAthleteModalClick(action, context);
  if (handledByAthleteModal) return true;

  const handledByAthleteAuth = await routeAthleteAuthClick(action, context);
  if (handledByAthleteAuth) return true;

  const handledByAthleteBilling = await routeAthleteBillingClick(action, context);
  if (handledByAthleteBilling) return true;

  const handledByAthletePage = await routeAthletePageClick(action, context);
  if (handledByAthletePage) return true;

  return routeAthleteTodayClick(action, {
    ...context,
    readAppState: readAthleteAppState,
  });
}
