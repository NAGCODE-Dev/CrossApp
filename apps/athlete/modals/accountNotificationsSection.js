export function renderAccountNotificationsSection({ notifications = [], escapeHtml }) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return `
      <details class="account-fold account-section-notifications">
        <summary class="account-foldSummary">
          <div>
            <div class="section-kicker">Notificacoes</div>
            <strong>Tudo tranquilo por aqui</strong>
          </div>
          <span class="account-foldMeta">0 alerta</span>
        </summary>
        <div class="account-foldBody">
          <p class="account-hint">Nenhuma acao urgente no momento.</p>
        </div>
      </details>
    `;
  }

  return `
    <details class="account-fold account-section-notifications" open>
      <summary class="account-foldSummary">
        <div>
          <div class="section-kicker">Notificacoes</div>
          <strong>Itens importantes do app</strong>
        </div>
        <span class="account-foldMeta">${notifications.length} alerta(s)</span>
      </summary>
      <div class="account-foldBody">
        <div class="account-notificationList">
          ${notifications.map((item) => `
            <article class="account-notificationCard is-${escapeHtml(item.level || 'info')}">
              <div class="account-notificationTop">
                <span class="account-notificationArea">${escapeHtml(item.area || 'App')}</span>
                <span class="account-notificationCount">${Math.max(Number(item.count || 0), 1)}</span>
              </div>
              <strong>${escapeHtml(item.title || 'Atualizacao importante')}</strong>
              <p class="account-hint">${escapeHtml(item.message || '')}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </details>
  `;
}
