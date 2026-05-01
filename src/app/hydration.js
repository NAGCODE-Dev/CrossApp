import { createCoachPortalDomain } from './coachPortalDomain.js';
import { createAthleteOverviewDomain } from './athleteOverviewDomain.js';
import { createEmptyAdminState } from '../../apps/athlete/uiState.js';

export function createHydrationController({
  getUiState,
  patchUiState,
  rerender,
  measureAsync,
  emptyCoachPortal,
  emptyAthleteOverview,
  getProfile,
  getSubscriptionStatus,
  getEntitlements,
  getMyGyms,
  getAthleteSummary,
  getAthleteResultsSummary,
  getAthleteWorkoutsRecent,
  getAthleteCheckinSessions,
}) {
  const HYDRATION_METRICS_KEY = '__RYXEN_HYDRATION_METRICS__';

  function pushHydrationMetric(entry) {
    try {
      const current = Array.isArray(window[HYDRATION_METRICS_KEY]) ? window[HYDRATION_METRICS_KEY] : [];
      window[HYDRATION_METRICS_KEY] = [...current, { ...entry, at: new Date().toISOString() }].slice(-60);
    } catch {
      // no-op
    }
  }

  function getProfileEmail(profile = null) {
    return String(profile?.email || '').trim().toLowerCase();
  }

  function shouldHydratePage(page) {
    return page === 'account' || page === 'history';
  }

  function resolveAuthHydrationOptions(page) {
    if (page === 'account') return { hydrateCoach: true, hydrateSummary: true };
    if (page === 'history') return { hydrateSummary: true, hydrateResults: true };
    return null;
  }

  const backgroundTasks = new Map();

  function createTaskKey(scope, profile, extra = '') {
    return `${scope}::${getProfileEmail(profile)}::${extra || '-'}`;
  }

  function runBackgroundTask(taskKey, taskFactory) {
    const inFlight = backgroundTasks.get(taskKey);
    if (inFlight) return inFlight;

    const task = Promise.resolve()
      .then(() => taskFactory())
      .finally(() => {
        if (backgroundTasks.get(taskKey) === task) {
          backgroundTasks.delete(taskKey);
        }
      });

    backgroundTasks.set(taskKey, task);
    return task;
  }

  function deferBackgroundTask(taskFactory) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        Promise.resolve()
          .then(() => taskFactory())
          .then(resolve)
          .catch(reject);
      }, 0);
    });
  }

  const coachPortalDomain = createCoachPortalDomain({
    measureAsync,
    emptyCoachPortal,
    getSubscriptionStatus,
    getEntitlements,
    getMyGyms,
  });
  const athleteOverviewDomain = createAthleteOverviewDomain({
    measureAsync,
    emptyAthleteOverview,
    getAthleteSummary,
    getAthleteResultsSummary,
    getAthleteWorkoutsRecent,
    getAthleteCheckinSessions,
  });
  const {
    invalidateCoachCache,
    loadCoachSnapshot,
    peekCoachSnapshot,
    isCoachSnapshotFresh,
  } = coachPortalDomain;
  const {
    buildAthleteOverviewPatch,
    invalidateAthleteCache,
    loadAthleteSummaryBlock,
    loadAthleteResultsBlock,
    loadAthleteWorkoutsBlock,
    loadAthleteCheckinsBlock,
    peekAthleteSummaryBlock,
    peekAthleteResultsBlock,
    peekAthleteWorkoutsBlock,
    peekAthleteCheckinsBlock,
    isAthleteSummaryFresh,
    isAthleteResultsFresh,
    isAthleteWorkoutsFresh,
    isAthleteCheckinsFresh,
  } = athleteOverviewDomain;

  async function patchAthleteBlock(block, status, partial = null, error = '') {
    await patchUiState((s) => ({
      ...s,
      athleteOverview: buildAthleteOverviewPatch(s?.athleteOverview, partial || undefined, block, status, error),
    }));
    await rerender();
  }

  async function patchCoachBlock(status, partial = null, error = '') {
    await patchUiState((s) => ({
      ...s,
      coachPortal: {
        ...emptyCoachPortal(),
        ...(s?.coachPortal || {}),
        ...(partial || {}),
        status,
        error: error || '',
      },
    }));
    await rerender();
  }

  function shouldApplyPagePatch(expectedPage) {
    const currentPage = getUiState?.()?.currentPage || 'today';
    return currentPage === expectedPage;
  }

  function buildReadyOverviewFromSnapshot(currentOverview, partial = {}, block) {
    return buildAthleteOverviewPatch(currentOverview, partial, block, 'ready');
  }

  function invalidateHydrationCache({ coach = true, athlete = true, account = true } = {}) {
    if (coach || account) {
      invalidateCoachCache();
    }
    if (athlete || account) {
      invalidateAthleteCache();
    }
  }

  async function loadAdminSnapshot() {
    return createEmptyAdminState();
  }

  async function hydrateCoachBlock(profile, selectedGymId = null, { force = false, page = 'account' } = {}) {
    if (!profile?.email) return emptyCoachPortal();
    const current = getUiState?.()?.coachPortal || {};
    if (!force && current?.status === 'ready' && current?.subscription) return current;
    const email = getProfileEmail(profile);
    if (!force) {
      const cached = peekCoachSnapshot(email, selectedGymId);
      if (cached) {
        if (shouldApplyPagePatch(page)) {
          await patchCoachBlock('ready', { ...cached, source: 'snapshot', stale: !isCoachSnapshotFresh(email, selectedGymId) });
        }
        pushHydrationMetric({ page, block: 'coach', source: 'snapshot' });
        if (isCoachSnapshotFresh(email, selectedGymId)) return cached;
      } else {
        await patchCoachBlock('loading');
      }
    } else if (!current?.subscription) {
      await patchCoachBlock('loading');
    }
    try {
      const coachPortal = await loadCoachSnapshot(email, selectedGymId, { force });
      if (!shouldApplyPagePatch(page)) return coachPortal;
      await patchCoachBlock('ready', { ...coachPortal, source: 'network', stale: false });
      pushHydrationMetric({ page, block: 'coach', source: 'network' });
      return coachPortal;
    } catch (error) {
      const fallback = { ...emptyCoachPortal(), status: 'error', error: error?.message || 'Falha ao carregar portal do coach' };
      if (current?.status === 'ready' && current?.subscription) {
        if (shouldApplyPagePatch(page)) {
          await patchCoachBlock('ready', { ...current, stale: true, source: current.source || 'snapshot', error: error?.message || '' }, '');
        }
        return current;
      }
      if (shouldApplyPagePatch(page)) {
        await patchCoachBlock('error', fallback, fallback.error);
      }
      return fallback;
    }
  }

  async function hydrateAthleteSummary(profile, { force = false, page = 'account' } = {}) {
    if (!profile?.email) return emptyAthleteOverview();
    const current = getUiState?.()?.athleteOverview || {};
    if (!force && current?.blocks?.summary?.status === 'ready' && current?.stats) return current;
    const email = getProfileEmail(profile);
    if (!force) {
      const cached = peekAthleteSummaryBlock(email);
      if (cached) {
        if (shouldApplyPagePatch(page)) {
          await patchUiState((s) => ({
            ...s,
            athleteOverview: buildReadyOverviewFromSnapshot(s?.athleteOverview, { ...cached, source: 'snapshot', stale: !isAthleteSummaryFresh(email) }, 'summary'),
          }));
          await rerender();
        }
        pushHydrationMetric({ page, block: 'summary', source: 'snapshot' });
        if (isAthleteSummaryFresh(email)) return cached;
      } else {
        await patchAthleteBlock('summary', 'loading');
      }
    } else if (!current?.stats) {
      await patchAthleteBlock('summary', 'loading');
    }
    try {
      const summary = await loadAthleteSummaryBlock(email, { force });
      if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('summary', 'ready', { ...summary, source: 'network', stale: false });
      }
      pushHydrationMetric({ page, block: 'summary', source: 'network' });
      return summary;
    } catch (error) {
      if (current?.blocks?.summary?.status === 'ready' && current?.stats) {
        return current;
      }
      if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('summary', 'error', null, error?.message || 'Falha ao carregar resumo');
      }
      return current;
    }
  }

  async function hydrateAthleteResultsBlock(profile, { force = false, page = 'history' } = {}) {
    if (!profile?.email) return emptyAthleteOverview();
    const current = getUiState?.()?.athleteOverview || {};
    if (!force && current?.blocks?.results?.status === 'ready' && Array.isArray(current?.benchmarkHistory)) return current;
    const email = getProfileEmail(profile);
    if (!force) {
      const cached = peekAthleteResultsBlock(email);
      if (cached) {
        if (shouldApplyPagePatch(page)) {
          await patchUiState((s) => ({
            ...s,
            athleteOverview: buildReadyOverviewFromSnapshot(s?.athleteOverview, { ...cached, source: 'snapshot', stale: !isAthleteResultsFresh(email) }, 'results'),
          }));
          await rerender();
        }
        pushHydrationMetric({ page, block: 'results', source: 'snapshot' });
        if (isAthleteResultsFresh(email)) return cached;
      } else if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('results', 'loading');
      }
    } else if (!current?.benchmarkHistory?.length && shouldApplyPagePatch(page)) {
      await patchAthleteBlock('results', 'loading');
    }
    try {
      const results = await loadAthleteResultsBlock(email, { force });
      if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('results', 'ready', { ...results, source: 'network', stale: false });
      }
      pushHydrationMetric({ page, block: 'results', source: 'network' });
      return results;
    } catch (error) {
      if (current?.blocks?.results?.status === 'ready' && Array.isArray(current?.benchmarkHistory)) {
        return current;
      }
      if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('results', 'error', null, error?.message || 'Falha ao carregar resultados');
      }
      return current;
    }
  }

  async function hydrateAthleteWorkoutsBlock(profile, { force = false, page = 'account' } = {}) {
    if (!profile?.email) return emptyAthleteOverview();
    const current = getUiState?.()?.athleteOverview || {};
    if (!force && current?.blocks?.workouts?.status === 'ready') return current;
    const email = getProfileEmail(profile);
    if (!force) {
      const cached = peekAthleteWorkoutsBlock(email);
      if (cached) {
        if (shouldApplyPagePatch(page)) {
          await patchUiState((s) => ({
            ...s,
            athleteOverview: buildReadyOverviewFromSnapshot(s?.athleteOverview, { ...cached, source: 'snapshot', stale: !isAthleteWorkoutsFresh(email) }, 'workouts'),
          }));
          await rerender();
        }
        pushHydrationMetric({ page, block: 'workouts', source: 'snapshot' });
        if (isAthleteWorkoutsFresh(email)) return cached;
      } else if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('workouts', 'loading');
      }
    } else if (shouldApplyPagePatch(page) && !current?.recentWorkouts?.length) {
      await patchAthleteBlock('workouts', 'loading');
    }
    try {
      const workouts = await loadAthleteWorkoutsBlock(email, { force });
      if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('workouts', 'ready', { ...workouts, source: 'network', stale: false });
      }
      pushHydrationMetric({ page, block: 'workouts', source: 'network' });
      return workouts;
    } catch (error) {
      if (current?.blocks?.workouts?.status === 'ready') {
        return current;
      }
      if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('workouts', 'error', null, error?.message || 'Falha ao carregar treinos');
      }
      return current;
    }
  }

  async function hydrateAthleteCheckinsBlock(profile, gymId, { force = false, page = 'account' } = {}) {
    if (!profile?.email || !Number(gymId)) return emptyAthleteOverview();
    const current = getUiState?.()?.athleteOverview || {};
    const email = getProfileEmail(profile);
    const normalizedGymId = Number(gymId);
    if (!force && current?.blocks?.checkins?.status === 'ready' && Number(current?.checkinGymId) === normalizedGymId) return current;
    if (!force) {
      const cached = peekAthleteCheckinsBlock(email, normalizedGymId);
      if (cached) {
        if (shouldApplyPagePatch(page)) {
          await patchUiState((s) => ({
            ...s,
            athleteOverview: buildReadyOverviewFromSnapshot(
              s?.athleteOverview,
              { ...cached, checkinGymId: normalizedGymId, source: 'snapshot', stale: !isAthleteCheckinsFresh(email, normalizedGymId) },
              'checkins',
            ),
          }));
          await rerender();
        }
        pushHydrationMetric({ page, block: 'checkins', source: 'snapshot' });
        if (isAthleteCheckinsFresh(email, normalizedGymId)) return cached;
      } else if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('checkins', 'loading');
      }
    } else if (shouldApplyPagePatch(page) && Number(current?.checkinGymId) !== normalizedGymId) {
      await patchAthleteBlock('checkins', 'loading');
    }
    try {
      const checkins = await loadAthleteCheckinsBlock(email, normalizedGymId, { force });
      if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('checkins', 'ready', { ...checkins, checkinGymId: normalizedGymId, source: 'network', stale: false });
      }
      pushHydrationMetric({ page, block: 'checkins', source: 'network' });
      return checkins;
    } catch (error) {
      if (current?.blocks?.checkins?.status === 'ready' && Number(current?.checkinGymId) === normalizedGymId) {
        return current;
      }
      if (shouldApplyPagePatch(page)) {
        await patchAthleteBlock('checkins', 'error', null, error?.message || 'Falha ao carregar aulas');
      }
      return current;
    }
  }

  async function hydrateAccountSummary(profile, selectedGymId = null, { force = false } = {}) {
    if (!profile?.email) return;
    const coachPortal = await hydrateCoachBlock(profile, selectedGymId, { force, page: 'account' });
    const summary = await hydrateAthleteSummary(profile, { force, page: 'account' });
    const fallbackGymId = coachPortal?.selectedGymId
      || coachPortal?.gyms?.[0]?.id
      || summary?.gymAccess?.find((item) => item?.gymId)?.gymId
      || null;
    if (fallbackGymId) {
      await hydrateAthleteCheckinsBlock(profile, fallbackGymId, { force, page: 'account' });
    }
  }

  function hydrateAccountLazyBlocks(profile, { force = false } = {}) {
    if (!profile?.email) return;
    const taskKey = createTaskKey('account-lazy', profile, force ? 'force' : 'cache');
    runBackgroundTask(taskKey, () => deferBackgroundTask(() => Promise.allSettled([
      hydrateAthleteWorkoutsBlock(profile, { force, page: 'account' }),
      hydrateAthleteResultsBlock(profile, { force, page: 'account' }),
    ]))).catch(() => {});
  }

  function hydrateHistoryLazyBlocks(profile, { force = false } = {}) {
    if (!profile?.email) return;
    const taskKey = createTaskKey('history-lazy', profile, force ? 'force' : 'cache');
    runBackgroundTask(taskKey, () => deferBackgroundTask(() => Promise.allSettled([
      hydrateAthleteResultsBlock(profile, { force, page: 'history' }),
      hydrateAthleteWorkoutsBlock(profile, { force, page: 'history' }),
    ])))
      .catch(() => {});
  }

  async function hydratePage(profile, page, selectedGymId = null, { force = false } = {}) {
    if (!profile?.email) return;
    const taskKey = createTaskKey('page', profile, `${page}:${selectedGymId || 'default'}:${force ? 'force' : 'cache'}`);
    const inFlight = backgroundTasks.get(taskKey);
    if (inFlight) {
      await inFlight;
      return;
    }

    const task = (async () => {
      if (page === 'account') {
        await hydrateAccountSummary(profile, selectedGymId, { force });
        if (force || !isAthleteResultsFresh(getProfileEmail(profile)) || !isAthleteWorkoutsFresh(getProfileEmail(profile))) {
          hydrateAccountLazyBlocks(profile, { force: true });
        } else {
          hydrateAccountLazyBlocks(profile, { force: false });
        }
        return;
      }
      if (page === 'history') {
        await hydrateAthleteSummary(profile, { force, page: 'history' });
        if (force || !isAthleteResultsFresh(getProfileEmail(profile)) || !isAthleteWorkoutsFresh(getProfileEmail(profile))) {
          hydrateHistoryLazyBlocks(profile, { force: true });
        } else {
          hydrateHistoryLazyBlocks(profile, { force: false });
        }
      }
    })();

    backgroundTasks.set(taskKey, task);
    try {
      await task;
    } finally {
      if (backgroundTasks.get(taskKey) === task) {
        backgroundTasks.delete(taskKey);
      }
    }
  }

  async function loadAccountSnapshot(profile, selectedGymId, options = {}) {
    const nextState = {
      coachPortal: { ...emptyCoachPortal(), status: 'idle', error: '' },
      athleteOverview: emptyAthleteOverview(),
      admin: await loadAdminSnapshot(),
    };

    if (!profile?.email) return nextState;

    if (options.includeCoach !== false) {
      nextState.coachPortal = await loadCoachSnapshot(getProfileEmail(profile), selectedGymId, { force: !!options.force });
      nextState.coachPortal.source = 'network';
    }

    if (options.includeAthlete !== false) {
      const summary = await loadAthleteSummaryBlock(getProfileEmail(profile), { force: !!options.force });
      nextState.athleteOverview = buildAthleteOverviewPatch(nextState.athleteOverview, { ...summary, source: 'network' }, 'summary', 'ready');
      const fallbackGymId = nextState.coachPortal?.selectedGymId
        || nextState.coachPortal?.gyms?.[0]?.id
        || summary?.gymAccess?.find((item) => item?.gymId)?.gymId
        || null;
      if (fallbackGymId) {
        const checkins = await loadAthleteCheckinsBlock(getProfileEmail(profile), fallbackGymId, { force: !!options.force });
        nextState.athleteOverview = buildAthleteOverviewPatch(nextState.athleteOverview, { ...checkins, checkinGymId: fallbackGymId, source: 'network' }, 'checkins', 'ready');
      }
      if (options.includeAthleteResults) {
        const results = await loadAthleteResultsBlock(getProfileEmail(profile), { force: !!options.force });
        nextState.athleteOverview = buildAthleteOverviewPatch(nextState.athleteOverview, { ...results, source: 'network' }, 'results', 'ready');
      }
    }

    return nextState;
  }

  async function hydrateAccountSnapshotInBackground(profile, selectedGymId = null, options = {}) {
    const page = options.page || getUiState?.()?.currentPage || 'today';
    return hydratePage(profile, page, selectedGymId, { force: !!options.force });
  }

  async function hydrateAthleteOverviewFullInBackground(profile = null, options = {}) {
    const targetProfile = profile || getProfile();
    return hydrateAthleteResultsBlock(targetProfile, { force: !!options.force });
  }

  return {
    shouldHydratePage,
    resolveAuthHydrationOptions,
    invalidateHydrationCache,
    loadCoachSnapshot,
    loadAdminSnapshot,
    loadAccountSnapshot,
    hydratePage,
    hydrateCoachBlock,
    hydrateAccountSummary,
    hydrateAthleteSummary,
    hydrateAthleteResultsBlock,
    hydrateAthleteWorkoutsBlock,
    hydrateAthleteCheckinsBlock,
    hydrateAccountLazyBlocks,
    hydrateHistoryLazyBlocks,
    hydrateAccountSnapshotInBackground,
    hydrateAthleteOverviewFullInBackground,
  };
}
