export function renderAdminSection({ overview, admin, escapeHtml, formatDateShort }) {
  const supportRequests = overview?.ops?.recentPasswordResetSupportRequests || [];
  return `
    <details class="account-fold account-section-admin">
      <summary class="account-foldSummary">
        <div>
          <div class="section-kicker">Admin</div>
          <strong>Painel administrativo</strong>
        </div>
        <span class="account-foldMeta">${Number(overview?.stats?.users || 0)} usuários • ${Number(overview?.stats?.activeSubscriptions || 0)} assinaturas</span>
      </summary>
      <div class="account-foldBody">
      <div class="account-sectionHead">
        <div></div>
        <button class="btn-secondary" data-action="admin:refresh" type="button">Atualizar</button>
      </div>
      <div class="admin-toolbar">
        <input class="add-input" id="admin-search" type="text" placeholder="Buscar por nome ou email" value="${escapeHtml(admin?.query || '')}" />
        <button class="btn-secondary" data-action="admin:refresh" type="button">Buscar</button>
      </div>
      ${overview ? `
        <div class="admin-stats">
          <div class="admin-statCard">
            <span class="admin-statLabel">Usuários</span>
            <span class="admin-statValue">${Number(overview?.stats?.users || 0)}</span>
          </div>
          <div class="admin-statCard">
            <span class="admin-statLabel">Assinaturas ativas</span>
            <span class="admin-statValue">${Number(overview?.stats?.activeSubscriptions || 0)}</span>
          </div>
          <div class="admin-statCard">
            <span class="admin-statLabel">Exclusões pendentes</span>
            <span class="admin-statValue">${Number(overview?.stats?.pendingAccountDeletions || 0)}</span>
          </div>
          <div class="admin-statCard">
            <span class="admin-statLabel">Reset pendente</span>
            <span class="admin-statValue">${Number(overview?.stats?.pendingPasswordResetSupportRequests || 0)}</span>
          </div>
        </div>
        <div class="admin-userList">
          <div class="section-kicker">Liberacoes de redefinicao</div>
          ${supportRequests.length ? supportRequests.map((request) => {
            const supportMeta = request.supportMeta || {};
            const trustSignals = supportMeta.trustSignals || {};
            const supportLabel = trustSignals.sameDeviceTrusted
              ? 'Aparelho confiavel'
              : trustSignals.hasTrustedDeviceForEmail
                ? 'Conta com aparelho confiavel'
                : 'Sem aparelho confiavel';
            return `
            <div class="admin-userRow">
              <div>
                <div class="admin-userName">${escapeHtml(request.user_name || request.email || 'Solicitacao sem usuario')}</div>
                <div class="admin-userEmail">${escapeHtml(request.email || '')}</div>
                <div class="account-hint">
                  Status: ${escapeHtml(request.supportStatus || request.status || 'pending')}
                  ${request.created_at ? ` • pediu em ${escapeHtml(formatDateShort(request.created_at))}` : ''}
                  ${request.approved_at ? ` • aprovado em ${escapeHtml(formatDateShort(request.approved_at))}` : ''}
                </div>
                <div class="account-hint">
                  Origem: ${escapeHtml(supportMeta.source || request.source || 'email_delivery_failed')}
                  ${supportMeta.attemptCount ? ` • tentativa ${Number(supportMeta.attemptCount)}` : ''}
                  ${supportMeta.requestedAt ? ` • ultima solicitacao ${escapeHtml(formatDateShort(supportMeta.requestedAt))}` : ''}
                </div>
                <div class="account-hint">
                  ${escapeHtml(supportLabel)}
                  ${trustSignals.recentLoginOnSameDevice ? ' • login recente no mesmo aparelho' : ''}
                </div>
                ${request.last_error ? `
                  <div class="account-hint" style="color:#f3c87b;">
                    Falha de entrega: ${escapeHtml(request.last_error)}
                  </div>
                ` : ''}
              </div>
              <div class="admin-userControls">
                <div class="admin-userMeta">${escapeHtml(request.supportStatus || request.status || 'pending')}</div>
                <div class="admin-userActions">
                  <button class="btn-secondary" data-action="admin:approve-reset-support" data-request-id="${Number(request.id)}" type="button">Liberar</button>
                  <button class="btn-secondary" data-action="admin:approve-reset-support-short" data-request-id="${Number(request.id)}" type="button">Liberar 15 min</button>
                  <button class="btn-secondary" data-action="admin:deny-reset-support" data-request-id="${Number(request.id)}" type="button">Negar</button>
                  <button class="btn-secondary" data-action="admin:manual-reset" data-user-id="${Number(request.user_id || 0)}" data-user-email="${escapeHtml(request.email || '')}" type="button">Gerar codigo</button>
                </div>
              </div>
            </div>
          `;
          }).join('') : `
            <p class="account-hint">Nenhuma liberacao pendente no momento.</p>
          `}
        </div>
        <div class="admin-userList">
          ${(overview?.users || []).map((user) => `
            <div class="admin-userRow">
              <div>
                <div class="admin-userName">${escapeHtml(user.name || 'Sem nome')}</div>
                <div class="admin-userEmail">${escapeHtml(user.email || '')}</div>
                <div class="account-hint">
                  Plano: ${escapeHtml(user.subscription_plan || 'free')} • ${escapeHtml(user.subscription_status || 'inactive')}
                  ${user.subscription_renew_at ? ` • renova em ${escapeHtml(formatDateShort(user.subscription_renew_at))}` : ''}
                </div>
                ${user.pendingDeletion ? `
                  <div class="account-hint" style="color:#f3c87b;">
                    Exclusão pendente • apaga em ${escapeHtml(formatDateShort(user.pendingDeletion.delete_after || user.pendingDeletion.deleteAfter || ''))}
                  </div>
                ` : ''}
              </div>
              <div class="admin-userControls">
                <div class="admin-userMeta">${user.is_admin ? 'Admin' : 'User'}</div>
                <div class="admin-userActions">
                  <button class="btn-secondary" data-action="admin:activate-plan" data-user-id="${Number(user.id)}" data-plan-id="starter" type="button">Starter</button>
                  <button class="btn-secondary" data-action="admin:activate-plan" data-user-id="${Number(user.id)}" data-plan-id="pro" type="button">Pro</button>
                  <button class="btn-secondary" data-action="admin:activate-plan" data-user-id="${Number(user.id)}" data-plan-id="performance" type="button">Performance</button>
                  <button class="btn-secondary" data-action="admin:request-delete" data-user-id="${Number(user.id)}" data-user-email="${escapeHtml(user.email || '')}" type="button">${user.pendingDeletion ? 'Reenviar deleção' : 'Pedir deleção'}</button>
                  <button class="btn-secondary" data-action="admin:delete-now" data-user-id="${Number(user.id)}" data-user-email="${escapeHtml(user.email || '')}" type="button">Excluir agora</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <p class="account-hint">Carregue os dados do painel para ver os últimos usuários.</p>
      `}
      </div>
    </details>
  `;
}
