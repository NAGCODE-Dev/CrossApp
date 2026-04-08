import {
  renderAccountAccessSection,
  renderAccountActivitySection,
  renderAccountCoachPortalSection,
  renderGuestBenefitsSection,
  renderGuestCoachPortalSection,
} from './sections.js';
import { buildAthleteAccountPageState } from './viewState.js';

export function renderAthleteAccountPage(state, helpers) {
  const {
    renderPageHero,
    renderPageFold,
    formatDateShort,
    escapeHtml,
  } = helpers;
  const {
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
  } = buildAthleteAccountPageState(state, helpers);

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
