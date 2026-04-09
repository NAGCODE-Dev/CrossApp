export async function handleAthleteAdminAction(action, context) {
  const {
    element,
    root,
    applyUiState,
    getAppBridge,
  } = context;

  const refreshAdminOverview = async (toastMessage) => {
    const query = String(root.querySelector('#admin-search')?.value || '').trim();
    const result = await getAppBridge().getAdminOverview({ q: query, limit: 25 });
    await applyUiState(
      { admin: { overview: result?.data || null, query } },
      { toastMessage },
    );
    return true;
  };

  switch (action) {
    case 'admin:refresh': {
      return refreshAdminOverview('Painel admin atualizado');
    }

    case 'admin:activate-plan': {
      const userId = Number(element.dataset.userId);
      const planId = String(element.dataset.planId || '').trim().toLowerCase();
      if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error('Usuário inválido');
      }
      if (!['athlete_plus', 'starter', 'pro', 'performance'].includes(planId)) {
        throw new Error('Plano inválido');
      }

      const confirmed = confirm(`Ativar plano ${planId} para este usuário por 30 dias?`);
      if (!confirmed) return true;

      await getAppBridge().activateCoachSubscription(userId, planId, 30);
      return refreshAdminOverview(`Plano ${planId} ativado`);
    }

    case 'admin:request-delete': {
      const userId = Number(element.dataset.userId);
      const userEmail = String(element.dataset.userEmail || '').trim();
      if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error('Usuário inválido');
      }

      const confirmed = confirm(`Solicitar exclusão da conta ${userEmail || `#${userId}`}?\n\nUm email será enviado. Se a pessoa não responder em até 15 dias, a conta e os dados serão excluídos automaticamente.`);
      if (!confirmed) return true;

      const deletion = await getAppBridge().requestAccountDeletion(userId);
      return refreshAdminOverview(
        deletion?.data?.reused ? 'Exclusão já estava pendente' : 'Email de exclusão enviado'
      );
    }

    case 'admin:manual-reset': {
      const userId = Number(element.dataset.userId);
      const userEmail = String(element.dataset.userEmail || '').trim();
      if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error('Usuário inválido');
      }

      const confirmed = confirm(`Gerar um codigo manual de reset para ${userEmail || `#${userId}`}?`);
      if (!confirmed) return true;

      const result = await getAppBridge().createManualPasswordReset(userId);
      const code = String(result?.data?.reset?.code || '').trim();
      return refreshAdminOverview(code ? `Codigo manual gerado: ${code}` : 'Codigo manual gerado');
    }

    case 'admin:approve-reset-support': {
      const requestId = Number(element.dataset.requestId);
      if (!Number.isFinite(requestId) || requestId <= 0) {
        throw new Error('Solicitação inválida');
      }

      const confirmed = confirm('Liberar redefinicao sem codigo para esta solicitacao?');
      if (!confirmed) return true;

      await getAppBridge().approvePasswordResetSupportRequest(requestId, 120);
      return refreshAdminOverview('Liberacao aprovada');
    }

    case 'admin:approve-reset-support-short': {
      const requestId = Number(element.dataset.requestId);
      if (!Number.isFinite(requestId) || requestId <= 0) {
        throw new Error('Solicitação inválida');
      }

      const confirmed = confirm('Liberar redefinicao por 15 minutos para esta solicitacao?');
      if (!confirmed) return true;

      await getAppBridge().approvePasswordResetSupportRequest(requestId, 15);
      return refreshAdminOverview('Liberacao curta aprovada');
    }

    case 'admin:deny-reset-support': {
      const requestId = Number(element.dataset.requestId);
      if (!Number.isFinite(requestId) || requestId <= 0) {
        throw new Error('Solicitação inválida');
      }

      const confirmed = confirm('Negar esta solicitacao de redefinicao?');
      if (!confirmed) return true;

      await getAppBridge().denyPasswordResetSupportRequest(requestId);
      return refreshAdminOverview('Liberacao negada');
    }

    case 'admin:delete-now': {
      const userId = Number(element.dataset.userId);
      const userEmail = String(element.dataset.userEmail || '').trim();
      if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error('Usuário inválido');
      }

      const confirmed = confirm(`Excluir agora a conta ${userEmail || `#${userId}`}?\n\nIsso remove a conta e os dados derivados permanentemente.`);
      if (!confirmed) return true;

      await getAppBridge().deleteAccountNow(userId);
      return refreshAdminOverview('Conta excluída permanentemente');
    }

    default:
      return false;
  }
}
