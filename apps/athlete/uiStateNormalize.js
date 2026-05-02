import {
  createEmptyAdminState,
  createEmptyAthleteOverviewState,
  createEmptyCoachPortalState,
} from './uiEmptyStates.js';
import { clampNyxGuideStep } from './features/guide/steps.js';

export function normalizeAthleteSettings(settings) {
  const next = settings && typeof settings === 'object' ? settings : {};
  if (typeof next.showLbsConversion !== 'boolean') next.showLbsConversion = true;
  if (typeof next.showEmojis !== 'boolean') next.showEmojis = true;
  if (typeof next.showObjectivesInWods !== 'boolean') next.showObjectivesInWods = true;
  if (typeof next.showNyxHints !== 'boolean') next.showNyxHints = true;
  next.theme = 'dark';
  if (!['blue', 'sage', 'sand', 'rose', 'teal', 'plum', 'ember'].includes(next.accentTone)) next.accentTone = 'blue';
  if (!['comfortable', 'compact'].includes(next.interfaceDensity)) next.interfaceDensity = 'comfortable';
  if (typeof next.reduceMotion !== 'boolean') next.reduceMotion = false;
  if (!['uploaded', 'coach'].includes(next.workoutPriority)) next.workoutPriority = 'uploaded';
  return next;
}

export function normalizeAthleteGuideState(guide) {
  const next = guide && typeof guide === 'object' ? guide : {};
  next.step = clampNyxGuideStep(next.step);
  return next;
}

export function normalizeAthleteImportStatus(importStatus) {
  const next = importStatus && typeof importStatus === 'object'
    ? importStatus
    : { active: false, tone: 'idle', title: '', message: '', fileName: '', step: 'idle', review: null };
  if (typeof next.step !== 'string') next.step = 'idle';
  next.review = next.review && typeof next.review === 'object' ? next.review : null;
  return next;
}

export function normalizeAthleteSyncStatus(syncStatus) {
  const next = syncStatus && typeof syncStatus === 'object' ? syncStatus : {};
  next.online = next.online !== false;
  next.isAuthenticated = next.isAuthenticated === true;
  next.pendingAppState = next.pendingAppState === true;
  next.pendingOutboxCount = Number.isFinite(Number(next.pendingOutboxCount)) ? Math.max(0, Number(next.pendingOutboxCount)) : 0;
  next.pendingTotal = Number.isFinite(Number(next.pendingTotal))
    ? Math.max(0, Number(next.pendingTotal))
    : (next.pendingAppState ? 1 : 0) + next.pendingOutboxCount;
  next.pendingKinds = Array.isArray(next.pendingKinds) ? next.pendingKinds.filter(Boolean).map((kind) => String(kind)) : [];
  next.pendingItems = Array.isArray(next.pendingItems)
    ? next.pendingItems
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        kind: String(item.kind || ''),
        label: String(item.label || ''),
        count: Number.isFinite(Number(item.count)) ? Math.max(0, Number(item.count)) : 0,
        preview: String(item.preview || ''),
        detail: String(item.detail || ''),
        updatedAt: String(item.updatedAt || ''),
        attempts: Number.isFinite(Number(item.attempts)) ? Math.max(0, Number(item.attempts)) : 0,
        lastFailedAt: String(item.lastFailedAt || ''),
        lastFailureMessage: String(item.lastFailureMessage || ''),
        isOldest: item.isOldest === true,
      }))
    : [];
  next.oldestPendingAt = typeof next.oldestPendingAt === 'string' ? next.oldestPendingAt : '';
  next.lastSyncAt = typeof next.lastSyncAt === 'string' ? next.lastSyncAt : '';
  next.lastError = typeof next.lastError === 'string' ? next.lastError : '';
  next.flushing = next.flushing === true;
  next.activeItemKind = typeof next.activeItemKind === 'string' ? next.activeItemKind : '';
  next.activeItemAction = typeof next.activeItemAction === 'string' ? next.activeItemAction : '';
  return next;
}

export function normalizeAthleteAdminState(admin) {
  const next = admin && typeof admin === 'object' ? admin : createEmptyAdminState();
  if (typeof next.query !== 'string') next.query = '';
  return next;
}

export function normalizeAthleteOverviewState(athleteOverview) {
  const next = athleteOverview && typeof athleteOverview === 'object'
    ? athleteOverview
    : createEmptyAthleteOverviewState();

  if (typeof next.detailLevel !== 'string') next.detailLevel = 'none';
  if (!Array.isArray(next.recentResults)) next.recentResults = [];
  if (!Array.isArray(next.recentWorkouts)) next.recentWorkouts = [];
  if (!Array.isArray(next.checkinSessions)) next.checkinSessions = [];
  if (!Array.isArray(next.benchmarkHistory)) next.benchmarkHistory = [];
  if (!Array.isArray(next.benchmarkLibrary)) next.benchmarkLibrary = [];
  if (!next.benchmarkLibraryPagination || typeof next.benchmarkLibraryPagination !== 'object') {
    next.benchmarkLibraryPagination = { total: 0, page: 1, limit: 12, pages: 1 };
  }
  if (typeof next.benchmarkLibraryQuery !== 'string') next.benchmarkLibraryQuery = '';
  if (typeof next.benchmarkLibraryError !== 'string') next.benchmarkLibraryError = '';
  if (!next.selectedBenchmark || typeof next.selectedBenchmark !== 'object') next.selectedBenchmark = null;
  if (typeof next.selectedBenchmarkError !== 'string') next.selectedBenchmarkError = '';
  if (!Array.isArray(next.prHistory)) next.prHistory = [];
  if (!next.prCurrent || typeof next.prCurrent !== 'object') next.prCurrent = {};
  if (!Array.isArray(next.measurements)) next.measurements = [];
  if (!Array.isArray(next.runningHistory)) next.runningHistory = [];
  if (!Array.isArray(next.strengthHistory)) next.strengthHistory = [];
  if (!Array.isArray(next.gymAccess)) next.gymAccess = [];
  if (!next.profileCard || typeof next.profileCard !== 'object') next.profileCard = null;
  if (!next.personalSubscription || typeof next.personalSubscription !== 'object') next.personalSubscription = null;
  if (!next.athleteBenefits || typeof next.athleteBenefits !== 'object') next.athleteBenefits = null;

  next.blocks = next.blocks && typeof next.blocks === 'object' ? next.blocks : {};
  for (const key of ['summary', 'results', 'workouts', 'checkins']) {
    const current = next.blocks[key];
    next.blocks[key] = current && typeof current === 'object'
      ? { status: typeof current.status === 'string' ? current.status : 'idle', error: String(current.error || '') }
      : { status: 'idle', error: '' };
  }

  return next;
}

export function normalizeCoachPortalState(coachPortal) {
  const next = coachPortal && typeof coachPortal === 'object'
    ? coachPortal
    : createEmptyCoachPortalState();

  if (!Array.isArray(next.gyms)) next.gyms = [];
  if (!Array.isArray(next.gymAccess)) next.gymAccess = [];
  if (!Array.isArray(next.entitlements)) next.entitlements = [];
  if (typeof next.selectedGymId !== 'number') next.selectedGymId = next.selectedGymId || null;
  if (typeof next.status !== 'string') next.status = 'idle';
  if (typeof next.error !== 'string') next.error = '';

  return next;
}

export function normalizeAthleteWodState(wod) {
  const next = wod && typeof wod === 'object' ? wod : {};

  Object.keys(next).forEach((key) => {
    const entry = next[key];
    if (!entry || typeof entry !== 'object') {
      delete next[key];
      return;
    }
    next[key] = {
      activeLineId: typeof entry.activeLineId === 'string' ? entry.activeLineId : null,
      done: entry.done && typeof entry.done === 'object' ? entry.done : {},
    };
  });

  return next;
}
