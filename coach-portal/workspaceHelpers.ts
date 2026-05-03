import React from 'react';
import { getRuntimeConfig } from '../packages/shared-web/runtime.js';
import { SPORT_OPTIONS } from './constants';
import type { CoachOption, WorkoutDraftPayload } from './types';

interface PlanCardOptions {
  name: string;
  price: string;
  description: string;
  features?: string[];
  featured?: boolean;
  action?: (() => void) | null;
  loading?: boolean;
}

interface PublishValidationOptions {
  forms?: Partial<WorkoutDraftPayload>;
  selectedGymId?: string | number | null;
  athleteMembers?: unknown[];
  groups?: unknown[];
  canCoachManage?: boolean;
}

interface RuntimeRolloutConfig {
  app?: {
    rollout?: {
      coreSports?: string[];
      betaSports?: string[];
      showBetaSports?: boolean;
    };
  };
  billing?: {
    provider?: string;
  };
}

export function statCard(label: string, value: string) {
  return React.createElement(
    'div',
    { className: 'stat-card card' },
    React.createElement('span', { className: 'stat-label' }, label),
    React.createElement('strong', { className: 'stat-value' }, value),
  );
}

export function portalSkeletonCard(key: string) {
  return React.createElement(
    'div',
    { key, className: 'stat-card card is-skeleton' },
    React.createElement('div', { className: 'skeleton skeleton-line skeleton-line-sm' }),
    React.createElement('div', { className: 'skeleton skeleton-line skeleton-line-lg' }),
  );
}

export function portalSkeletonList(count = 3) {
  return Array.from({ length: count }, (_, index) =>
    React.createElement(
      'div',
      { key: `sk-${index}`, className: 'list-item static is-skeleton' },
      React.createElement('div', { className: 'skeleton skeleton-line skeleton-line-lg' }),
      React.createElement('div', { className: 'skeleton skeleton-line' }),
    ),
  );
}

export function planCard({
  name,
  price,
  description,
  features = [],
  featured = false,
  action = null,
  loading = false,
}: PlanCardOptions) {
  return React.createElement(
    'div',
    { className: `plan-card ${featured ? 'plan-card-featured' : ''}` },
    React.createElement('span', { className: 'eyebrow' }, 'Acesso'),
    React.createElement('h3', { className: 'plan-cardTitle' }, name),
    React.createElement('strong', { className: 'plan-cardPrice' }, price),
    React.createElement('p', { className: 'muted' }, description),
    React.createElement(
      'div',
      { className: 'plan-cardFeatures' },
      features.map((feature) =>
        React.createElement('span', { key: feature, className: 'plan-feature' }, feature),
      ),
    ),
    action
      ? React.createElement(
          'button',
          { className: 'btn btn-primary', onClick: action, disabled: loading },
          loading ? 'Abrindo...' : 'Abrir cobrança',
        )
      : React.createElement('span', { className: 'plan-cardGhost' }, 'Em breve'),
  );
}

export function getDaysRemaining(dateValue: string | number | Date | null | undefined) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function formatDateLabel(dateValue: string | number | Date | null | undefined): string {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTimeLabel(dateValue: string | number | Date | null | undefined): string {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumericValue(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value || '');
  return Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function benchmarkCategoryLabel(value: unknown): string {
  switch (String(value || '').toLowerCase()) {
    case 'girls':
      return 'Girls';
    case 'classic':
      return 'Classics';
    case 'hero':
      return 'Hero';
    case 'open':
      return 'Open';
    case 'all':
    case '':
      return 'Todos';
    default:
      return String(value || 'Todos');
  }
}

export function benchmarkSourceLabel(value: unknown): string {
  switch (String(value || '').toLowerCase()) {
    case 'benchmark':
      return 'Benchmark oficial';
    case 'hero':
      return 'Hero';
    case 'open':
      return 'Open';
    default:
      return String(value || 'Sem fonte');
  }
}

export function sportLabel(value: unknown): string {
  switch (String(value || 'cross').toLowerCase()) {
    case 'running':
      return 'Running';
    case 'strength':
      return 'Strength';
    default:
      return 'Cross';
  }
}

export function getPublishValidationErrors({
  forms = {},
  selectedGymId = '',
  athleteMembers = [],
  groups = [],
  canCoachManage = false,
}: PublishValidationOptions = {}): string[] {
  const errors: string[] = [];
  const title = String(forms.workoutTitle || '').trim();
  const date = String(forms.workoutDate || '').trim();
  const lines = String(forms.workoutLines || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const audienceMode = String(forms.workoutAudienceMode || 'all');
  const selectedAthletes = Array.isArray(forms.targetMembershipIds)
    ? forms.targetMembershipIds.filter(Boolean)
    : [];
  const selectedGroups = Array.isArray(forms.targetGroupIds)
    ? forms.targetGroupIds.filter(Boolean)
    : [];

  if (!selectedGymId) errors.push('Selecione um gym');
  if (!canCoachManage) errors.push('Seu acesso atual não libera publicação no portal');
  if (!title) errors.push('Defina um título para o treino');
  if (!date) errors.push('Escolha a data da publicação');
  if (!lines.length) errors.push('Adicione pelo menos uma linha no treino');
  if (audienceMode === 'selected' && !selectedAthletes.length) {
    errors.push('Escolha pelo menos um atleta');
  }
  if (audienceMode === 'groups' && !selectedGroups.length) {
    errors.push('Escolha pelo menos um grupo');
  }
  if (audienceMode === 'selected' && !athleteMembers.length) {
    errors.push('Não há atletas ativos para selecionar');
  }
  if (audienceMode === 'groups' && !groups.length) {
    errors.push('Não há grupos disponíveis para esse gym');
  }

  return errors;
}

export function resolveBillingProvider(): string {
  const cfg = getRuntimeConfig() as RuntimeRolloutConfig;
  return cfg?.billing?.provider || 'kiwify_link';
}

export function getAvailableSportOptions(config: RuntimeRolloutConfig): CoachOption[] {
  const rollout = config?.app?.rollout || {};
  const coreSports =
    Array.isArray(rollout.coreSports) && rollout.coreSports.length
      ? rollout.coreSports
      : ['cross'];
  const betaSports = rollout.showBetaSports
    ? Array.isArray(rollout.betaSports)
      ? rollout.betaSports
      : []
    : [];
  const allowed = new Set([...coreSports, ...betaSports]);
  return SPORT_OPTIONS.filter((sport) => allowed.has(sport.value));
}
