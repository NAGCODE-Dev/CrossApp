export function buildAthleteHistoryPageState(state) {
  const athleteOverview = state?.__ui?.athleteOverview || {};
  const isAuthenticated = !!state?.__ui?.auth?.profile?.email;
  const blocks = athleteOverview?.blocks || {};
  const summaryState = blocks?.summary?.status || 'idle';
  const resultsState = blocks?.results?.status || 'idle';
  const workoutsState = blocks?.workouts?.status || 'idle';
  const benchmarkHistory = athleteOverview?.benchmarkHistory || [];
  const benchmarkLibrary = athleteOverview?.benchmarkLibrary || [];
  const benchmarkLibraryPagination = athleteOverview?.benchmarkLibraryPagination || { total: 0, page: 1, limit: 12, pages: 1 };
  const benchmarkLibraryQuery = athleteOverview?.benchmarkLibraryQuery || '';
  const selectedBenchmark = athleteOverview?.selectedBenchmark || null;
  const prHistory = athleteOverview?.prHistory || [];
  const recentResults = athleteOverview?.recentResults || [];
  const recentWorkouts = athleteOverview?.recentWorkouts || [];
  const measurements = athleteOverview?.measurements || [];
  const runningHistory = athleteOverview?.runningHistory || [];
  const strengthHistory = athleteOverview?.strengthHistory || [];
  const athleteStats = athleteOverview?.stats || {};
  const isBusy = !!state?.__ui?.isBusy;
  const historyView = ['overview', 'benchmarks', 'activity', 'body', 'sessions'].includes(state?.__ui?.historyView)
    ? state.__ui.historyView
    : 'overview';
  const isSummaryLoading = isAuthenticated && summaryState === 'loading' && !athleteOverview?.stats;
  const isDetailLoading = isAuthenticated && (resultsState === 'loading' || (resultsState === 'idle' && athleteOverview?.detailLevel !== 'full'));
  const isWorkoutsLoading = isAuthenticated && workoutsState === 'loading' && !athleteOverview?.recentWorkouts?.length;
  const isDetailError = resultsState === 'error';
  const resultsLogged = Number(athleteStats?.resultsLogged || 0);
  const progressSummary = [
    !isDetailLoading && benchmarkHistory.length ? `${benchmarkHistory.length} benchmark(s) com histórico` : null,
    !isDetailLoading && prHistory.length ? `${prHistory.length} PR(s) acompanhados` : null,
    !isSummaryLoading && resultsLogged ? `${resultsLogged} resultado(s) registrado(s)` : null,
  ].filter(Boolean).join(' • ');
  const showSnapshotNotice = (
    summaryState === 'ready' || resultsState === 'ready'
  ) && (
    athleteOverview?.stale || athleteOverview?.source === 'snapshot'
  );

  return {
    benchmarkHistory,
    benchmarkLibrary,
    benchmarkLibraryPagination,
    benchmarkLibraryQuery,
    selectedBenchmark,
    prHistory,
    recentResults,
    recentWorkouts,
    measurements,
    runningHistory,
    strengthHistory,
    historyView,
    isBusy,
    isSummaryLoading,
    isDetailLoading,
    isWorkoutsLoading,
    isDetailError,
    resultsLogged,
    progressSummary,
    showSnapshotNotice,
  };
}
