export function createEmptyPasswordResetState(overrides = {}) {
  return {
    open: false,
    step: 'request',
    email: '',
    code: '',
    previewCode: '',
    previewUrl: '',
    supportEmail: '',
    supportRequestKey: '',
    supportRequestStatus: '',
    supportApprovedAt: '',
    adminNotificationSent: false,
    ...overrides,
  };
}

export async function handleAthletePasswordResetAction(action, context) {
  const {
    root,
    getUiState,
    applyUiPatch,
    isDeveloperEmail,
    getAppBridge,
  } = context;

  switch (action) {
    case 'auth:reset-toggle': {
      await applyUiPatch(
        (state) => ({
          ...state,
          passwordReset: {
            ...(state.passwordReset || {}),
            open: !(state.passwordReset?.open),
            step: state.passwordReset?.open ? 'request' : (state.passwordReset?.step || 'request'),
          },
        }),
        { ensureGoogle: true },
      );
      if (!(getUiState?.()?.passwordReset?.open)) return true;
      root.querySelector('#reset-email')?.focus();
      return true;
    }

    case 'auth:reset-request': {
      const currentReset = getUiState?.()?.passwordReset || {};
      const cooldownUntil = Number(currentReset?.cooldownUntil || 0);
      const remainingMs = cooldownUntil - Date.now();
      if (remainingMs > 0) {
        throw new Error(`Aguarde ${Math.ceil(remainingMs / 1000)}s para gerar outro código`);
      }

      const email = String(root.querySelector('#reset-email')?.value || '').trim().toLowerCase();
      if (!email) throw new Error('Informe o email da conta');

      const result = await getAppBridge().requestPasswordReset({ email });
      const showDeveloperPreview = isDeveloperEmail(email);
      const requestedAt = Date.now();
      const supportPending = result?.deliveryStatus === 'admin_review_pending' && !!result?.supportRequestKey;
      await applyUiPatch(
        (state) => ({
          ...state,
          passwordReset: {
            ...(state.passwordReset || {}),
            open: true,
            step: supportPending ? 'support_pending' : 'confirm',
            email,
            code: '',
            requestedAt: new Date(requestedAt).toISOString(),
            deliveryStatus: result?.deliveryStatus || 'sent',
            message: supportPending
              ? 'Nao conseguimos entregar o codigo. O suporte foi avisado no app e pode liberar sua redefinicao.'
              : showDeveloperPreview && result?.previewCode
              ? 'Código gerado em preview.'
              : 'Código enviado para seu email. Use o mais recente.',
            cooldownUntil: requestedAt + 30_000,
            previewCode: showDeveloperPreview ? (result?.previewCode || '') : '',
            previewUrl: showDeveloperPreview ? (result?.delivery?.previewUrl || '') : '',
            supportEmail: result?.supportEmail || '',
            supportRequestKey: supportPending ? String(result?.supportRequestKey || '') : '',
            supportRequestStatus: supportPending ? String(result?.supportRequestStatus || 'pending') : '',
            supportApprovedAt: '',
            adminNotificationSent: supportPending,
          },
        }),
        {
          toastMessage: supportPending
            ? 'Pedido enviado para liberacao do suporte'
            : showDeveloperPreview && result?.previewCode
              ? 'Código gerado'
              : 'Código enviado para seu email',
          ensureGoogle: true,
          focusSelector: supportPending ? '' : '#reset-code',
        },
      );
      return true;
    }

    case 'auth:reset-check-support': {
      const currentReset = getUiState?.()?.passwordReset || {};
      const email = String(root.querySelector('#reset-email')?.value || currentReset.email || '').trim().toLowerCase();
      const requestKey = String(currentReset.supportRequestKey || '').trim();
      if (!email || !requestKey) {
        throw new Error('Gere uma nova solicitacao de suporte primeiro');
      }

      const result = await getAppBridge().getPasswordResetSupportStatus({ email, requestKey });
      const supportStatus = String(result?.status || '');
      const approved = supportStatus === 'approved';

      await applyUiPatch(
        (state) => ({
          ...state,
          passwordReset: {
            ...(state.passwordReset || {}),
            open: true,
            email,
            supportRequestKey: requestKey,
            supportRequestStatus: supportStatus,
            supportApprovedAt: result?.request?.approvedAt || '',
            step: approved ? 'support_confirm' : 'support_pending',
            message: approved
              ? 'Suporte liberou a redefinicao. Agora voce pode criar sua nova senha.'
              : supportStatus === 'denied'
                ? 'A solicitacao foi negada. Gere um novo pedido se necessario.'
                : supportStatus === 'expired'
                  ? 'A liberacao expirou. Gere uma nova solicitacao.'
                  : 'Ainda aguardando liberacao do suporte.',
          },
        }),
        {
          toastMessage: approved ? 'Redefinicao liberada' : 'Status atualizado',
          ensureGoogle: true,
          focusSelector: approved ? '#reset-password-support' : '',
        },
      );
      return true;
    }

    case 'auth:reset-support-confirm': {
      const currentReset = getUiState?.()?.passwordReset || {};
      const email = String(root.querySelector('#reset-email')?.value || currentReset.email || '').trim().toLowerCase();
      const requestKey = String(currentReset.supportRequestKey || '').trim();
      const newPassword = String(root.querySelector('#reset-password-support')?.value || '');

      if (!email || !requestKey || !newPassword) {
        throw new Error('Preencha email e nova senha para concluir');
      }

      const result = await getAppBridge().confirmPasswordResetSupport({ email, requestKey, newPassword });
      if (!result?.success) throw new Error(result?.error || 'Falha ao redefinir senha');

      await applyUiPatch(
        (state) => ({
          ...state,
          authMode: 'signin',
          passwordReset: createEmptyPasswordResetState({
            step: 'request',
            email,
            message: 'Senha atualizada. Entre com a nova senha.',
            requestedAt: '',
            cooldownUntil: 0,
            deliveryStatus: '',
          }),
        }),
        { toastMessage: 'Senha atualizada', ensureGoogle: true, focusSelector: '#auth-email' },
      );
      return true;
    }

    case 'auth:reset-confirm': {
      const email = String(root.querySelector('#reset-email')?.value || '').trim().toLowerCase();
      const code = String(root.querySelector('#reset-code')?.value || '').trim();
      const newPassword = String(root.querySelector('#reset-password')?.value || '');

      if (!email || !code || !newPassword) {
        throw new Error('Preencha email, código e nova senha');
      }

      const result = await getAppBridge().confirmPasswordReset({ email, code, newPassword });
      if (!result?.success) throw new Error(result?.error || 'Falha ao redefinir senha');

      await applyUiPatch(
        (state) => ({
          ...state,
          authMode: 'signin',
          passwordReset: createEmptyPasswordResetState({
            step: 'request',
            email,
            message: 'Senha atualizada. Entre com a nova senha.',
            requestedAt: '',
            cooldownUntil: 0,
            deliveryStatus: '',
          }),
        }),
        { toastMessage: 'Senha atualizada', ensureGoogle: true, focusSelector: '#auth-email' },
      );
      return true;
    }

    default:
      return false;
  }
}
