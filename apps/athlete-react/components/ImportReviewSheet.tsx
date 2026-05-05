import React from 'react';
import {
  MetricStrip,
  PrimaryAction,
  SecondaryAction,
  SectionCard,
  SheetModal,
} from '../../../packages/ui/index.js';
import type { ImportReviewDay, ImportReviewSheetProps } from '../types';

const MetricStripView = MetricStrip as any;
const PrimaryActionView = PrimaryAction as any;
const SecondaryActionView = SecondaryAction as any;
const SectionCardView = SectionCard as any;
const SheetModalView = SheetModal as any;

export default function ImportReviewSheet({
  open,
  review,
  reviewText,
  reviewTextDeferred,
  importState,
  onClose,
  onChangeReviewText,
  onReparse,
  onConfirm,
  onCancel,
}: ImportReviewSheetProps) {
  const days: ImportReviewDay[] = Array.isArray(review?.days) ? review.days : [];
  const reviewLines = String(reviewTextDeferred || '').split('\n').filter(Boolean).length;
  const sourceLabel = String(review?.source || 'import').trim() || 'import';
  const fileLabel = String(review?.fileName || 'Arquivo atual').trim() || 'Arquivo atual';
  const canEdit = Boolean(review?.canEditText);
  const hasStructuredPreview = days.length > 0;

  return (
    <SheetModalView
      open={open}
      title="Revisão ativa do plano"
      subtitle="Edite o texto que o parser vai interpretar antes de salvar. Isso ajuda muito quando OCR, cabeçalho ou nome do arquivo entram no meio do treino."
      onClose={onClose}
      footer={(
        <>
          <SecondaryActionView onClick={onCancel} disabled={importState === 'saving'}>
            Cancelar
          </SecondaryActionView>
          <PrimaryActionView onClick={onConfirm} disabled={importState === 'saving'}>
            {importState === 'saving' ? 'Salvando...' : 'Salvar plano'}
          </PrimaryActionView>
        </>
      )}
    >
      <MetricStripView
        metrics={[
          { label: 'Semanas', value: String(review?.weeksCount || 0).padStart(2, '0'), detail: review?.fileName || 'Arquivo atual' },
          { label: 'Dias', value: String(review?.totalDays || 0).padStart(2, '0'), detail: `${reviewLines} linhas revisadas` },
          { label: 'Blocos', value: String(review?.totalBlocks || 0).padStart(2, '0'), detail: review?.source || 'import' },
          { label: 'Preview', value: String(days.length).padStart(2, '0'), detail: 'dias resumidos abaixo' },
        ]}
      />

      <SectionCardView
        eyebrow="Contexto"
        title="Antes de salvar"
        subtitle="Cheque de onde veio esse preview e qual é o modo atual da revisão."
      >
        <div className="ath-reviewContextGrid">
          <article className="ath-reviewContextCard">
            <strong>Arquivo</strong>
            <span>{fileLabel}</span>
          </article>
          <article className="ath-reviewContextCard">
            <strong>Origem</strong>
            <span>{sourceLabel}</span>
          </article>
          <article className="ath-reviewContextCard">
            <strong>Modo</strong>
            <span>{canEdit ? 'Texto revisável antes do save' : 'Preview somente leitura'}</span>
          </article>
        </div>
      </SectionCardView>

      <SectionCardView
        eyebrow="Texto fonte"
        title="Revisão editorial do parser"
        subtitle="Se o OCR trouxe ruído, troque o texto cru aqui e mande reprocessar o preview."
        actions={(
          <SecondaryActionView onClick={onReparse} disabled={!review?.canEditText || importState === 'reparsing'}>
            {importState === 'reparsing' ? 'Reprocessando...' : 'Reprocessar preview'}
          </SecondaryActionView>
        )}
      >
        <label className="ath-reviewLabel" htmlFor="athlete-review-text">
          Texto revisável
        </label>
        <textarea
          id="athlete-review-text"
          className="ath-reviewTextarea"
          value={reviewText}
          onChange={(event) => onChangeReviewText(event.target.value)}
          spellCheck="false"
        />
      </SectionCardView>

      <SectionCardView eyebrow="Resumo" title="O que o preview entendeu" subtitle="Dias, blocos e movimentos inferidos a partir do texto revisado.">
        {hasStructuredPreview ? (
          <div className="ath-reviewMetrics">
            {days.map((day, index) => (
              <article key={`${day.weekNumber || 'week'}-${day.day || 'day'}-${index}`} className="ath-reviewDay">
                <strong>{day.day}</strong>
                <span>Semana {day.weekNumber || '-'}</span>
                {day.blockTypes?.length ? <span>{day.blockTypes.join(' · ')}</span> : null}
                {day.goal ? <span>Objetivo: {day.goal}</span> : null}
                {day.movements?.length ? <span>{day.movements.join(', ')}</span> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="ath-reviewEmpty">
            <strong>O parser ainda não montou dias resumidos</strong>
            <span>Você ainda pode revisar o texto acima e reprocessar o preview antes de salvar.</span>
          </div>
        )}
      </SectionCardView>
    </SheetModalView>
  );
}
