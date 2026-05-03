export type AthleteAction = () => void;

export type SetTextState = (value: string) => void;

export type ImportState = 'idle' | 'previewing' | 'reparsing' | 'saving';

export interface WorkoutBlockSummary {
  type?: string;
  title?: string;
  lines?: string[];
}

export interface WorkoutSummary {
  day?: string;
  blocks?: WorkoutBlockSummary[];
}

export interface WorkoutMetaSummary {
  blockCount?: number;
}

export interface ImportedPlanMetaSummary {
  fileName?: string;
  source?: string;
  updatedAt?: string;
  uploadedAt?: string;
  weekNumbers?: number[];
}

export interface ImportedPlanSummary {
  source?: string;
  fileName?: string;
  updatedAt?: string;
  weekNumbers?: number[];
}

export interface WorkoutWeekSummary {
  weekNumber?: number;
  workouts?: WorkoutSummary[];
}

export interface RecentWorkoutSummary {
  gym_name?: string;
}

export interface AthleteSnapshot {
  profile?: {
    email?: string;
    name?: string;
  } | null;
  weeks?: WorkoutWeekSummary[];
  currentDay?: string | null;
  activeWeekNumber?: number | null;
  workout?: WorkoutSummary | null;
  workoutMeta?: WorkoutMetaSummary | null;
  importedPlanMeta?: ImportedPlanMetaSummary | null;
  workoutContext?: {
    source?: string;
    availableDays?: string[];
    availableWeeks?: number[];
    recentWorkouts?: RecentWorkoutSummary[];
    stats?: {
      activeGyms?: number;
      athleteTier?: string;
    };
    athleteBenefits?: {
      tier?: string;
    } | null;
    preferences?: Record<string, unknown>;
  } | null;
}

export interface AuthResult {
  handled?: boolean;
  success?: boolean;
  error?: string;
}

export interface TodayViewModel {
  hero?: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    badges?: HeroBadge[];
  } | null;
  metrics?: ViewMetric[];
  weekItems?: WeekItem[];
  dayItems?: DayItem[];
  workout?: WorkoutSummary | null;
  importedPlanSummary?: ImportedPlanSummary | null;
  recentWorkouts?: RecentWorkoutSummary[];
}

export interface HeroBadge {
  label: string;
  tone: string;
}

export interface ViewMetric {
  label: string;
  value: string;
  detail: string;
}

export interface WeekItem {
  key?: number;
  label: string;
  meta: string;
  active: boolean;
}

export interface DayItem {
  key: string;
  label: string;
  meta: string;
  active: boolean;
}

export interface ImportReviewDay {
  weekNumber?: number | null;
  day?: string;
  blockTypes?: string[];
  goal?: string;
  movements?: string[];
}

export interface ImportReview {
  weeksCount?: number;
  totalDays?: number;
  totalBlocks?: number;
  fileName?: string;
  source?: string;
  canEditText?: boolean;
  days?: ImportReviewDay[];
  reviewText?: string;
  weekNumbers?: number[];
}

export interface TodayPageProps {
  snapshot: AthleteSnapshot | null;
  viewModel: TodayViewModel | null;
  loading: boolean;
  error: string;
  message: string;
  progressMessage: string;
  onOpenImport: AthleteAction;
  onSelectWeek: (item: TodaySelectionItem) => void | Promise<void>;
  onSelectDay: (item: TodaySelectionItem) => void | Promise<void>;
  onResetDay: AthleteAction;
  onStartAuth: AthleteAction;
  onSignOut: AthleteAction;
}

export interface ImportReviewSheetProps {
  open: boolean;
  review: ImportReview | null;
  reviewText: string;
  reviewTextDeferred: string;
  importState: ImportState;
  onClose: AthleteAction;
  onChangeReviewText: (value: string) => void;
  onReparse: AthleteAction;
  onConfirm: AthleteAction;
  onCancel: AthleteAction;
}

export interface TodaySelectionItem {
  key?: string | number;
  weekNumber?: number;
  day?: string;
}

export interface ImportReviewCommitWeek {
  weekNumber?: number;
  workouts?: Array<Record<string, unknown>>;
}

export interface ImportReviewResult {
  success?: boolean;
  error?: string;
  review?: ImportReview | null;
  weeks?: ImportReviewCommitWeek[];
}

export interface ImportReviewAdapter {
  previewImportFromFile: (file: File) => Promise<ImportReviewResult>;
  reparseImportReview: (reviewText: string) => Promise<ImportReviewResult>;
  commitImportReview: () => Promise<ImportReviewResult>;
  cancelImportReview: () => Promise<unknown>;
}

export interface UseAthleteImportFlowArgs {
  snapshot: AthleteSnapshot | null;
  setError: SetTextState;
  setMessage: SetTextState;
  setProgressMessage: SetTextState;
  loadSnapshot: () => Promise<void>;
}

export interface UseAthleteImportFlowResult {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  review: ImportReview | null;
  reviewText: string;
  reviewTextDeferred: string;
  importState: ImportState;
  setReviewText: SetTextState;
  handleOpenImport: () => Promise<void>;
  handleImportFileChange: (event: EventLikeWithFiles) => Promise<void>;
  handleReparseReview: () => Promise<void>;
  handleConfirmReview: () => Promise<void>;
  handleCancelReview: () => Promise<void>;
}

export interface UseAthleteTodaySnapshotResult {
  snapshot: AthleteSnapshot;
  viewModel: TodayViewModel;
  loading: boolean;
  error: string;
  message: string;
  progressMessage: string;
  setError: SetTextState;
  setMessage: SetTextState;
  setProgressMessage: SetTextState;
  loadSnapshot: () => Promise<void>;
  handleSelectWeek: (item: TodaySelectionItem) => Promise<void>;
  handleSelectDay: (item: TodaySelectionItem) => Promise<void>;
  handleResetDay: () => Promise<void>;
  handleStartAuth: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export interface EventLikeWithFiles {
  target: {
    files?: FileList | File[] | null;
    value: string;
  };
}
