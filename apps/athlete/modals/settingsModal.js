import {
  renderSettingsAboutSection,
  renderSettingsAdvancedSection,
  renderSettingsDataSection,
  renderSettingsPreferencesSection,
} from './settingsSections.js';

export function renderAthleteSettingsModal(settings = {}) {
  const showLbsConversion = settings.showLbsConversion !== false;
  const showEmojis = settings.showEmojis !== false;
  const showObjectivesInWods = settings.showObjectivesInWods !== false;

  return `
    <div class="modal-overlay isOpen" id="ui-settingsModalBackdrop">
      <div class="modal-container modal-container-settings">
        <div class="modal-header">
          <h2 class="modal-title">⚙️ Configurações do app</h2>
          <button class="modal-close" data-action="modal:close" type="button">✕</button>
        </div>

        <div class="modal-body modal-body-settings">
          ${renderSettingsPreferencesSection({
            showLbsConversion,
            showEmojis,
            showObjectivesInWods,
          })}
          ${renderSettingsDataSection()}
          ${renderSettingsAdvancedSection()}
          ${renderSettingsAboutSection()}
        </div>
      </div>
    </div>
  `;
}
