import express from 'express';

import { pool } from '../db.js';
import { authRequired } from '../auth.js';
import { getAccessContextForUser, getActiveSubscriptionForUser } from '../access.js';
import { selectEffectiveAthleteBenefits } from '../accessPolicy.js';
import { loadGymInsights, loadVisibleWorkoutFeed } from '../queries/coachDashboardQueries.js';
import {
  cancelGymClassCheckIn,
  createGymClassSession,
  listGymClassSessions,
  markGymClassCheckIn,
} from '../services/gymOperationsServices.js';
import {
  createAthleteGroup,
  createGymWithOwnerMembership,
  createWorkoutForAudience,
  inviteGymMembership,
} from '../services/gymWriteServices.js';
import { normalizeSportType } from '../utils/sportType.js';

function serializeMembershipSummary(membership) {
  if (!membership || typeof membership !== 'object') return null;
  return {
    id: membership.id,
    gymId: membership.gym_id,
    gymName: membership.gym_name,
    gymSlug: membership.gym_slug,
    role: membership.role,
    status: membership.status,
    createdAt: membership.created_at || null,
  };
}

function serializeGymAccessSummary(access) {
  if (!access || typeof access !== 'object') return null;
  return {
    canCoachManage: !!access.canCoachManage,
    canAthletesUseApp: !!access.canAthletesUseApp,
    warning: access.warning || null,
  };
}

export function createGymRouter({
  authMiddleware = authRequired,
  requireGymManager,
  slugify,
  enrichWorkoutWithBenchmark,
  gymReadRateLimit = (_req, _res, next) => next(),
  gymWriteRateLimit = (_req, _res, next) => next(),
} = {}) {
  const router = express.Router();

  router.get('/access/context', gymReadRateLimit, authMiddleware, async (req, res) => {
    const [gyms, personalSubscription] = await Promise.all([
      getAccessContextForUser(req.user.userId),
      getActiveSubscriptionForUser(req.user.userId),
    ]);
    return res.json({
      athleteBenefits: selectEffectiveAthleteBenefits({ gymContexts: gyms, personalSubscription }),
      personalSubscription,
      gyms: gyms.map((ctx) => ({
        membership: serializeMembershipSummary(ctx.membership),
        gymAccess: serializeGymAccessSummary(ctx.access?.gymAccess || null),
        athleteBenefits: ctx.access?.athleteBenefits || null,
      })),
    });
  });

  router.post('/gyms', gymWriteRateLimit, authMiddleware, async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const slug = slugify(req.body?.slug || name);
    if (!name || !slug) {
      return res.status(400).json({ error: 'name e slug são obrigatórios' });
    }

    try {
      const created = await createGymWithOwnerMembership({
        name,
        slug,
        ownerUserId: req.user.userId,
      });
      if (created.error) {
        return res.status(created.code || 400).json({ error: created.error });
      }
      return res.json(created);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar gym' });
    }
  });

  router.get('/gyms/me', gymReadRateLimit, authMiddleware, async (req, res) => {
    const memberships = await getAccessContextForUser(req.user.userId);
    return res.json({
      gyms: memberships.map((ctx) => ({
        id: ctx.membership.gym_id,
        name: ctx.membership.gym_name,
        slug: ctx.membership.gym_slug,
        role: ctx.membership.role,
        status: ctx.membership.status,
        access: ctx.access?.gymAccess || null,
      })),
    });
  });

  router.post('/gyms/:gymId/memberships', gymWriteRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const role = String(req.body?.role || 'athlete');
    const email = String(req.body?.email || '').toLowerCase().trim();

    if (!Number.isFinite(gymId) || !email) {
      return res.status(400).json({ error: 'gymId e email são obrigatórios' });
    }

    if (!['coach', 'athlete'].includes(role)) {
      return res.status(400).json({ error: 'role inválido' });
    }

    const membership = await requireGymManager(gymId, req.user.userId);
    if (!membership.success) {
      return res.status(membership.code).json({ error: membership.error });
    }

    try {
      const created = await inviteGymMembership({ gymId, email, role });
      if (created.error) {
        return res.status(created.code || 400).json({ error: created.error });
      }
      return res.json(created);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao adicionar membro' });
    }
  });

  router.get('/gyms/:gymId/memberships', gymReadRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    const rows = await pool.query(
      `SELECT gm.*, u.email, u.name, u.display_name, u.handle, u.avatar_url, u.bio, u.profile_visibility, u.attendance_display
       FROM gym_memberships gm
       LEFT JOIN users u ON u.id = gm.user_id
       WHERE gm.gym_id = $1
       ORDER BY gm.created_at ASC`,
      [gymId],
    );

    return res.json({ memberships: rows.rows });
  });

  router.get('/gyms/:gymId/groups', gymReadRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const sportType = normalizeSportType(req.query?.sportType);
    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    const groups = await pool.query(
      `SELECT
         ag.id,
         ag.gym_id,
         ag.name,
         ag.sport_type,
         ag.description,
         ag.created_at,
         COUNT(agm.id)::int AS member_count
       FROM athlete_groups ag
       LEFT JOIN athlete_group_memberships agm ON agm.group_id = ag.id
       WHERE ag.gym_id = $1
         AND ag.sport_type = $2
       GROUP BY ag.id
       ORDER BY ag.created_at DESC`,
      [gymId, sportType],
    );

    const members = await pool.query(
      `SELECT
         agm.group_id,
         gm.id AS membership_id,
         COALESCE(u.name, u.email, gm.pending_email, 'Convidado') AS label,
         COALESCE(u.email, gm.pending_email, '') AS email,
         gm.role,
         gm.status
       FROM athlete_group_memberships agm
       JOIN athlete_groups ag ON ag.id = agm.group_id
       JOIN gym_memberships gm ON gm.id = agm.gym_membership_id
       LEFT JOIN users u ON u.id = gm.user_id
       WHERE ag.gym_id = $1
         AND ag.sport_type = $2
       ORDER BY agm.created_at ASC`,
      [gymId, sportType],
    );

    const memberMap = new Map();
    for (const row of members.rows) {
      if (!memberMap.has(row.group_id)) memberMap.set(row.group_id, []);
      memberMap.get(row.group_id).push({
        membershipId: row.membership_id,
        label: row.label,
        email: row.email,
        role: row.role,
        status: row.status,
      });
    }

    return res.json({
      groups: groups.rows.map((group) => ({
        ...group,
        members: memberMap.get(group.id) || [],
      })),
    });
  });

  router.post('/gyms/:gymId/groups', gymWriteRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const sportType = normalizeSportType(req.body?.sportType);
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const memberIds = Array.isArray(req.body?.memberIds)
      ? req.body.memberIds.map((id) => Number(id)).filter(Number.isFinite)
      : [];

    if (!Number.isFinite(gymId) || !name) {
      return res.status(400).json({ error: 'gymId e name são obrigatórios' });
    }

    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    try {
      const created = await createAthleteGroup({
        gymId,
        sportType,
        name,
        description,
        memberIds,
        userId: req.user.userId,
      });
      return res.json(created);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar grupo' });
    }
  });

  router.post('/gyms/:gymId/workouts', gymWriteRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const sportType = normalizeSportType(req.body?.sportType);
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const scheduledDate = String(req.body?.scheduledDate || '').trim();
    const payload = req.body?.payload;
    const audienceMode = String(req.body?.audienceMode || 'all').trim().toLowerCase();
    const targetMembershipIds = Array.isArray(req.body?.targetMembershipIds)
      ? req.body.targetMembershipIds.map((id) => Number(id)).filter(Number.isFinite)
      : [];
    const targetGroupIds = Array.isArray(req.body?.targetGroupIds)
      ? req.body.targetGroupIds.map((id) => Number(id)).filter(Number.isFinite)
      : [];

    if (!Number.isFinite(gymId) || !title || !scheduledDate || !payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'gymId, title, scheduledDate e payload são obrigatórios' });
    }

    if (!['all', 'selected', 'groups'].includes(audienceMode)) {
      return res.status(400).json({ error: 'audienceMode inválido' });
    }

    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    if (!manager.access.gymAccess.canCoachManage) {
      return res.status(402).json({ error: 'Assinatura do coach inativa. Renove para publicar treinos.' });
    }

    const created = await createWorkoutForAudience({
      gymId,
      userId: req.user.userId,
      title,
      description,
      scheduledDate,
      payload,
      sportType,
      audienceMode,
      targetMembershipIds,
      targetGroupIds,
    });
    if (created.error) {
      return res.status(created.code || 400).json({ error: created.error });
    }
    return res.json(created);
  });

  router.get('/workouts/feed', gymReadRateLimit, authMiddleware, async (req, res) => {
    const sportType = normalizeSportType(req.query?.sportType);
    const workouts = await loadVisibleWorkoutFeed({
      userId: req.user.userId,
      sportType,
      enrichWorkoutWithBenchmark,
    });
    return res.json({ workouts });
  });

  router.get('/gyms/:gymId/insights', gymReadRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const sportType = normalizeSportType(req.query?.sportType);
    if (!Number.isFinite(gymId)) {
      return res.status(400).json({ error: 'gymId inválido' });
    }

    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    const insights = await loadGymInsights({
      gymId,
      sportType,
      access: manager.access,
    });
    return res.json(insights);
  });

  router.get('/gyms/:gymId/checkin-sessions', gymReadRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const sportType = normalizeSportType(req.query?.sportType);
    const limit = Math.min(Math.max(Number(req.query?.limit) || 12, 1), 50);
    const from = String(req.query?.from || '').trim() || new Date().toISOString();

    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    const sessions = await listGymClassSessions({ gymId, sportType, limit, from });
    return res.json(sessions);
  });

  router.post('/gyms/:gymId/checkin-sessions', gymWriteRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const sportType = normalizeSportType(req.body?.sportType);
    const title = String(req.body?.title || '').trim();
    const startsAt = String(req.body?.startsAt || '').trim();
    const endsAt = String(req.body?.endsAt || '').trim();
    const checkInClosesAt = String(req.body?.checkInClosesAt || '').trim();
    const location = String(req.body?.location || '').trim();
    const notes = String(req.body?.notes || '').trim();
    const status = String(req.body?.status || 'scheduled').trim().toLowerCase();
    const capacity = req.body?.capacity !== undefined && req.body?.capacity !== '' ? Number(req.body.capacity) : null;

    if (!Number.isFinite(gymId) || !title || !startsAt) {
      return res.status(400).json({ error: 'gymId, title e startsAt são obrigatórios' });
    }
    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
      return res.status(400).json({ error: 'endsAt inválido' });
    }
    if (checkInClosesAt && Number.isNaN(new Date(checkInClosesAt).getTime())) {
      return res.status(400).json({ error: 'checkInClosesAt inválido' });
    }
    if (Number.isNaN(new Date(startsAt).getTime())) {
      return res.status(400).json({ error: 'startsAt inválido' });
    }
    if (!['scheduled', 'open', 'closed', 'canceled'].includes(status)) {
      return res.status(400).json({ error: 'status inválido' });
    }

    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    const created = await createGymClassSession({
      gymId,
      sportType,
      title,
      startsAt,
      endsAt: endsAt || null,
      checkInClosesAt: checkInClosesAt || null,
      capacity: Number.isFinite(capacity) ? capacity : null,
      location,
      notes,
      coachUserId: req.user.userId,
      status,
    });
    return res.json(created);
  });

  router.post('/gyms/:gymId/checkin-sessions/:sessionId/checkins', gymWriteRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const sessionId = Number(req.params.sessionId);
    const gymMembershipId = Number(req.body?.gymMembershipId);

    if (!Number.isFinite(gymId) || !Number.isFinite(sessionId) || !Number.isFinite(gymMembershipId)) {
      return res.status(400).json({ error: 'gymId, sessionId e gymMembershipId válidos são obrigatórios' });
    }

    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    const result = await markGymClassCheckIn({
      sessionId,
      gymMembershipId,
      userId: req.user.userId,
      source: 'coach_portal',
    });
    if (result.error) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    return res.json(result);
  });

  router.post('/gyms/:gymId/checkin-sessions/:sessionId/checkins/cancel', gymWriteRateLimit, authMiddleware, async (req, res) => {
    const gymId = Number(req.params.gymId);
    const sessionId = Number(req.params.sessionId);
    const gymMembershipId = Number(req.body?.gymMembershipId);
    const reason = String(req.body?.reason || '').trim();

    if (!Number.isFinite(gymId) || !Number.isFinite(sessionId) || !Number.isFinite(gymMembershipId)) {
      return res.status(400).json({ error: 'gymId, sessionId e gymMembershipId válidos são obrigatórios' });
    }

    const manager = await requireGymManager(gymId, req.user.userId);
    if (!manager.success) {
      return res.status(manager.code).json({ error: manager.error });
    }

    const result = await cancelGymClassCheckIn({
      sessionId,
      gymMembershipId,
      userId: req.user.userId,
      source: 'coach_portal',
      reason,
    });
    if (result.error) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    return res.json(result);
  });

  return router;
}
