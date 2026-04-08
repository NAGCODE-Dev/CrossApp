import {
  hasCheckoutAuth,
  peekCheckoutIntent,
  queueCheckoutIntent,
} from '../../../../src/core/services/subscriptionService.js';
import { getAppBridge } from '../../../../src/app/bridge.js';
import {
  maybePrimeCheckoutIntentFromUrl,
  normalizeCheckoutPlan,
} from '../account/services.js';

export function queueAthleteCheckoutBootstrap({
  applyUiPatch,
  getEnsureGoogleSignInUi,
  maybeResumePendingCheckout,
}) {
  queueMicrotask(async () => {
    try {
      await maybePrimeCheckoutIntentFromUrl({
        getAppBridge,
        hasCheckoutAuth,
        queueCheckoutIntent,
        normalizeCheckoutPlan,
        maybeResumePendingCheckout,
        applyUiPatch,
      });
      await getEnsureGoogleSignInUi?.()?.();
      if (peekCheckoutIntent() && hasCheckoutAuth() && getAppBridge()?.getProfile?.()?.data?.email) {
        await maybeResumePendingCheckout();
      }
    } catch (error) {
      console.warn('Falha ao preparar checkout pendente:', error?.message || error);
    }
  });
}
