export function buildAthleteAccountPageState(state, helpers) {
  const {
    describeAthleteBenefitSource,
    formatSubscriptionPlanName,
    isDeveloperEmail,
    normalizeAthleteBenefits,
    getAthleteImportUsage,
  } = helpers;

  const profile = state?.__ui?.auth?.profile || null;
  const coachPortal = state?.__ui?.coachPortal || {};
  const subscription = coachPortal?.subscription || null;
  const planKey = subscription?.plan || subscription?.plan_id || 'free';
  const planName = formatSubscriptionPlanName(planKey);
  const planStatus = subscription?.status || 'inactive';
  const renewAt = subscription?.renewAt || subscription?.renew_at || null;
  const canUseDeveloperTools = isDeveloperEmail(profile?.email) || !!profile?.isAdmin || !!profile?.is_admin;
  const isBusy = !!state?.__ui?.isBusy;
  const athleteBenefits = normalizeAthleteBenefits(state?.__ui?.athleteOverview?.athleteBenefits || null);
  const athleteBlocks = state?.__ui?.athleteOverview?.blocks || {};
  const importUsage = getAthleteImportUsage(athleteBenefits, 'pdf');
  const accessEntitlements = coachPortal?.entitlements || [];
  const canCoachManage = accessEntitlements.includes('coach_portal');
  const gyms = coachPortal?.gyms || [];
  const gymAccess = coachPortal?.gymAccess || [];
  const athleteStats = state?.__ui?.athleteOverview?.stats || {};
  const athleteBenefitSource = describeAthleteBenefitSource(athleteBenefits);
  const athleteResults = state?.__ui?.athleteOverview?.recentResults || [];
  const athleteWorkouts = state?.__ui?.athleteOverview?.recentWorkouts || [];
  const checkinSessions = state?.__ui?.athleteOverview?.checkinSessions || [];
  const measurements = state?.__ui?.athleteOverview?.measurements || [];
  const runningHistory = state?.__ui?.athleteOverview?.runningHistory || [];
  const strengthHistory = state?.__ui?.athleteOverview?.strengthHistory || [];
  const athleteOverview = state?.__ui?.athleteOverview || {};
  const profileCard = athleteOverview?.profileCard || null;
  const personalSubscription = athleteOverview?.personalSubscription || null;
  const preferences = state?.preferences || {};
  const accountView = ['overview', 'profile', 'checkins', 'preferences', 'data'].includes(state?.__ui?.accountView)
    ? state.__ui.accountView
    : 'overview';
  const isSummaryLoading = coachPortal?.status === 'loading' || athleteBlocks?.summary?.status === 'loading';
  const isWorkoutsLoading = athleteBlocks?.workouts?.status === 'loading';
  const isResultsLoading = athleteBlocks?.results?.status === 'loading';
  const isCheckinsLoading = athleteBlocks?.checkins?.status === 'loading';
  const selectedGymId = coachPortal?.selectedGymId
    || gyms?.[0]?.id
    || gymAccess?.find((item) => item?.gymId)?.gymId
    || null;
  const selectedGym = gyms.find((gym) => Number(gym?.id) === Number(selectedGymId)) || null;
  const showSnapshotNotice = (
    coachPortal?.status === 'ready'
    && (coachPortal?.stale || coachPortal?.source === 'snapshot')
  ) || (
    athleteBlocks?.summary?.status === 'ready'
    && (athleteOverview?.stale || athleteOverview?.source === 'snapshot')
  );

  return {
    profile,
    coachPortal,
    planName,
    planStatus,
    renewAt,
    canUseDeveloperTools,
    isBusy,
    athleteBenefits,
    importUsage,
    canCoachManage,
    gyms,
    gymAccess,
    athleteStats,
    athleteBenefitSource,
    athleteResults,
    athleteWorkouts,
    checkinSessions,
    measurements,
    runningHistory,
    strengthHistory,
    profileCard,
    personalSubscription,
    preferences,
    accountView,
    isSummaryLoading,
    isWorkoutsLoading,
    isResultsLoading,
    isCheckinsLoading,
    selectedGymId,
    selectedGym,
    showSnapshotNotice,
  };
}
