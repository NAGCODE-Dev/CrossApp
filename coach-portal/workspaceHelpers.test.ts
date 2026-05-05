import { describe, expect, it } from 'vitest';

import { getActionCalloutState, getPublishCalloutState } from './workspaceHelpers';

describe('workspace publish callout', () => {
  it('prioriza erros de publicação quando ainda falta ajustar', () => {
    const result = getPublishCalloutState({
      publishErrors: ['Defina um título para o treino'],
      publishSummary: 'Todos os atletas do gym',
      canPublishWorkout: false,
    });

    expect(result.tone).toBe('warn');
    expect(result.title).toBe('Ainda falta ajustar');
    expect(result.detail).toMatch(/Defina um título/i);
  });

  it('mostra estado de rascunho quando existe conteúdo salvo', () => {
    const result = getPublishCalloutState({
      draftStatus: 'Rascunho salvo automaticamente',
      selectedGymName: 'BSB Strong',
      publishSummary: 'Todos os atletas do gym',
    });

    expect(result.tone).toBe('draft');
    expect(result.title).toBe('Rascunho ativo');
    expect(result.detail).toMatch(/BSB Strong/i);
  });

  it('sinaliza quando o treino está pronto para publicar', () => {
    const result = getPublishCalloutState({
      publishSummary: '2 grupo(s) selecionado(s)',
      selectedGymName: 'BSB Strong',
      workoutTitle: 'Lower + Engine',
      canPublishWorkout: true,
    });

    expect(result.tone).toBe('ready');
    expect(result.title).toBe('Pronto para publicar');
    expect(result.detail).toMatch(/Lower \+ Engine/i);
    expect(result.detail).toMatch(/BSB Strong/i);
  });
});

describe('workspace action callout', () => {
  it('mostra estado de loading contextual', () => {
    const result = getActionCalloutState({
      status: 'loading',
      actionLabel: 'Criando grupo',
      detail: 'Salvando grupo e membros selecionados.',
    });

    expect(result?.tone).toBe('loading');
    expect(result?.title).toBe('Criando grupo');
    expect(result?.detail).toMatch(/membros selecionados/i);
  });

  it('mostra estado de erro contextual', () => {
    const result = getActionCalloutState({
      status: 'error',
      actionLabel: 'Não consegui publicar o treino',
      detail: 'API indisponível',
    });

    expect(result?.tone).toBe('error');
    expect(result?.title).toMatch(/publicar o treino/i);
    expect(result?.detail).toBe('API indisponível');
  });

  it('mostra estado de sucesso contextual', () => {
    const result = getActionCalloutState({
      status: 'success',
      actionLabel: 'Sessão criada',
      detail: 'A agenda do gym já foi atualizada.',
    });

    expect(result?.tone).toBe('success');
    expect(result?.title).toBe('Sessão criada');
    expect(result?.detail).toMatch(/agenda do gym/i);
  });
});
