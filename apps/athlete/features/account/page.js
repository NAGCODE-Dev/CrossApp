import {
  renderAccountAccessSection,
  renderAccountActivitySection,
  renderAccountCoachPortalSection,
  renderGuestBenefitsSection,
  renderGuestCoachPortalSection,
} from './sections.js';

export function renderAthleteAccountPage(state, helpers) {
  const {
    renderPageHero,
    renderPageFold,
    renderAccountSkeleton,
    describeAthleteBenefitSource,
    formatSubscriptionPlanName,
    formatDateShort,
    escapeHtml,
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

  if (!profile?.email) {
    return `
      <div class="workout-container page-stack page-stack-account">
        ${renderPageHero({
          eyebrow: 'Conta',
          title: 'Sua conta',
          subtitle: 'Salve seu uso, recupere a senha por email e continue de onde parou.',
          actions: `
            <button class="btn-primary" data-action="modal:open" data-modal="auth" type="button">Entrar</button>
          `,
        })}

        ${renderGuestBenefitsSection(renderPageFold)}
        ${renderGuestCoachPortalSection(renderPageFold)}
      </div>
    `;
  }

  return `
    <div class="workout-container page-stack page-stack-account">
      ${renderPageHero({
        eyebrow: 'Conta',
        title: profile.name || 'Sua conta',
        subtitle: 'Acesso, plano e atividade recente em leitura direta.',
        actions: `
          <button class="btn-secondary" data-action="auth:refresh" type="button">Recarregar</button>
          <button class="btn-primary" data-action="auth:signout" type="button">Sair</button>
        `,
      })}

      ${renderAccountAccessSection(renderPageFold, {
        isBusy,
        coachPortalStatus: coachPortal?.status,
        isSummaryLoading,
        profileName: profile.name,
        profileEmail: profile.email,
        planName,
        planStatus,
        athleteBenefitsLabel: athleteBenefits.label,
        athleteBenefitSource,
        resultsLogged: athleteStats?.resultsLogged,
        importUsage,
        escapeHtml,
      })}

      ${renderAccountCoachPortalSection(renderPageFold, {
        canCoachManage,
        gymsCount: gyms.length,
        renewAt,
        canUseDeveloperTools,
        formatDateShort,
        escapeHtml,
      })}

      ${renderAccountActivitySection(renderPageFold, {
        isResultsLoading,
        isWorkoutsLoading,
        athleteResultsCount: athleteResults.length,
        athleteWorkoutsCount: athleteWorkouts.length,
      })}
    </div>
  `;
}
