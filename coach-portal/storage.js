import { DEFAULT_WORKOUT_DRAFT, STORAGE_KEYS } from './constants.js';

function getStorage(preferred = 'local') {
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

function readStoredValue(keys = [], preferred = 'local') {
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

function writeStoredValue(keys = [], value, preferred = 'local') {
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

function removeStoredValue(keys = [], preferred = null) {
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

export function readToken() {
  return readStoredValue([STORAGE_KEYS.token, STORAGE_KEYS.legacyToken], 'session');
}

export function writeToken(token) {
  const value = String(token || '');
  writeStoredValue([STORAGE_KEYS.token, STORAGE_KEYS.legacyToken], value, 'session');
  removeStoredValue([STORAGE_KEYS.token, STORAGE_KEYS.legacyToken], 'local');
}

export function readProfile() {
  try {
    const raw = readStoredValue([STORAGE_KEYS.profile, STORAGE_KEYS.legacyProfile], 'session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeProfile(profile) {
  const serialized = JSON.stringify(profile || null);
  writeStoredValue([STORAGE_KEYS.profile, STORAGE_KEYS.legacyProfile], serialized, 'session');
  removeStoredValue([STORAGE_KEYS.profile, STORAGE_KEYS.legacyProfile], 'local');
}

export function clearAuthSession() {
  removeStoredValue([
    STORAGE_KEYS.token,
    STORAGE_KEYS.legacyToken,
    STORAGE_KEYS.profile,
    STORAGE_KEYS.legacyProfile,
  ]);
}

export function getWorkoutDraftPayload(forms = {}) {
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
    runningSegments: Array.isArray(forms.runningSegments) && forms.runningSegments.length
      ? forms.runningSegments.map((segment) => ({
        label: String(segment?.label || ''),
        distanceMeters: String(segment?.distanceMeters || ''),
        targetPace: String(segment?.targetPace || ''),
        restSeconds: String(segment?.restSeconds || ''),
      }))
      : DEFAULT_WORKOUT_DRAFT.runningSegments,
    strengthFocus: String(forms.strengthFocus || ''),
    strengthLoadGuidance: String(forms.strengthLoadGuidance || ''),
    strengthRir: String(forms.strengthRir || ''),
    strengthRestSeconds: String(forms.strengthRestSeconds || ''),
    strengthExercises: Array.isArray(forms.strengthExercises) && forms.strengthExercises.length
      ? forms.strengthExercises.map((exercise) => ({
        name: String(exercise?.name || ''),
        sets: String(exercise?.sets || ''),
        reps: String(exercise?.reps || ''),
        load: String(exercise?.load || ''),
        rir: String(exercise?.rir || ''),
      }))
      : DEFAULT_WORKOUT_DRAFT.strengthExercises,
    workoutAudienceMode: String(forms.workoutAudienceMode || 'all'),
    targetMembershipIds: Array.isArray(forms.targetMembershipIds) ? forms.targetMembershipIds.filter(Boolean) : [],
    targetGroupIds: Array.isArray(forms.targetGroupIds) ? forms.targetGroupIds.filter(Boolean) : [],
  };
}

export function hasWorkoutDraftContent(forms = {}) {
  const draft = getWorkoutDraftPayload(forms);
  return !!(
    draft.workoutTitle
    || draft.workoutDate
    || draft.workoutBenchmarkSlug
    || draft.workoutLines
    || draft.runningDistanceKm
    || draft.runningDurationMin
    || draft.runningTargetPace
    || draft.runningZone
    || draft.runningNotes
    || draft.runningSegments.some((segment) => segment.label || segment.distanceMeters || segment.targetPace || segment.restSeconds)
    || draft.strengthFocus
    || draft.strengthLoadGuidance
    || draft.strengthRir
    || draft.strengthRestSeconds
    || draft.strengthExercises.some((exercise) => exercise.name || exercise.sets || exercise.reps || exercise.load || exercise.rir)
    || draft.workoutAudienceMode !== 'all'
    || draft.targetMembershipIds.length
    || draft.targetGroupIds.length
  );
}

export function readWorkoutDraft() {
  try {
    const raw = readStoredValue([STORAGE_KEYS.workoutDraft, STORAGE_KEYS.legacyWorkoutDraft], 'local');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return getWorkoutDraftPayload(parsed);
  } catch {
    return null;
  }
}

export function writeWorkoutDraft(forms = {}) {
  try {
    if (!hasWorkoutDraftContent(forms)) {
      removeStoredValue([STORAGE_KEYS.workoutDraft, STORAGE_KEYS.legacyWorkoutDraft], 'local');
      return;
    }
    const serialized = JSON.stringify(getWorkoutDraftPayload(forms));
    writeStoredValue([STORAGE_KEYS.workoutDraft, STORAGE_KEYS.legacyWorkoutDraft], serialized, 'local');
  } catch {
    // no-op
  }
}

export function clearWorkoutDraft() {
  removeStoredValue([STORAGE_KEYS.workoutDraft, STORAGE_KEYS.legacyWorkoutDraft], 'local');
}
