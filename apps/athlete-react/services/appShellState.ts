import { getStoredProfile } from '../../../packages/shared-web/auth.js';
import type { AthleteSnapshot, AuthResult } from '../types';

export const IMPORT_ACCEPT = [
  '.pdf',
  '.txt',
  '.json',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  'application/pdf',
  'text/plain',
  'application/json',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
].join(',');

export function buildInitialSnapshot(): AthleteSnapshot {
  return {
    profile: getStoredProfile(),
    weeks: [],
    activeWeekNumber: null,
    currentDay: null,
    workout: null,
    workoutMeta: null,
    importedPlanMeta: null,
    workoutContext: {
      source: 'empty',
      availableDays: [],
      availableWeeks: [],
      recentWorkouts: [],
      stats: {},
      athleteBenefits: null,
      preferences: {},
    },
  };
}

export function normalizeAuthMessage(result: AuthResult | null | undefined): string {
  if (!result?.handled) return '';
  if (result.success) return 'Sessão iniciada com Google.';
  return result.error || 'Não foi possível concluir o login com Google.';
}
