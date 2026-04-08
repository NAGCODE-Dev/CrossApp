import { handleAthleteImportAction } from './todayImportActions.js';
import { handleAthletePrAction } from './todayPrActions.js';

export async function handleAthleteTodayAction(action, context) {
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
    getAppBridge,
    readAppState,
    isImportBusy,
    idleImportStatus,
    guardAthleteImport,
    prepareImportFileForClientUse,
    pickPdfFile,
    pickJsonFile,
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
    startRestTimer,
  } = context;

  const handledByImport = await handleAthleteImportAction(action, context);
  if (handledByImport) return true;

  const handledByPrs = await handleAthletePrAction(action, context);
  if (handledByPrs) return true;

  switch (action) {
    case 'week:select': {
      const week = Number(element.dataset.week);
      if (!Number.isFinite(week)) return true;
      await getAppBridge().selectWeek(week);
      await renderUi();
      return true;
    }

    case 'day:auto': {
      if (typeof getAppBridge()?.resetDay === 'function') {
        const result = await getAppBridge().resetDay();
        if (result?.success === false) throw new Error(result?.error || 'Falha ao voltar para automático');
      } else if (typeof getAppBridge()?.setDay === 'function') {
        const result = await getAppBridge().setDay('');
        if (result?.success === false) throw new Error(result?.error || 'Falha ao voltar para automático');
      }
      await finalizeUiChange({ toastMessage: 'Dia automático' });
      return true;
    }

    case 'workout:source': {
      const source = String(element.dataset.source || 'uploaded').trim().toLowerCase();
      const nextPriority = source === 'coach' ? 'coach' : 'uploaded';

      if (typeof getAppBridge()?.setPreferences !== 'function') {
        throw new Error('Alternância de treino indisponível');
      }

      const result = await getAppBridge().setPreferences({ workoutPriority: nextPriority });
      if (!result?.success) {
        throw new Error(result?.error || 'Falha ao alternar fonte do treino');
      }

      await finalizeUiChange({
        toastMessage: nextPriority === 'coach' ? 'Mostrando treino do coach' : 'Mostrando planilha enviada',
      });
      return true;
    }

    case 'wod:toggle': {
      const lineId = element.dataset.lineId;
      if (!lineId) return true;

      await applyUiPatch((state) => {
        const next = { ...state };
        const key = workoutKeyFromAppState();
        next.wod = next.wod || {};
        const wod = next.wod[key] || { activeLineId: null, done: {} };
        wod.done = wod.done || {};
        wod.done[lineId] = !wod.done[lineId];
        wod.activeLineId = lineId;
        next.wod[key] = wod;
        return next;
      });
      scrollToLine(root, lineId);
      return true;
    }

    case 'wod:next': {
      await applyUiPatch((state) => {
        const next = { ...state };
        const key = workoutKeyFromAppState();
        next.wod = next.wod || {};
        const wod = next.wod[key] || { activeLineId: null, done: {} };
        wod.done = wod.done || {};

        const ids = getLineIdsFromDOM(root);
        if (!ids.length) return next;

        const current = wod.activeLineId;
        if (current && ids.includes(current)) wod.done[current] = true;

        const nextId = pickNextId(ids, wod.done, current);
        wod.activeLineId = nextId;
        next.wod[key] = wod;
        return next;
      });
      const id = getActiveLineIdFromUi(getUiState(), workoutKeyFromAppState());
      if (id) scrollToLine(root, id);
      return true;
    }

    case 'wod:prev': {
      await applyUiPatch((state) => {
        const next = { ...state };
        const key = workoutKeyFromAppState();
        next.wod = next.wod || {};
        const wod = next.wod[key] || { activeLineId: null, done: {} };

        const ids = getLineIdsFromDOM(root);
        if (!ids.length) return next;

        const current = wod.activeLineId;
        wod.activeLineId = pickPrevId(ids, current);
        next.wod[key] = wod;
        return next;
      });
      const id = getActiveLineIdFromUi(getUiState(), workoutKeyFromAppState());
      if (id) scrollToLine(root, id);
      return true;
    }

    case 'timer:start': {
      const seconds = Number(element.dataset.seconds);
      if (!seconds || seconds <= 0) return true;
      startRestTimer(seconds, toast);
      return true;
    }

    default:
      return false;
  }
}

export async function handleAthleteTodayChange(event, context) {
  const {
    root,
    toast,
    applyUiPatch,
    finalizeUiChange,
    getAppBridge,
  } = context;

  const settingsToggle = event.target?.closest?.('[data-setting-toggle]');
  if (settingsToggle) {
    const showLbsConversion = !!root.querySelector('#setting-showLbsConversion')?.checked;
    const showEmojis = !!root.querySelector('#setting-showEmojis')?.checked;
    const showObjectivesInWods = !!root.querySelector('#setting-showObjectives')?.checked;

    try {
      if (typeof getAppBridge()?.setPreferences === 'function') {
        const corePrefsResult = await getAppBridge().setPreferences({
          showLbsConversion,
          showEmojis,
          showGoals: showObjectivesInWods,
          autoConvertLbs: showLbsConversion,
        });

        if (!corePrefsResult?.success) {
          throw new Error(corePrefsResult?.error || 'Falha ao salvar preferências');
        }
      }

      await applyUiPatch(
        (state) => ({
          ...state,
          settings: { showLbsConversion, showEmojis, showObjectivesInWods },
        }),
        { toastMessage: 'Preferência salva' },
      );
    } catch (error) {
      toast(error?.message || 'Erro ao salvar preferência');
      console.error(error);
    }
    return true;
  }

  const actionElement = event.target.closest('[data-action="day:set"]');
  if (!actionElement) return false;

  const dayName = actionElement.value;
  if (!dayName) return true;

  try {
    const result = await getAppBridge().setDay(dayName);
    if (!result?.success) throw new Error(result?.error || 'Falha ao definir dia');

    actionElement.value = '';
    await finalizeUiChange({ toastMessage: `Dia manual: ${result.day || dayName}` });
  } catch (error) {
    toast(error?.message || 'Erro');
    console.error(error);
  }
  return true;
}
