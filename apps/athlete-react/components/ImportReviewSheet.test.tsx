import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import ImportReviewSheet from './ImportReviewSheet';

const noop = () => {};

describe('ImportReviewSheet', () => {
  it('mostra contexto do arquivo e modo de revisão quando o preview é editável', () => {
    render(
      <ImportReviewSheet
        open
        review={{
          fileName: 'week24.pdf',
          source: 'pdf',
          weeksCount: 1,
          totalDays: 2,
          totalBlocks: 4,
          canEditText: true,
          days: [{ weekNumber: 24, day: 'Quarta', blockTypes: ['WOD'] }],
        }}
        reviewText={'SEMANA 24\nQUARTA\nWOD'}
        reviewTextDeferred={'SEMANA 24\nQUARTA\nWOD'}
        importState="idle"
        onClose={noop}
        onChangeReviewText={noop}
        onReparse={noop}
        onConfirm={noop}
        onCancel={noop}
      />,
    );

    expect(screen.getAllByText('week24.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pdf').length).toBeGreaterThan(0);
    expect(screen.getByText(/Texto revisável antes do save/i)).toBeInTheDocument();
  });

  it('mostra fallback amigável quando ainda não existem dias resumidos', () => {
    render(
      <ImportReviewSheet
        open
        review={{
          fileName: 'captura.png',
          source: 'image',
          weeksCount: 0,
          totalDays: 0,
          totalBlocks: 0,
          canEditText: true,
          days: [],
        }}
        reviewText={'QUARTA\nWOD'}
        reviewTextDeferred={'QUARTA\nWOD'}
        importState="idle"
        onClose={noop}
        onChangeReviewText={noop}
        onReparse={noop}
        onConfirm={noop}
        onCancel={noop}
      />,
    );

    expect(screen.getByText(/O parser ainda não montou dias resumidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Você ainda pode revisar o texto acima/i)).toBeInTheDocument();
  });
});
