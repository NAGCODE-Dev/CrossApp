export function buildAthleteNotifications(state = {}) {
  const ui = state?.__ui || state || {};
  const notifications = [];
  const auth = ui.auth || {};
  const profile = auth.profile || null;
  const adminOverview = auth.admin?.overview || ui.admin?.overview || null;
  const passwordReset = auth.passwordReset || ui.passwordReset || {};

  if (passwordReset?.deliveryStatus === 'admin_review_pending') {
    notifications.push({
      id: 'password-reset-support-pending',
      level: 'warn',
      area: 'Conta',
      title: 'Redefinicao aguardando liberacao',
      message: 'O email falhou e o suporte foi avisado no app. Assim que houver liberacao, voce podera redefinir sem codigo.',
      count: 1,
    });
  }

  if ((passwordReset?.supportRequestStatus || '') === 'approved' || passwordReset?.step === 'support_confirm') {
    notifications.push({
      id: 'password-reset-support-approved',
      level: 'ok',
      area: 'Conta',
      title: 'Redefinicao liberada',
      message: 'Sua liberacao de suporte ja foi aprovada. Abra a recuperacao e defina a nova senha.',
      count: 1,
    });
  }

  if (profile?.email && adminOverview) {
    const stats = adminOverview.stats || {};
    const ops = adminOverview.ops || {};
    const supportRequests = Array.isArray(ops.recentPasswordResetSupportRequests) ? ops.recentPasswordResetSupportRequests : [];
    const pendingSupport = supportRequests.filter((item) => item?.supportStatus === 'pending');

    if (Number(stats.pendingPasswordResetSupportRequests || 0) > 0) {
      notifications.push({
        id: 'admin-reset-support-pending',
        level: 'warn',
        area: 'Admin',
        title: 'Pedidos de redefinicao pendentes',
        message: `${Number(stats.pendingPasswordResetSupportRequests || pendingSupport.length || 0)} pedido(s) aguardando aprovacao manual.`,
        count: Number(stats.pendingPasswordResetSupportRequests || pendingSupport.length || 0),
      });
    }

    if (Number(stats.pendingBillingClaims || 0) > 0) {
      notifications.push({
        id: 'admin-billing-claims',
        level: 'warn',
        area: 'Admin',
        title: 'Claims de billing pendentes',
        message: `${Number(stats.pendingBillingClaims || 0)} claim(s) aguardando tratamento.`,
        count: Number(stats.pendingBillingClaims || 0),
      });
    }

    if (Number(stats.pendingAccountDeletions || 0) > 0) {
      notifications.push({
        id: 'admin-account-deletions',
        level: 'warn',
        area: 'Admin',
        title: 'Exclusoes pendentes',
        message: `${Number(stats.pendingAccountDeletions || 0)} conta(s) com exclusao em aberto.`,
        count: Number(stats.pendingAccountDeletions || 0),
      });
    }

    if (ops.mailer && ops.mailer.ok === false) {
      notifications.push({
        id: 'admin-mailer-health',
        level: 'danger',
        area: 'Admin',
        title: 'Mailer com problema',
        message: ops.mailer.error || 'O envio de emails precisa de atencao.',
        count: 1,
      });
    }

    const failedEmailJobs = Array.isArray(ops.recentEmailJobs)
      ? ops.recentEmailJobs.filter((job) => ['failed', 'retry_scheduled'].includes(String(job?.status || '')))
      : [];
    if (failedEmailJobs.length > 0) {
      notifications.push({
        id: 'admin-email-jobs',
        level: 'warn',
        area: 'Admin',
        title: 'Emails com falha recente',
        message: `${failedEmailJobs.length} job(s) de email exigem revisao ou retry.`,
        count: failedEmailJobs.length,
      });
    }
  }

  return notifications;
}

export function getAthleteNotificationCount(state = {}) {
  return buildAthleteNotifications(state).reduce((sum, item) => sum + Math.max(Number(item?.count || 0), 1), 0);
}
