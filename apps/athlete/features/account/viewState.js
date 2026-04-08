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
  const canUseDeveloperTools = isDeveloperEmail(profile?.email);
  const isBusy = !!state?.__ui?.isBusy;
  const athleteBenefits = normalizeAthleteBenefits(state?.__ui?.athleteOverview?.athleteBenefits || null);
  const athleteBlocks = state?.__ui?.athleteOverview?.blocks || {};
  const importUsage = getAthleteImportUsage(athleteBenefits, 'pdf');
  const accessEntitlements = coachPortal?.entitlements || [];
  const canCoachManage = accessEntitlements.includes('coach_portal');
  const gyms = coachPortal?.gyms || [];
  const athleteStats = state?.__ui?.athleteOverview?.stats || {};
  const athleteBenefitSource = describeAthleteBenefitSource(athleteBenefits);
  const athleteResults = state?.__ui?.athleteOverview?.recentResults || [];
  const athleteWorkouts = state?.__ui?.athleteOverview?.recentWorkouts || [];
  const isSummaryLoading = coachPortal?.status === 'loading' || athleteBlocks?.summary?.status === 'loading';
  const isWorkoutsLoading = athleteBlocks?.workouts?.status === 'loading';
  const isResultsLoading = athleteBlocks?.results?.status === 'loading';

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
    athleteStats,
    athleteBenefitSource,
    athleteResults,
    athleteWorkouts,
    isSummaryLoading,
    isWorkoutsLoading,
    isResultsLoading,
  };
}

