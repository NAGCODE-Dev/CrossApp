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
  const isSupportDenied = resetStep === 'support_denied';
  const isSupportExpired = resetStep === 'support_expired';
  const trustSignals = reset?.trustSignals || {};
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
          ${!isSupportPending && !isSupportConfirm && !isSupportDenied && !isSupportExpired ? `
            <input class="add-input" id="reset-code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Código de 6 dígitos" value="${escapeHtml(reset.code || '')}" />
          ` : ''}
          ${isCodeConfirm ? '<input class="add-input" id="reset-password" type="password" autocomplete="new-password" placeholder="Nova senha" />' : ''}
          ${isSupportPending ? `
            <div class="auth-supportNotice">
              <strong>Suporte notificado</strong>
              <p class="account-hint">Se o admin aprovar no app, voce podera redefinir sua senha aqui sem digitar codigo.</p>
              ${trustSignals?.sameDeviceTrusted ? `
                <p class="account-hint auth-resetMeta">Pedido feito neste aparelho confiavel.</p>
              ` : ''}
              ${trustSignals?.recentLoginOnSameDevice ? `
                <p class="account-hint auth-resetMeta">Ja houve login recente neste mesmo aparelho.</p>
              ` : ''}
              ${reset?.requestedAt ? `
                <p class="account-hint auth-resetMeta">Pedido aberto em ${escapeHtml(formatResetTimestamp(reset.requestedAt))}</p>
              ` : ''}
              ${reset?.supportExpiresAt ? `
                <p class="account-hint auth-resetMeta">Liberacao disponivel ate ${escapeHtml(formatResetTimestamp(reset.supportExpiresAt))}</p>
              ` : ''}
            </div>
          ` : ''}
          ${isSupportConfirm ? `
            <div class="auth-supportNotice isApproved">
              <strong>Redefinicao liberada</strong>
              <p class="account-hint">A aprovacao ja foi registrada. Agora e so definir sua nova senha.</p>
            </div>
            <input class="add-input" id="reset-password-support" type="password" autocomplete="new-password" placeholder="Nova senha" />
          ` : ''}
          ${isSupportDenied ? `
            <div class="auth-supportNotice isDenied">
              <strong>Liberacao negada</strong>
              <p class="account-hint">O suporte negou a solicitacao atual. Gere um novo pedido se ainda precisar redefinir a senha.</p>
            </div>
          ` : ''}
          ${isSupportExpired ? `
            <div class="auth-supportNotice">
              <strong>Liberacao expirada</strong>
              <p class="account-hint">A janela de redefinicao terminou. Gere um novo pedido para tentar novamente.</p>
            </div>
          ` : ''}
          <div class="settings-actions auth-resetActions">
            ${isSupportPending ? `
              <button class="btn-primary" type="button" disabled>${reset?.polling ? 'Aguardando liberacao...' : 'Aguardando liberacao'}</button>
              <button class="btn-secondary" data-action="auth:reset-check-support" type="button">Atualizar agora</button>
              <button class="btn-secondary" data-action="auth:reset-request" type="button" ${!reset?.canRetry ? 'disabled' : ''}>Gerar novo pedido</button>
            ` : isSupportConfirm ? `
              <button class="btn-primary" data-action="auth:reset-support-confirm" type="button">Salvar nova senha</button>
            ` : isSupportDenied || isSupportExpired ? `
              <button class="btn-primary" data-action="auth:reset-request" type="button" ${Number(reset?.cooldownUntil || 0) > Date.now() ? 'disabled' : ''}>Gerar novo pedido</button>
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

function formatResetTimestamp(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}
