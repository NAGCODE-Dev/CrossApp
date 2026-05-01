export const STORAGE_KEYS = {
  token: 'ryxen-auth-token',
  profile: 'ryxen-user-profile',
  runtime: 'ryxen-runtime-config',
  workoutDraft: 'ryxen-coach-workout-draft',
};

export const DEFAULT_WORKOUT_DRAFT = {
  workoutTitle: '',
  workoutDate: '',
  workoutBenchmarkSlug: '',
  workoutLines: '',
  runningSessionType: 'easy',
  runningDistanceKm: '',
  runningDurationMin: '',
  runningTargetPace: '',
  runningZone: '',
  runningNotes: '',
  runningSegments: [{ label: '', distanceMeters: '', targetPace: '', restSeconds: '' }],
  strengthFocus: '',
  strengthLoadGuidance: '',
  strengthRir: '',
  strengthRestSeconds: '',
  strengthExercises: [{ name: '', sets: '', reps: '', load: '', rir: '' }],
  workoutAudienceMode: 'all',
  targetMembershipIds: [],
  targetGroupIds: [],
};

export const SPORT_OPTIONS = [
  { value: 'cross', label: 'Cross' },
  { value: 'running', label: 'Running' },
  { value: 'strength', label: 'Strength' },
];

export const BENCHMARK_SOURCE_OPTIONS = [
  { value: '', label: 'Todas as fontes' },
  { value: 'benchmark', label: 'Benchmark oficial' },
  { value: 'hero', label: 'Hero' },
  { value: 'open', label: 'Open' },
];

export const BENCHMARK_CATEGORY_TABS = ['', 'girls', 'classic', 'hero', 'open'];
