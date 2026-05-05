import { getStoredProfile, hasStoredSession } from './auth.js';
import { createStorage } from '../../src/adapters/storage/storageFactory.js';
import { loadParsedWeeks, saveParsedWeeks } from '../../src/adapters/pdf/pdfRepository.js';
import { getWorkoutFromWeek } from '../../src/adapters/pdf/customPdfParser.js';
import { getDayName } from '../../src/core/utils/date.js';
import {
  getAccessContext,
  getAthleteSummary,
  getAthleteWorkoutsRecent,
  getImportedPlanSnapshot,
} from '../../src/core/services/gymService.js';

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
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SharedWorkout {
  day?: string;
  blocks?: SharedWorkoutBlock[];
  [key: string]: unknown;
}

export interface SharedWorkoutWeek {
  weekNumber?: number;
  workouts?: SharedWorkout[];
  [key: string]: unknown;
}

export interface SharedAthleteProfile {
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface SharedImportedPlanMeta {
  fileName?: string;
  source?: string;
  updatedAt?: string | null;
  uploadedAt?: string | null;
  weekNumbers?: number[];
  [key: string]: unknown;
}

export interface SharedAthleteTodaySelection {
  activeWeekNumber: number | null;
  currentDay: string | null;
}

export interface SharedAthleteTodaySnapshot {
  authenticated?: boolean;
  profile?: SharedAthleteProfile | null;
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
  importedPlanMeta?: SharedImportedPlanMeta | null;
  workoutContext?: {
    source?: string;
    availableDays?: string[];
    availableWeeks?: number[];
    recentWorkouts?: Array<{ gym_name?: string; [key: string]: unknown }>;
    accessContext?: unknown;
    athleteBenefits?: { tier?: string; [key: string]: unknown } | null;
    stats?: { activeGyms?: number; athleteTier?: string; [key: string]: unknown } | null;
    preferences?: Record<string, unknown>;
  } | null;
}

interface LoadAthleteTodaySnapshotOptions {
  sportType?: string;
}

interface SharedImportedPlanRemote {
  weeks?: SharedWorkoutWeek[];
  metadata?: SharedImportedPlanMeta | null;
  updatedAt?: string | null;
  activeWeekNumber?: number | null;
}

interface BuildAthleteTodaySnapshotOptions {
  profile?: SharedAthleteProfile | null;
  weeks?: SharedWorkoutWeek[];
  selection?: Partial<SharedAthleteTodaySelection>;
  preferences?: Record<string, unknown>;
  athleteSummary?: {
    athleteBenefits?: { tier?: string; [key: string]: unknown } | null;
    stats?: { activeGyms?: number; athleteTier?: string; [key: string]: unknown } | null;
    [key: string]: unknown;
  } | null;
  accessContext?: unknown;
  recentWorkouts?: Array<{ gym_name?: string; [key: string]: unknown }>;
  importedPlanMeta?: SharedImportedPlanMeta | null;
  importedPlanSource?: string;
}

interface SharedAsyncStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

interface SharedParsedWeeksResult {
  success?: boolean;
  data?: {
    weeks?: SharedWorkoutWeek[];
    metadata?: SharedImportedPlanMeta | null;
  } | null;
}

const activeWeekStorage = createStorage('active-week', 100) as SharedAsyncStorage;
const dayOverrideStorage = createStorage('day-override', 100) as SharedAsyncStorage;
const prefsStorage = createStorage('preferences', 1000) as SharedAsyncStorage;

export async function loadAthleteTodaySnapshot(
  options: LoadAthleteTodaySnapshotOptions = {},
): Promise<SharedAthleteTodaySnapshot> {
  const sportType = String(options?.sportType || 'cross').trim() || 'cross';
  const profile = getStoredProfile() as SharedAthleteProfile | null;
  const authenticated = hasStoredSession();
  const selection = await readTodaySelection();
  const preferences = await readAthletePreferences();

  let weeks: SharedWorkoutWeek[] = [];
  let importedPlanMeta: SharedImportedPlanMeta | null = null;
  let importedPlanSource = 'empty';

  const localPlan = (await loadParsedWeeks()) as SharedParsedWeeksResult;
  if (localPlan?.success && Array.isArray(localPlan?.data?.weeks) && localPlan.data.weeks.length) {
    weeks = localPlan.data.weeks;
    importedPlanMeta = localPlan.data.metadata || null;
    importedPlanSource = 'local';
  }

  const [remoteImport, summarySettled, workoutsSettled, accessSettled] = authenticated
    ? await Promise.all([
        weeks.length ? Promise.resolve({ importedPlan: null }) : safeServiceCall(() => getImportedPlanSnapshot(), { importedPlan: null }),
        safeServiceCall(() => getAthleteSummary({ sportType }), null),
        safeServiceCall(() => getAthleteWorkoutsRecent({ sportType }), { recentWorkouts: [] }),
        safeServiceCall(() => getAccessContext(), null),
      ])
    : [{ importedPlan: null }, null, { recentWorkouts: [] }, null];

  const importedPlan = (remoteImport?.importedPlan || null) as SharedImportedPlanRemote | null;
  if (!weeks.length && Array.isArray(importedPlan?.weeks) && importedPlan.weeks.length) {
    weeks = importedPlan.weeks;
    importedPlanMeta = {
      ...(importedPlan.metadata || {}),
      updatedAt: importedPlan.updatedAt || importedPlan.metadata?.uploadedAt || null,
      source: importedPlan.metadata?.source || 'account',
    };
    importedPlanSource = 'remote';
    await saveParsedWeeks(weeks, importedPlanMeta || {});
  }

  const snapshot = buildAthleteTodaySnapshot({
    profile,
    weeks,
    selection: {
      ...selection,
      activeWeekNumber: selection?.activeWeekNumber || Number(importedPlan?.activeWeekNumber) || null,
    },
    preferences,
    athleteSummary: summarySettled,
    accessContext: accessSettled,
    recentWorkouts: workoutsSettled?.recentWorkouts || [],
    importedPlanMeta,
    importedPlanSource,
  });

  return {
    ...snapshot,
    authenticated,
    profile,
    preferences,
  };
}

export function buildAthleteTodaySnapshot({
  profile = null,
  weeks = [],
  selection = {},
  preferences = {},
  athleteSummary = null,
  accessContext = null,
  recentWorkouts = [],
  importedPlanMeta = null,
  importedPlanSource = 'empty',
}: BuildAthleteTodaySnapshotOptions = {}): SharedAthleteTodaySnapshot {
  const normalizedWeeks = Array.isArray(weeks)
    ? [...weeks].sort((a, b) => Number(a?.weekNumber || 0) - Number(b?.weekNumber || 0))
    : [];
  const activeWeekNumber = resolveActiveWeekNumber(normalizedWeeks, selection?.activeWeekNumber);
  const activeWeek = normalizedWeeks.find((week) => Number(week?.weekNumber) === Number(activeWeekNumber)) || normalizedWeeks[0] || null;
  const availableDays = Array.isArray(activeWeek?.workouts)
    ? activeWeek.workouts.map((workout) => String(workout?.day || '').trim()).filter(Boolean)
    : [];
  const currentDay = resolveCurrentDay(availableDays, selection?.currentDay || undefined);
  const workout = activeWeek
    ? ((getWorkoutFromWeek(activeWeek, currentDay) as SharedWorkout | null) ||
        activeWeek.workouts?.[0] ||
        null)
    : null;
  const workoutBlocks = Array.isArray(workout?.blocks) ? workout.blocks : [];

  return {
    profile,
    weeks: normalizedWeeks,
    activeWeekNumber,
    currentDay,
    workout,
    workoutMeta: workout
      ? {
          source: importedPlanSource === 'empty' ? 'unavailable' : `${importedPlanSource}-imported-plan`,
          weekNumber: activeWeek?.weekNumber || null,
          day: workout.day || currentDay || null,
          blockCount: workoutBlocks.length,
          availableDays,
        }
      : null,
    importedPlanMeta,
    workoutContext: {
      source: importedPlanSource,
      availableDays,
      availableWeeks: normalizedWeeks
        .map((week) => week?.weekNumber)
        .filter((weekNumber): weekNumber is number => Number.isFinite(Number(weekNumber))),
      recentWorkouts,
      accessContext,
      athleteBenefits: athleteSummary?.athleteBenefits || null,
      stats: athleteSummary?.stats || null,
      preferences,
    },
  };
}

export async function readAthletePreferences() {
  try {
    const stored = (await prefsStorage.get('preferences')) as Record<string, unknown> | null;
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

export async function readTodaySelection(): Promise<SharedAthleteTodaySelection> {
  const [storedWeek, storedDay] = await Promise.all([
    activeWeekStorage.get('active-week').catch(() => null),
    dayOverrideStorage.get('custom-day').catch(() => null),
  ]);

  return {
    activeWeekNumber: Number(storedWeek) || null,
    currentDay: String(storedDay || '').trim() || null,
  };
}

export async function persistTodaySelection({
  activeWeekNumber = null,
  currentDay = null,
}: Partial<SharedAthleteTodaySelection> = {}) {
  if (Number.isFinite(Number(activeWeekNumber)) && Number(activeWeekNumber) > 0) {
    await activeWeekStorage.set('active-week', Number(activeWeekNumber));
  } else {
    await activeWeekStorage.remove('active-week');
  }

  if (String(currentDay || '').trim()) {
    await dayOverrideStorage.set('custom-day', String(currentDay).trim());
  } else {
    await dayOverrideStorage.remove('custom-day');
  }
}

export async function clearTodayDayOverride() {
  await dayOverrideStorage.remove('custom-day');
}

function resolveActiveWeekNumber(
  weeks: SharedWorkoutWeek[],
  requestedWeekNumber?: number | null,
): number | null {
  const requested = Number(requestedWeekNumber) || null;
  if (requested && weeks.some((week) => Number(week?.weekNumber) === requested)) return requested;
  return Number(weeks[0]?.weekNumber) || null;
}

function resolveCurrentDay(availableDays: string[] = [], requestedDay = '') {
  const normalizedRequested = String(requestedDay || '').trim();
  if (normalizedRequested && availableDays.includes(normalizedRequested)) return normalizedRequested;

  const today = getDayName();
  if (availableDays.includes(today)) return today;

  return availableDays[0] || today;
}

async function safeServiceCall<T>(task: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallbackValue;
  }
}
