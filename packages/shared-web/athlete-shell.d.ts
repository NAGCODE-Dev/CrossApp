export interface SharedWorkoutBlock {
  type?: string;
  title?: string;
  lines?: string[];
  period?: string;
  parsed?: {
    goal?: string;
    rounds?: number;
    items?: Array<{
      type?: string;
      durationSeconds?: number;
      displayName?: string;
      canonicalName?: string;
      name?: string;
    }>;
  };
}

export interface SharedWorkout {
  day?: string;
  blocks?: SharedWorkoutBlock[];
}

export interface SharedWorkoutWeek {
  weekNumber?: number;
  workouts?: SharedWorkout[];
}

export interface SharedAthleteTodaySnapshot {
  authenticated?: boolean;
  profile?: {
    email?: string;
    name?: string;
  } | null;
  preferences?: Record<string, unknown>;
  weeks?: SharedWorkoutWeek[];
  activeWeekNumber?: number | null;
  currentDay?: string | null;
  workout?: SharedWorkout | null;
  workoutMeta?: {
    source?: string;
    weekNumber?: number | null;
    day?: string | null;
    blockCount?: number;
    availableDays?: string[];
  } | null;
  importedPlanMeta?: {
    fileName?: string;
    source?: string;
    updatedAt?: string | null;
    uploadedAt?: string | null;
    weekNumbers?: number[];
  } | null;
  workoutContext?: {
    source?: string;
    availableDays?: string[];
    availableWeeks?: number[];
    recentWorkouts?: Array<{ gym_name?: string }>;
    accessContext?: unknown;
    athleteBenefits?: { tier?: string } | null;
    stats?: { activeGyms?: number; athleteTier?: string } | null;
    preferences?: Record<string, unknown>;
  } | null;
}

export function loadAthleteTodaySnapshot(options?: {
  sportType?: string;
}): Promise<SharedAthleteTodaySnapshot>;
export function buildAthleteTodaySnapshot(options?: Record<string, unknown>): SharedAthleteTodaySnapshot;
export function readAthletePreferences(): Promise<Record<string, unknown>>;
export function readTodaySelection(): Promise<{
  activeWeekNumber: number | null;
  currentDay: string | null;
}>;
export function persistTodaySelection(payload?: {
  activeWeekNumber?: number | null;
  currentDay?: string | null;
}): Promise<void>;
export function clearTodayDayOverride(): Promise<void>;
