export function renderGuestIntroSection({ isSignup }) {
  return `
    <div class="auth-intro auth-intro-auth">
      <div class="section-kicker">${isSignup ? 'Criar conta' : 'Entrar'}</div>
      <p class="account-hint">${isSignup
        ? 'Crie sua conta para salvar treino, histórico e progresso sem misturar isso com a operação do box.'
        : 'Entre para retomar treino, histórico e progresso exatamente de onde parou.'}</p>
    </div>
  `;
}

export function renderGuestSwitchSection({ isSignup }) {
  return `
    <div class="auth-switch">
      <button class="btn-secondary ${!isSignup ? 'isSelected' : ''}" data-action="auth:switch" data-mode="signin" type="button">Entrar</button>
      <button class="btn-secondary ${isSignup ? 'isSelected' : ''}" data-action="auth:switch" data-mode="signup" type="button">Cadastrar</button>
    </div>
  `;
}

export function renderSignupVerificationBox({ signupVerification, escapeHtml }) {
  return `
    <div class="auth-signupVerify">
      <button class="btn-secondary" data-action="auth:signup-request-code" type="button">Enviar código</button>
      <input class="add-input" id="auth-signup-code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Código de verificação" value="${escapeHtml(signupVerification.code || signupVerification.previewCode || '')}" />
      ${signupVerification?.previewCode ? `
        <div class="reset-codePreview">
          Código temporário: <strong>${escapeHtml(signupVerification.previewCode)}</strong>
        </div>
      ` : ''}
      ${signupVerification?.previewUrl ? `
        <a class="reset-previewLink" href="${escapeHtml(signupVerification.previewUrl)}" target="_blank" rel="noopener noreferrer">
          Abrir preview do email
        </a>
      ` : ''}
      <p class="account-hint">Digite o código enviado ao seu email.</p>
    </div>
  `;
}

export function renderPasswordResetBox({ reset, escapeHtml }) {
  const resetStep = String(reset?.step || 'request');
  const isCodeConfirm = resetStep === 'confirm';
  const isSupportPending = resetStep === 'support_pending';
  const isSupportConfirm = resetStep === 'support_confirm';
  return `
    <div class="auth-resetBox ${reset?.open ? 'isOpen' : ''}">
      <div class="auth-resetHeader">
        <button class="btn-secondary auth-resetToggle" data-action="auth:reset-toggle" type="button">${reset?.open ? 'Fechar recuperação' : 'Esqueci minha senha'}</button>
      </div>
      ${reset?.open ? `
        <div class="auth-resetBody">
          <div class="auth-resetRow">
            <input class="add-input" id="reset-email" type="email" inputmode="email" autocapitalize="off" autocomplete="email username" placeholder="Email da conta" value="${escapeHtml(reset.email || '')}" />
            <button class="btn-secondary auth-resetRequestButton" data-action="auth:reset-request" type="button" ${Number(reset?.cooldownUntil || 0) > Date.now() ? 'disabled' : ''}>${escapeHtml(formatCooldownLabel(reset?.cooldownUntil || 0))}</button>
          </div>
          ${reset?.previewCode ? `
            <div class="reset-codePreview">
              Código temporário: <strong>${escapeHtml(reset.previewCode)}</strong>
            </div>
          ` : ''}
          ${reset?.previewUrl ? `
            <a class="reset-previewLink" href="${escapeHtml(reset.previewUrl)}" target="_blank" rel="noopener noreferrer">
              Abrir preview do email
            </a>
          ` : ''}
          ${!isSupportPending && !isSupportConfirm ? `
            <input class="add-input" id="reset-code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Código de 6 dígitos" value="${escapeHtml(reset.code || '')}" />
          ` : ''}
          ${isCodeConfirm ? '<input class="add-input" id="reset-password" type="password" autocomplete="new-password" placeholder="Nova senha" />' : ''}
          ${isSupportPending ? `
            <div class="auth-supportNotice">
              <strong>Suporte notificado</strong>
              <p class="account-hint">Se o admin aprovar no app, você poderá redefinir sua senha aqui sem digitar código.</p>
            </div>
          ` : ''}
          ${isSupportConfirm ? `
            <div class="auth-supportNotice isApproved">
              <strong>Redefinição liberada</strong>
              <p class="account-hint">A aprovação já foi registrada. Agora é só definir sua nova senha.</p>
            </div>
            <input class="add-input" id="reset-password-support" type="password" autocomplete="new-password" placeholder="Nova senha" />
          ` : ''}
          <div class="settings-actions auth-resetActions">
            ${isSupportPending ? `
              <button class="btn-primary" data-action="auth:reset-check-support" type="button">Verificar liberação</button>
            ` : isSupportConfirm ? `
              <button class="btn-primary" data-action="auth:reset-support-confirm" type="button">Salvar nova senha</button>
            ` : `
              <button class="btn-primary" data-action="${isCodeConfirm ? 'auth:reset-confirm' : 'auth:reset-request'}" type="button">${isCodeConfirm ? 'Salvar nova senha' : 'Enviar ou reenviar código'}</button>
            `}
          </div>
          ${reset?.message ? `
            <p class="account-hint auth-resetStatus">${escapeHtml(reset.message)}</p>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function formatCooldownLabel(cooldownUntil) {
  const remainingMs = Number(cooldownUntil || 0) - Date.now();
  if (remainingMs <= 0) return 'Enviar código';
  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return `Aguarde ${remainingSeconds}s`;
}
