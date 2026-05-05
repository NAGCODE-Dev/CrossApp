import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import TodayPage from './TodayPage';
import { createTodayViewModel } from '../services/todayViewModel';

function buildSnapshot(withWorkout = true) {
  return {
    profile: { email: 'athlete@ryxen.app', name: 'Athlete Ryxen' },
    weeks: withWorkout ? [{
      weekNumber: 24,
      workouts: [{
        day: 'Quarta',
        blocks: [
          { type: 'WOD', title: '16 MIN AMRAP', lines: ['15 CAL ROW', '20 CTBS'] },
        ],
      }],
    }] : [],
    activeWeekNumber: withWorkout ? 24 : null,
    currentDay: 'Quarta',
    workout: withWorkout ? {
      day: 'Quarta',
      blocks: [
        { type: 'WOD', title: '16 MIN AMRAP', lines: ['15 CAL ROW', '20 CTBS'] },
      ],
    } : null,
    workoutMeta: withWorkout ? { blockCount: 1 } : null,
    importedPlanMeta: withWorkout ? { fileName: 'week24.pdf' } : null,
    workoutContext: {
      source: withWorkout ? 'local' : 'empty',
      availableDays: withWorkout ? ['Quarta'] : [],
      availableWeeks: withWorkout ? [24] : [],
      recentWorkouts: [],
      stats: { activeGyms: 1, athleteTier: 'plus' },
      athleteBenefits: { tier: 'plus' },
    },
  };
}

const noop = () => {};

describe('TodayPage', () => {
  it('renderiza o Today com treino e blocos estruturados', () => {
    const snapshot = buildSnapshot(true);

    render(
      <TodayPage
        snapshot={snapshot}
        viewModel={createTodayViewModel(snapshot)}
        loading={false}
        error=""
        message=""
        progressMessage=""
        onOpenImport={noop}
        onRetryLoad={noop}
        onSelectWeek={noop}
        onSelectDay={noop}
        onResetDay={noop}
        onStartAuth={noop}
        onSignOut={noop}
      />,
    );

    expect(screen.getByRole('heading', { name: /Editorial Today/i })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: /Quarta/i })).toHaveLength(2);
    expect(screen.getByText(/16 MIN AMRAP/i)).toBeInTheDocument();
    expect(screen.getByText(/15 CAL ROW/i)).toBeInTheDocument();
  });

  it('renderiza empty state quando ainda não há workout estruturado', () => {
    const snapshot = buildSnapshot(false);

    render(
      <TodayPage
        snapshot={snapshot}
        viewModel={createTodayViewModel(snapshot)}
        loading={false}
        error=""
        message=""
        progressMessage=""
        onOpenImport={noop}
        onRetryLoad={noop}
        onSelectWeek={noop}
        onSelectDay={noop}
        onResetDay={noop}
        onStartAuth={noop}
        onSignOut={noop}
      />,
    );

    expect(screen.getByText(/Sem treino estruturado por aqui ainda/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importar agora/i })).toBeInTheDocument();
  });

  it('mostra um estado explícito de retry quando o snapshot falha', () => {
    const snapshot = buildSnapshot(false);

    render(
      <TodayPage
        snapshot={snapshot}
        viewModel={createTodayViewModel(snapshot)}
        loading={false}
        error="Falha ao carregar snapshot remoto"
        message=""
        progressMessage=""
        onOpenImport={noop}
        onRetryLoad={noop}
        onSelectWeek={noop}
        onSelectDay={noop}
        onResetDay={noop}
        onStartAuth={noop}
        onSignOut={noop}
      />,
    );

    expect(screen.getByText(/Não consegui sincronizar seu Today agora/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar de novo/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Falha ao carregar snapshot remoto/i).length).toBeGreaterThan(0);
  });

  it('mostra um estado de sync quando o cold start ainda está carregando', () => {
    const snapshot = buildSnapshot(false);

    render(
      <TodayPage
        snapshot={snapshot}
        viewModel={createTodayViewModel(snapshot)}
        loading
        error=""
        message=""
        progressMessage=""
        onOpenImport={noop}
        onRetryLoad={noop}
        onSelectWeek={noop}
        onSelectDay={noop}
        onResetDay={noop}
        onStartAuth={noop}
        onSignOut={noop}
      />,
    );

    expect(screen.getByText(/Montando seu Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Validando acesso/i)).toBeInTheDocument();
    expect(screen.getByText(/Plano local continua disponível/i)).toBeInTheDocument();
  });
});
