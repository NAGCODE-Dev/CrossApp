export function renderBenchmarkHistorySection({
  benchmarkHistory = [],
  isBusy = false,
  isDetailLoading = false,
  isDetailError = false,
  renderTrendSkeletons,
  renderSparkline,
  formatTrendValue,
  escapeHtml,
}) {
  if (isBusy || isDetailLoading) return renderTrendSkeletons(4);
  if (isDetailError) return '<p class="account-hint">Não foi possível carregar benchmarks agora.</p>';
  if (!benchmarkHistory.length) {
    return '<p class="account-hint">Finalize benchmarks ou registre seus resultados para começar o histórico.</p>';
  }

  return benchmarkHistory.map((item) => `
    <button class="trend-card" data-action="history:benchmark:open" data-benchmark-slug="${escapeHtml(item.slug || '')}" type="button">
      <div class="trend-cardHead">
        <strong>${escapeHtml(item.name || item.slug || 'Benchmark')}</strong>
        <span>${escapeHtml(item.latestLabel || 'Sem marca')}</span>
      </div>
      ${renderSparkline(item.points.map((point) => Number(point.value || 0)), item.scoreType === 'for_time')}
      <div class="trend-meta">
        <span>${item.improvement === null ? 'Sem histórico suficiente' : `${item.improvement > 0 ? '+' : ''}${formatTrendValue(item.improvement, item.scoreType)}`}</span>
        <span>${item.points.length} registro(s)</span>
      </div>
    </button>
  `).join('');
}

function formatBenchmarkScoreType(scoreType = '') {
  switch (String(scoreType || '').trim().toLowerCase()) {
    case 'for_time':
      return 'Tempo';
    case 'rounds_reps':
      return 'Rounds + reps';
    case 'weight':
      return 'Carga';
    case 'reps':
      return 'Repetições';
    default:
      return scoreType || 'Score';
  }
}

function buildBenchmarkFacts(benchmark = {}) {
  const payload = benchmark?.payload && typeof benchmark.payload === 'object' ? benchmark.payload : {};
  const facts = [];

  if (Array.isArray(payload.reps) && payload.reps.length) facts.push(`Reps: ${payload.reps.join('-')}`);
  else if (Number.isFinite(payload.reps)) facts.push(`Reps: ${payload.reps}`);
  if (Number.isFinite(payload.rounds)) facts.push(`${payload.rounds} round(s)`);
  if (Number.isFinite(payload.timeCapMinutes)) facts.push(`Cap ${payload.timeCapMinutes} min`);
  if (Number.isFinite(payload.distanceMeters)) facts.push(`${payload.distanceMeters} m`);
  if (payload.movement) facts.push(payload.movement);
  if (Array.isArray(payload.movements) && payload.movements.length) facts.push(payload.movements.slice(0, 4).join(', '));
  if (Array.isArray(payload.stations) && payload.stations.length) facts.push(payload.stations.slice(0, 4).join(', '));

  return facts.slice(0, 4);
}

export function renderBenchmarkLibrarySection({
  benchmarkLibrary = [],
  benchmarkLibraryPagination = {},
  benchmarkLibraryQuery = '',
  benchmarkLibraryError = '',
  selectedBenchmark = null,
  selectedBenchmarkError = '',
  escapeHtml,
}) {
  const selected = selectedBenchmark?.benchmark || null;
  const leaderboard = Array.isArray(selectedBenchmark?.leaderboard) ? selectedBenchmark.leaderboard : [];
  const latestResult = selectedBenchmark?.viewerLatestResult || null;
  const facts = buildBenchmarkFacts(selected);

  return `
    <div class="account-settingsCard">
      <div class="account-settingsHead">
        <strong>Biblioteca de benchmarks</strong>
        <span>${Number(benchmarkLibraryPagination?.total || benchmarkLibrary.length || 0)} benchmark(s)</span>
      </div>
      <div class="page-actions page-actions-inline">
        <input class="add-input" id="history-benchmark-query" type="search" placeholder="Buscar benchmark" value="${escapeHtml(benchmarkLibraryQuery || '')}" />
        <button class="btn-primary" data-action="history:benchmarks:search" type="button">Buscar</button>
      </div>
      ${benchmarkLibraryError ? `<p class="account-hint">${escapeHtml(benchmarkLibraryError)}</p>` : ''}
      <div class="coach-list coach-listCompact">
        ${benchmarkLibrary.length ? benchmarkLibrary.map((item) => `
          <button
            class="coach-listItem ${selected?.slug === item.slug ? 'isSelected' : ''}"
            data-action="history:benchmark:open"
            data-benchmark-slug="${escapeHtml(item.slug || '')}"
            type="button"
          >
            <strong>${escapeHtml(item.name || item.slug || 'Benchmark')}</strong>
            <span>${escapeHtml([item.category, item.year, item.official_source].filter(Boolean).join(' • ') || 'Abrir benchmark')}</span>
          </button>
        `).join('') : '<p class="account-hint">Nenhum benchmark encontrado.</p>'}
      </div>
    </div>
    <div class="account-settingsCard">
      <div class="account-settingsHead">
        <strong>${escapeHtml(selected?.name || 'Detalhe do benchmark')}</strong>
        <span>${selected ? escapeHtml(formatBenchmarkScoreType(selected.score_type)) : 'Toque em um benchmark'}</span>
      </div>
      ${selectedBenchmarkError ? `<p class="account-hint">${escapeHtml(selectedBenchmarkError)}</p>` : ''}
      ${selected ? `
        <div class="coach-list coach-listCompact">
          <div class="coach-listItem static">
            <strong>Descrição</strong>
            <span>${escapeHtml(selected.description || 'Sem descrição cadastrada.')}</span>
          </div>
          ${facts.length ? `
            <div class="coach-listItem static">
              <strong>Estrutura</strong>
              <span>${escapeHtml(facts.join(' • '))}</span>
            </div>
          ` : ''}
          ${latestResult ? `
            <div class="coach-listItem static">
              <strong>Sua marca mais recente</strong>
              <span>${escapeHtml(latestResult.score_display || '-')}</span>
            </div>
          ` : ''}
        </div>
        ${leaderboard.length ? `
          <div class="trend-meta" style="margin-top:12px;">
            <span>Top ${leaderboard.length}</span>
            <span>${escapeHtml(selected.slug || '')}</span>
          </div>
          <div class="coach-list coach-listCompact">
            ${leaderboard.map((row) => `
              <div class="coach-listItem static">
                <strong>#${Number(row.rank || 0)} ${escapeHtml(row.name || 'Atleta')}</strong>
                <span>${escapeHtml(row.score_display || '-')}</span>
              </div>
            `).join('')}
          </div>
        ` : '<p class="account-hint">Sem resultados ainda para este benchmark.</p>'}
        ${selected?.payload?.sourceUrl ? `
          <div class="page-actions" style="margin-top:12px;">
            <a class="btn-secondary settings-linkBtn" href="${escapeHtml(selected.payload.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fonte oficial</a>
          </div>
        ` : ''}
      ` : '<p class="account-hint">Abra um benchmark para ver descrição, estrutura e ranking.</p>'}
    </div>
  `;
}

export function renderPrHistorySection({
  prHistory = [],
  isBusy = false,
  isDetailLoading = false,
  isDetailError = false,
  renderTrendSkeletons,
  renderSparkline,
  formatNumber,
  escapeHtml,
}) {
  if (isBusy || isDetailLoading) return renderTrendSkeletons(3);
  if (isDetailError) return '<p class="account-hint">Não foi possível carregar PRs agora.</p>';
  if (!prHistory.length) {
    return '<p class="account-hint">Cadastre PRs para calcular cargas.</p>';
  }

  return prHistory.map((item) => `
    <div class="trend-card">
      <div class="trend-cardHead">
        <strong>${escapeHtml(item.exercise)}</strong>
        <span>${escapeHtml(String(item.latestValue ?? '-'))} ${escapeHtml(item.unit || 'kg')}</span>
      </div>
      ${renderSparkline(item.points.map((point) => Number(point.value || 0)), false)}
      <div class="trend-meta">
        <span>${item.delta === null ? 'Sem histórico suficiente' : `${item.delta > 0 ? '+' : ''}${formatNumber(item.delta)} ${escapeHtml(item.unit || 'kg')}`}</span>
        <span>${item.points.length} atualização(ões)</span>
      </div>
    </div>
  `).join('');
}

function formatDateShort(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDateTimeShort(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMeasurementValue(entry = {}) {
  const value = Number(entry?.value);
  const label = entry?.label || entry?.type || 'Medição';
  const unit = entry?.unit || '';
  return {
    label,
    value: Number.isFinite(value) ? `${value}${unit ? ` ${unit}` : ''}` : '-',
  };
}

function formatRunningSummary(entry = {}) {
  const parts = [];
  if (Number.isFinite(Number(entry?.distance_km))) parts.push(`${Number(entry.distance_km)} km`);
  if (Number.isFinite(Number(entry?.duration_min))) parts.push(`${Number(entry.duration_min)} min`);
  if (entry?.avg_pace) parts.push(`pace ${entry.avg_pace}`);
  return parts.join(' • ') || 'Sessão registrada';
}

function formatStrengthSummary(entry = {}) {
  const parts = [];
  if (Number.isFinite(Number(entry?.sets_count))) parts.push(`${Number(entry.sets_count)} séries`);
  if (entry?.reps_text) parts.push(entry.reps_text);
  if (entry?.load_text) parts.push(entry.load_text);
  else if (Number.isFinite(Number(entry?.load_value))) parts.push(`${Number(entry.load_value)} kg`);
  if (Number.isFinite(Number(entry?.rir))) parts.push(`RIR ${Number(entry.rir)}`);
  return parts.join(' • ') || 'Sessão registrada';
}

export function renderRecentResultsSection({
  recentResults = [],
  isBusy = false,
  isLoading = false,
  escapeHtml,
}) {
  if (isBusy || isLoading) return '<p class="account-hint">Carregando resultados...</p>';
  if (!recentResults.length) return '<p class="account-hint">Nenhum resultado recente ainda.</p>';

  return `
    <div class="coach-list coach-listCompact">
      ${recentResults.map((result) => `
        <div class="coach-listItem static">
          <strong>${escapeHtml(result?.benchmark_name || result?.benchmark_slug || 'Resultado')}</strong>
          <span>${escapeHtml(result?.score_display || '-')} • ${escapeHtml(result?.gym_name || 'Sem gym')}</span>
          <span>${escapeHtml(formatDateTimeShort(result?.created_at))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderRecentWorkoutsSection({
  recentWorkouts = [],
  isBusy = false,
  isLoading = false,
  escapeHtml,
}) {
  if (isBusy || isLoading) return '<p class="account-hint">Carregando treinos...</p>';
  if (!recentWorkouts.length) return '<p class="account-hint">Nenhum treino recente liberado para sua conta.</p>';

  return `
    <div class="coach-list coach-listCompact">
      ${recentWorkouts.map((workout) => `
        <div class="coach-listItem static">
          <strong>${escapeHtml(workout?.title || 'Treino')}</strong>
          <span>${escapeHtml(workout?.gym_name || 'Sem gym')}</span>
          <span>${escapeHtml(formatDateShort(workout?.scheduled_date || workout?.published_at))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderMeasurementsSection({
  measurements = [],
  isBusy = false,
  isLoading = false,
  escapeHtml,
}) {
  if (isBusy || isLoading) return '<p class="account-hint">Carregando medidas...</p>';
  if (!measurements.length) return '<p class="account-hint">Nenhuma medida corporal sincronizada ainda.</p>';

  return `
    <div class="coach-list coach-listCompact">
      ${measurements.slice(0, 16).map((entry) => {
        const formatted = formatMeasurementValue(entry);
        return `
          <div class="coach-listItem static">
            <strong>${escapeHtml(formatted.label)}</strong>
            <span>${escapeHtml(formatted.value)}</span>
            <span>${escapeHtml(formatDateTimeShort(entry?.recorded_at || entry?.created_at))}</span>
            ${entry?.notes ? `<span>${escapeHtml(entry.notes)}</span>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function renderRunningHistorySection({
  runningHistory = [],
  isBusy = false,
  isLoading = false,
  escapeHtml,
}) {
  if (isBusy || isLoading) return '<p class="account-hint">Carregando corridas...</p>';
  if (!runningHistory.length) return '<p class="account-hint">Nenhuma sessão de corrida registrada ainda.</p>';

  return `
    <div class="coach-list coach-listCompact">
      ${runningHistory.map((entry) => `
        <div class="coach-listItem static">
          <strong>${escapeHtml(entry?.title || entry?.session_type || 'Corrida')}</strong>
          <span>${escapeHtml(formatRunningSummary(entry))}</span>
          <span>${escapeHtml(formatDateTimeShort(entry?.logged_at))}</span>
          ${entry?.notes ? `<span>${escapeHtml(entry.notes)}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

export function renderStrengthHistorySection({
  strengthHistory = [],
  isBusy = false,
  isLoading = false,
  escapeHtml,
}) {
  if (isBusy || isLoading) return '<p class="account-hint">Carregando sessões de força...</p>';
  if (!strengthHistory.length) return '<p class="account-hint">Nenhuma sessão de força registrada ainda.</p>';

  return `
    <div class="coach-list coach-listCompact">
      ${strengthHistory.map((entry) => `
        <div class="coach-listItem static">
          <strong>${escapeHtml(entry?.exercise || 'Força')}</strong>
          <span>${escapeHtml(formatStrengthSummary(entry))}</span>
          <span>${escapeHtml(formatDateTimeShort(entry?.logged_at))}</span>
          ${entry?.notes ? `<span>${escapeHtml(entry.notes)}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
