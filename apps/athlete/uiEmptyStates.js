export function createEmptyAthleteOverviewState() {
  return {
    detailLevel: 'none',
    stats: null,
    recentResults: [],
    recentWorkouts: [],
    checkinSessions: [],
    benchmarkHistory: [],
    benchmarkLibrary: [],
    benchmarkLibraryPagination: { total: 0, page: 1, limit: 12, pages: 1 },
    benchmarkLibraryQuery: '',
    selectedBenchmark: null,
    prHistory: [],
    prCurrent: {},
    measurements: [],
    runningHistory: [],
    strengthHistory: [],
    gymAccess: [],
    profileCard: null,
    personalSubscription: null,
    athleteBenefits: null,
    blocks: {
      summary: { status: 'idle', error: '' },
      results: { status: 'idle', error: '' },
      workouts: { status: 'idle', error: '' },
      checkins: { status: 'idle', error: '' },
    },
  };
}

export function createEmptyCoachPortalState() {
  return {
    subscription: null,
    entitlements: [],
    gymAccess: [],
    gyms: [],
    selectedGymId: null,
    status: 'idle',
    error: '',
  };
}

export function createEmptyAdminState() {
  return {
    overview: null,
    query: '',
  };
}
