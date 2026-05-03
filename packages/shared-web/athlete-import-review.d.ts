import type { SharedWorkoutWeek } from './athlete-shell.js';

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

export interface SharedImportReviewAdapterOptions {
  getActiveWeekNumber?: () => number | null;
  getFallbackDay?: () => string | null;
  onProgress?: (progress?: {
    stage?: string;
    message?: string;
    fileName?: string;
    source?: string;
  }) => void;
  syncImportedPlan?: (
    weeks: SharedWorkoutWeek[],
    metadata: Record<string, unknown>,
  ) => Promise<{ success: boolean; skipped?: boolean }>;
}

export function createAthleteImportReviewAdapter(
  options?: SharedImportReviewAdapterOptions,
): SharedImportReviewAdapter;
