import { handleAthleteImportAction } from './todayImportActions.js';
import { handleAthletePrAction } from './todayPrActions.js';
import {
  handleAthleteTodayChangeAction,
  handleAthleteWodAction,
} from './todayUiActions.js';

export async function handleAthleteTodayAction(action, context) {
  const {
    element,
    finalizeUiChange,
    renderUi,
    getAppBridge,
  } = context;

  const handledByImport = await handleAthleteImportAction(action, context);
  if (handledByImport) return true;

  const handledByPrs = await handleAthletePrAction(action, context);
  if (handledByPrs) return true;

  const handledByWod = await handleAthleteWodAction(action, context);
  if (handledByWod) return true;

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

    default:
      return false;
  }
}

export async function handleAthleteTodayChange(event, context) {
  return handleAthleteTodayChangeAction(event, context);
}
