import { getAppBridge } from '../../../../src/app/bridge.js';

export function registerAthleteChangeListeners({
  root,
  toast,
  applyUiPatch,
  finalizeUiChange,
  handleAthleteTodayChange,
}) {
  root.addEventListener('change', async (event) => {
    await handleAthleteTodayChange(event, {
      root,
      toast,
      applyUiPatch,
      finalizeUiChange,
      getAppBridge,
    });
  });
}

