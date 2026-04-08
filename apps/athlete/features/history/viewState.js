export function buildAthleteHistoryPageState(state) {
  const athleteOverview = state?.__ui?.athleteOverview || {};
  const isAuthenticated = !!state?.__ui?.auth?.profile?.email;
  const blocks = athleteOverview?.blocks || {};
  const summaryState = blocks?.summary?.status || 'idle';
  const resultsState = blocks?.results?.status || 'idle';
  const benchmarkHistory = athleteOverview?.benchmarkHistory || [];
  const prHistory = athleteOverview?.prHistory || [];
  const athleteStats = athleteOverview?.stats || {};
  const isBusy = !!state?.__ui?.isBusy;
  const isSummaryLoading = isAuthenticated && summaryState === 'loading' && !athleteOverview?.stats;
  const isDetailLoading = isAuthenticated && (resultsState === 'loading' || (resultsState === 'idle' && athleteOverview?.detailLevel !== 'full'));
  const isDetailError = resultsState === 'error';
  const resultsLogged = Number(athleteStats?.resultsLogged || 0);
  const progressSummary = [
    !isDetailLoading && benchmarkHistory.length ? `${benchmarkHistory.length} benchmark(s) com histórico` : null,
    !isDetailLoading && prHistory.length ? `${prHistory.length} PR(s) acompanhados` : null,
    !isSummaryLoading && resultsLogged ? `${resultsLogged} resultado(s) registrado(s)` : null,
  ].filter(Boolean).join(' • ');

  return {
    benchmarkHistory,
    prHistory,
    isBusy,
    isSummaryLoading,
    isDetailLoading,
    isDetailError,
    resultsLogged,
    progressSummary,
  };
}

