import {
  renderBenchmarkHistorySection,
  renderBenchmarkLibrarySection,
  renderMeasurementsSection,
  renderPrHistorySection,
  renderRecentResultsSection,
  renderRecentWorkoutsSection,
  renderRunningHistorySection,
  renderStrengthHistorySection,
} from './sections.js';
import { buildAthleteHistoryPageState } from './viewState.js';

function renderHeroStat(label, value, detail = '') {
  return `
    <div class="summary-tile summary-tileCompact summary-tileHero">
      <span class="summary-label">${label}</span>
      <strong class="summary-value">${value}</strong>
      ${detail ? `<span class="summary-detail">${detail}</span>` : ''}
    </div>
  `;
}

function renderHistoryViewButton(view, currentView, label, detail) {
  const isActive = currentView === view;
  return `
    <button
      class="account-viewTab ${isActive ? 'isActive' : ''}"
      data-action="history:view:set"
      data-history-view="${view}"
      aria-pressed="${isActive ? 'true' : 'false'}"
      type="button"
    >
      <strong>${label}</strong>
      <span>${detail}</span>
    </button>
  `;
}

export function renderAthleteHistoryPage(state, helpers) {
  const {
    renderPageHero,
    renderPageFold,
    renderTrendSkeletons,
    renderSparkline,
    formatTrendValue,
    formatNumber,
    escapeHtml,
    platformVariant,
  } = helpers;
  const {
    benchmarkHistory,
    benchmarkLibrary,
    benchmarkLibraryPagination,
    benchmarkLibraryQuery,
    benchmarkLibraryError,
    prHistory,
    recentResults,
    recentWorkouts,
    measurements,
    runningHistory,
    strengthHistory,
    historyView,
    selectedBenchmark,
    selectedBenchmarkError,
    isBusy,
    isSummaryLoading,
    isDetailLoading,
    isWorkoutsLoading,
    isDetailError,
    resultsLogged,
    progressSummary,
    showSnapshotNotice,
  } = buildAthleteHistoryPageState(state);

  const containerClass = `workout-container page-stack page-stack-history ${platformVariant === 'native' ? 'native-screenStack native-screenStack-history' : ''}`.trim();

  return `
    <div class="${containerClass}">
      ${renderPageHero({
        eyebrow: 'Histórico',
        title: 'Evolução',
        subtitle: historyView === 'benchmarks'
          ? 'Benchmarks, biblioteca e PRs em um lugar só.'
          : historyView === 'activity'
            ? 'Resultados e treinos recentes, sem ter que caçar informação.'
            : historyView === 'body'
              ? 'Medições e evolução corporal com leitura direta.'
              : historyView === 'sessions'
                ? 'Corrida, força e sessões registradas pela sua conta.'
                : (progressSummary || 'Benchmarks, resultados, medidas e sessões bem separados.'),
        actions: `
          <button class="btn-secondary" data-action="modal:open" data-modal="prs" type="button">PRs</button>
          <button class="btn-secondary" data-action="page:set" data-page="account" type="button">Conta</button>
        `,
        footer: `
          <div class="account-viewTabs" role="tablist" aria-label="Seções do histórico">
            ${renderHistoryViewButton('overview', historyView, 'Resumo', 'visão geral')}
            ${renderHistoryViewButton('benchmarks', historyView, 'Benchmarks', 'library e PRs')}
            ${renderHistoryViewButton('activity', historyView, 'Resultados', 'treinos e marcas')}
            ${renderHistoryViewButton('body', historyView, 'Corpo', 'medidas e evolução')}
            ${renderHistoryViewButton('sessions', historyView, 'Sessões', 'corrida e força')}
          </div>
          <div class="summary-strip summary-strip-3">
            ${renderHeroStat('Benchmarks', String(benchmarkHistory.length), benchmarkHistory.length ? 'com histórico' : 'sem marcas ainda')}
            ${renderHeroStat('PRs', String(prHistory.length), prHistory.length ? 'em acompanhamento' : 'cadastre cargas')}
            ${renderHeroStat('Resultados', String(resultsLogged || 0), resultsLogged ? 'registrados no app' : 'sem registros ainda')}
          </div>
        `,
      })}

      ${showSnapshotNotice ? '<p class="account-hint">Mostrando dados salvos enquanto a conexão atualiza.</p>' : ''}

      ${historyView === 'overview' ? renderPageFold({
        title: 'Resumo',
        subtitle: 'O essencial para continuar.',
        content: `
        <div class="coach-list coach-listCompact">
          <div class="coach-listItem static">
            <strong>Benchmarks</strong>
            <span>${isBusy || isDetailLoading ? 'Carregando histórico...' : benchmarkHistory.length ? `${benchmarkHistory.length} benchmark(s) com marca registrada.` : 'Nenhum benchmark com histórico ainda.'}</span>
          </div>
          <div class="coach-listItem static">
            <strong>PRs</strong>
            <span>${isBusy || isDetailLoading ? 'Carregando PRs...' : prHistory.length ? `${prHistory.length} PR(s) acompanhados no app.` : 'Cadastre seus PRs para calcular cargas com contexto.'}</span>
          </div>
          <div class="coach-listItem static">
            <strong>Resultados</strong>
            <span>${isBusy || isSummaryLoading ? 'Carregando resumo...' : resultsLogged ? `${resultsLogged} resultado(s) registrado(s) até agora.` : 'Nenhum resultado registrado ainda.'}</span>
          </div>
        </div>
        `,
      }) : ''}

      ${historyView === 'overview' || historyView === 'benchmarks' ? renderPageFold({
        title: 'Benchmarks',
        subtitle: 'Tendência das marcas já registradas.',
        guideTarget: 'history-benchmarks',
        content: `
        <div class="trend-grid">
          ${renderBenchmarkHistorySection({
            benchmarkHistory,
            isBusy,
            isDetailLoading,
            isDetailError,
            renderTrendSkeletons,
            renderSparkline,
            formatTrendValue,
            escapeHtml,
          })}
        </div>
        `,
      }) : ''}

      ${historyView === 'overview' || historyView === 'benchmarks' ? renderPageFold({
        title: 'Biblioteca',
        subtitle: 'Pesquisar e abrir benchmarks completos.',
        content: renderBenchmarkLibrarySection({
          benchmarkLibrary,
          benchmarkLibraryPagination,
          benchmarkLibraryQuery,
          benchmarkLibraryError,
          selectedBenchmark,
          selectedBenchmarkError,
          escapeHtml,
        }),
      }) : ''}

      ${historyView === 'overview' || historyView === 'benchmarks' ? renderPageFold({
        title: 'PRs',
        subtitle: 'Suas cargas de referência, sem ruído.',
        guideTarget: 'history-prs',
        content: `
        <div class="trend-grid">
          ${renderPrHistorySection({
            prHistory,
            isBusy,
            isDetailLoading,
            isDetailError,
            renderTrendSkeletons,
            renderSparkline,
            formatNumber,
            escapeHtml,
          })}
        </div>
        `,
      }) : ''}

      ${historyView === 'overview' || historyView === 'activity' ? renderPageFold({
        title: 'Resultados recentes',
        subtitle: 'Últimas marcas registradas por você.',
        content: renderRecentResultsSection({
          recentResults,
          isBusy,
          isLoading: isDetailLoading,
          escapeHtml,
        }),
      }) : ''}

      ${historyView === 'overview' || historyView === 'activity' ? renderPageFold({
        title: 'Treinos recentes',
        subtitle: 'Treinos publicados para sua conta e seus gyms.',
        content: renderRecentWorkoutsSection({
          recentWorkouts,
          isBusy,
          isLoading: isWorkoutsLoading,
          escapeHtml,
        }),
      }) : ''}

      ${historyView === 'overview' || historyView === 'body' ? renderPageFold({
        title: 'Medidas corporais',
        subtitle: 'Peso, dobras, cintura ou o que você sincronizar.',
        content: renderMeasurementsSection({
          measurements,
          isBusy,
          isLoading: isDetailLoading,
          escapeHtml,
        }),
      }) : ''}

      ${historyView === 'overview' || historyView === 'sessions' ? renderPageFold({
        title: 'Corrida',
        subtitle: 'Sessões e ritmo recente.',
        content: renderRunningHistorySection({
          runningHistory,
          isBusy,
          isLoading: isDetailLoading,
          escapeHtml,
        }),
      }) : ''}

      ${historyView === 'overview' || historyView === 'sessions' ? renderPageFold({
        title: 'Força',
        subtitle: 'Séries, reps e carga registrados.',
        content: renderStrengthHistorySection({
          strengthHistory,
          isBusy,
          isLoading: isDetailLoading,
          escapeHtml,
        }),
      }) : ''}
    </div>
  `;
}
