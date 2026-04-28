export async function handleAthletePageSessionAction(action, context) {
  const {
    element,
    getUiState,
    applyUiState,
    applyUiPatch,
    finalizeUiChange,
    hydratePage,
    shouldHydratePage,
    invalidateHydrationCache,
    getAppBridge,
    maybeResumePendingCheckout,
    emptyCoachPortal,
    emptyAthleteOverview,
    emptyAdmin,
  } = context;

  switch (action) {
    case 'account:view:set': {
      const accountView = ['overview', 'preferences', 'data'].includes(element.dataset.accountView)
        ? String(element.dataset.accountView)
        : 'overview';
      await applyUiPatch((state) => ({ ...state, accountView }));
      return true;
    }

    case 'page:set': {
      const page = String(element.dataset.page || 'today');
      const nextAccountView = ['overview', 'preferences', 'data'].includes(element.dataset.accountView)
        ? String(element.dataset.accountView)
        : null;
      await applyUiPatch((state) => ({
        ...state,
        currentPage: page,
        ...(nextAccountView ? { accountView: nextAccountView } : {}),
      }));
      if (page === 'account' || page === 'history') {
        const profile = getAppBridge()?.getProfile?.()?.data || null;
        const ui = getUiState?.() || {};
        hydratePage(profile, page, ui?.coachPortal?.selectedGymId || null);
      }
      return true;
    }

    case 'auth:refresh': {
      const result = await getAppBridge().refreshSession();
      if (!result?.token && !result?.user) {
        throw new Error('Falha ao atualizar sessão');
      }
      const profile = result?.user || getAppBridge()?.getProfile?.()?.data || null;
      const ui = getUiState?.() || {};
      invalidateHydrationCache();
      await finalizeUiChange({ toastMessage: 'Sessão atualizada' });
      if (shouldHydratePage(ui?.currentPage || 'today')) {
        hydratePage(profile, ui?.currentPage || 'today', ui?.coachPortal?.selectedGymId || null);
      }
      if (await maybeResumePendingCheckout()) return true;
      return true;
    }

    case 'auth:signout': {
      await getAppBridge().signOut();
      invalidateHydrationCache();
      await applyUiState(
        {
          currentPage: 'today',
          accountView: 'overview',
          modal: null,
          authMode: 'signin',
          passwordReset: {},
          signupVerification: {},
          guide: { step: 0 },
          importStatus: {
            active: false,
            tone: 'idle',
            title: '',
            message: '',
            fileName: '',
            step: 'idle',
            review: null,
          },
          settings: {},
          wod: {},
          coachPortal: emptyCoachPortal(),
          athleteOverview: emptyAthleteOverview(),
          admin: typeof emptyAdmin === 'function' ? emptyAdmin() : { overview: null, query: '' },
        },
        { toastMessage: 'Sessão encerrada' },
      );
      return true;
    }

    case 'athlete:session:reserve':
    case 'athlete:session:checkin':
    case 'athlete:session:cancel': {
      const sessionId = Number(element?.dataset?.sessionId);
      const gymId = Number(element?.dataset?.gymId);
      if (!Number.isFinite(sessionId) || !Number.isFinite(gymId)) {
        throw new Error('Sessão inválida');
      }
      const bridge = getAppBridge();
      if (!bridge) {
        throw new Error('Bridge indisponível');
      }

      if (action === 'athlete:session:reserve') {
        await bridge.reserveAthleteCheckinSession?.(sessionId, { gymId });
      } else if (action === 'athlete:session:checkin') {
        await bridge.checkInAthleteSession?.(sessionId, { gymId });
      } else {
        await bridge.cancelAthleteCheckinSession?.(sessionId, { gymId });
      }

      invalidateHydrationCache({ coach: false, athlete: true, account: true });
      const profile = bridge.getProfile?.()?.data || null;
      const ui = getUiState?.() || {};
      await finalizeUiChange({
        toastMessage: action === 'athlete:session:reserve'
          ? 'Reserva confirmada'
          : action === 'athlete:session:checkin'
            ? 'Check-in realizado'
            : 'Reserva cancelada',
      });
      if (profile?.email) {
        hydratePage(profile, 'account', gymId || ui?.coachPortal?.selectedGymId || null, { force: true });
      }
      return true;
    }

    default:
      return false;
  }
}
