import type { SharedWorkoutWeek } from './athlete-shell.js';

export function saveImportedPlanSnapshot(payload: {
  weeks: SharedWorkoutWeek[];
  metadata: Record<string, unknown>;
  activeWeekNumber?: number | null;
}): Promise<unknown>;
