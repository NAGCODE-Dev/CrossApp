function createTimedCache() {
  return { key: '', value: null, task: null, snapshotAt: 0, networkAt: 0 };
}

function isFresh(cache, key, maxAgeMs) {
  return cache.key === key && cache.value && (Date.now() - cache.networkAt) < maxAgeMs;
}

function emptyBlockState() {
  return { status: 'idle', error: '' };
}

export function createAthleteOverviewDomain({
  measureAsync,
  emptyAthleteOverview,
  getAthleteSummary,
  getAthleteResultsSummary,
  getAthleteWorkoutsRecent,
  getAthleteCheckinSessions,
}) {
  let athleteSummaryCache = createTimedCache();
  let athleteResultsCache = createTimedCache();
  let athleteWorkoutsCache = createTimedCache();
  let athleteCheckinsCache = createTimedCache();

  function invalidateAthleteCache() {
    athleteSummaryCache = createTimedCache();
    athleteResultsCache = createTimedCache();
    athleteWorkoutsCache = createTimedCache();
    athleteCheckinsCache = createTimedCache();
  }

  function readSnapshot(cache, key) {
    return cache.key === key && cache.value ? cache.value : null;
  }

  function buildCacheEntry(cacheKey, value) {
    return {
      key: cacheKey,
      value,
      task: null,
      snapshotAt: Date.now(),
      networkAt: Date.now(),
    };
  }

  function buildAthleteOverviewPatch(currentOverview, partial = {}, block, status = 'ready', error = '') {
    const current = currentOverview && typeof currentOverview === 'object'
      ? currentOverview
      : emptyAthleteOverview();
    const nextBlocks = {
      summary: emptyBlockState(),
      results: emptyBlockState(),
      workouts: emptyBlockState(),
      ...(current.blocks || {}),
    };
    if (block) {
      nextBlocks[block] = { status, error: error || '' };
    }

    const next = {
      ...current,
      ...partial,
      blocks: nextBlocks,
    };

    const summaryReady = nextBlocks.summary.status === 'ready';
    const resultsReady = nextBlocks.results.status === 'ready';
    next.detailLevel = resultsReady ? 'full' : (summaryReady ? 'lite' : 'none');

    if (!Array.isArray(next.recentResults)) next.recentResults = [];
    if (!Array.isArray(next.recentWorkouts)) next.recentWorkouts = [];
    if (!Array.isArray(next.checkinSessions)) next.checkinSessions = [];
    if (!Array.isArray(next.benchmarkHistory)) next.benchmarkHistory = [];
    if (!Array.isArray(next.benchmarkLibrary)) next.benchmarkLibrary = [];
    if (typeof next.benchmarkLibraryQuery !== 'string') next.benchmarkLibraryQuery = '';
    if (typeof next.benchmarkLibraryError !== 'string') next.benchmarkLibraryError = '';
    if (!next.benchmarkLibraryPagination || typeof next.benchmarkLibraryPagination !== 'object') {
      next.benchmarkLibraryPagination = { total: 0, page: 1, limit: 12, pages: 1 };
    }
    if (!next.selectedBenchmark || typeof next.selectedBenchmark !== 'object') next.selectedBenchmark = null;
    if (typeof next.selectedBenchmarkError !== 'string') next.selectedBenchmarkError = '';
    if (!Array.isArray(next.prHistory)) next.prHistory = [];
    if (!Array.isArray(next.measurements)) next.measurements = [];
    if (!Array.isArray(next.runningHistory)) next.runningHistory = [];
    if (!Array.isArray(next.strengthHistory)) next.strengthHistory = [];
    if (!Array.isArray(next.gymAccess)) next.gymAccess = [];
    if (!next.prCurrent || typeof next.prCurrent !== 'object') next.prCurrent = {};
    if (!next.profileCard || typeof next.profileCard !== 'object') next.profileCard = null;
    if (!next.athleteBenefits || typeof next.athleteBenefits !== 'object') next.athleteBenefits = null;

    return next;
  }

  async function loadAthleteSummaryBlock(profileEmail, { force = false } = {}) {
    const email = String(profileEmail || '').trim().toLowerCase();
    if (!email) {
      return {
        stats: null,
        profileCard: null,
        athleteBenefits: null,
        personalSubscription: null,
        gymAccess: [],
      };
    }
    const cacheKey = `${email}::summary`;
    if (!force && isFresh(athleteSummaryCache, cacheKey, 20000)) return athleteSummaryCache.value;
    if (!force && athleteSummaryCache.key === cacheKey && athleteSummaryCache.task) return athleteSummaryCache.task;

    athleteSummaryCache.key = cacheKey;
    athleteSummaryCache.task = (async () => {
      const result = await measureAsync('account.summary', () => getAthleteSummary());
      const value = result?.data || {
        stats: null,
        profileCard: null,
        athleteBenefits: null,
        personalSubscription: null,
        gymAccess: [],
      };
      athleteSummaryCache = buildCacheEntry(cacheKey, value);
      return value;
    })();
    return athleteSummaryCache.task;
  }

  async function loadAthleteResultsBlock(profileEmail, { force = false } = {}) {
    const email = String(profileEmail || '').trim().toLowerCase();
    if (!email) {
      return {
        recentResults: [],
        benchmarkHistory: [],
        prHistory: [],
        prCurrent: {},
        measurements: [],
        runningHistory: [],
        strengthHistory: [],
      };
    }
    const cacheKey = `${email}::results`;
    if (!force && isFresh(athleteResultsCache, cacheKey, 30000)) return athleteResultsCache.value;
    if (!force && athleteResultsCache.key === cacheKey && athleteResultsCache.task) return athleteResultsCache.task;

    athleteResultsCache.key = cacheKey;
    athleteResultsCache.task = (async () => {
      const result = await measureAsync('account.results', () => getAthleteResultsSummary());
      const value = result?.data || {
        recentResults: [],
        benchmarkHistory: [],
        prHistory: [],
        prCurrent: {},
        measurements: [],
        runningHistory: [],
        strengthHistory: [],
      };
      athleteResultsCache = buildCacheEntry(cacheKey, value);
      return value;
    })();
    return athleteResultsCache.task;
  }

  async function loadAthleteWorkoutsBlock(profileEmail, { force = false } = {}) {
    const email = String(profileEmail || '').trim().toLowerCase();
    if (!email) return { recentWorkouts: [] };
    const cacheKey = `${email}::workouts`;
    if (!force && isFresh(athleteWorkoutsCache, cacheKey, 30000)) return athleteWorkoutsCache.value;
    if (!force && athleteWorkoutsCache.key === cacheKey && athleteWorkoutsCache.task) return athleteWorkoutsCache.task;

    athleteWorkoutsCache.key = cacheKey;
    athleteWorkoutsCache.task = (async () => {
      const result = await measureAsync('account.workouts', () => getAthleteWorkoutsRecent());
      const value = result?.data || { recentWorkouts: [] };
      athleteWorkoutsCache = buildCacheEntry(cacheKey, value);
      return value;
    })();
    return athleteWorkoutsCache.task;
  }

  async function loadAthleteCheckinsBlock(profileEmail, gymId, { force = false } = {}) {
    const email = String(profileEmail || '').trim().toLowerCase();
    const resolvedGymId = Number(gymId) || null;
    if (!email || !resolvedGymId) return { checkinSessions: [] };
    const cacheKey = `${email}::checkins::${resolvedGymId}`;
    if (!force && isFresh(athleteCheckinsCache, cacheKey, 30000)) return athleteCheckinsCache.value;
    if (!force && athleteCheckinsCache.key === cacheKey && athleteCheckinsCache.task) return athleteCheckinsCache.task;

    athleteCheckinsCache.key = cacheKey;
    athleteCheckinsCache.task = (async () => {
      const result = await measureAsync('account.checkins', () => getAthleteCheckinSessions({ gymId: resolvedGymId, limit: 8 }));
      const value = result?.data || { checkinSessions: [] };
      athleteCheckinsCache = buildCacheEntry(cacheKey, value);
      return value;
    })();
    return athleteCheckinsCache.task;
  }

  return {
    buildAthleteOverviewPatch,
    invalidateAthleteCache,
    loadAthleteSummaryBlock,
    loadAthleteResultsBlock,
    loadAthleteWorkoutsBlock,
    loadAthleteCheckinsBlock,
    peekAthleteSummaryBlock(profileEmail) {
      const email = String(profileEmail || '').trim().toLowerCase();
      if (!email) return null;
      return readSnapshot(athleteSummaryCache, `${email}::summary`);
    },
    peekAthleteResultsBlock(profileEmail) {
      const email = String(profileEmail || '').trim().toLowerCase();
      if (!email) return null;
      return readSnapshot(athleteResultsCache, `${email}::results`);
    },
    peekAthleteWorkoutsBlock(profileEmail) {
      const email = String(profileEmail || '').trim().toLowerCase();
      if (!email) return null;
      return readSnapshot(athleteWorkoutsCache, `${email}::workouts`);
    },
    peekAthleteCheckinsBlock(profileEmail, gymId) {
      const email = String(profileEmail || '').trim().toLowerCase();
      const resolvedGymId = Number(gymId) || null;
      if (!email || !resolvedGymId) return null;
      return readSnapshot(athleteCheckinsCache, `${email}::checkins::${resolvedGymId}`);
    },
    isAthleteSummaryFresh(profileEmail) {
      const email = String(profileEmail || '').trim().toLowerCase();
      return !!email && isFresh(athleteSummaryCache, `${email}::summary`, 20000);
    },
    isAthleteResultsFresh(profileEmail) {
      const email = String(profileEmail || '').trim().toLowerCase();
      return !!email && isFresh(athleteResultsCache, `${email}::results`, 30000);
    },
    isAthleteWorkoutsFresh(profileEmail) {
      const email = String(profileEmail || '').trim().toLowerCase();
      return !!email && isFresh(athleteWorkoutsCache, `${email}::workouts`, 30000);
    },
    isAthleteCheckinsFresh(profileEmail, gymId) {
      const email = String(profileEmail || '').trim().toLowerCase();
      const resolvedGymId = Number(gymId) || null;
      return !!email && !!resolvedGymId && isFresh(athleteCheckinsCache, `${email}::checkins::${resolvedGymId}`, 30000);
    },
  };
}
