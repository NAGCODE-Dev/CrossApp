export interface CoachProfile {
  email?: string;
  name?: string;
  isAdmin?: boolean;
  is_admin?: boolean;
  [key: string]: unknown;
}

export interface CoachAuthRedirectResult {
  handled?: boolean;
  success?: boolean;
  error?: string;
  token?: string;
  user?: CoachProfile | null;
}

export interface CoachLoginState {
  email: string;
  password: string;
}

export interface CoachApiRequestOptions {
  method?: string;
  body?: Record<string, unknown>;
  token?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface CoachApiError extends Error {
  status?: number;
  kind?: string;
  raw?: string;
  payload?: unknown;
}

export interface CoachApiRequest {
  (path: string, options?: CoachApiRequestOptions): Promise<any>;
}

export interface RunningSegmentDraft {
  label: string;
  distanceMeters: string;
  targetPace: string;
  restSeconds: string;
}

export interface StrengthExerciseDraft {
  name: string;
  sets: string;
  reps: string;
  load: string;
  rir: string;
}

export interface WorkoutDraftPayload {
  workoutTitle: string;
  workoutDate: string;
  workoutBenchmarkSlug: string;
  workoutLines: string;
  runningSessionType: string;
  runningDistanceKm: string;
  runningDurationMin: string;
  runningTargetPace: string;
  runningZone: string;
  runningNotes: string;
  runningSegments: RunningSegmentDraft[];
  strengthFocus: string;
  strengthLoadGuidance: string;
  strengthRir: string;
  strengthRestSeconds: string;
  strengthExercises: StrengthExerciseDraft[];
  workoutAudienceMode: string;
  targetMembershipIds: Array<string | number>;
  targetGroupIds: Array<string | number>;
}

export interface CoachOption {
  value: string;
  label: string;
}
