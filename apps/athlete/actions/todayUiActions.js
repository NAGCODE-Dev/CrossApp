export async function handleAthleteWodAction(action, context) {
  const {
    element,
    root,
    toast,
    getUiState,
    applyUiPatch,
    workoutKeyFromAppState,
    getActiveLineIdFromUi,
    getLineIdsFromDOM,
    pickNextId,
    pickPrevId,
    scrollToLine,
    startRestTimer,
  } = context;

  switch (action) {
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

export async function handleAthleteTodayChangeAction(event, context) {
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
