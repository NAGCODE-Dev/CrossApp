import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { hasStoredSession } from '../../../packages/shared-web/auth.js';
import { createAthleteImportReviewAdapter } from '../../../packages/shared-web/athlete-import-review';
import type { SharedWorkoutWeek } from '../../../packages/shared-web/athlete-shell';
import { saveImportedPlanSnapshot } from '../../../packages/shared-web/athlete-services';
import { persistTodaySelection } from '../../../packages/shared-web/athlete-shell';
import { validateWorkoutContract } from '../../../packages/shared-web/flowContracts';
import type {
  EventLikeWithFiles,
  ImportReview,
  ImportReviewAdapter,
  ImportState,
  UseAthleteImportFlowArgs,
  UseAthleteImportFlowResult,
} from '../types';

export function useAthleteImportFlow({
  snapshot,
  setError,
  setMessage,
  setProgressMessage,
  loadSnapshot,
}: UseAthleteImportFlowArgs): UseAthleteImportFlowResult {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef({
    activeWeekNumber: snapshot?.activeWeekNumber || null,
    currentDay: snapshot?.currentDay || null,
  });
  const syncFeedbackRef = useRef('');
  const [review, setReview] = useState<ImportReview | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [importState, setImportState] = useState<ImportState>('idle');

  selectionRef.current = {
    activeWeekNumber: snapshot?.activeWeekNumber || null,
    currentDay: snapshot?.currentDay || null,
  };

  const reviewTextDeferred = useDeferredValue(reviewText);

  const reviewAdapter = useMemo(() => {
    const adapterConfig = {
        getActiveWeekNumber: () => selectionRef.current.activeWeekNumber,
        getFallbackDay: () => selectionRef.current.currentDay,
        onProgress: ({ message: nextMessage = '' } = {}) => {
          setProgressMessage(String(nextMessage || '').trim());
        },
        syncImportedPlan: async (
          weeks: SharedWorkoutWeek[],
          metadata: Record<string, unknown>,
        ) => {
          if (!hasStoredSession()) {
            syncFeedbackRef.current = '';
            return { success: true, skipped: true };
          }

          try {
            await saveImportedPlanSnapshot({
              weeks,
              metadata,
              activeWeekNumber:
                Number(weeks?.[0]?.weekNumber) ||
                selectionRef.current.activeWeekNumber ||
                null,
            });
            syncFeedbackRef.current = '';
            return { success: true };
          } catch {
            syncFeedbackRef.current =
              'Plano salvo localmente, mas a sincronização da conta falhou.';
            return { success: false, skipped: true };
          }
        },
      };

    return createAthleteImportReviewAdapter(adapterConfig) as ImportReviewAdapter;
  }, [setProgressMessage]);

  async function handleOpenImport() {
    setError('');
    setMessage('');
    fileInputRef.current?.click();
  }

  async function handleImportFileChange(event: EventLikeWithFiles) {
    const [file] = Array.from(event?.target?.files || []);
    event.target.value = '';
    if (!file) return;

    setImportState('previewing');
    setError('');
    setMessage('');
    syncFeedbackRef.current = '';

    const result = await reviewAdapter.previewImportFromFile(file);
    if (!result?.success) {
      setImportState('idle');
      setReview(null);
      setReviewText('');
      setError(result?.error || 'Não consegui preparar a revisão do plano.');
      return;
    }

    setReview(result.review || null);
    setReviewText(result.review?.reviewText || '');
    setImportState('idle');
  }

  async function handleReparseReview() {
    setImportState('reparsing');
    setError('');
    const result = await reviewAdapter.reparseImportReview(reviewText);
    if (!result?.success) {
      setImportState('idle');
      setError(result?.error || 'Não consegui reprocessar o preview.');
      return;
    }

    setReview(result.review || null);
    setReviewText(result.review?.reviewText || reviewText);
    setImportState('idle');
  }

  async function handleConfirmReview() {
    setImportState('saving');
    const result = await reviewAdapter.commitImportReview();
    if (!result?.success) {
      setImportState('idle');
      setError(result?.error || 'Não consegui salvar o plano.');
      return;
    }

    const workouts =
      result?.weeks?.flatMap((week) => week.workouts || []) || [];
    for (const workout of workouts) {
      const validation = validateWorkoutContract(workout);
      if (!validation.valid) {
        setImportState('idle');
        setError(
          `Plano inválido: ${validation.errors.map((item: { message: string }) => item.message).join(', ')}`,
        );
        return;
      }
    }

    const nextWeek = result?.review?.weekNumbers?.[0] || result?.weeks?.[0]?.weekNumber || null;
    const nextDay = result?.review?.days?.[0]?.day || null;
    await persistTodaySelection({
      activeWeekNumber: nextWeek,
      currentDay: nextDay,
    });

    setReview(null);
    setReviewText('');
    setImportState('idle');
    setMessage(syncFeedbackRef.current || 'Plano salvo com sucesso.');
    setError('');
    await loadSnapshot();
  }

  async function handleCancelReview() {
    await reviewAdapter.cancelImportReview();
    setReview(null);
    setReviewText('');
    setImportState('idle');
    setProgressMessage('');
  }

  return {
    fileInputRef,
    review,
    reviewText,
    reviewTextDeferred,
    importState,
    setReviewText,
    handleOpenImport,
    handleImportFileChange,
    handleReparseReview,
    handleConfirmReview,
    handleCancelReview,
  };
}
