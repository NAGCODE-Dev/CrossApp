import { hasTrustedDeviceGrant } from '../../../../src/core/services/authService.js';

const SUPPORT_POLL_DELAYS_MS = [2500, 5000, 8000, 12000, 20000];
let supportPollingTimer = null;
let supportPollingAttempt = 0;

export function clearPasswordResetSupportPolling() {
  if (supportPollingTimer) {
    clearTimeout(supportPollingTimer);
    supportPollingTimer = null;
  }
  supportPollingAttempt = 0;
}

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
    supportDeniedAt: '',
    supportExpiresAt: '',
    requestedAt: '',
    adminNotificationSent: false,
    polling: false,
    canRetry: true,
    retryAfterSeconds: 0,
    trustSignals: null,
    deliveryStatus: '',
    message: '',
    cooldownUntil: 0,
    ...overrides,
  };
}

function getSupportMessage(status, trustSignals = {}) {
  if (status === 'approved') {
    return 'Suporte liberou a redefinicao. Agora voce pode criar sua nova senha.';
  }
  if (status === 'denied') {
    return 'A solicitacao foi negada. Gere um novo pedido se necessario.';
  }
  if (status === 'expired') {
    return 'A liberacao expirou. Gere uma nova solicitacao.';
  }
  if (trustSignals?.sameDeviceTrusted) {
    return 'Pedido enviado neste aparelho confiavel. O suporte foi avisado e, ao aprovar, a redefinicao sera liberada aqui automaticamente.';
  }
  return 'Nao conseguimos entregar o codigo. O suporte foi avisado no app e pode liberar sua redefinicao.';
}

function getSupportStep(status) {
  if (status === 'approved') return 'support_confirm';
  if (status === 'denied') return 'support_denied';
  if (status === 'expired') return 'support_expired';
  return 'support_pending';
}

function normalizeTrustSignals(reset, fallbackEmail = '') {
  const email = String(fallbackEmail || reset?.email || '').trim().toLowerCase();
  const existing = reset?.trustSignals && typeof reset.trustSignals === 'object' ? reset.trustSignals : {};
  return {
    hasTrustedDeviceForEmail: !!existing.hasTrustedDeviceForEmail || !!(email && hasTrustedDeviceGrant(email)),
    sameDeviceTrusted: !!existing.sameDeviceTrusted || !!(email && hasTrustedDeviceGrant(email)),
    recentLoginOnSameDevice: !!existing.recentLoginOnSameDevice,
    sameDeviceLastSeenAt: existing.sameDeviceLastSeenAt || '',
    trustedDeviceLabel: existing.trustedDeviceLabel || '',
  };
}

function buildSupportState(currentReset, result, emailFallback = '') {
  const supportStatus = String(result?.status || currentReset?.supportRequestStatus || 'pending');
  const trustSignals = normalizeTrustSignals({
    ...currentReset,
    trustSignals: result?.trustSignals || currentReset?.trustSignals || null,
  }, emailFallback);
  return {
    ...(currentReset || {}),
    open: true,
    email: String(emailFallback || currentReset?.email || '').trim().toLowerCase(),
    supportRequestKey: String(currentReset?.supportRequestKey || ''),
    supportRequestStatus: supportStatus,
    supportApprovedAt: result?.approvedAt || result?.request?.approvedAt || currentReset?.supportApprovedAt || '',
    supportDeniedAt: result?.deniedAt || result?.request?.deniedAt || currentReset?.supportDeniedAt || '',
    supportExpiresAt: result?.expiresAt || result?.request?.expiresAt || currentReset?.supportExpiresAt || '',
    requestedAt: result?.requestedAt || currentReset?.requestedAt || '',
    step: getSupportStep(supportStatus),
    polling: supportStatus === 'pending',
    canRetry: typeof result?.canRetry === 'boolean' ? result.canRetry : ['denied', 'expired', 'missing'].includes(supportStatus),
    retryAfterSeconds: Number(result?.retryAfterSeconds || 0),
    trustSignals,
    message: getSupportMessage(supportStatus, trustSignals),
  };
}

function scheduleSupportPolling(context) {
  const currentReset = context.getUiState?.()?.passwordReset || {};
  if (!currentReset?.open || String(currentReset?.supportRequestStatus || '') !== 'pending') {
    clearPasswordResetSupportPolling();
    return;
  }

  clearTimeout(supportPollingTimer);
  const delay = SUPPORT_POLL_DELAYS_MS[Math.min(supportPollingAttempt, SUPPORT_POLL_DELAYS_MS.length - 1)];
  supportPollingTimer = setTimeout(() => {
    pollPasswordResetSupportStatus(context).catch((error) => {
      console.warn('Falha ao atualizar status do reset assistido:', error?.message || error);
    });
  }, delay);
  supportPollingAttempt += 1;
}

async function pollPasswordResetSupportStatus(context, options = {}) {
  const { root, getUiState, getAppBridge, applyUiPatch } = context;
  const { manual = false } = options;
  const currentReset = getUiState?.()?.passwordReset || {};
  const email = String(root.querySelector('#reset-email')?.value || currentReset.email || '').trim().toLowerCase();
  const requestKey = String(currentReset.supportRequestKey || '').trim();

  if (!currentReset?.open || !email || !requestKey) {
    clearPasswordResetSupportPolling();
    return false;
  }

  try {
    const result = await getAppBridge().getPasswordResetSupportStatus({ email, requestKey });
    const nextReset = buildSupportState(currentReset, result, email);
    const previousStatus = String(currentReset.supportRequestStatus || '');
    const nextStatus = String(nextReset.supportRequestStatus || '');

    await applyUiPatch(
      (state) => ({
        ...state,
        passwordReset: {
          ...(state.passwordReset || {}),
          ...nextReset,
        },
      }),
      {
        ensureGoogle: true,
        toastMessage: manual
          ? (nextStatus === 'approved' ? 'Redefinicao liberada' : 'Status atualizado')
          : (previousStatus !== nextStatus
            ? (nextStatus === 'approved'
              ? 'Redefinicao liberada'
              : nextStatus === 'denied'
                ? 'Pedido negado'
                : nextStatus === 'expired'
                  ? 'Liberacao expirada'
                  : '')
            : ''),
        focusSelector: nextStatus === 'approved' ? '#reset-password-support' : '',
      },
    );

    if (nextStatus === 'pending') {
      scheduleSupportPolling(context);
    } else {
      clearPasswordResetSupportPolling();
    }

    return true;
  } catch (error) {
    if (manual) throw error;
    scheduleSupportPolling(context);
    return false;
  }
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
      const isOpen = !!(getUiState?.()?.passwordReset?.open);
      if (isOpen) {
        clearPasswordResetSupportPolling();
      }
      await applyUiPatch(
        (state) => ({
          ...state,
          passwordReset: {
            ...(state.passwordReset || {}),
            open: !isOpen,
            step: isOpen ? 'request' : (state.passwordReset?.step || 'request'),
            polling: !isOpen && state.passwordReset?.supportRequestStatus === 'pending',
          },
        }),
        { ensureGoogle: true },
      );
      if (!(getUiState?.()?.passwordReset?.open)) return true;
      root.querySelector('#reset-email')?.focus();
      const nextReset = getUiState?.()?.passwordReset || {};
      if (String(nextReset.supportRequestStatus || '') === 'pending' && String(nextReset.supportRequestKey || '').trim()) {
        supportPollingAttempt = 0;
        scheduleSupportPolling(context);
      }
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

      const showDeveloperPreview = isDeveloperEmail(email);
      const requestedAt = Date.now();

      try {
        const result = await getAppBridge().requestPasswordReset({ email });
        const supportPending = result?.deliveryStatus === 'admin_review_pending' && !!result?.supportRequestKey;
        const trustSignals = normalizeTrustSignals({ trustSignals: result?.trustSignals || null }, email);
        await applyUiPatch(
          (state) => ({
            ...state,
            passwordReset: {
              ...(state.passwordReset || {}),
              open: true,
              step: supportPending ? 'support_pending' : 'confirm',
              email,
              code: '',
              requestedAt: result?.supportRequestedAt || new Date(requestedAt).toISOString(),
              deliveryStatus: result?.deliveryStatus || 'sent',
              message: supportPending
                ? getSupportMessage('pending', trustSignals)
                : showDeveloperPreview && result?.previewCode
                  ? 'Código gerado em preview.'
                  : 'Código enviado para seu email. Use o mais recente.',
              cooldownUntil: requestedAt + ((Number(result?.cooldownSeconds || 30) || 30) * 1000),
              previewCode: showDeveloperPreview ? (result?.previewCode || '') : '',
              previewUrl: showDeveloperPreview ? (result?.delivery?.previewUrl || '') : '',
              supportEmail: result?.supportEmail || '',
              supportRequestKey: supportPending ? String(result?.supportRequestKey || '') : '',
              supportRequestStatus: supportPending ? String(result?.supportRequestStatus || 'pending') : '',
              supportApprovedAt: result?.supportApprovedAt || '',
              supportDeniedAt: result?.supportDeniedAt || '',
              supportExpiresAt: result?.supportExpiresAt || '',
              adminNotificationSent: supportPending,
              polling: supportPending,
              canRetry: typeof result?.canRetry === 'boolean' ? result.canRetry : !supportPending,
              retryAfterSeconds: Number(result?.retryAfterSeconds || 0),
              trustSignals,
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

        if (supportPending) {
          supportPollingAttempt = 0;
          scheduleSupportPolling(context);
        } else {
          clearPasswordResetSupportPolling();
        }
        return true;
      } catch (error) {
        if (error?.deliveryStatus === 'admin_review_pending') {
          const trustSignals = normalizeTrustSignals({ trustSignals: error?.trustSignals || null }, email);
          await applyUiPatch(
            (state) => ({
              ...state,
              passwordReset: {
                ...(state.passwordReset || {}),
                open: true,
                step: getSupportStep(error?.supportRequestStatus || 'pending'),
                email,
                requestedAt: error?.supportRequestedAt || currentReset?.requestedAt || new Date(requestedAt).toISOString(),
                deliveryStatus: error?.deliveryStatus || 'admin_review_pending',
                message: error?.message || getSupportMessage(error?.supportRequestStatus || 'pending', trustSignals),
                cooldownUntil: requestedAt + Math.max(Number(error?.retryAfterSeconds || 0), 30) * 1000,
                supportEmail: error?.supportEmail || currentReset?.supportEmail || '',
                supportRequestKey: String(error?.supportRequestKey || currentReset?.supportRequestKey || ''),
                supportRequestStatus: String(error?.supportRequestStatus || currentReset?.supportRequestStatus || 'pending'),
                supportApprovedAt: error?.supportApprovedAt || currentReset?.supportApprovedAt || '',
                supportDeniedAt: error?.supportDeniedAt || currentReset?.supportDeniedAt || '',
                supportExpiresAt: error?.supportExpiresAt || currentReset?.supportExpiresAt || '',
                adminNotificationSent: true,
                polling: String(error?.supportRequestStatus || currentReset?.supportRequestStatus || 'pending') === 'pending',
                canRetry: !!error?.canRetry,
                retryAfterSeconds: Number(error?.retryAfterSeconds || 0),
                trustSignals,
              },
            }),
            {
              toastMessage: error?.status === 429 ? 'Pedido ainda em cooldown' : 'Pedido de suporte mantido',
              ensureGoogle: true,
            },
          );
          supportPollingAttempt = 0;
          scheduleSupportPolling(context);
          return true;
        }
        throw error;
      }
    }

    case 'auth:reset-check-support': {
      return pollPasswordResetSupportStatus(context, { manual: true });
    }

    case 'auth:reset-support-confirm': {
      clearPasswordResetSupportPolling();
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
      clearPasswordResetSupportPolling();
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
