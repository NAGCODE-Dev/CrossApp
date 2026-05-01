import { getLastAuthEmail, hasTrustedDeviceGrant } from '../../../../src/core/services/authService.js';

export function getTrustedDeviceUiState(email) {
  const rememberedEmail = getLastAuthEmail();
  const normalizedEmail = String(email || '').trim().toLowerCase() || rememberedEmail;
  const isTrusted = !!normalizedEmail && hasTrustedDeviceGrant(normalizedEmail);

  if (isTrusted) {
    return {
      isTrusted: true,
      resolvedEmail: normalizedEmail,
      submitLabel: 'Continuar',
      trustedSubmitLabel: 'Continuar neste aparelho',
      passwordPlaceholder: 'Senha (se quiser confirmar manualmente)',
      passwordToggleLabel: 'Usar senha',
      showPasswordByDefault: false,
      hintTitle: normalizedEmail === rememberedEmail && !email
        ? 'Continuar neste aparelho'
        : 'Conta reconhecida',
      hintBody: normalizedEmail === rememberedEmail && !email
        ? `Reconhecemos ${normalizedEmail} neste aparelho. Toque em continuar.`
        : 'Este aparelho já foi validado para essa conta.',
    };
  }

  if (normalizedEmail) {
    return {
      isTrusted: false,
      resolvedEmail: normalizedEmail,
      submitLabel: 'Entrar',
      trustedSubmitLabel: 'Continuar neste aparelho',
      passwordPlaceholder: 'Sua senha',
      passwordToggleLabel: 'Usar senha',
      showPasswordByDefault: true,
      hintTitle: 'Primeiro acesso neste aparelho',
      hintBody: 'Use sua senha para validar este aparelho.',
    };
  }

  return {
    isTrusted: false,
    resolvedEmail: '',
    submitLabel: 'Entrar',
    trustedSubmitLabel: 'Continuar neste aparelho',
    passwordPlaceholder: 'Sua senha',
    passwordToggleLabel: 'Usar senha',
    showPasswordByDefault: true,
    hintTitle: 'Acesso mais simples',
    hintBody: 'Digite seu email para continuar.',
  };
}

export function renderTrustedDeviceStatus({ email, escapeHtml }) {
  const ui = getTrustedDeviceUiState(email);
  return `
    <div class="auth-trustedStatus${ui.isTrusted ? ' isTrusted' : ''}" data-auth-trusted-status>
      <strong class="auth-trustedTitle">${escapeHtml(ui.hintTitle)}</strong>
      <p class="account-hint auth-inlineStatus">${escapeHtml(ui.hintBody)}</p>
    </div>
  `;
}

export function syncTrustedDeviceAuthUi(root) {
  if (!(root instanceof HTMLElement) && !(root instanceof Document)) return;

  const emailInput = root.querySelector('#auth-email');
  const passwordInput = root.querySelector('#auth-password');
  const submitButton = root.querySelector('[data-action="auth:submit"][data-mode="signin"]');
  const trustedSubmitButton = root.querySelector('[data-action="auth:trusted-submit"]');
  const status = root.querySelector('[data-auth-trusted-status]');
  const title = status?.querySelector('.auth-trustedTitle');
  const body = status?.querySelector('.auth-inlineStatus');
  const form = root.querySelector('#ui-authForm');
  const passwordShell = root.querySelector('[data-auth-password-shell]');
  const passwordToggle = root.querySelector('[data-action="auth:toggle-password"]');

  if (!(emailInput instanceof HTMLInputElement) || !(passwordInput instanceof HTMLInputElement)) return;

  const ui = getTrustedDeviceUiState(emailInput.value);
  const passwordVisible = form?.dataset?.passwordVisible === 'true';
  const shouldShowPassword = !ui.isTrusted || passwordVisible || ui.showPasswordByDefault;

  if (!String(emailInput.value || '').trim() && ui.resolvedEmail) {
    emailInput.value = ui.resolvedEmail;
  }

  passwordInput.placeholder = ui.passwordPlaceholder;
  form?.classList.toggle('isTrustedDeviceReady', ui.isTrusted);
  status?.classList.toggle('isTrusted', ui.isTrusted);
  if (passwordShell instanceof HTMLElement) {
    passwordShell.hidden = !shouldShowPassword;
  }
  if (passwordToggle instanceof HTMLElement) {
    passwordToggle.hidden = !ui.isTrusted;
    passwordToggle.textContent = shouldShowPassword ? 'Ocultar senha' : ui.passwordToggleLabel;
  }

  if (submitButton) {
    submitButton.textContent = ui.submitLabel;
  }
  if (trustedSubmitButton) {
    trustedSubmitButton.textContent = ui.trustedSubmitLabel;
    trustedSubmitButton.hidden = true;
  }
  if (title) {
    title.textContent = ui.hintTitle;
  }
  if (body) {
    body.textContent = ui.hintBody;
  }
}
