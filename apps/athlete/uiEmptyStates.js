export function createEmptyAthleteOverviewState() {
  return {
    detailLevel: 'none',
    stats: null,
    recentResults: [],
    recentWorkouts: [],
    checkinSessions: [],
    benchmarkHistory: [],
    prHistory: [],
    prCurrent: {},
    measurements: [],
    runningHistory: [],
    strengthHistory: [],
    gymAccess: [],
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
