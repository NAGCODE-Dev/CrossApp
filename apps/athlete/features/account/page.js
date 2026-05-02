import {
  renderAccountAccessSection,
  renderAccountActivitySection,
  renderAccountCheckinSection,
  renderAccountCoachPortalSection,
  renderAccountDataSections,
  renderAccountProfileSection,
  renderAccountPreferencesSections,
  renderAccountSyncSection,
  renderGuestBenefitsSection,
  renderGuestCoachPortalSection,
} from './sections.js';
import { buildAthleteAccountPageState } from './viewState.js';

function renderAccountViewButton(view, currentView, label, detail) {
  const isActive = currentView === view;
  return `
    <button
      class="account-viewTab ${isActive ? 'isActive' : ''}"
      data-action="account:view:set"
      data-account-view="${view}"
      aria-pressed="${isActive ? 'true' : 'false'}"
      type="button"
    >
      <strong>${label}</strong>
      <span>${detail}</span>
    </button>
  `;
}

export function renderAthleteAccountPage(state, helpers) {
  const {
    renderPageHero,
    renderPageFold,
    formatDateShort,
    escapeHtml,
    platformVariant,
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
    syncStatus,
    accountView,
    isSummaryLoading,
    isWorkoutsLoading,
    isResultsLoading,
    isCheckinsLoading,
    selectedGymId,
    selectedGym,
    showSnapshotNotice,
  } = buildAthleteAccountPageState(state, helpers);

  const containerClass = `workout-container page-stack page-stack-account ${platformVariant === 'native' ? 'native-screenStack native-screenStack-account' : ''}`.trim();

  if (!profile?.email) {
    return `
      <div class="${containerClass}">
        ${renderPageHero({
          eyebrow: 'Conta',
          title: 'Sua conta',
          subtitle: accountView === 'profile'
            ? 'Identidade pública, gyms e coaches.'
            : accountView === 'checkins'
              ? 'Aulas, presença e reservas do gym.'
            : accountView === 'preferences'
            ? 'Visual e treino deste aparelho.'
            : accountView === 'data'
              ? 'Backup e dados locais.'
              : 'Acesso, status e atividade.',
          actions: `
            <button class="btn-primary" data-action="modal:open" data-modal="auth" type="button">Entrar</button>
          `,
          footer: `
            <div class="account-viewTabs" role="tablist" aria-label="Seções da conta">
              ${renderAccountViewButton('overview', accountView, 'Visão geral', 'entrada e benefícios')}
              ${renderAccountViewButton('profile', accountView, 'Perfil', 'nome, foto e gym')}
              ${renderAccountViewButton('checkins', accountView, 'Aulas', 'check-ins e presença')}
              ${renderAccountViewButton('preferences', accountView, 'Preferências', 'visual e treino')}
              ${renderAccountViewButton('data', accountView, 'Dados', 'backup e documentos')}
            </div>
          `,
        })}

        ${accountView === 'preferences'
          ? renderAccountPreferencesSections(renderPageFold, {
            preferences,
            escapeHtml,
          })
          : accountView === 'profile'
            ? renderGuestBenefitsSection(renderPageFold)
            : accountView === 'checkins'
              ? renderGuestCoachPortalSection(renderPageFold)
          : accountView === 'data'
            ? renderAccountDataSections(renderPageFold, {
              profileEmail: '',
              planName: 'Livre',
              planStatus: 'sem login',
              athleteBenefitSource: 'Conta local',
              importUsage,
              escapeHtml,
            })
            : `
              ${renderGuestBenefitsSection(renderPageFold)}
              ${renderGuestCoachPortalSection(renderPageFold)}
            `}
      </div>
    `;
  }

  return `
    <div class="${containerClass}">
      ${renderPageHero({
        eyebrow: 'Conta',
        title: profile.display_name || profile.name || 'Sua conta',
          subtitle: accountView === 'profile'
            ? 'Seu perfil social, gyms e coaches visíveis.'
          : accountView === 'checkins'
            ? 'Agenda do gym, presença e vagas.'
          : accountView === 'preferences'
            ? 'Aparência e treino.'
          : accountView === 'data'
            ? 'Backup, privacidade e dados locais.'
            : 'Conta, acesso, atividade e visão geral.',
        actions: `
          <button class="btn-secondary" data-action="auth:refresh" type="button">Atualizar</button>
          <button class="btn-primary" data-action="auth:signout" type="button">Sair</button>
        `,
        footer: `
          <div class="account-viewTabs" role="tablist" aria-label="Seções da conta">
            ${renderAccountViewButton('overview', accountView, 'Visão geral', 'status e atividade')}
            ${renderAccountViewButton('profile', accountView, 'Perfil', 'nome, gym e coach')}
            ${renderAccountViewButton('checkins', accountView, 'Aulas', 'check-ins e lista')}
            ${renderAccountViewButton('preferences', accountView, 'Preferências', 'aparência e treino')}
            ${renderAccountViewButton('data', accountView, 'Dados', 'backup e documentos')}
          </div>
        `,
      })}

      ${showSnapshotNotice ? '<p class="account-hint">Mostrando dados salvos anteriormente enquanto a conexão atualiza.</p>' : ''}

      ${accountView === 'preferences'
        ? renderAccountPreferencesSections(renderPageFold, {
          preferences,
          escapeHtml,
        })
        : accountView === 'profile'
          ? renderAccountProfileSection(renderPageFold, {
            profile,
            profileCard,
            planName,
            planStatus,
            escapeHtml,
          })
        : accountView === 'checkins'
          ? renderAccountCheckinSection(renderPageFold, {
            selectedGym,
            selectedGymId,
            checkinSessions,
            isCheckinsLoading,
            escapeHtml,
          })
        : accountView === 'data'
          ? `
            ${renderAccountDataSections(renderPageFold, {
              profileEmail: profile.email,
              planName,
              planStatus,
              athleteBenefitSource,
              importUsage,
              syncStatus,
              escapeHtml,
            })}

            ${renderAccountSyncSection(renderPageFold, {
              syncStatus,
              escapeHtml,
            })}
          `
          : `
            ${renderAccountAccessSection(renderPageFold, {
              isBusy,
              coachPortalStatus: coachPortal?.status,
              isSummaryLoading,
              profileName: profile.display_name || profile.name,
              profileEmail: profile.email,
              planName,
              planStatus,
              athleteBenefitsLabel: athleteBenefits.label,
              athleteBenefitSource,
              resultsLogged: athleteStats?.resultsLogged,
              importUsage,
              gymAccess,
              personalSubscription,
              escapeHtml,
            })}

            ${renderAccountSyncSection(renderPageFold, {
              syncStatus,
              escapeHtml,
            })}

            ${renderAccountCoachPortalSection(renderPageFold, {
              canCoachManage,
              gymsCount: gyms.length,
              athleteGymMemberships: (gymAccess || []).filter((item) => item?.role === 'athlete').length,
              renewAt,
              canUseDeveloperTools,
              formatDateShort,
              escapeHtml,
            })}

            ${renderAccountActivitySection(renderPageFold, {
              isResultsLoading,
              isWorkoutsLoading,
              athleteResults,
              athleteWorkouts,
              escapeHtml,
            })}

            ${renderPageFold({
              title: 'Evolução rápida',
              subtitle: 'Atalhos para o que já existe na sua conta.',
              content: `
                <div class="coach-list coach-listCompact">
                  <div class="coach-listItem static">
                    <strong>Medidas corporais</strong>
                    <span>${measurements.length ? `${measurements.length} registro(s) sincronizado(s)` : 'Nenhuma medida sincronizada ainda.'}</span>
                  </div>
                  <div class="coach-listItem static">
                    <strong>Corrida</strong>
                    <span>${runningHistory.length ? `${runningHistory.length} sessão(ões) recente(s)` : 'Sem sessões recentes.'}</span>
                  </div>
                  <div class="coach-listItem static">
                    <strong>Força</strong>
                    <span>${strengthHistory.length ? `${strengthHistory.length} sessão(ões) recente(s)` : 'Sem sessões recentes.'}</span>
                  </div>
                </div>
                <div class="page-actions">
                  <button class="btn-secondary" data-action="page:set" data-page="history" data-history-view="body" type="button">Abrir corpo</button>
                  <button class="btn-secondary" data-action="page:set" data-page="history" data-history-view="sessions" type="button">Abrir sessões</button>
                </div>
              `,
            })}
          `}
    </div>
  `;
}
