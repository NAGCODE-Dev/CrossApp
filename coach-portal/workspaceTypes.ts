import type { CoachProfile, WorkoutDraftPayload } from './types';

export interface CoachWorkspaceProps {
  profile?: CoachProfile | null;
  onLogout?: (() => void) | null;
}

export interface CoachBenchmarkPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CoachGym {
  id?: number | string;
  name?: string;
  slug?: string;
  role?: string;
  access?: {
    warning?: string;
  } | null;
}

export interface CoachMember {
  id?: number | string;
  role?: string;
  status?: string;
  name?: string;
  display_name?: string;
  email?: string;
  pending_email?: string;
  handle?: string;
  bio?: string;
}

export interface CoachGroup {
  id?: number | string;
  name?: string;
  description?: string;
  member_count?: number;
  members?: unknown[];
  sport_type?: string;
}

export interface CoachFeedItem {
  id?: number | string;
  title?: string;
  gym_name?: string;
  sport_type?: string;
  benchmark?: {
    name?: string;
  } | null;
}

export interface CoachBenchmarkItem {
  id?: number | string;
  slug?: string;
  name?: string;
  category?: string;
  year?: number | string;
  official_source?: string;
  payload?: Record<string, unknown>;
}

export interface CoachBenchmarkDetail {
  benchmark?: CoachBenchmarkItem | null;
  leaderboard?: unknown[];
}

export interface CoachCheckinEntry {
  id?: number | string;
  gymMembershipId?: number | string;
  attendeeDisplayName?: string;
  attendeeLabel?: string;
  attendeeEmail?: string;
  status?: string;
  checkedInAt?: string;
  canceledAt?: string;
}

export interface CoachCheckinSession {
  id?: number | string;
  title?: string;
  starts_at?: string;
  location?: string;
  capacity?: number | string | null;
  summary?: {
    totalEntries?: number;
    availableSpots?: number | null;
  } | null;
  rules?: {
    checkInClosesAt?: string;
    checkInClosed?: boolean;
  } | null;
  entries?: CoachCheckinEntry[];
}

export interface CoachInsights {
  stats?: {
    athletes?: number;
    results?: number;
    activePrs?: number;
    athletesWithPrs?: number;
    workouts?: number;
    workoutsNext7Days?: number;
    groups?: number;
  } | null;
  topBenchmarks?: Array<{
    slug?: string;
    name?: string;
    total?: number;
  }>;
  recentPrs?: Array<{
    id?: number | string;
    athlete_name?: string;
    athlete_email?: string;
    exercise?: string;
    value?: number | string;
    unit?: string;
  }>;
}

export interface CoachDashboardState {
  subscription: Record<string, unknown> | null;
  entitlements: string[];
  gymAccess: Array<Record<string, unknown>>;
  gyms: CoachGym[];
  feed: CoachFeedItem[];
  benchmarks: CoachBenchmarkItem[];
  benchmarkPagination: CoachBenchmarkPagination;
  members: CoachMember[];
  groups: CoachGroup[];
  checkinSessions: CoachCheckinSession[];
  selectedGymId: number | string | null;
  selectedSportType: string;
  insights: CoachInsights | null;
}

export interface CoachPortalForms extends WorkoutDraftPayload {
  gymName: string;
  gymSlug: string;
  memberEmail: string;
  memberRole: string;
  groupName: string;
  groupDescription: string;
  selectedGroupMemberIds: Array<number | string>;
  sessionTitle: string;
  sessionStartsAt: string;
  sessionEndsAt: string;
  sessionCheckInClosesAt: string;
  sessionCapacity: string;
  sessionLocation: string;
  sessionNotes: string;
  benchmarkQuery: string;
  benchmarkCategory: string;
  benchmarkSource: string;
  benchmarkSort: string;
}

export const INITIAL_COACH_DASHBOARD: CoachDashboardState = {
  subscription: null,
  entitlements: [],
  gymAccess: [],
  gyms: [],
  feed: [],
  benchmarks: [],
  benchmarkPagination: { total: 0, page: 1, limit: 30, pages: 1 },
  members: [],
  groups: [],
  checkinSessions: [],
  selectedGymId: null,
  selectedSportType: 'cross',
  insights: null,
};

export const INITIAL_COACH_FORMS: CoachPortalForms = {
  gymName: '',
  gymSlug: '',
  memberEmail: '',
  memberRole: 'athlete',
  groupName: '',
  groupDescription: '',
  selectedGroupMemberIds: [],
  sessionTitle: '',
  sessionStartsAt: '',
  sessionEndsAt: '',
  sessionCheckInClosesAt: '',
  sessionCapacity: '',
  sessionLocation: '',
  sessionNotes: '',
  benchmarkQuery: '',
  benchmarkCategory: '',
  benchmarkSource: '',
  benchmarkSort: 'year_desc',
  ...({
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
  } satisfies WorkoutDraftPayload),
};
