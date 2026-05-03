import React, { useEffect, useMemo, useState } from 'react';
import { getRuntimeConfig } from '../packages/shared-web/runtime.js';
import { coachRequestOptional, createCoachApiRequest, resolveCoachKiwifyCheckoutUrl } from './apiClient';
import {
  BENCHMARK_CATEGORY_TABS,
  BENCHMARK_SOURCE_OPTIONS,
  DEFAULT_WORKOUT_DRAFT,
} from './constants';
import {
  clearWorkoutDraft,
  hasWorkoutDraftContent,
  readProfile,
  readToken,
  readWorkoutDraft,
  writeWorkoutDraft,
} from './storage';
import {
  benchmarkCategoryLabel,
  benchmarkSourceLabel,
  formatDateLabel,
  formatDateTimeLabel,
  formatNumericValue,
  getAvailableSportOptions,
  getDaysRemaining,
  getPublishValidationErrors,
  planCard,
  portalSkeletonCard,
  portalSkeletonList,
  resolveBillingProvider,
  sportLabel,
  statCard,
} from './workspaceHelpers';
import {
  INITIAL_COACH_DASHBOARD,
  INITIAL_COACH_FORMS,
} from './workspaceTypes';
import type {
  CoachBenchmarkDetail,
  CoachDashboardState,
  CoachPortalForms,
  CoachWorkspaceProps,
} from './workspaceTypes';
import '../coach/styles.css';

const apiRequest = createCoachApiRequest({ readToken });

export default function CoachWorkspace({
  profile: initialProfile = null,
  onLogout = null,
}: CoachWorkspaceProps = {}) {
  const token = readToken();
  const profile = initialProfile || readProfile();
  const availableSportOptions = getAvailableSportOptions(getRuntimeConfig());
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [draftStatus, setDraftStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedBenchmarkSlug, setSelectedBenchmarkSlug] = useState('');
  const [selectedBenchmarkDetail, setSelectedBenchmarkDetail] =
    useState<CoachBenchmarkDetail | null>(null);
  const [benchmarkDetailLoading, setBenchmarkDetailLoading] = useState(false);
  const [dashboard, setDashboard] =
    useState<CoachDashboardState>(INITIAL_COACH_DASHBOARD);
  const [forms, setForms] = useState<CoachPortalForms>(INITIAL_COACH_FORMS);

  const selectedGym = useMemo(
    () => dashboard.gyms.find((gym) => gym.id === dashboard.selectedGymId) || null,
    [dashboard.gyms, dashboard.selectedGymId],
  );

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  useEffect(() => {
    if (!dashboard.benchmarks.length) {
      setSelectedBenchmarkSlug('');
      setSelectedBenchmarkDetail(null);
      return;
    }
    if (!selectedBenchmarkSlug || !dashboard.benchmarks.some((item) => item.slug === selectedBenchmarkSlug)) {
      const nextSlug = dashboard.benchmarks[0]?.slug || '';
      if (nextSlug) {
        setSelectedBenchmarkSlug(nextSlug);
        void handleOpenBenchmark(nextSlug);
      }
    }
  }, [dashboard.benchmarks, dashboard.selectedGymId, dashboard.selectedSportType]);

  useEffect(() => {
    if (selectedBenchmarkSlug && dashboard.benchmarks.some((item) => item.slug === selectedBenchmarkSlug)) {
      void handleOpenBenchmark(selectedBenchmarkSlug);
    }
  }, [dashboard.selectedGymId, dashboard.selectedSportType]);

  useEffect(() => {
    const draft = readWorkoutDraft();
    if (!draft) return;
    setForms((prev) => ({ ...prev, ...draft }));
    setDraftStatus('Rascunho recuperado automaticamente');
  }, []);

  useEffect(() => {
    writeWorkoutDraft(forms);
    setDraftStatus(hasWorkoutDraftContent(forms) ? 'Rascunho salvo automaticamente' : '');
  }, [
    forms.workoutTitle,
    forms.workoutDate,
    forms.workoutBenchmarkSlug,
    forms.workoutLines,
    forms.runningSessionType,
    forms.runningDistanceKm,
    forms.runningDurationMin,
    forms.runningTargetPace,
    forms.runningZone,
    forms.runningNotes,
    forms.runningSegments,
    forms.strengthFocus,
    forms.strengthLoadGuidance,
    forms.strengthRir,
    forms.strengthRestSeconds,
    forms.strengthExercises,
    forms.workoutAudienceMode,
    forms.targetMembershipIds,
    forms.targetGroupIds,
  ]);

  async function loadDashboard(
    nextGymId: number | string | null = null,
    nextSportType: string | null = null,
  ) {
    setLoading(true);
    setError('');
    try {
      const preferredSportType = nextSportType || dashboard.selectedSportType || 'cross';
      const selectedSportType = availableSportOptions.some((sport) => sport.value === preferredSportType)
        ? preferredSportType
        : (availableSportOptions[0]?.value || 'cross');
      const [subscription, entitlementsRes, gymsRes, feedRes, benchmarksRes] =
        await Promise.all([
        apiRequest('/billing/status'),
        apiRequest('/billing/entitlements'),
        apiRequest('/gyms/me'),
        apiRequest(`/workouts/feed?sportType=${encodeURIComponent(selectedSportType)}`),
        apiRequest('/benchmarks?limit=30&sort=year_desc'),
      ]);

      const gyms = gymsRes?.gyms || [];
      const gymAccess = entitlementsRes?.gymAccess || [];
      const gymAccessById = new Map(
        gymAccess
          .filter((item) => item?.gymId !== null && item?.gymId !== undefined)
          .map((item) => [Number(item.gymId), item]),
      );
      const selectedGymId = nextGymId || dashboard.selectedGymId || gyms[0]?.id || null;
      let members: CoachDashboardState['members'] = [];
      let groups: CoachDashboardState['groups'] = [];
      let insights: CoachDashboardState['insights'] = null;
      let checkinSessions: CoachDashboardState['checkinSessions'] = [];
      if (selectedGymId) {
        const selectedGymAccess = gymAccessById.get(Number(selectedGymId)) || null;
        const [membersRes, groupsRes, insightsRes, checkinSessionsRes] = await Promise.all([
          selectedGymAccess?.canCoachManage
            ? apiRequest(`/gyms/${selectedGymId}/memberships`)
            : coachRequestOptional(apiRequest, `/gyms/${selectedGymId}/memberships`, { memberships: [] }),
          selectedGymAccess?.canCoachManage
            ? apiRequest(`/gyms/${selectedGymId}/groups?sportType=${encodeURIComponent(selectedSportType)}`)
            : coachRequestOptional(apiRequest, `/gyms/${selectedGymId}/groups?sportType=${encodeURIComponent(selectedSportType)}`, { groups: [] }),
          selectedGymAccess?.canCoachManage
            ? apiRequest(`/gyms/${selectedGymId}/insights?sportType=${encodeURIComponent(selectedSportType)}`)
            : coachRequestOptional(apiRequest, `/gyms/${selectedGymId}/insights?sportType=${encodeURIComponent(selectedSportType)}`, null),
          selectedGymAccess?.canCoachManage
            ? apiRequest(`/gyms/${selectedGymId}/checkin-sessions?sportType=${encodeURIComponent(selectedSportType)}&limit=8`)
            : coachRequestOptional(apiRequest, `/gyms/${selectedGymId}/checkin-sessions?sportType=${encodeURIComponent(selectedSportType)}&limit=8`, { sessions: [] }),
        ]);
        members = membersRes?.memberships || [];
        groups = groupsRes?.groups || [];
        insights = insightsRes || null;
        checkinSessions = checkinSessionsRes?.sessions || [];
      }

      setDashboard({
        subscription,
        entitlements: entitlementsRes?.entitlements || [],
        gymAccess,
        gyms,
        feed: feedRes?.workouts || [],
        benchmarks: benchmarksRes?.benchmarks || [],
        benchmarkPagination: benchmarksRes?.pagination || { total: 0, page: 1, limit: 30, pages: 1 },
        members,
        groups,
        checkinSessions,
        selectedGymId,
        selectedSportType,
        insights,
      });
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao carregar portal');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGym(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/gyms', {
        method: 'POST',
        body: { name: forms.gymName, slug: forms.gymSlug },
      });
      setForms((prev) => ({ ...prev, gymName: '', gymSlug: '' }));
      setMessage(`Gym criado: ${res?.gym?.name || ''}`);
      await loadDashboard(res?.gym?.id || null, dashboard.selectedSportType);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao criar gym');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectGym(gymId: number | string | null) {
    await loadDashboard(gymId, dashboard.selectedSportType);
  }

  async function handleSelectSportType(sportType: string) {
    await loadDashboard(dashboard.selectedGymId, sportType);
  }

  async function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard.selectedGymId) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/gyms/${dashboard.selectedGymId}/memberships`, {
        method: 'POST',
        body: {
          email: forms.memberEmail,
          role: forms.memberRole,
        },
      });
      setForms((prev) => ({ ...prev, memberEmail: '', memberRole: 'athlete' }));
      setMessage('Membro adicionado');
      await loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao adicionar membro');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard.selectedGymId) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/gyms/${dashboard.selectedGymId}/groups`, {
        method: 'POST',
        body: {
          name: forms.groupName,
          description: forms.groupDescription,
          sportType: dashboard.selectedSportType,
          memberIds: forms.selectedGroupMemberIds,
        },
      });
      setForms((prev) => ({
        ...prev,
        groupName: '',
        groupDescription: '',
        selectedGroupMemberIds: [],
      }));
      setMessage('Grupo criado');
      await loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao criar grupo');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCheckinSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard.selectedGymId) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/gyms/${dashboard.selectedGymId}/checkin-sessions`, {
        method: 'POST',
        body: {
          sportType: dashboard.selectedSportType,
          title: forms.sessionTitle,
          startsAt: forms.sessionStartsAt,
          endsAt: forms.sessionEndsAt || null,
          checkInClosesAt: forms.sessionCheckInClosesAt || null,
          capacity: forms.sessionCapacity || null,
          location: forms.sessionLocation,
          notes: forms.sessionNotes,
          status: 'scheduled',
        },
      });
      setForms((prev) => ({
        ...prev,
        sessionTitle: '',
        sessionStartsAt: '',
        sessionEndsAt: '',
        sessionCheckInClosesAt: '',
        sessionCapacity: '',
        sessionLocation: '',
        sessionNotes: '',
      }));
      setMessage('Sessão criada');
      await loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao criar sessão');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkSessionCheckIn(
    sessionId: number | string | null | undefined,
    gymMembershipId: number | string | null | undefined,
  ) {
    if (!dashboard.selectedGymId || !sessionId || !gymMembershipId) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/gyms/${dashboard.selectedGymId}/checkin-sessions/${sessionId}/checkins`, {
        method: 'POST',
        body: { gymMembershipId },
      });
      setMessage('Check-in registrado');
      await loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao registrar check-in');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSessionCheckIn(
    sessionId: number | string | null | undefined,
    gymMembershipId: number | string | null | undefined,
  ) {
    if (!dashboard.selectedGymId || !sessionId || !gymMembershipId) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/gyms/${dashboard.selectedGymId}/checkin-sessions/${sessionId}/checkins/cancel`, {
        method: 'POST',
        body: { gymMembershipId },
      });
      setMessage('Check-in cancelado');
      await loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao cancelar check-in');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(
    key: 'selectedGroupMemberIds' | 'targetMembershipIds' | 'targetGroupIds',
    value: number | string,
  ) {
    setForms((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  }

  function updateCollectionItem(
    key: 'runningSegments' | 'strengthExercises',
    index: number,
    field: string,
    value: string,
  ) {
    setForms((prev) => {
      const nextItems = Array.isArray(prev[key]) ? [...prev[key]] as any[] : [];
      nextItems[index] = { ...(nextItems[index] || {}), [field]: value };
      return { ...prev, [key]: nextItems } as CoachPortalForms;
    });
  }

  function addCollectionItem(
    key: 'runningSegments' | 'strengthExercises',
    factory: () => Record<string, string>,
  ) {
    setForms((prev) => ({
      ...prev,
      [key]: [...(Array.isArray(prev[key]) ? prev[key] : []), factory()],
    }));
  }

  function removeCollectionItem(
    key: 'runningSegments' | 'strengthExercises',
    index: number,
  ) {
    setForms((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      if (current.length <= 1) return prev;
      return {
        ...prev,
        [key]: current.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  async function handlePublishWorkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard.selectedGymId) return;
    setLoading(true);
    setError('');
    try {
      const lines = forms.workoutLines
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      let payload;

      if (dashboard.selectedSportType === 'running') {
        const segments = (forms.runningSegments || [])
          .map((segment) => ({
            label: String(segment.label || '').trim(),
            distanceMeters: segment.distanceMeters ? Number(segment.distanceMeters) : null,
            targetPace: String(segment.targetPace || '').trim(),
            restSeconds: segment.restSeconds ? Number(segment.restSeconds) : null,
          }))
          .filter((segment) => segment.label || segment.distanceMeters || segment.targetPace || segment.restSeconds);

        payload = {
          session: {
            type: forms.runningSessionType || 'easy',
            distanceKm: forms.runningDistanceKm ? Number(forms.runningDistanceKm) : null,
            durationMin: forms.runningDurationMin ? Number(forms.runningDurationMin) : null,
            targetPace: forms.runningTargetPace || '',
            zone: forms.runningZone || '',
            notes: forms.runningNotes || '',
            segments,
          },
          blocks: lines.length ? [{ type: 'RUNNING', lines }] : [],
        };
      } else if (dashboard.selectedSportType === 'strength') {
        const exercises = (forms.strengthExercises || [])
          .map((exercise) => ({
            name: String(exercise.name || '').trim(),
            sets: exercise.sets ? Number(exercise.sets) : null,
            reps: String(exercise.reps || '').trim(),
            load: String(exercise.load || '').trim(),
            rir: exercise.rir ? Number(exercise.rir) : null,
          }))
          .filter((exercise) => exercise.name);

        payload = {
          strength: {
            focus: forms.strengthFocus || '',
            loadGuidance: forms.strengthLoadGuidance || '',
            rir: forms.strengthRir ? Number(forms.strengthRir) : null,
            restSeconds: forms.strengthRestSeconds ? Number(forms.strengthRestSeconds) : null,
            exercises,
          },
          blocks: lines.length ? [{ type: 'STRENGTH', lines }] : [],
        };
      } else {
        payload = {
          blocks: [{ type: 'PROGRAMMING', lines }],
          ...(forms.workoutBenchmarkSlug ? { benchmarkSlug: forms.workoutBenchmarkSlug.trim() } : {}),
        };
      }

      await apiRequest(`/gyms/${dashboard.selectedGymId}/workouts`, {
        method: 'POST',
        body: {
          sportType: dashboard.selectedSportType,
          title: forms.workoutTitle,
          scheduledDate: forms.workoutDate,
          audienceMode: forms.workoutAudienceMode,
          targetMembershipIds: forms.targetMembershipIds,
          targetGroupIds: forms.targetGroupIds,
          payload,
        },
      });
      setForms((prev) => ({
        ...prev,
        ...DEFAULT_WORKOUT_DRAFT,
      }));
      clearWorkoutDraft();
      setDraftStatus('');
      setMessage('Treino publicado');
      await loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao publicar treino');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchBenchmarks({
    category = forms.benchmarkCategory,
    source = forms.benchmarkSource,
    sort = forms.benchmarkSort,
    page = 1,
  }: {
    category?: string;
    source?: string;
    sort?: string;
    page?: number;
  } = {}) {
    setLoading(true);
    setError('');
    try {
      const search = new URLSearchParams();
      if (forms.benchmarkQuery) search.set('q', forms.benchmarkQuery);
      if (category) search.set('category', category);
      if (source) search.set('source', source);
      if (sort) search.set('sort', sort);
      search.set('page', String(page));
      search.set('limit', '30');
      const res = await apiRequest(`/benchmarks?${search.toString()}`);
      setDashboard((prev) => ({
        ...prev,
        benchmarks: res?.benchmarks || [],
        benchmarkPagination: res?.pagination || { total: 0, page: 1, limit: 30, pages: 1 },
      }));
      setForms((prev) => ({
        ...prev,
        benchmarkCategory: category,
        benchmarkSource: source,
        benchmarkSort: sort,
      }));
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao buscar benchmarks');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenBenchmark(slug: string) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    if (!normalizedSlug) return;
    setBenchmarkDetailLoading(true);
    setError('');
    try {
      const search = new URLSearchParams({
        sportType: dashboard.selectedSportType || 'cross',
        limit: '8',
      });
      if (dashboard.selectedGymId) {
        search.set('gymId', String(dashboard.selectedGymId));
      }
      const res = await apiRequest(`/benchmarks/${encodeURIComponent(normalizedSlug)}?${search.toString()}`);
      setSelectedBenchmarkSlug(normalizedSlug);
      setSelectedBenchmarkDetail(res || null);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao carregar benchmark');
    } finally {
      setBenchmarkDetailLoading(false);
    }
  }

  async function handleCheckout(planId = 'coach') {
    setLoading(true);
    setError('');
    try {
      const provider = resolveBillingProvider();
      if (provider === 'kiwify_link') {
        const checkoutUrl = resolveCoachKiwifyCheckoutUrl(planId);
        if (!checkoutUrl) {
          throw new Error(`Link da Kiwify não configurado para o plano ${String(planId).toUpperCase()}`);
        }
        window.location.href = checkoutUrl;
        return;
      }

      const res = await apiRequest('/billing/checkout', {
        method: 'POST',
        body: {
          planId,
          provider,
          successUrl: `${window.location.origin}/coach/?billing=success`,
          cancelUrl: `${window.location.origin}/coach/?billing=cancel`,
        },
      });
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      throw new Error('Checkout indisponível');
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao abrir checkout');
      setLoading(false);
    }
  }

  async function handleActivateLocalPlan() {
    setLoading(true);
    setError('');
    try {
      await apiRequest('/billing/mock/activate', {
        method: 'POST',
        body: { planId: 'coach', provider: 'mock' },
      });
      setMessage('Acesso local liberado');
      await loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType);
    } catch (err) {
      setError((err as Error | undefined)?.message || 'Erro ao ativar plano local');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    if (typeof onLogout === 'function') onLogout();
  }

  function handleClearWorkoutDraft() {
    setForms((prev) => ({ ...prev, ...DEFAULT_WORKOUT_DRAFT }));
    clearWorkoutDraft();
    setDraftStatus('');
    setMessage('Rascunho limpo');
  }

  const canCoachManage = dashboard.entitlements.includes('coach_portal');
  const canAthleteUseApp = dashboard.entitlements.includes('athlete_app');
  const subscription = dashboard.subscription || null;
  const planName = subscription?.plan || subscription?.plan_id || 'free';
  const planStatus = subscription?.status || 'inactive';
  const renewAt = subscription?.renewAt || subscription?.renew_at || null;
  const daysRemaining = getDaysRemaining(renewAt);
  const billingTone = daysRemaining !== null && daysRemaining <= 7 ? 'warn' : (canCoachManage ? 'ok' : 'warn');
  const canUseDeveloperTools = (
    String(profile?.email || '').toLowerCase() === 'nagcode.contact@gmail.com'
    || profile?.isAdmin === true
    || profile?.is_admin === true
  );
  const athleteMembers = dashboard.members.filter((member) => member.role === 'athlete' && member.status === 'active');
  const showSkeleton = loading && !dashboard.gyms.length && !dashboard.feed.length && !dashboard.benchmarks.length;
  const isRunning = dashboard.selectedSportType === 'running';
  const isStrength = dashboard.selectedSportType === 'strength';
  const quickSections = [
    ['overview', 'Visão geral'],
    ['operation', 'Operação'],
    ['programming', 'Programação'],
    ['library', 'Biblioteca'],
  ];
  const isOverviewSection = activeSection === 'overview';
  const isOperationSection = activeSection === 'operation';
  const isProgrammingSection = activeSection === 'programming';
  const isLibrarySection = activeSection === 'library';
  const publishAudienceMode = forms.workoutAudienceMode || 'all';
  const hasSelectedAthletes = forms.targetMembershipIds.length > 0;
  const hasSelectedGroups = forms.targetGroupIds.length > 0;
  const publishSummary = publishAudienceMode === 'groups'
    ? (hasSelectedGroups ? `${forms.targetGroupIds.length} grupo(s) selecionado(s)` : 'Nenhum grupo selecionado')
    : publishAudienceMode === 'selected'
      ? (hasSelectedAthletes ? `${forms.targetMembershipIds.length} atleta(s) selecionado(s)` : 'Nenhum atleta selecionado')
      : 'Todos os atletas do gym';
  const previewLines = String(forms.workoutLines || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
  const previewOverflow = Math.max(0, String(forms.workoutLines || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length - previewLines.length);
  const publishErrors = getPublishValidationErrors({
    forms,
    selectedGymId: dashboard.selectedGymId,
    athleteMembers,
    groups: dashboard.groups,
    canCoachManage,
  });
  const canPublishWorkout = !loading && publishErrors.length === 0;
  const shouldShowBillingAction = !canCoachManage || planStatus !== 'active';
  const overviewBenchmarks = (dashboard.insights?.topBenchmarks || []).length
    ? dashboard.insights.topBenchmarks
      .slice(0, 4)
      .map((item) => ({
        key: item.slug || item.name,
        title: item.name || 'Benchmark',
        detail: `${item.total || 0} registro(s) no gym`,
      }))
    : dashboard.benchmarks
      .slice(0, 4)
      .map((benchmark) => ({
        key: benchmark.slug || benchmark.id,
        title: benchmark.name || benchmark.slug || 'Benchmark',
        detail: `${benchmarkCategoryLabel(benchmark.category)}${benchmark.year ? ` • ${benchmark.year}` : ''}`,
      }));
  const overviewRecentPrs = dashboard.selectedSportType === 'cross'
    ? (dashboard.insights?.recentPrs || []).slice(0, 4)
    : [];
  const overviewFeed = (dashboard.feed || []).slice(0, 4);
  const benchmarkDetail = selectedBenchmarkDetail?.benchmark || null;
  const benchmarkLeaderboard = Array.isArray(selectedBenchmarkDetail?.leaderboard) ? selectedBenchmarkDetail.leaderboard : [];

  function formatBenchmarkScoreType(scoreType = '') {
    switch (String(scoreType || '').trim().toLowerCase()) {
      case 'for_time':
        return 'Tempo';
      case 'rounds_reps':
        return 'Rounds + reps';
      case 'weight':
        return 'Carga';
      case 'reps':
        return 'Repetições';
      default:
        return scoreType || 'Score';
    }
  }

  function buildBenchmarkFacts(benchmark = {}) {
    const payload = benchmark?.payload && typeof benchmark.payload === 'object' ? benchmark.payload : {};
    const facts = [];
    if (Array.isArray(payload.reps) && payload.reps.length) facts.push(`Reps ${payload.reps.join('-')}`);
    else if (Number.isFinite(payload.reps)) facts.push(`${payload.reps} reps`);
    if (Number.isFinite(payload.rounds)) facts.push(`${payload.rounds} round(s)`);
    if (Number.isFinite(payload.timeCapMinutes)) facts.push(`Cap ${payload.timeCapMinutes} min`);
    if (Number.isFinite(payload.distanceMeters)) facts.push(`${payload.distanceMeters} m`);
    if (payload.movement) facts.push(payload.movement);
    if (Array.isArray(payload.movements) && payload.movements.length) facts.push(payload.movements.slice(0, 4).join(', '));
    if (Array.isArray(payload.stations) && payload.stations.length) facts.push(payload.stations.slice(0, 4).join(', '));
    return facts.slice(0, 4);
  }

  function renderSportSpecificWorkoutFields() {
    if (isRunning) {
      return React.createElement(React.Fragment, null,
        React.createElement('section', { className: 'stack nested-card publish-formSection' },
          React.createElement('div', { className: 'publish-formSectionHead' },
            React.createElement('div', { className: 'eyebrow' }, 'Sessão'),
            React.createElement('strong', null, 'Campos principais')
          ),
          React.createElement('div', { className: 'grid dual-grid' },
            React.createElement('select', {
              className: 'field',
              value: forms.runningSessionType,
              onChange: (e) => setForms((prev) => ({ ...prev, runningSessionType: e.target.value })),
            },
              React.createElement('option', { value: 'easy' }, 'Easy run'),
              React.createElement('option', { value: 'interval' }, 'Intervalado'),
              React.createElement('option', { value: 'tempo' }, 'Tempo run'),
              React.createElement('option', { value: 'long' }, 'Longão'),
              React.createElement('option', { value: 'recovery' }, 'Recovery')
            ),
            React.createElement('input', {
              className: 'field',
              type: 'number',
              min: '0',
              step: '0.1',
              placeholder: 'Distância (km)',
              value: forms.runningDistanceKm,
              onChange: (e) => setForms((prev) => ({ ...prev, runningDistanceKm: e.target.value })),
            }),
            React.createElement('input', {
              className: 'field',
              type: 'number',
              min: '0',
              step: '1',
              placeholder: 'Duração (min)',
              value: forms.runningDurationMin,
              onChange: (e) => setForms((prev) => ({ ...prev, runningDurationMin: e.target.value })),
            }),
            React.createElement('input', {
              className: 'field',
              placeholder: 'Pace alvo (ex: 5:00/km)',
              value: forms.runningTargetPace,
              onChange: (e) => setForms((prev) => ({ ...prev, runningTargetPace: e.target.value })),
            }),
          ),
          React.createElement('details', { className: 'publish-advancedToggle' },
            React.createElement('summary', { className: 'muted' }, 'Campos extras'),
            React.createElement('div', { className: 'stack', style: { marginTop: '12px' } },
              React.createElement('div', { className: 'grid dual-grid' },
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Zona (ex: Z2, Threshold)',
                  value: forms.runningZone,
                  onChange: (e) => setForms((prev) => ({ ...prev, runningZone: e.target.value })),
                }),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Notas rápidas',
                  value: forms.runningNotes,
                  onChange: (e) => setForms((prev) => ({ ...prev, runningNotes: e.target.value })),
                }),
              ),
              React.createElement('section', { className: 'stack nested-card publish-formSection' },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Intervalos'),
                  React.createElement('span', { className: 'muted' }, 'Opcional')
                ),
                (forms.runningSegments || []).map((segment, index) =>
            React.createElement('div', { key: `seg-${index}`, className: 'stack publish-collectionItem' },
              React.createElement('div', { className: 'publish-collectionHead' },
                React.createElement('strong', null, `Segmento ${index + 1}`),
                React.createElement('span', { className: 'muted' }, segment.label || 'Defina bloco, distância, pace e descanso')
              ),
              React.createElement('div', { className: 'grid dual-grid' },
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Bloco (ex: 6x400m)',
                  value: segment.label,
                  onChange: (e) => updateCollectionItem('runningSegments', index, 'label', e.target.value),
                }),
                React.createElement('input', {
                  className: 'field',
                  type: 'number',
                  min: '0',
                  step: '50',
                  placeholder: 'Distância (m)',
                  value: segment.distanceMeters,
                  onChange: (e) => updateCollectionItem('runningSegments', index, 'distanceMeters', e.target.value),
                }),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Pace alvo',
                  value: segment.targetPace,
                  onChange: (e) => updateCollectionItem('runningSegments', index, 'targetPace', e.target.value),
                }),
                React.createElement('input', {
                  className: 'field',
                  type: 'number',
                  min: '0',
                  step: '15',
                  placeholder: 'Descanso (seg)',
                  value: segment.restSeconds,
                  onChange: (e) => updateCollectionItem('runningSegments', index, 'restSeconds', e.target.value),
                }),
              ),
              React.createElement('div', { className: 'publish-collectionActions' },
                React.createElement('button', {
                  type: 'button',
                  className: 'btn btn-secondary',
                  onClick: () => removeCollectionItem('runningSegments', index),
                  disabled: (forms.runningSegments || []).length <= 1,
                }, 'Remover segmento')
              )
            )
                ),
                React.createElement('button', {
                  type: 'button',
                  className: 'btn btn-secondary',
                  onClick: () => addCollectionItem('runningSegments', () => ({ label: '', distanceMeters: '', targetPace: '', restSeconds: '' })),
                }, 'Adicionar segmento')
              )
            )
          )
        ),
      );
    }

    if (isStrength) {
      return React.createElement(React.Fragment, null,
        React.createElement('section', { className: 'stack nested-card publish-formSection' },
          React.createElement('div', { className: 'publish-formSectionHead' },
            React.createElement('div', { className: 'eyebrow' }, 'Sessão'),
            React.createElement('strong', null, 'Campos principais')
          ),
          React.createElement('div', { className: 'grid dual-grid' },
            React.createElement('input', {
              className: 'field',
              placeholder: 'Foco (ex: Lower, Push, Pull)',
              value: forms.strengthFocus,
              onChange: (e) => setForms((prev) => ({ ...prev, strengthFocus: e.target.value })),
            }),
            React.createElement('input', {
              className: 'field',
              placeholder: 'Carga/guia (ex: 75-80% RM)',
              value: forms.strengthLoadGuidance,
              onChange: (e) => setForms((prev) => ({ ...prev, strengthLoadGuidance: e.target.value })),
            }),
            React.createElement('input', {
              className: 'field',
              type: 'number',
              min: '0',
              step: '0.5',
              placeholder: 'RIR',
              value: forms.strengthRir,
              onChange: (e) => setForms((prev) => ({ ...prev, strengthRir: e.target.value })),
            }),
            React.createElement('input', {
              className: 'field',
              type: 'number',
              min: '0',
              step: '15',
              placeholder: 'Descanso (seg)',
              value: forms.strengthRestSeconds,
              onChange: (e) => setForms((prev) => ({ ...prev, strengthRestSeconds: e.target.value })),
            }),
          ),
          React.createElement('details', { className: 'publish-advancedToggle' },
            React.createElement('summary', { className: 'muted' }, 'Campos extras'),
            React.createElement('section', { className: 'stack nested-card publish-formSection', style: { marginTop: '12px' } },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Exercícios'),
                React.createElement('span', { className: 'muted' }, 'Opcional')
              ),
              (forms.strengthExercises || []).map((exercise, index) =>
            React.createElement('div', { key: `ex-${index}`, className: 'stack publish-collectionItem' },
              React.createElement('div', { className: 'publish-collectionHead' },
                React.createElement('strong', null, `Exercício ${index + 1}`),
                React.createElement('span', { className: 'muted' }, exercise.name || 'Nome, sets, reps, carga e RIR')
              ),
              React.createElement('div', { className: 'grid dual-grid' },
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Exercício',
                  value: exercise.name,
                  onChange: (e) => updateCollectionItem('strengthExercises', index, 'name', e.target.value),
                }),
                React.createElement('input', {
                  className: 'field',
                  type: 'number',
                  min: '1',
                  step: '1',
                  placeholder: 'Sets',
                  value: exercise.sets,
                  onChange: (e) => updateCollectionItem('strengthExercises', index, 'sets', e.target.value),
                }),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Reps (ex: 5 ou 8-10)',
                  value: exercise.reps,
                  onChange: (e) => updateCollectionItem('strengthExercises', index, 'reps', e.target.value),
                }),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Carga (ex: 100kg ou 75%)',
                  value: exercise.load,
                  onChange: (e) => updateCollectionItem('strengthExercises', index, 'load', e.target.value),
                }),
                React.createElement('input', {
                  className: 'field',
                  type: 'number',
                  min: '0',
                  step: '0.5',
                  placeholder: 'RIR',
                  value: exercise.rir,
                  onChange: (e) => updateCollectionItem('strengthExercises', index, 'rir', e.target.value),
                }),
              ),
              React.createElement('div', { className: 'publish-collectionActions' },
                React.createElement('button', {
                  type: 'button',
                  className: 'btn btn-secondary',
                  onClick: () => removeCollectionItem('strengthExercises', index),
                  disabled: (forms.strengthExercises || []).length <= 1,
                }, 'Remover exercício')
              )
            )
              ),
              React.createElement('button', {
                type: 'button',
                className: 'btn btn-secondary',
                onClick: () => addCollectionItem('strengthExercises', () => ({ name: '', sets: '', reps: '', load: '', rir: '' })),
              }, 'Adicionar exercício')
            )
          )
        ),
      );
    }

    return [
      React.createElement('input', {
        key: 'benchmark',
        className: 'field',
        placeholder: 'benchmark slug opcional (ex: fran)',
        value: forms.workoutBenchmarkSlug,
        onChange: (e) => setForms((prev) => ({ ...prev, workoutBenchmarkSlug: e.target.value })),
      }),
    ];
  }

  return React.createElement('div', { className: 'portal-shell' },
    React.createElement('aside', { className: 'sidebar' },
      React.createElement('div', { className: 'eyebrow' }, 'Ryxen Coach'),
      React.createElement('h1', { className: 'sidebar-title' }, 'Coach Portal'),
      React.createElement('p', { className: 'sidebar-copy' }, 'Operação diária, aulas, check-in e programação.'),
      React.createElement('div', { className: 'profile-box' },
        React.createElement('strong', null, profile?.name || profile?.email || 'Coach'),
        React.createElement('span', null, profile?.email || '')
      ),
      React.createElement('div', { className: 'sidebar-plan' },
        React.createElement('span', { className: 'stat-label' }, 'Acesso atual'),
        React.createElement('strong', { className: 'sidebar-planValue' }, planName),
        React.createElement('span', { className: `pill ${billingTone}` },
          renewAt
            ? (daysRemaining !== null ? `${daysRemaining} dia(s) restantes` : formatDateLabel(renewAt))
            : 'Sem renovação'
        )
      ),
      React.createElement('nav', { className: 'sidebar-nav', 'aria-label': 'Seções do portal' },
        quickSections.map(([id, label]) =>
          React.createElement('button', {
            key: id,
            type: 'button',
            className: `sidebar-navLink ${activeSection === id ? 'isActive' : ''}`,
            onClick: () => setActiveSection(id),
          }, label)
        )
      ),
      React.createElement('div', { className: 'stack' },
        React.createElement('button', { className: 'btn btn-secondary', onClick: () => loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType) }, 'Atualizar dados'),
        React.createElement('button', { className: 'btn btn-secondary', onClick: handleLogout }, 'Sair'),
        React.createElement('a', { className: 'btn btn-link', href: '/' }, 'Voltar ao app do atleta')
      )
    ),
    React.createElement('main', { className: 'portal-main' },
      React.createElement('section', { className: 'hero', id: 'overview' },
        React.createElement('div', null,
          React.createElement('div', { className: 'eyebrow' }, 'Operação do coach'),
          React.createElement('h2', null, selectedGym ? `Operação de ${selectedGym.name}` : 'Seu painel operacional do box'),
          React.createElement('p', { className: 'hero-copy' }, selectedGym
            ? `Publicação, grupos, atletas, benchmarks e rotina de ${selectedGym.name}.`
            : 'Escolha um gym para publicar, acompanhar atletas e usar o portal.')
        ),
        React.createElement('div', { className: 'hero-pills' },
          React.createElement('span', { className: 'pill' }, sportLabel(dashboard.selectedSportType)),
          React.createElement('span', { className: `pill ${canCoachManage ? 'ok' : 'warn'}` }, canCoachManage ? 'Portal disponível' : 'Portal indisponível'),
          React.createElement('span', { className: `pill ${canAthleteUseApp ? 'ok' : 'warn'}` }, canAthleteUseApp ? 'Atletas com acesso' : 'Atletas sem acesso')
        )
      ),
      React.createElement('section', { className: 'portal-toolbarCard card' },
        React.createElement('div', { className: 'stack' },
          React.createElement('div', { className: 'eyebrow' }, 'Modalidade ativa'),
          React.createElement('strong', null, 'Selecione a modalidade'),
          React.createElement('div', { className: 'tabs' },
            availableSportOptions.map((sport) =>
              React.createElement('button', {
                key: sport.value,
                type: 'button',
                className: `btn btn-chip ${dashboard.selectedSportType === sport.value ? 'is-active' : ''}`,
                onClick: () => handleSelectSportType(sport.value),
              }, sport.label)
            )
          )
        )
      ),
      React.createElement('section', { className: 'portal-viewTabs', 'aria-label': 'Áreas do portal' },
        quickSections.map(([id, label]) =>
          React.createElement('button', {
            key: id,
            type: 'button',
            className: `btn btn-chip ${activeSection === id ? 'is-active' : ''}`,
            onClick: () => setActiveSection(id),
          }, label)
        )
      ),
      error ? React.createElement('div', { className: 'notice error' }, error) : null,
      message ? React.createElement('div', { className: 'notice success' }, message) : null,
      React.createElement('section', { className: `billing-banner billing-banner-${billingTone}`, hidden: !isOverviewSection },
        React.createElement('div', null,
          React.createElement('div', { className: 'eyebrow' }, 'Acesso'),
          React.createElement('strong', { className: 'billing-bannerTitle' },
            planStatus === 'active'
              ? `Acesso ${planName} ativo`
              : `${planName} • ${planStatus}`
          ),
          React.createElement('p', { className: 'muted' },
            renewAt
              ? `Renovação em ${formatDateLabel(renewAt)}${daysRemaining !== null ? ` • ${daysRemaining} dia(s) restantes` : ''}`
              : 'Sem renovação cadastrada. O portal segue em modo limitado enquanto o acesso não estiver ativo.'
          )
        ),
        React.createElement('div', { className: 'billing-bannerActions' },
          shouldShowBillingAction ? React.createElement('button', { className: 'btn btn-primary', onClick: () => handleCheckout('coach'), disabled: loading }, 'Abrir cobrança') : null,
          canUseDeveloperTools ? React.createElement('button', { className: 'btn btn-secondary', onClick: handleActivateLocalPlan, disabled: loading }, 'Ativar local') : null,
          React.createElement('a', { className: 'btn btn-link', href: '/terms.html', target: '_blank', rel: 'noreferrer' }, 'Termos')
        )
      ),
      React.createElement('section', { className: 'grid stats-grid', hidden: !isOverviewSection },
        showSkeleton
          ? Array.from({ length: 6 }, (_, index) => portalSkeletonCard(`stat-${index}`))
          : [
              statCard('Acesso', planName),
              statCard('Status', planStatus),
              statCard('Gyms', String(dashboard.gyms.length)),
              statCard('Modalidade', sportLabel(dashboard.selectedSportType)),
              statCard('Treinos no feed', String(dashboard.feed.length)),
              statCard('Atletas ativos', String(dashboard.insights?.stats?.athletes || 0)),
              statCard('Resultados', String(dashboard.insights?.stats?.results || 0)),
              statCard('PRs ativos', String(dashboard.insights?.stats?.activePrs || 0)),
              statCard('Atletas com PR', String(dashboard.insights?.stats?.athletesWithPrs || 0)),
            ]
      ),
      React.createElement('section', { className: 'portal-sectionHeader', id: 'operation', hidden: !isOperationSection },
        React.createElement('div', { className: 'eyebrow' }, 'Operação'),
        React.createElement('h3', null, 'Estrutura do box'),
        React.createElement('p', { className: 'muted' }, 'Gyms, membros, grupos e indicadores operacionais em leitura direta.')
      ),
      React.createElement('section', { className: 'grid portal-grid', hidden: !isOverviewSection },
        !dashboard.gyms.length
          ? React.createElement('div', { className: 'card wide' },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Primeiros passos'),
                React.createElement('strong', null, 'Começar pelo básico')
              ),
              React.createElement('p', { className: 'muted' }, 'Crie um gym, convide membros e publique um treino.'),
              React.createElement('div', { className: 'stack list-block' },
                React.createElement('div', { className: 'list-item static' },
                  React.createElement('strong', null, '1. Criar gym'),
                  React.createElement('span', null, 'Abra Operação para cadastrar o box e definir o contexto inicial.')
                ),
                React.createElement('div', { className: 'list-item static' },
                  React.createElement('strong', null, '2. Convidar membros'),
                  React.createElement('span', null, 'Adicione atletas e coaches para montar a estrutura de trabalho.')
                ),
                React.createElement('div', { className: 'list-item static' },
                  React.createElement('strong', null, '3. Publicar treino'),
                  React.createElement('span', null, 'Use Programação para enviar o primeiro treino ao feed do atleta.')
                )
              ),
              React.createElement('div', { className: 'billing-bannerActions' },
                React.createElement('button', { className: 'btn btn-secondary', type: 'button', onClick: () => setActiveSection('operation') }, 'Abrir operação'),
                React.createElement('button', { className: 'btn btn-secondary', type: 'button', onClick: () => setActiveSection('programming') }, 'Abrir programação'),
                React.createElement('button', { className: 'btn btn-secondary', type: 'button', onClick: () => setActiveSection('library') }, 'Ver benchmarks')
              )
            )
          : [
              React.createElement('div', { className: 'card', key: 'overview-actions' },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Próximas ações'),
                  React.createElement('strong', null, selectedGym ? `Fluxo de ${selectedGym.name}` : 'Fluxo operacional')
                ),
                React.createElement('div', { className: 'stack list-block' },
                  React.createElement('button', { className: 'list-item', type: 'button', onClick: () => setActiveSection('programming') },
                    React.createElement('strong', null, 'Publicar treino'),
                    React.createElement('span', null, selectedGym ? `Enviar treino para ${selectedGym.name}` : 'Abrir publicação')
                  ),
                  React.createElement('button', { className: 'list-item', type: 'button', onClick: () => setActiveSection('operation') },
                    React.createElement('strong', null, 'Revisar membros e grupos'),
                    React.createElement('span', null, `${dashboard.members.length} membro(s) • ${dashboard.groups.length} grupo(s)`)
                  ),
                  React.createElement('button', { className: 'list-item', type: 'button', onClick: () => setActiveSection('library') },
                    React.createElement('strong', null, 'Consultar benchmarks'),
                    React.createElement('span', null, `${dashboard.benchmarkPagination.total || dashboard.benchmarks.length || 0} benchmark(s) disponíveis`)
                  )
                )
              ),
              React.createElement('div', { className: 'card', key: 'overview-access' },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Leitura rápida'),
                  React.createElement('strong', null, 'Estado atual do portal')
                ),
                React.createElement('div', { className: 'stack list-block' },
                  React.createElement('div', { className: 'list-item static' },
                    React.createElement('strong', null, 'Gym selecionado'),
                    React.createElement('span', null, selectedGym ? `${selectedGym.name} • ${selectedGym.role || 'membro'}` : 'Nenhum gym ativo')
                  ),
                  React.createElement('div', { className: 'list-item static' },
                    React.createElement('strong', null, 'Portal do coach'),
                    React.createElement('span', null, canCoachManage ? 'Disponível para operar' : 'Indisponível no estado atual')
                  ),
                  React.createElement('div', { className: 'list-item static' },
                    React.createElement('strong', null, 'App do atleta'),
                    React.createElement('span', null, canAthleteUseApp ? 'Disponível para os atletas vinculados' : 'Sem liberação para atletas')
                  ),
                  React.createElement('div', { className: 'list-item static' },
                    React.createElement('strong', null, 'Renovação'),
                    React.createElement('span', null, renewAt ? formatDateLabel(renewAt) : 'Sem data cadastrada')
                  )
                )
              ),
              React.createElement('div', { className: 'card', key: 'overview-benchmarks' },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Benchmarks'),
                  React.createElement('strong', null, 'Referências em destaque')
                ),
                overviewBenchmarks.length
                  ? React.createElement('div', { className: 'stack list-block' },
                      overviewBenchmarks.map((item) =>
                        React.createElement('div', { key: item.key, className: 'list-item static' },
                          React.createElement('strong', null, item.title),
                          React.createElement('span', null, item.detail)
                        )
                      )
                    )
                  : React.createElement('p', { className: 'muted' }, 'Abra a biblioteca para ver benchmarks.'),
                React.createElement('div', { className: 'billing-bannerActions' },
                  React.createElement('button', { className: 'btn btn-secondary', type: 'button', onClick: () => setActiveSection('library') }, 'Abrir biblioteca')
                )
              ),
              React.createElement('div', { className: 'card', key: 'overview-prs' },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'PRs'),
                  React.createElement('strong', null, 'Últimos registros')
                ),
                dashboard.selectedSportType !== 'cross'
                  ? React.createElement('p', { className: 'muted' }, 'Troque para Cross para ver PRs.')
                  : overviewRecentPrs.length
                    ? React.createElement('div', { className: 'stack list-block' },
                        overviewRecentPrs.map((record, index) =>
                          React.createElement('div', { key: `${record.id || record.exercise || 'pr'}-${index}`, className: 'list-item static' },
                            React.createElement('strong', null, record.athlete_name || record.athlete_email || 'Atleta'),
                            React.createElement('span', null, `${record.exercise} • ${formatNumericValue(record.value)} ${record.unit || 'kg'}`)
                          )
                        )
                      )
                    : React.createElement('p', { className: 'muted' }, 'Nenhum PR sincronizado recentemente.'),
                React.createElement('div', { className: 'billing-bannerActions' },
                  React.createElement('button', { className: 'btn btn-secondary', type: 'button', onClick: () => setActiveSection('operation') }, 'Abrir operação')
                )
              ),
              React.createElement('div', { className: 'card wide', key: 'overview-feed' },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Feed'),
                  React.createElement('strong', null, 'Treinos recentes publicados')
                ),
                overviewFeed.length
                  ? React.createElement('div', { className: 'stack list-block' },
                      overviewFeed.map((item) =>
                        React.createElement('div', { key: item.id, className: 'list-item static' },
                          React.createElement('strong', null, item.title || 'Treino'),
                          React.createElement('span', null, `${item.gym_name || selectedGym?.name || 'Gym'} • ${sportLabel(item.sport_type || dashboard.selectedSportType)}${item.benchmark?.name ? ` • ${item.benchmark.name}` : ''}`)
                        )
                      )
                    )
                  : React.createElement('p', { className: 'muted' }, 'Sem treinos publicados ainda para este contexto.'),
                React.createElement('div', { className: 'billing-bannerActions' },
                  React.createElement('button', { className: 'btn btn-secondary', type: 'button', onClick: () => setActiveSection('programming') }, 'Abrir programação'),
                  React.createElement('button', { className: 'btn btn-secondary', type: 'button', onClick: () => loadDashboard(dashboard.selectedGymId, dashboard.selectedSportType) }, 'Atualizar visão geral')
                )
              ),
            ]
      ),
      React.createElement('section', { className: 'grid portal-grid', hidden: !(isOperationSection || isProgrammingSection || isLibrarySection) },
        React.createElement('div', { className: 'card wide operation-shellLayout', hidden: !isOperationSection },
          React.createElement('div', { className: 'stack operation-primaryRail' },
            React.createElement('div', { className: 'card nested-card operation-card' },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Gyms'),
                React.createElement('strong', null, 'Estrutura principal')
              ),
              React.createElement('div', { className: 'stack list-block' },
                showSkeleton
                  ? portalSkeletonList(3)
                  : dashboard.gyms.map((gym) =>
                  React.createElement('button', {
                    key: gym.id,
                    className: `list-item ${dashboard.selectedGymId === gym.id ? 'selected' : ''}`,
                    onClick: () => handleSelectGym(gym.id),
                  },
                    React.createElement('strong', null, gym.name),
                    React.createElement('span', null, `${gym.role} • ${gym.access?.warning || 'Acesso OK'}`)
                  )
                  ),
                dashboard.gyms.length === 0 ? React.createElement('p', { className: 'muted' }, 'Nenhum gym criado ainda.') : null
              ),
              React.createElement('form', { className: 'stack operation-form', onSubmit: handleCreateGym },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Novo gym'),
                  React.createElement('span', { className: 'muted' }, 'Crie um box sem sair da operação.')
                ),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Nome do gym',
                  value: forms.gymName,
                  onChange: (e) => setForms((prev) => ({ ...prev, gymName: e.target.value })),
                }),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'slug-do-gym',
                  value: forms.gymSlug,
                  onChange: (e) => setForms((prev) => ({ ...prev, gymSlug: e.target.value })),
                }),
                React.createElement('button', { className: 'btn btn-secondary', type: 'submit', disabled: loading }, 'Criar gym')
              )
            ),
            React.createElement('div', { className: 'card nested-card operation-card' },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Membros'),
                React.createElement('strong', null, selectedGym ? `Equipe de ${selectedGym.name}` : 'Equipe do gym')
              ),
              React.createElement('div', { className: 'stack list-block' },
                showSkeleton
                  ? portalSkeletonList(3)
                  : dashboard.members.map((member) =>
                  React.createElement('div', { key: member.id, className: 'list-item static member-item' },
                    React.createElement('strong', null, member.display_name || member.name || member.email || member.pending_email || 'Convidado'),
                    React.createElement('span', null, `${member.role} • ${member.status}${member.handle ? ` • @${member.handle}` : ''}`),
                    member.bio ? React.createElement('span', { className: 'muted' }, member.bio) : null,
                    React.createElement('span', { className: 'muted' }, member.email || member.pending_email || '')
                  )
                  ),
                dashboard.members.length === 0 ? React.createElement('p', { className: 'muted' }, 'Selecione um gym para carregar membros.') : null
              ),
              React.createElement('form', { className: 'stack operation-form', onSubmit: handleAddMember },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Adicionar membro'),
                  React.createElement('span', { className: 'muted' }, 'Convide atleta ou coach em poucos toques.')
                ),
                React.createElement('input', {
                  className: 'field',
                  type: 'email',
                  placeholder: 'Email do membro',
                  value: forms.memberEmail,
                  onChange: (e) => setForms((prev) => ({ ...prev, memberEmail: e.target.value })),
                }),
                React.createElement('select', {
                  className: 'field',
                  value: forms.memberRole,
                  onChange: (e) => setForms((prev) => ({ ...prev, memberRole: e.target.value })),
                },
                  React.createElement('option', { value: 'athlete' }, 'athlete'),
                  React.createElement('option', { value: 'coach' }, 'coach')
                ),
                React.createElement('button', { className: 'btn btn-secondary', type: 'submit', disabled: loading || !selectedGym }, 'Adicionar membro')
              )
            )
          ),
          React.createElement('div', { className: 'stack operation-secondaryRail' },
            React.createElement('div', { className: 'card nested-card operation-card' },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Agenda e check-in'),
                React.createElement('strong', null, selectedGym ? `Sessões de ${selectedGym.name}` : 'Sessões do gym')
              ),
              React.createElement('p', { className: 'muted' }, `Base pronta para reserva, presença e recepção em ${sportLabel(dashboard.selectedSportType)}.`),
              React.createElement('div', { className: 'stack list-block' },
                showSkeleton
                  ? portalSkeletonList(2)
                  : (dashboard.checkinSessions || []).map((session) =>
                      React.createElement('div', { key: session.id, className: 'list-item static' },
                        React.createElement('strong', null, session.title || 'Sessão'),
                        React.createElement(
                          'span',
                          null,
                          `${formatDateTimeLabel(session.starts_at)}${session.location ? ` • ${session.location}` : ''}${session.capacity ? ` • ${session.summary?.totalEntries || 0}/${session.capacity}` : ''}${session.rules?.checkInClosesAt ? ` • check-in até ${formatDateTimeLabel(session.rules.checkInClosesAt)}` : ''}`
                        ),
                        React.createElement('span', { className: 'muted' },
                          session.rules?.checkInClosed
                            ? 'Janela de check-in encerrada'
                            : (session.summary?.availableSpots !== null ? `${session.summary?.availableSpots || 0} vaga(s) restante(s)` : 'Sem limite de vagas')
                        ),
                        React.createElement('div', { className: 'stack list-block' },
                          (session.entries || []).length
                            ? session.entries.map((entry) =>
                                React.createElement('div', { key: entry.id, className: 'list-item static' },
                                  React.createElement('strong', null, entry.attendeeDisplayName || entry.attendeeLabel || entry.attendeeEmail || 'Atleta'),
                                  React.createElement(
                                    'span',
                                    null,
                                    `${entry.status}${entry.checkedInAt ? ` • ${formatDateTimeLabel(entry.checkedInAt)}` : ''}${entry.canceledAt ? ` • cancelado em ${formatDateTimeLabel(entry.canceledAt)}` : ''}${entry.attendeeEmail ? ` • ${entry.attendeeEmail}` : ''}`
                                  ),
                                  entry.status !== 'checked_in'
                                    ? React.createElement('button', {
                                      type: 'button',
                                      className: 'btn btn-secondary',
                                      onClick: () => handleMarkSessionCheckIn(session.id, entry.gymMembershipId),
                                      disabled: loading || session.rules?.checkInClosed,
                                    }, 'Marcar check-in')
                                    : null,
                                  entry.status !== 'canceled'
                                    ? React.createElement('button', {
                                      type: 'button',
                                      className: 'btn btn-secondary',
                                      onClick: () => handleCancelSessionCheckIn(session.id, entry.gymMembershipId),
                                      disabled: loading,
                                    }, 'Cancelar check-in')
                                    : null
                                )
                              )
                            : React.createElement('p', { className: 'muted' }, 'Sem reservas ainda nesta sessão.')
                        )
                      )
                    ),
                !(dashboard.checkinSessions || []).length ? React.createElement('p', { className: 'muted' }, 'Crie a primeira sessão para começar agenda e presença.') : null
              ),
              React.createElement('form', { className: 'stack operation-form', onSubmit: handleCreateCheckinSession },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Nova sessão'),
                  React.createElement('span', { className: 'muted' }, 'MVP pronto para crescer depois com QR, recepção e reservas pelo atleta.')
                ),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Título da sessão',
                  value: forms.sessionTitle,
                  onChange: (e) => setForms((prev) => ({ ...prev, sessionTitle: e.target.value })),
                }),
                React.createElement('div', { className: 'grid dual-grid' },
                  React.createElement('input', {
                    className: 'field',
                    type: 'datetime-local',
                    value: forms.sessionStartsAt,
                    onChange: (e) => setForms((prev) => ({ ...prev, sessionStartsAt: e.target.value })),
                  }),
                  React.createElement('input', {
                    className: 'field',
                    type: 'datetime-local',
                    value: forms.sessionEndsAt,
                    onChange: (e) => setForms((prev) => ({ ...prev, sessionEndsAt: e.target.value })),
                  }),
                  React.createElement('input', {
                    className: 'field',
                    type: 'datetime-local',
                    value: forms.sessionCheckInClosesAt,
                    onChange: (e) => setForms((prev) => ({ ...prev, sessionCheckInClosesAt: e.target.value })),
                    placeholder: 'Limite do check-in',
                  }),
                  React.createElement('input', {
                    className: 'field',
                    type: 'number',
                    min: '1',
                    step: '1',
                    placeholder: 'Capacidade',
                    value: forms.sessionCapacity,
                    onChange: (e) => setForms((prev) => ({ ...prev, sessionCapacity: e.target.value })),
                  }),
                  React.createElement('input', {
                    className: 'field',
                    placeholder: 'Local',
                    value: forms.sessionLocation,
                    onChange: (e) => setForms((prev) => ({ ...prev, sessionLocation: e.target.value })),
                  }),
                ),
                React.createElement('textarea', {
                  className: 'field textarea',
                  placeholder: 'Notas rápidas da aula / sessão',
                  value: forms.sessionNotes,
                  onChange: (e) => setForms((prev) => ({ ...prev, sessionNotes: e.target.value })),
                }),
                React.createElement('button', { className: 'btn btn-secondary', type: 'submit', disabled: loading || !selectedGym || !forms.sessionTitle || !forms.sessionStartsAt }, 'Criar sessão')
              )
            ),
            React.createElement('div', { className: 'card nested-card operation-card' },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Grupos'),
                React.createElement('strong', null, selectedGym ? `Grupos de ${selectedGym.name}` : 'Grupos')
              ),
              React.createElement('p', { className: 'muted' }, `Mostrando grupos de ${sportLabel(dashboard.selectedSportType)}.`),
              React.createElement('div', { className: 'stack list-block' },
                showSkeleton
                  ? portalSkeletonList(2)
                  : dashboard.groups.map((group) =>
                  React.createElement('div', { key: group.id, className: 'list-item static group-item' },
                    React.createElement('strong', null, group.name),
                    React.createElement('span', null, `${group.member_count || group.members?.length || 0} atleta(s) • ${sportLabel(group.sport_type || dashboard.selectedSportType)}${group.description ? ` • ${group.description}` : ''}`)
                  )
                  ),
                dashboard.groups.length === 0 ? React.createElement('p', { className: 'muted' }, 'Crie grupos para blocos especiais e planilhas separadas.') : null
              ),
              React.createElement('form', { className: 'stack operation-form', onSubmit: handleCreateGroup },
                React.createElement('div', { className: 'publish-formSectionHead' },
                  React.createElement('div', { className: 'eyebrow' }, 'Novo grupo'),
                  React.createElement('span', { className: 'muted' }, 'Selecione atletas sem apertar a interface no celular.')
                ),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Nome do grupo',
                  value: forms.groupName,
                  onChange: (e) => setForms((prev) => ({ ...prev, groupName: e.target.value })),
                }),
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Descrição curta',
                  value: forms.groupDescription,
                  onChange: (e) => setForms((prev) => ({ ...prev, groupDescription: e.target.value })),
                }),
                React.createElement('div', { className: 'selection-grid operation-selectionGrid' },
                  athleteMembers.length
                    ? athleteMembers.map((member) =>
                        React.createElement('label', { key: member.id, className: 'check-row' },
                          React.createElement('input', {
                            type: 'checkbox',
                            checked: forms.selectedGroupMemberIds.includes(member.id),
                            onChange: () => toggleSelection('selectedGroupMemberIds', member.id),
                          }),
                          React.createElement('span', null,
                            React.createElement('strong', null, member.name || member.email || member.pending_email || 'Atleta'),
                            React.createElement('small', null, member.email || member.pending_email || '')
                          )
                        )
                      )
                    : React.createElement('p', { className: 'muted' }, 'Nenhum atleta ativo disponível.')
                ),
                React.createElement('button', { className: 'btn btn-secondary', type: 'submit', disabled: loading || !selectedGym || !forms.groupName }, 'Criar grupo')
              )
            ),
            React.createElement('div', { className: 'card nested-card operation-card' },
              React.createElement('h3', null, selectedGym ? `Insights de ${selectedGym.name}` : 'Insights do gym'),
              React.createElement('p', { className: 'muted' }, `Métricas filtradas em ${sportLabel(dashboard.selectedSportType)}.`),
              showSkeleton
                ? React.createElement('div', { className: 'stack list-block' }, portalSkeletonList(4))
                : dashboard.insights
                ? React.createElement('div', { className: 'stack list-block' },
                    React.createElement('div', { className: 'list-item static' },
                      React.createElement('strong', null, 'Programação'),
                      React.createElement('span', null, `${dashboard.insights.stats?.workouts || 0} treino(s) no total • ${dashboard.insights.stats?.workoutsNext7Days || 0} nos próximos 7 dias`)
                    ),
                    React.createElement('div', { className: 'list-item static' },
                      React.createElement('strong', null, 'Competições'),
                      React.createElement('span', null, 'Fora do escopo da base atual')
                    ),
                    React.createElement('div', { className: 'list-item static' },
                      React.createElement('strong', null, 'Grupos'),
                      React.createElement('span', null, `${dashboard.insights.stats?.groups || 0} grupo(s) ativos`)
                    ),
                    React.createElement('div', { className: 'list-item static' },
                      React.createElement('strong', null, 'PRs sincronizados'),
                      React.createElement(
                        'span',
                        null,
                        dashboard.selectedSportType === 'cross'
                          ? `${dashboard.insights.stats?.activePrs || 0} PR(s) ativos em ${dashboard.insights.stats?.athletesWithPrs || 0} atleta(s)`
                          : 'Disponível ao visualizar o modo Cross'
                      )
                    ),
                    React.createElement('div', { className: 'list-item static' },
                      React.createElement('strong', null, 'Benchmarks mais usados'),
                      React.createElement('span', null, (dashboard.insights.topBenchmarks || []).length ? dashboard.insights.topBenchmarks.map((item) => `${item.name} (${item.total})`).join(' • ') : 'Sem volume suficiente ainda')
                    ),
                    React.createElement('div', { className: 'list-item static' },
                      React.createElement('strong', null, 'Últimos PRs'),
                      React.createElement(
                        'span',
                        null,
                        dashboard.selectedSportType === 'cross'
                          ? ((dashboard.insights.recentPrs || []).length
                            ? dashboard.insights.recentPrs
                              .map((record) => `${record.athlete_name || record.athlete_email || 'Atleta'} • ${record.exercise} ${formatNumericValue(record.value)} ${record.unit || 'kg'}`)
                              .join(' • ')
                            : 'Nenhum PR sincronizado recentemente')
                          : 'Troque para Cross para revisar PRs'
                      )
                    )
                  )
                : React.createElement('p', { className: 'muted' }, 'Selecione um gym para carregar métricas operacionais.')
            )
          )
        ),
        React.createElement('div', { className: 'card wide', hidden: !isProgrammingSection },
        React.createElement('div', { className: 'portal-sectionHeader portal-sectionHeader-inline', id: 'programming' },
          React.createElement('div', { className: 'eyebrow' }, 'Programação'),
          React.createElement('h3', null, `Publicar treino • ${sportLabel(dashboard.selectedSportType)}`),
          React.createElement('p', { className: 'muted' }, 'Monte a sessão, escolha a audiência e publique sem excesso de configuração.')
        ),
          React.createElement('form', { className: 'stack publish-form', onSubmit: handlePublishWorkout },
            React.createElement('div', { className: 'publish-shellLayout' },
              React.createElement('div', { className: 'stack publish-editorRail' },
                React.createElement('section', { className: 'stack nested-card publish-formSection' },
                  React.createElement('div', { className: 'publish-formSectionHead' },
                    React.createElement('div', { className: 'eyebrow' }, 'Sessão'),
                    React.createElement('strong', null, 'Base da publicação')
                  ),
                  React.createElement('div', { className: 'grid dual-grid' },
                    React.createElement('input', {
                      className: 'field',
                      placeholder: 'Título do treino',
                      value: forms.workoutTitle,
                      onChange: (e) => setForms((prev) => ({ ...prev, workoutTitle: e.target.value })),
                    }),
                    React.createElement('input', {
                      className: 'field',
                      type: 'date',
                      value: forms.workoutDate,
                      onChange: (e) => setForms((prev) => ({ ...prev, workoutDate: e.target.value })),
                    }),
                  ),
                  renderSportSpecificWorkoutFields(),
                  React.createElement('textarea', {
                    className: 'field textarea publish-workoutTextarea',
                    placeholder: isRunning
                      ? 'Uma linha por bloco/intervalo (ex: 6x400m @ 4:20/km / 1:30 trote)'
                      : isStrength
                        ? 'Uma linha por exercício (ex: Back Squat | 5x5 | 100kg)'
                        : 'Uma linha por exercício',
                    value: forms.workoutLines,
                    onChange: (e) => setForms((prev) => ({ ...prev, workoutLines: e.target.value })),
                  })
                ),
                React.createElement('section', { className: 'stack nested-card audience-card publish-formSection' },
                  React.createElement('div', { className: 'publish-formSectionHead' },
                    React.createElement('div', { className: 'eyebrow' }, 'Audiência'),
                    React.createElement('strong', null, 'Destino da publicação')
                  ),
                  React.createElement('span', { className: 'muted' }, 'Escolha só o destino que precisa publicar agora.'),
                  React.createElement('div', { className: 'tabs audience-modeTabs' },
                    [
                      ['all', 'Todos os atletas'],
                      ['selected', 'Atletas específicos'],
                      ['groups', 'Grupos'],
                    ].map(([value, label]) =>
                      React.createElement('button', {
                        key: value,
                        type: 'button',
                        className: `btn btn-chip ${forms.workoutAudienceMode === value ? 'is-active' : ''}`,
                        onClick: () => setForms((prev) => ({ ...prev, workoutAudienceMode: value })),
                      }, label)
                    )
                  ),
                  React.createElement('div', { className: 'publish-audienceSummary' },
                    React.createElement('strong', null, 'Resumo da audiência'),
                    React.createElement('span', { className: 'muted' }, publishSummary)
                  ),
                  React.createElement('div', { className: 'selection-panels', hidden: publishAudienceMode === 'all' },
                    React.createElement('div', { className: 'selection-panel' },
                      publishAudienceMode === 'groups' ? null : React.createElement(React.Fragment, null,
                      React.createElement('div', { className: 'eyebrow' }, 'Atletas'),
                      React.createElement('div', { className: 'selection-grid' },
                        athleteMembers.length
                          ? athleteMembers.map((member) =>
                              React.createElement('label', { key: member.id, className: 'check-row' },
                                React.createElement('input', {
                                  type: 'checkbox',
                                  checked: forms.targetMembershipIds.includes(member.id),
                                  onChange: () => toggleSelection('targetMembershipIds', member.id),
                                }),
                                React.createElement('span', null,
                                  React.createElement('strong', null, member.name || member.email || member.pending_email || 'Atleta'),
                                  React.createElement('small', null, member.email || member.pending_email || '')
                                )
                              )
                            )
                          : React.createElement('p', { className: 'muted' }, 'Sem atletas ativos.')
                      )
                      )
                    ),
                    React.createElement('div', { className: 'selection-panel' },
                      publishAudienceMode === 'selected' ? null : React.createElement(React.Fragment, null,
                      React.createElement('div', { className: 'eyebrow' }, 'Grupos'),
                      React.createElement('div', { className: 'selection-grid' },
                        dashboard.groups.length
                          ? dashboard.groups.map((group) =>
                              React.createElement('label', { key: group.id, className: 'check-row' },
                                React.createElement('input', {
                                  type: 'checkbox',
                                  checked: forms.targetGroupIds.includes(group.id),
                                  onChange: () => toggleSelection('targetGroupIds', group.id),
                                }),
                                React.createElement('span', null,
                                  React.createElement('strong', null, group.name),
                                  React.createElement('small', null, `${group.member_count || group.members?.length || 0} atleta(s)`)
                                )
                              )
                            )
                          : React.createElement('p', { className: 'muted' }, 'Sem grupos criados.')
                      )
                      )
                    )
                  )
                )
              ),
              React.createElement('div', { className: 'stack publish-summaryRail' },
                React.createElement('div', { className: 'publish-flow' },
                  React.createElement('div', { className: 'publish-step isActive' },
                    React.createElement('span', { className: 'publish-stepIndex' }, '1'),
                    React.createElement('div', null,
                      React.createElement('strong', null, 'Sessão'),
                      React.createElement('span', null, 'Título, data e estrutura do treino')
                    )
                  ),
                  React.createElement('div', { className: 'publish-step' },
                    React.createElement('span', { className: 'publish-stepIndex' }, '2'),
                    React.createElement('div', null,
                      React.createElement('strong', null, 'Audiência'),
                      React.createElement('span', null, publishSummary)
                    )
                  ),
                  React.createElement('div', { className: 'publish-step' },
                    React.createElement('span', { className: 'publish-stepIndex' }, '3'),
                    React.createElement('div', null,
                      React.createElement('strong', null, 'Publicação'),
                      React.createElement('span', null, selectedGym ? `Vai para ${selectedGym.name}` : 'Selecione um gym')
                    )
                  )
                ),
                React.createElement('div', { className: 'publish-metaCard' },
                  React.createElement('strong', null, 'Resumo rápido'),
                  React.createElement('span', null, selectedGym ? `${selectedGym.name} • ${sportLabel(dashboard.selectedSportType)}` : 'Escolha um gym para publicar'),
                  React.createElement('span', null, publishSummary)
                ),
                React.createElement('div', { className: 'publish-previewCard' },
                  React.createElement('div', { className: 'publish-previewHead' },
                    React.createElement('strong', null, 'Prévia do atleta'),
                    React.createElement('span', null, forms.workoutTitle || 'Título do treino')
                  ),
                  React.createElement('div', { className: 'publish-previewMeta' },
                    React.createElement('span', null, forms.workoutDate ? formatDateLabel(forms.workoutDate) : 'Sem data definida'),
                    React.createElement('span', null, publishSummary)
                  ),
                  previewLines.length
                    ? React.createElement('div', { className: 'publish-previewList' },
                        previewLines.map((line, index) =>
                          React.createElement('div', { key: `preview-line-${index}`, className: 'publish-previewLine' },
                            React.createElement('span', { className: 'publish-previewDot', 'aria-hidden': 'true' }),
                            React.createElement('span', null, line)
                          )
                        ),
                        previewOverflow > 0
                          ? React.createElement('span', { className: 'muted' }, `+${previewOverflow} linha(s) na publicação`)
                          : null
                      )
                    : React.createElement('p', { className: 'muted' }, 'A prévia aparece conforme você preenche o treino.')
                ),
                publishErrors.length
                  ? React.createElement('div', { className: 'publish-validationCard' },
                      React.createElement('strong', null, 'Falta ajustar antes de publicar'),
                      React.createElement('div', { className: 'publish-validationList' },
                        publishErrors.map((item) =>
                          React.createElement('span', { key: item, className: 'publish-validationItem' }, item)
                        )
                      )
                    )
                  : React.createElement('div', { className: 'publish-validationCard isReady' },
                      React.createElement('strong', null, 'Pronto para publicar'),
                      React.createElement('span', { className: 'muted' }, 'O treino já tem o mínimo necessário para ser enviado.')
                    ),
                draftStatus ? React.createElement('div', { className: 'draft-statusRow' },
                  React.createElement('span', { className: 'muted' }, draftStatus),
                  React.createElement('button', {
                    type: 'button',
                    className: 'btn btn-secondary',
                    onClick: handleClearWorkoutDraft,
                  }, 'Limpar rascunho')
                ) : null
              )
            ),
            React.createElement('div', { className: 'publish-actionBar' },
              React.createElement('button', { className: 'btn btn-primary', type: 'submit', disabled: !canPublishWorkout }, loading ? 'Publicando...' : 'Publicar treino')
            )
          )
        ),
        React.createElement('div', { className: 'card', id: 'library', hidden: !isLibrarySection },
          React.createElement('div', { className: 'portal-sectionHeader portal-sectionHeader-inline' },
            React.createElement('div', { className: 'eyebrow' }, 'Biblioteca'),
            React.createElement('h3', null, 'Benchmarks'),
            React.createElement('p', { className: 'muted' }, 'Busque e filtre a biblioteca oficial em leitura rápida.')
          ),
          React.createElement('div', { className: 'library-shellLayout' },
            React.createElement('section', { className: 'stack nested-card library-filterCard' },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Busca'),
                React.createElement('strong', null, 'Filtros de benchmark')
              ),
              React.createElement('div', { className: 'toolbar library-toolbar' },
                React.createElement('input', {
                  className: 'field',
                  placeholder: 'Buscar benchmark',
                  value: forms.benchmarkQuery,
                  onChange: (e) => setForms((prev) => ({ ...prev, benchmarkQuery: e.target.value })),
                }),
                React.createElement('select', {
                  className: 'field',
                  value: forms.benchmarkSource,
                  onChange: (e) => setForms((prev) => ({ ...prev, benchmarkSource: e.target.value })),
                },
                  BENCHMARK_SOURCE_OPTIONS.map((option) =>
                    React.createElement('option', { key: option.value || 'all', value: option.value }, option.label)
                  )
                ),
                React.createElement('select', {
                  className: 'field',
                  value: forms.benchmarkSort,
                  onChange: (e) => setForms((prev) => ({ ...prev, benchmarkSort: e.target.value })),
                },
                  React.createElement('option', { value: 'year_desc' }, 'Ano desc'),
                  React.createElement('option', { value: 'year_asc' }, 'Ano asc'),
                  React.createElement('option', { value: 'name_asc' }, 'Nome A-Z'),
                  React.createElement('option', { value: 'name_desc' }, 'Nome Z-A'),
                  React.createElement('option', { value: 'category_asc' }, 'Categoria')
                ),
                React.createElement('button', { className: 'btn btn-secondary', onClick: () => handleSearchBenchmarks(), disabled: loading }, 'Buscar')
              ),
              React.createElement('div', { className: 'tabs library-categoryTabs' },
                BENCHMARK_CATEGORY_TABS.map((category) =>
                  React.createElement('button', {
                    key: category || 'all',
                    className: 'btn btn-chip',
                    onClick: () => handleSearchBenchmarks({ category }),
                  }, benchmarkCategoryLabel(category || 'all'))
                )
              ),
              React.createElement('div', { className: 'benchmark-meta' },
                React.createElement('span', { className: 'muted' }, `${dashboard.benchmarkPagination.total || 0} benchmarks`),
                React.createElement('span', { className: 'muted' }, `Página ${dashboard.benchmarkPagination.page || 1} de ${dashboard.benchmarkPagination.pages || 1}`)
              )
            ),
            React.createElement('section', { className: 'stack nested-card library-resultsCard' },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Resultados'),
                React.createElement('strong', null, 'Lista de benchmarks')
              ),
              React.createElement('div', { className: 'stack list-block' },
                showSkeleton
                  ? portalSkeletonList(4)
                  : dashboard.benchmarks.map((benchmark) =>
                  React.createElement('button', {
                    key: benchmark.id,
                    type: 'button',
                    className: `list-item benchmark-item ${selectedBenchmarkSlug === benchmark.slug ? 'isActive' : ''}`,
                    onClick: () => handleOpenBenchmark(benchmark.slug),
                  },
                    React.createElement('strong', null, benchmark.name),
                    React.createElement('span', null, `${benchmarkCategoryLabel(benchmark.category)}${benchmark.year ? ` • ${benchmark.year}` : ''}${benchmark.official_source ? ` • ${benchmarkSourceLabel(benchmark.official_source)}` : ''}`),
                    React.createElement('code', { className: 'inline-code' }, benchmark.slug)
                  )
                  ),
                dashboard.benchmarks.length === 0 ? React.createElement('p', { className: 'muted' }, 'Nenhum benchmark encontrado para esse filtro.') : null
              ),
              React.createElement('div', { className: 'pager' },
                React.createElement('button', {
                  className: 'btn btn-secondary',
                  disabled: loading || (dashboard.benchmarkPagination.page || 1) <= 1,
                  onClick: () => handleSearchBenchmarks({ page: Math.max(1, (dashboard.benchmarkPagination.page || 1) - 1) }),
                }, 'Anterior'),
                React.createElement('button', {
                  className: 'btn btn-secondary',
                  disabled: loading || (dashboard.benchmarkPagination.page || 1) >= (dashboard.benchmarkPagination.pages || 1),
                  onClick: () => handleSearchBenchmarks({ page: Math.min((dashboard.benchmarkPagination.pages || 1), (dashboard.benchmarkPagination.page || 1) + 1) }),
                }, 'Próxima')
              )
            ),
            React.createElement('section', { className: 'stack nested-card library-resultsCard' },
              React.createElement('div', { className: 'publish-formSectionHead' },
                React.createElement('div', { className: 'eyebrow' }, 'Detalhe'),
                React.createElement('strong', null, benchmarkDetail?.name || 'Abra um benchmark')
              ),
              benchmarkDetailLoading
                ? React.createElement('p', { className: 'muted' }, 'Carregando benchmark...')
                : benchmarkDetail
                  ? React.createElement(React.Fragment, null,
                      React.createElement('div', { className: 'stack list-block' },
                        React.createElement('div', { className: 'list-item static' },
                          React.createElement('strong', null, 'Descrição'),
                          React.createElement('span', null, benchmarkDetail.description || 'Sem descrição cadastrada.')
                        ),
                        React.createElement('div', { className: 'list-item static' },
                          React.createElement('strong', null, 'Score'),
                          React.createElement('span', null, formatBenchmarkScoreType(benchmarkDetail.score_type))
                        ),
                        buildBenchmarkFacts(benchmarkDetail).length
                          ? React.createElement('div', { className: 'list-item static' },
                              React.createElement('strong', null, 'Estrutura'),
                              React.createElement('span', null, buildBenchmarkFacts(benchmarkDetail).join(' • '))
                            )
                          : null,
                        selectedBenchmarkDetail?.viewerLatestResult
                          ? React.createElement('div', { className: 'list-item static' },
                              React.createElement('strong', null, 'Sua marca mais recente'),
                              React.createElement('span', null, selectedBenchmarkDetail.viewerLatestResult.score_display || '-')
                            )
                          : null
                      ),
                      benchmarkLeaderboard.length
                        ? React.createElement('div', { className: 'stack list-block' },
                            React.createElement('strong', null, 'Ranking'),
                            benchmarkLeaderboard.map((row) =>
                              React.createElement('div', { key: `${benchmarkDetail.slug}-${row.rank}-${row.name}`, className: 'list-item static leaderboard-item' },
                                React.createElement('strong', null, `#${row.rank} ${row.name || 'Atleta'}`),
                                React.createElement('span', null, row.score_display || '-')
                              )
                            )
                          )
                        : React.createElement('p', { className: 'muted' }, 'Sem resultados ainda para este benchmark.'),
                      benchmarkDetail?.payload?.sourceUrl
                        ? React.createElement('a', {
                            className: 'btn btn-secondary',
                            href: benchmarkDetail.payload.sourceUrl,
                            target: '_blank',
                            rel: 'noopener noreferrer',
                          }, 'Fonte oficial')
                        : null
                    )
                  : React.createElement('p', { className: 'muted' }, 'Toque em um benchmark para ver a ficha completa.')
            )
          )
        ),
        React.createElement('div', { className: 'card', hidden: !isProgrammingSection },
          React.createElement('h3', null, `Feed do app • ${sportLabel(dashboard.selectedSportType)}`),
          React.createElement('div', { className: 'stack list-block' },
            showSkeleton
              ? portalSkeletonList(4)
              : dashboard.feed.map((item) =>
              React.createElement('div', { key: item.id, className: 'list-item static' },
                React.createElement('strong', null, item.title),
                React.createElement('span', null, `${item.gym_name || ''} • ${sportLabel(item.sport_type || dashboard.selectedSportType)}${item.benchmark?.name ? ` • ${item.benchmark.name}` : ''}`)
              )
              ),
            dashboard.feed.length === 0 ? React.createElement('p', { className: 'muted' }, 'Sem treinos publicados ainda.') : null
          )
        ),
      )
    )
  );
}
