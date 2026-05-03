import { DEFAULT_WORKOUT_DRAFT, STORAGE_KEYS } from './constants';
import type { CoachProfile, RunningSegmentDraft, StrengthExerciseDraft, WorkoutDraftPayload } from './types';

type StoragePreference = 'local' | 'session';
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;

function getStorage(preferred: StoragePreference = 'local'): StorageLike {
  try {
    if (preferred === 'session' && typeof sessionStorage !== 'undefined') {
      return sessionStorage;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // ignore
  }

  return null;
}

function readStoredValue(keys: string[] = [], preferred: StoragePreference = 'local'): string {
  const primary = getStorage(preferred);
  const fallback = preferred === 'session' ? getStorage('local') : null;
  for (const key of keys) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) continue;
    try {
      const value = primary?.getItem(normalizedKey);
      if (value) return value;
    } catch {
      // ignore
    }
    try {
      const value = fallback?.getItem(normalizedKey);
      if (value) return value;
    } catch {
      // ignore
    }
  }
  return '';
}

function writeStoredValue(keys: string[] = [], value: string, preferred: StoragePreference = 'local') {
  const storage = getStorage(preferred);
  if (!storage) return;
  for (const key of keys) {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) continue;
    try {
      storage.setItem(normalizedKey, value);
    } catch {
      // ignore
    }
  }
}

function removeStoredValue(keys: string[] = [], preferred: StoragePreference | null = null) {
  const storages = preferred
    ? [getStorage(preferred)]
    : [getStorage('session'), getStorage('local')];
  for (const storage of storages) {
    if (!storage) continue;
    for (const key of keys) {
      const normalizedKey = String(key || '').trim();
      if (!normalizedKey) continue;
      try {
        storage.removeItem(normalizedKey);
      } catch {
        // ignore
      }
    }
  }
}

export function readToken(): string {
  return readStoredValue([STORAGE_KEYS.token], 'session');
}

export function writeToken(token: string): void {
  const value = String(token || '');
  writeStoredValue([STORAGE_KEYS.token], value, 'session');
  removeStoredValue([STORAGE_KEYS.token], 'local');
}

export function readProfile(): CoachProfile | null {
  try {
    const raw = readStoredValue([STORAGE_KEYS.profile], 'session');
    return raw ? (JSON.parse(raw) as CoachProfile | null) : null;
  } catch {
    return null;
  }
}

export function writeProfile(profile: CoachProfile | null): void {
  const serialized = JSON.stringify(profile || null);
  writeStoredValue([STORAGE_KEYS.profile], serialized, 'session');
  removeStoredValue([STORAGE_KEYS.profile], 'local');
}

export function clearAuthSession(): void {
  removeStoredValue([STORAGE_KEYS.token, STORAGE_KEYS.profile]);
}

function normalizeRunningSegments(input: unknown): RunningSegmentDraft[] {
  if (!Array.isArray(input) || !input.length) return DEFAULT_WORKOUT_DRAFT.runningSegments;
  return input.map((segment) => ({
    label: String((segment as RunningSegmentDraft | undefined)?.label || ''),
    distanceMeters: String((segment as RunningSegmentDraft | undefined)?.distanceMeters || ''),
    targetPace: String((segment as RunningSegmentDraft | undefined)?.targetPace || ''),
    restSeconds: String((segment as RunningSegmentDraft | undefined)?.restSeconds || ''),
  }));
}

function normalizeStrengthExercises(input: unknown): StrengthExerciseDraft[] {
  if (!Array.isArray(input) || !input.length) return DEFAULT_WORKOUT_DRAFT.strengthExercises;
  return input.map((exercise) => ({
    name: String((exercise as StrengthExerciseDraft | undefined)?.name || ''),
    sets: String((exercise as StrengthExerciseDraft | undefined)?.sets || ''),
    reps: String((exercise as StrengthExerciseDraft | undefined)?.reps || ''),
    load: String((exercise as StrengthExerciseDraft | undefined)?.load || ''),
    rir: String((exercise as StrengthExerciseDraft | undefined)?.rir || ''),
  }));
}

export function getWorkoutDraftPayload(
  forms: Partial<WorkoutDraftPayload> = {},
): WorkoutDraftPayload {
  return {
    ...DEFAULT_WORKOUT_DRAFT,
    workoutTitle: String(forms.workoutTitle || ''),
    workoutDate: String(forms.workoutDate || ''),
    workoutBenchmarkSlug: String(forms.workoutBenchmarkSlug || ''),
    workoutLines: String(forms.workoutLines || ''),
    runningSessionType: String(forms.runningSessionType || 'easy'),
    runningDistanceKm: String(forms.runningDistanceKm || ''),
    runningDurationMin: String(forms.runningDurationMin || ''),
    runningTargetPace: String(forms.runningTargetPace || ''),
    runningZone: String(forms.runningZone || ''),
    runningNotes: String(forms.runningNotes || ''),
    runningSegments: normalizeRunningSegments(forms.runningSegments),
    strengthFocus: String(forms.strengthFocus || ''),
    strengthLoadGuidance: String(forms.strengthLoadGuidance || ''),
    strengthRir: String(forms.strengthRir || ''),
    strengthRestSeconds: String(forms.strengthRestSeconds || ''),
    strengthExercises: normalizeStrengthExercises(forms.strengthExercises),
    workoutAudienceMode: String(forms.workoutAudienceMode || 'all'),
    targetMembershipIds: Array.isArray(forms.targetMembershipIds)
      ? forms.targetMembershipIds.filter(Boolean)
      : [],
    targetGroupIds: Array.isArray(forms.targetGroupIds)
      ? forms.targetGroupIds.filter(Boolean)
      : [],
  };
}

export function hasWorkoutDraftContent(forms: Partial<WorkoutDraftPayload> = {}): boolean {
  const draft = getWorkoutDraftPayload(forms);
  return !!(
    draft.workoutTitle ||
    draft.workoutDate ||
    draft.workoutBenchmarkSlug ||
    draft.workoutLines ||
    draft.runningDistanceKm ||
    draft.runningDurationMin ||
    draft.runningTargetPace ||
    draft.runningZone ||
    draft.runningNotes ||
    draft.runningSegments.some(
      (segment) =>
        segment.label || segment.distanceMeters || segment.targetPace || segment.restSeconds,
    ) ||
    draft.strengthFocus ||
    draft.strengthLoadGuidance ||
    draft.strengthRir ||
    draft.strengthRestSeconds ||
    draft.strengthExercises.some(
      (exercise) =>
        exercise.name || exercise.sets || exercise.reps || exercise.load || exercise.rir,
    ) ||
    draft.workoutAudienceMode !== 'all' ||
    draft.targetMembershipIds.length ||
    draft.targetGroupIds.length
  );
}

export function readWorkoutDraft(): WorkoutDraftPayload | null {
  try {
    const raw = readStoredValue([STORAGE_KEYS.workoutDraft], 'local');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkoutDraftPayload>;
    return getWorkoutDraftPayload(parsed);
  } catch {
    return null;
  }
}

export function writeWorkoutDraft(forms: Partial<WorkoutDraftPayload> = {}): void {
  try {
    if (!hasWorkoutDraftContent(forms)) {
      removeStoredValue([STORAGE_KEYS.workoutDraft], 'local');
      return;
    }
    const serialized = JSON.stringify(getWorkoutDraftPayload(forms));
    writeStoredValue([STORAGE_KEYS.workoutDraft], serialized, 'local');
  } catch {
    // no-op
  }
}

export function clearWorkoutDraft(): void {
  removeStoredValue([STORAGE_KEYS.workoutDraft], 'local');
}
