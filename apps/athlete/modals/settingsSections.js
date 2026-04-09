function renderSettingsSection({ title, subtitle, content, danger = false }) {
  return `
    <section class="settings-section${danger ? ' settings-section-danger' : ''}">
      <div class="settings-sectionHead">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
      ${content}
    </section>
  `;
}

export function renderSettingsPreferencesSection({
  showLbsConversion,
  showEmojis,
  showObjectivesInWods,
}) {
  return renderSettingsSection({
    title: 'Preferências',
    subtitle: 'Salvam automaticamente quando você toca.',
    content: `
      <div class="settings-group">
        <label class="settings-label">
          <input
            type="checkbox"
            id="setting-showLbsConversion"
            data-setting-toggle="showLbsConversion"
            ${showLbsConversion ? 'checked' : ''}
          />
          <span>
            <strong>Mostrar conversão lbs → kg</strong>
            <small>Ajuda a ler cargas importadas em libras sem fazer conta mental.</small>
          </span>
        </label>

        <label class="settings-label">
          <input
            type="checkbox"
            id="setting-showEmojis"
            data-setting-toggle="showEmojis"
            ${showEmojis ? 'checked' : ''}
          />
          <span>
            <strong>Mostrar emojis</strong>
            <small>Mantém a leitura mais leve nas áreas que usam sinais visuais rápidos.</small>
          </span>
        </label>

        <label class="settings-label">
          <input
            type="checkbox"
            id="setting-showObjectives"
            data-setting-toggle="showObjectivesInWods"
            ${showObjectivesInWods ? 'checked' : ''}
          />
          <span>
            <strong>Mostrar objetivos nos WODs</strong>
            <small>Exibe a intenção do treino quando o conteúdo tiver esse contexto.</small>
          </span>
        </label>
      </div>
    `,
  });
}

export function renderSettingsDataSection() {
  return renderSettingsSection({
    title: 'Dados',
    subtitle: 'Ferramentas para guardar ou recuperar seu app.',
    content: `
      <div class="settings-actions settings-actions-grid">
        <button class="btn-secondary" data-action="backup:export" type="button">Fazer backup</button>
        <button class="btn-secondary" data-action="backup:import" type="button">Restaurar backup</button>
      </div>
    `,
  });
}

export function renderSettingsAdvancedSection() {
  return renderSettingsSection({
    title: 'Avançado',
    subtitle: 'Ação crítica. Use só quando quiser zerar os dados locais do app.',
    danger: true,
    content: `
      <div class="settings-actions">
        <button class="btn-secondary btn-dangerSoft" data-action="pdf:clear" type="button">Limpar dados do app</button>
      </div>
    `,
  });
}

export function renderSettingsAboutSection() {
  return renderSettingsSection({
    title: 'Sobre',
    subtitle: 'Informações legais e privacidade.',
    content: `
      <div class="settings-actions settings-actions-grid">
        <a class="btn-secondary settings-linkBtn" href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacidade</a>
        <a class="btn-secondary settings-linkBtn" href="/terms.html" target="_blank" rel="noopener noreferrer">Termos</a>
      </div>
    `,
  });
}
