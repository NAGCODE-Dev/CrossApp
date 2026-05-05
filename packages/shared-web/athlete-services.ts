import type { SharedWorkoutWeek } from './athlete-shell';
import {
  getAccessContext,
  getAthleteDashboard,
  getAthleteSummary,
  getAthleteWorkoutsRecent,
  getImportedPlanSnapshot,
  getRunningHistory,
  getStrengthHistory,
  getWorkoutFeed,
  logRunningSession,
  logStrengthSession,
  saveImportedPlanSnapshot as saveImportedPlanSnapshotBase,
} from '../../src/core/services/gymService.js';

export interface SharedImportedPlanSnapshotPayload {
  weeks: SharedWorkoutWeek[];
  metadata: Record<string, unknown>;
  activeWeekNumber?: number | null;
}

export {
  getAccessContext,
  getAthleteDashboard,
  getAthleteSummary,
  getAthleteWorkoutsRecent,
  getImportedPlanSnapshot,
  getRunningHistory,
  getStrengthHistory,
  getWorkoutFeed,
  logRunningSession,
  logStrengthSession,
};

export function saveImportedPlanSnapshot(payload: SharedImportedPlanSnapshotPayload) {
  return saveImportedPlanSnapshotBase(payload);
}
