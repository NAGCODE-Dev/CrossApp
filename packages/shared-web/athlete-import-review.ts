import { previewMultiWeekPdf, saveParsedWeeks } from '../../src/adapters/pdf/pdfRepository.js';
import { importWorkoutAsWeeks } from '../../src/core/usecases/exportWorkout.js';
import { classifyUniversalImportFile, isPdfImportFile, isTextLikeImportFile } from '../../src/app/importFileTypes.js';
import { parseTextIntoWeeks, prepareImportTextForParsing } from '../../src/app/workoutHelpers.js';
import type { SharedImportedPlanMeta, SharedWorkoutBlock, SharedWorkoutWeek } from './athlete-shell';

export interface SharedImportReviewDay {
  weekNumber?: number | null;
  day?: string;
  periods?: string[];
  blockTypes?: string[];
  goal?: string;
  movements?: string[];
  intervalSummary?: string;
}

export interface SharedImportReview {
  fileName?: string;
  source?: string;
  weeksCount?: number;
  totalDays?: number;
  totalBlocks?: number;
  weekNumbers?: number[];
  days?: SharedImportReviewDay[];
  reviewText?: string;
  canEditText?: boolean;
}

export interface SharedImportReviewResult {
  success?: boolean;
  error?: string;
  source?: string;
  preview?: boolean;
  review?: SharedImportReview | null;
  weeks?: SharedWorkoutWeek[];
  metadata?: Record<string, unknown>;
}

export interface SharedImportReviewAdapter {
  previewImportFromFile(file: File): Promise<SharedImportReviewResult>;
  reparseImportReview(nextText: string): Promise<SharedImportReviewResult>;
  commitImportReview(): Promise<SharedImportReviewResult>;
  cancelImportReview(): Promise<{ success: boolean }>;
  getPendingReview(): SharedImportReview | null;
}

export interface SharedImportProgress {
  stage?: string;
  message?: string;
  fileName?: string;
  source?: string;
}

export interface SharedImportReviewAdapterOptions {
  getActiveWeekNumber?: () => number | null;
  getFallbackDay?: () => string | null;
  onProgress?: (progress?: SharedImportProgress) => void;
  syncImportedPlan?: (
    weeks: SharedWorkoutWeek[],
    metadata: Record<string, unknown>,
  ) => Promise<{ success: boolean; skipped?: boolean }>;
}

interface SharedPreviewPdfResult {
  success?: boolean;
  error?: string;
  data?: {
    parsedWeeks: SharedWorkoutWeek[];
    reviewText?: string;
    metadata?: SharedImportedPlanMeta | null;
  };
}

interface SharedSaveParsedWeeksResult {
  success?: boolean;
  error?: string;
  data?: {
    parsedWeeks: SharedWorkoutWeek[];
    metadata: Record<string, unknown>;
  };
}

interface PendingImportReviewState {
  parsedWeeks: SharedWorkoutWeek[];
  metadata: SharedImportedPlanMeta & {
    fileSize?: number;
    source?: string;
  };
  reviewText: string;
  activeWeekNumber: number | null;
  fallbackDay: string | null;
  review: SharedImportReview;
}

interface StructuredWorkoutImportResult {
  success?: boolean;
  data?: SharedWorkoutWeek[];
}

type ParseTextIntoWeeksFn = (
  text: string,
  activeWeekNumber?: number | null,
  options?: { fallbackDay?: string | null; fileName?: string },
) => SharedWorkoutWeek[];

export function createAthleteImportReviewAdapter({
  getActiveWeekNumber = () => null,
  getFallbackDay = () => null,
  onProgress = () => {},
  syncImportedPlan = async () => ({ success: false, skipped: true }),
}: SharedImportReviewAdapterOptions = {}): SharedImportReviewAdapter {
  let pendingImportReview: PendingImportReviewState | null = null;
  const parseWeeks = parseTextIntoWeeks as unknown as ParseTextIntoWeeksFn;

  async function previewImportFromFile(file: File): Promise<SharedImportReviewResult> {
    if (!file) {
      return { success: false, error: 'Arquivo não fornecido' };
    }

    if (isPdfImportFile(file)) {
      return previewPdfImport(file);
    }

    return previewUniversalImport(file);
  }

  async function reparseImportReview(nextText: string): Promise<SharedImportReviewResult> {
    if (!pendingImportReview?.metadata) {
      return { success: false, error: 'Nenhum preview pendente para revisar' };
    }

    const fileName = String(pendingImportReview.metadata?.fileName || '');
    const editedText = String(nextText || '').trim();
    if (!editedText) {
      return { success: false, error: 'Edite o texto antes de reprocessar o preview' };
    }

    onProgress({
      stage: 'import-reparse',
      message: 'Organizando preview com suas correções...',
      fileName,
      source: String(pendingImportReview.metadata?.source || 'arquivo'),
    });

    const reviewText = prepareImportTextForParsing(editedText, { fileName });
    const parsedWeeks = parseWeeks(reviewText, pendingImportReview.activeWeekNumber, {
      fallbackDay: pendingImportReview.fallbackDay,
      fileName,
    });

    if (!parsedWeeks.length) {
      return { success: false, error: 'Ainda não consegui identificar treinos nesse texto revisado' };
    }

    pendingImportReview = {
      ...pendingImportReview,
      parsedWeeks,
      reviewText,
      review: summarizeWeeksForReview(
        parsedWeeks,
        String(pendingImportReview.metadata?.source || 'arquivo'),
        fileName,
        { reviewText },
      ),
    };

    return {
      success: true,
      review: pendingImportReview.review,
      source: String(pendingImportReview.metadata?.source || 'arquivo'),
    };
  }

  async function commitImportReview(): Promise<SharedImportReviewResult> {
    if (!pendingImportReview?.parsedWeeks?.length) {
      return { success: false, error: 'Nenhuma importação pendente para confirmar' };
    }

    const metadata = pendingImportReview.metadata || {};
    onProgress({
      stage: 'import-save',
      message: 'Salvando treino importado...',
      fileName: String(metadata.fileName || ''),
      source: String(metadata.source || 'arquivo'),
    });

    const result = (await saveParsedWeeks(
      pendingImportReview.parsedWeeks,
      metadata,
    )) as SharedSaveParsedWeeksResult;
    if (!result?.success) {
      return { success: false, error: result?.error || 'Falha ao salvar plano importado' };
    }

    if (!result.data) {
      return { success: false, error: 'Falha ao salvar plano importado' };
    }

    await syncImportedPlan(result.data.parsedWeeks, result.data.metadata);

    const payload = {
      success: true,
      weeks: result.data.parsedWeeks,
      metadata: result.data.metadata,
      review: pendingImportReview.review,
      source: String(metadata.source || 'arquivo'),
    };

    pendingImportReview = null;
    return payload;
  }

  async function cancelImportReview() {
    pendingImportReview = null;
    return { success: true };
  }

  function getPendingReview() {
    return pendingImportReview?.review || null;
  }

  return {
    previewImportFromFile,
    reparseImportReview,
    commitImportReview,
    cancelImportReview,
    getPendingReview,
  };

  async function previewPdfImport(file: File): Promise<SharedImportReviewResult> {
    onProgress({
      stage: 'pdf-start',
      message: 'Preparando PDF para importação...',
      fileName: file.name,
      source: 'pdf',
    });

    const result = (await previewMultiWeekPdf(file, {
      onProgress: (progress: SharedImportProgress = {}) => onProgress({
        fileName: file.name,
        source: 'pdf',
        ...progress,
      }),
    })) as SharedPreviewPdfResult;

    if (!result?.success) {
      return { success: false, error: result?.error || 'Falha ao preparar preview do PDF' };
    }

    if (!result.data) {
      return { success: false, error: result?.error || 'Falha ao preparar preview do PDF' };
    }

    const reviewText = String(result.data.reviewText || '').trim();
    pendingImportReview = {
      parsedWeeks: result.data.parsedWeeks,
      metadata: {
        ...(result.data.metadata || {}),
        fileName: file.name,
        fileSize: file.size,
        source: 'pdf',
      },
      reviewText,
      activeWeekNumber: getActiveWeekNumber(),
      fallbackDay: getFallbackDay(),
      review: summarizeWeeksForReview(result.data.parsedWeeks, 'pdf', file.name, { reviewText }),
    };

    return { success: true, review: pendingImportReview.review, source: 'pdf' };
  }

  async function previewUniversalImport(file: File): Promise<SharedImportReviewResult> {
    const fileInfo = classifyUniversalImportFile(file);
    let source = 'text';
    let rawText = '';
    let parsedWeeks: SharedWorkoutWeek[] = [];
    let reviewText = '';

    try {
      if (isImageImportFile(file)) {
        source = 'image';
        onProgress({
          stage: 'media-ocr',
          message: 'Lendo texto da imagem...',
          fileName: file.name,
          source,
        });
        rawText = await readImageImportText(file);
      } else if (isTextLikeImportFile(file)) {
        source = 'text';
        rawText = await file.text();
        const maybeStructuredWorkout = importWorkoutAsWeeks(
          rawText,
          getActiveWeekNumber() || undefined,
        ) as StructuredWorkoutImportResult;
        if (maybeStructuredWorkout?.success) {
          source = 'structured-json';
          parsedWeeks = maybeStructuredWorkout.data || [];
        }
      } else {
        throw new Error(fileInfo.error || `Formato não suportado: ${file.type || file.name}`);
      }

      if (source !== 'structured-json') {
        reviewText = prepareImportTextForParsing(rawText, { fileName: file.name });
      }

      parsedWeeks = parsedWeeks.length
        ? parsedWeeks
        : parseWeeks(rawText, getActiveWeekNumber(), {
            fallbackDay: getFallbackDay(),
            fileName: file.name,
          });

      if (!parsedWeeks.length) {
        throw new Error('Não foi possível identificar treinos no conteúdo importado');
      }

      pendingImportReview = {
        parsedWeeks,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          source,
        },
        reviewText,
        activeWeekNumber: getActiveWeekNumber(),
        fallbackDay: getFallbackDay(),
        review: summarizeWeeksForReview(parsedWeeks, source, file.name, { reviewText }),
      };

      return {
        success: true,
        preview: true,
        review: pendingImportReview.review,
        source,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao importar arquivo',
      };
    }
  }
}

function isImageImportFile(file: File) {
  return !!file?.type?.startsWith('image/');
}

async function readImageImportText(file: File) {
  const { extractTextFromImageFile } = await import('../../src/adapters/media/ocrReader.js');
  return extractTextFromImageFile(file);
}

function summarizeWeeksForReview(
  weeks: SharedWorkoutWeek[] = [],
  source = 'text',
  fileName = '',
  options: { reviewText?: string } = {},
): SharedImportReview {
  const normalizedWeeks = Array.isArray(weeks) ? weeks : [];
  const previewDays: SharedImportReviewDay[] = [];
  let totalBlocks = 0;

  for (const week of normalizedWeeks) {
    for (const workout of week?.workouts || []) {
      const blocks = Array.isArray(workout?.blocks) ? workout.blocks : [];
      totalBlocks += blocks.length;
      const periods = [
        ...new Set(blocks.map((block) => block?.period).filter((value): value is string => Boolean(value))),
      ];
      const blockTypes = [
        ...new Set(
          blocks
            .map((block) => String(block?.type || '').trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const goals = [
        ...new Set(
          blocks
            .map((block) => block?.parsed?.goal)
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const movements = [
        ...new Set(
          blocks.flatMap((block) =>
            (block?.parsed?.items || [])
              .filter((item) => item?.type === 'movement')
              .map((item) => item?.canonicalName || item?.name || item?.displayName)
              .filter((value): value is string => Boolean(value)),
          ),
        ),
      ];
      const intervalSummary = blocks
        .map((block) => buildIntervalReviewSummary(block))
        .find(Boolean) || '';

      previewDays.push({
        weekNumber: week?.weekNumber || null,
        day: workout?.day || '',
        periods: periods.slice(0, 3),
        blockTypes: blockTypes.slice(0, 4),
        goal: goals[0] || '',
        movements: movements.slice(0, 3),
        intervalSummary,
      });
    }
  }

  return {
    fileName,
    source,
    weeksCount: normalizedWeeks.length,
    totalDays: previewDays.length,
    totalBlocks,
    weekNumbers: normalizedWeeks
      .map((week) => week?.weekNumber)
      .filter((weekNumber): weekNumber is number => Number.isFinite(Number(weekNumber))),
    days: previewDays.slice(0, 6),
    reviewText: typeof options.reviewText === 'string' ? options.reviewText : '',
    canEditText: Boolean(options.reviewText),
  };
}

function buildIntervalReviewSummary(block: SharedWorkoutBlock = {}) {
  const parsed = block?.parsed || {};
  const rounds = Number(parsed?.rounds || 0);
  const timedItems = (parsed?.items || []).filter(
    (item) => Number(item?.durationSeconds) > 0,
  );
  if (!rounds || !timedItems.length) return '';

  const segments = timedItems
    .map((item) => item.type === 'rest'
      ? `${item.durationSeconds}s rest`
      : `${item.durationSeconds}s ${item.displayName || item.canonicalName || item.name || 'trabalho'}`)
    .slice(0, 4);

  return `${rounds} rounds · ${segments.join(' · ')}`;
}
