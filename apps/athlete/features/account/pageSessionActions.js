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

  async function loadBenchmarkLibrary({
    query = '',
    page = 1,
    autoSelect = false,
  } = {}) {
    const bridge = getAppBridge();
    if (!bridge?.getBenchmarks) {
      throw new Error('Biblioteca de benchmarks indisponível');
    }

    try {
      const result = await bridge.getBenchmarks({
        q: query,
        page,
        limit: 12,
        sort: 'year_desc',
      });
      const items = result?.data?.benchmarks || [];
      const pagination = result?.data?.pagination || { total: 0, page: 1, limit: 12, pages: 1 };

      await applyUiPatch((state) => {
        const currentSelectedSlug = state?.athleteOverview?.selectedBenchmark?.benchmark?.slug || '';
        const selectionStillExists = items.some((item) => item.slug === currentSelectedSlug);
        return {
          ...state,
          athleteOverview: {
            ...(state?.athleteOverview || {}),
            benchmarkLibrary: items,
            benchmarkLibraryPagination: pagination,
            benchmarkLibraryQuery: query,
            benchmarkLibraryError: '',
            selectedBenchmark: selectionStillExists ? state?.athleteOverview?.selectedBenchmark || null : null,
            selectedBenchmarkError: '',
          },
        };
      });

      if (autoSelect && items[0]?.slug) {
        await openBenchmarkDetail(items[0].slug);
      }
      return true;
    } catch (error) {
      await applyUiPatch((state) => ({
        ...state,
        athleteOverview: {
          ...(state?.athleteOverview || {}),
          benchmarkLibrary: [],
          benchmarkLibraryPagination: { total: 0, page: 1, limit: 12, pages: 1 },
          benchmarkLibraryQuery: query,
          benchmarkLibraryError: 'Biblioteca indisponível agora. Tente novamente em instantes.',
          selectedBenchmark: null,
          selectedBenchmarkError: '',
        },
      }));
      return false;
    }
  }

  async function openBenchmarkDetail(slug) {
    const bridge = getAppBridge();
    if (!bridge?.getBenchmarkDetail) {
      throw new Error('Detalhe do benchmark indisponível');
    }
    const ui = getUiState?.() || {};
    const gymId = ui?.coachPortal?.selectedGymId || null;
    try {
      const result = await bridge.getBenchmarkDetail(slug, {
        gymId,
        limit: 8,
      });

      await applyUiPatch((state) => ({
        ...state,
        athleteOverview: {
          ...(state?.athleteOverview || {}),
          selectedBenchmark: result?.data || null,
          selectedBenchmarkError: '',
        },
      }));
      return true;
    } catch (error) {
      await applyUiPatch((state) => ({
        ...state,
        athleteOverview: {
          ...(state?.athleteOverview || {}),
          selectedBenchmark: null,
          selectedBenchmarkError: 'Não foi possível abrir este benchmark agora.',
        },
      }));
      return false;
    }
  }

  switch (action) {
    case 'account:view:set': {
      const accountView = ['overview', 'profile', 'checkins', 'preferences', 'data'].includes(element.dataset.accountView)
        ? String(element.dataset.accountView)
        : 'overview';
      await applyUiPatch((state) => ({ ...state, accountView }));
      return true;
    }

    case 'history:view:set': {
      const historyView = ['overview', 'benchmarks', 'activity', 'body', 'sessions'].includes(element.dataset.historyView)
        ? String(element.dataset.historyView)
        : 'overview';
      await applyUiPatch((state) => ({ ...state, historyView }));
      return true;
    }

    case 'nav:toggle': {
      await applyUiPatch((state) => ({
        ...state,
        bottomNavCollapsed: !(state?.bottomNavCollapsed === true),
      }));
      return true;
    }

    case 'page:set': {
      const page = String(element.dataset.page || 'today');
      const nextAccountView = ['overview', 'profile', 'checkins', 'preferences', 'data'].includes(element.dataset.accountView)
        ? String(element.dataset.accountView)
        : null;
      const nextHistoryView = ['overview', 'benchmarks', 'activity', 'body', 'sessions'].includes(element.dataset.historyView)
        ? String(element.dataset.historyView)
        : null;
      await applyUiPatch((state) => ({
        ...state,
        currentPage: page,
        ...(nextAccountView ? { accountView: nextAccountView } : {}),
        ...(nextHistoryView ? { historyView: nextHistoryView } : {}),
      }));
      if (page === 'account' || page === 'history') {
        const profile = getAppBridge()?.getProfile?.()?.data || null;
        const ui = getUiState?.() || {};
        hydratePage(profile, page, ui?.coachPortal?.selectedGymId || null);
        if (page === 'history' && profile?.email) {
          const currentLibrary = ui?.athleteOverview?.benchmarkLibrary || [];
          if (!currentLibrary.length) {
            await loadBenchmarkLibrary({ autoSelect: true });
          }
        }
      }
      return true;
    }

    case 'history:benchmarks:search': {
      const query = String(document.querySelector('#history-benchmark-query')?.value || '').trim();
      await loadBenchmarkLibrary({ query, autoSelect: true });
      return true;
    }

    case 'history:benchmark:open': {
      const slug = String(element?.dataset?.benchmarkSlug || '').trim().toLowerCase();
      if (!slug) throw new Error('Benchmark inválido');
      await openBenchmarkDetail(slug);
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
          historyView: 'overview',
          bottomNavCollapsed: false,
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

    case 'athlete:profile:save': {
      const bridge = getAppBridge();
      if (!bridge?.updateMyProfile) {
        throw new Error('Atualização de perfil indisponível');
      }

      const form = element?.closest?.('form');
      if (!form) {
        throw new Error('Formulário de perfil não encontrado');
      }

      const payload = {
        name: form.querySelector('[name="name"]')?.value || '',
        displayName: form.querySelector('[name="displayName"]')?.value || '',
        handle: form.querySelector('[name="handle"]')?.value || '',
        avatarUrl: form.querySelector('[name="avatarUrl"]')?.value || '',
        bio: form.querySelector('[name="bio"]')?.value || '',
        profileVisibility: form.querySelector('[name="profileVisibility"]')?.value || 'members',
        attendanceDisplay: form.querySelector('[name="attendanceDisplay"]')?.value || 'display_name',
      };

      const result = await bridge.updateMyProfile(payload);
      const profile = result?.user || result?.data?.user || bridge.getProfile?.()?.data || null;
      invalidateHydrationCache({ coach: false, athlete: true, account: true });
      await finalizeUiChange({ toastMessage: 'Perfil atualizado' });
      if (profile?.email) {
        hydratePage(profile, 'account', getUiState?.()?.coachPortal?.selectedGymId || null, { force: true });
      }
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
