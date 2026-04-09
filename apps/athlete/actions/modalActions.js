import { clearPasswordResetSupportPolling } from '../features/account/authResetActions.js';

function emptyPasswordResetState() {
  return {
    open: false,
    step: 'request',
    email: '',
    code: '',
    previewCode: '',
    previewUrl: '',
    supportEmail: '',
    supportRequestKey: '',
    supportRequestStatus: '',
    supportApprovedAt: '',
    adminNotificationSent: false,
  };
}

async function closeModal(context) {
  const {
    applyUiPatch,
    toast,
    isImportBusy,
  } = context;

  if (isImportBusy?.()) {
    toast?.('A importacao ainda esta em andamento');
    return true;
  }

  clearPasswordResetSupportPolling();
  await applyUiPatch((state) => ({
    ...state,
    modal: null,
    passwordReset: emptyPasswordResetState(),
  }));
  return true;
}

export async function handleAthleteModalAction(action, context) {
  const {
    element,
    applyUiState,
    applyUiPatch,
    getAppBridge,
  } = context;

  switch (action) {
    case 'modal:open': {
      const modal = element.dataset.modal || null;
      if (modal === 'auth') {
        clearPasswordResetSupportPolling();
        await applyUiPatch(
          (state) => ({
            ...state,
            modal,
            passwordReset: emptyPasswordResetState(),
          }),
          { ensureGoogle: true, focusSelector: '#auth-email' },
        );
        const profile = getAppBridge?.()?.getProfile?.()?.data || null;
        if (profile?.is_admin || profile?.isAdmin) {
          try {
            const result = await getAppBridge().getAdminOverview({ limit: 25 });
            await applyUiState({ admin: { overview: result?.data || null, query: '' } });
          } catch (error) {
            console.warn('Falha ao carregar painel admin:', error?.message || error);
          }
        }
        return true;
      }
      await applyUiState(
        { modal },
        { focusSelector: modal === 'prs' ? '#ui-prsSearch' : (modal === 'auth' ? '#auth-email' : '') },
      );
      return true;
    }

    case 'modal:close':
      return closeModal(context);

    default:
      return false;
  }
}

export async function handleAthleteModalOverlayClick(event, context) {
  const overlay = event.target?.closest?.('.modal-overlay');
  if (!overlay || event.target !== overlay) return false;
  await closeModal(context);
  return true;
}

export async function handleAthleteModalEscapeKey(event, context) {
  if (event.key !== 'Escape') return false;
  const ui = context.getUiState?.();
  if (!ui?.modal) return false;
  await closeModal(context);
  return true;
}
