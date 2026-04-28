import { DEFAULT_WORKOUT_DRAFT, STORAGE_KEYS } from './constants.js';

export function readToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.token) || localStorage.getItem(STORAGE_KEYS.legacyToken) || '';
  } catch {
    return '';
  }
}

export function writeToken(token) {
  localStorage.setItem(STORAGE_KEYS.token, token || '');
  localStorage.setItem(STORAGE_KEYS.legacyToken, token || '');
}

export function readProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile) || localStorage.getItem(STORAGE_KEYS.legacyProfile);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeProfile(profile) {
  const serialized = JSON.stringify(profile || null);
  localStorage.setItem(STORAGE_KEYS.profile, serialized);
  localStorage.setItem(STORAGE_KEYS.legacyProfile, serialized);
}

export function clearAuthSession() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.legacyToken);
  localStorage.removeItem(STORAGE_KEYS.profile);
  localStorage.removeItem(STORAGE_KEYS.legacyProfile);
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
    const raw = localStorage.getItem(STORAGE_KEYS.workoutDraft) || localStorage.getItem(STORAGE_KEYS.legacyWorkoutDraft);
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
      localStorage.removeItem(STORAGE_KEYS.workoutDraft);
      localStorage.removeItem(STORAGE_KEYS.legacyWorkoutDraft);
      return;
    }
    const serialized = JSON.stringify(getWorkoutDraftPayload(forms));
    localStorage.setItem(STORAGE_KEYS.workoutDraft, serialized);
    localStorage.setItem(STORAGE_KEYS.legacyWorkoutDraft, serialized);
  } catch {
    // no-op
  }
}

export function clearWorkoutDraft() {
  try {
    localStorage.removeItem(STORAGE_KEYS.workoutDraft);
    localStorage.removeItem(STORAGE_KEYS.legacyWorkoutDraft);
  } catch {
    // no-op
  }
}
