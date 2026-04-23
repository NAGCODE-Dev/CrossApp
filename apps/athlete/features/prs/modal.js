export function renderAthletePrsModal(prs = {}, helpers = {}) {
  const { escapeHtml } = helpers;
  const platformVariant = helpers?.platformVariant === 'native' ? 'native' : 'web';
  const nativeOverlayClass = platformVariant === 'native' ? 'modal-overlay-native' : '';
  const nativeContainerClass = platformVariant === 'native' ? 'modal-container-nativeSheet' : '';
  const entries = Object.entries(prs).sort((a, b) => a[0].localeCompare(b[0]));

  return `
    <div class="modal-overlay ${nativeOverlayClass} isOpen" id="ui-prsModalBackdrop">
      <div class="modal-container modal-container-prs ${nativeContainerClass}">
        <div class="modal-header">
          <div class="modal-titleGroup">
            <span class="modal-kicker">Cargas</span>
            <h2 class="modal-title">Personal Records</h2>
          </div>
          <button class="modal-close" data-action="modal:close" type="button">✕</button>
        </div>

        <div class="modal-body">
          <p class="account-hint pr-modalHint">Salve suas referências e ajuste as cargas do treino sem sair do fluxo.</p>

          <div class="pr-toolbar">
            <input
              type="text"
              class="search-input"
              placeholder="Buscar exercício..."
              id="ui-prsSearch"
            />
            <div class="pr-toolbarActions">
              ${entries.length > 0 ? `
                <button class="btn-primary pr-saveAll" data-action="prs:save-all" type="button">
                  Salvar tudo
                </button>
              ` : ''}
              <button class="btn-secondary" data-action="prs:export" type="button">
                Exportar
              </button>
              <button class="btn-secondary" data-action="prs:import-file" type="button">
                Importar arquivo
              </button>
              <button class="btn-secondary" data-action="prs:import" type="button">
                Colar JSON
              </button>
            </div>
          </div>

          <div class="pr-list" id="ui-prsTable">
            ${entries.length === 0 ? `
              <div class="empty-state-small">
                <p>Nenhum PR cadastrado</p>
              </div>
            ` : entries.map(([exercise, value]) => `
              <div class="pr-item" data-exercise="${escapeHtml(exercise)}">
                <label class="pr-label">${escapeHtml(exercise)}</label>

                <input
                  type="number"
                  class="pr-input"
                  data-action="prs:editValue"
                  value="${Number(value)}"
                  data-exercise="${escapeHtml(exercise)}"
                  step="0.5"
                  min="0"
                />

                <button
                  class="pr-remove"
                  data-action="prs:remove"
                  data-exercise="${escapeHtml(exercise)}"
                  type="button"
                  title="Remover"
                >
                  🗑️
                </button>
              </div>
            `).join('')}
          </div>

          <div class="pr-addCard pr-addCard-compact">
            <div class="pr-addHead pr-addHead-compact">
              <strong>Novo exercício</strong>
              <span>Adicione um PR rápido sem abrir outra tela.</span>
            </div>
            <div class="pr-add">
              <input
                type="text"
                class="add-input"
                placeholder="Nome do exercício"
                id="ui-prsNewName"
              />
              <input
                type="number"
                class="add-input"
                placeholder="PR (kg)"
                id="ui-prsNewValue"
                step="0.5"
                min="0"
              />
              <button class="btn-primary" data-action="prs:add" type="button">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
