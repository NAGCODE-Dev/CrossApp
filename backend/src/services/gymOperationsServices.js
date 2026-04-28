import { pool } from '../db.js';

export async function createGymClassSession({
  gymId,
  sportType,
  title,
  startsAt,
  endsAt = null,
  checkInClosesAt = null,
  capacity = null,
  location = '',
  notes = '',
  coachUserId = null,
  status = 'scheduled',
}) {
  const inserted = await pool.query(
    `INSERT INTO gym_class_sessions (
       gym_id, sport_type, title, starts_at, ends_at, check_in_closes_at, capacity, location, notes, coach_user_id, status, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
     RETURNING *`,
    [
      gymId,
      sportType,
      title,
      startsAt,
      endsAt || null,
      checkInClosesAt || null,
      Number.isFinite(capacity) ? capacity : null,
      location || null,
      notes || null,
      coachUserId,
      status,
    ],
  );
  return { session: inserted.rows[0] || null };
}

export async function listGymClassSessions({ gymId, sportType = 'cross', limit = 20, from = null } = {}) {
  const sessionsRes = await pool.query(
    `SELECT *
     FROM gym_class_sessions
     WHERE gym_id = $1
       AND sport_type = $2
       AND ($3::timestamptz IS NULL OR starts_at >= $3)
     ORDER BY starts_at ASC
     LIMIT $4`,
    [gymId, sportType, from, limit],
  );

  const sessions = sessionsRes.rows || [];
  if (!sessions.length) return { sessions: [] };

  const sessionIds = sessions.map((session) => session.id);
  const entriesRes = await pool.query(
    `SELECT
       gc.*,
       gm.role AS membership_role,
       gm.status AS membership_status,
       COALESCE(u.name, u.email, gm.pending_email, 'Convidado') AS attendee_label,
       COALESCE(u.email, gm.pending_email, '') AS attendee_email
     FROM gym_class_checkins gc
     JOIN gym_memberships gm ON gm.id = gc.gym_membership_id
     LEFT JOIN users u ON u.id = gm.user_id
     WHERE gc.session_id = ANY($1::int[])
     ORDER BY gc.created_at ASC`,
    [sessionIds],
  );

  const entriesBySessionId = new Map();
  for (const row of entriesRes.rows) {
    if (!entriesBySessionId.has(row.session_id)) entriesBySessionId.set(row.session_id, []);
    entriesBySessionId.get(row.session_id).push({
      id: row.id,
      sessionId: row.session_id,
      gymMembershipId: row.gym_membership_id,
      userId: row.user_id,
      source: row.source,
      status: row.status,
      checkedInAt: row.checked_in_at,
      canceledAt: row.canceled_at,
      cancelReason: row.cancel_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attendeeLabel: row.attendee_label,
      attendeeEmail: row.attendee_email,
      membershipRole: row.membership_role,
      membershipStatus: row.membership_status,
    });
  }

  return {
    sessions: sessions.map((session) => decorateSession(session, entriesBySessionId.get(session.id) || [])),
  };
}

export async function reserveGymClassSessionForMembership({
  sessionId,
  gymMembershipId,
  userId = null,
  source = 'athlete_app',
  status = 'reserved',
}) {
  const sessionRes = await pool.query(
    `SELECT *
     FROM gym_class_sessions
     WHERE id = $1
     LIMIT 1`,
    [sessionId],
  );
  const session = sessionRes.rows[0] || null;
  if (!session) {
    return { error: 'Sessão não encontrada', code: 404 };
  }
  if (session.status === 'canceled') {
    return { error: 'Sessão cancelada', code: 409 };
  }
  if (isCheckInClosed(session)) {
    return { error: 'Janela de check-in encerrada para esta sessão', code: 409 };
  }

  const membershipRes = await pool.query(
    `SELECT *
     FROM gym_memberships
     WHERE id = $1
       AND gym_id = $2
       AND status = 'active'
     LIMIT 1`,
    [gymMembershipId, session.gym_id],
  );
  const membership = membershipRes.rows[0] || null;
  if (!membership) {
    return { error: 'Membership inválida para esta sessão', code: 404 };
  }

  const blockedByCancellation = await findDailyCancellationBlock({
    gymId: session.gym_id,
    gymMembershipId,
    sessionStartsAt: session.starts_at,
  });
  if (blockedByCancellation) {
    return {
      error: 'Atleta com check-in cancelado hoje. Novo check-in bloqueado até o próximo dia.',
      code: 409,
    };
  }

  if (Number.isFinite(Number(session.capacity)) && session.capacity !== null) {
    const occupancyRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM gym_class_checkins
       WHERE session_id = $1
         AND status IN ('reserved', 'checked_in')`,
      [sessionId],
    );
    const occupied = Number(occupancyRes.rows[0]?.total || 0);
    const alreadyRes = await pool.query(
      `SELECT id
       FROM gym_class_checkins
       WHERE session_id = $1
         AND gym_membership_id = $2
       LIMIT 1`,
      [sessionId, gymMembershipId],
    );
    if (!alreadyRes.rows[0] && occupied >= Number(session.capacity)) {
      return { error: 'Sessão lotada', code: 409 };
    }
  }

  const upserted = await pool.query(
    `INSERT INTO gym_class_checkins (
       session_id, gym_membership_id, user_id, source, status, checked_in_at, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (session_id, gym_membership_id)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       source = EXCLUDED.source,
       status = EXCLUDED.status,
       checked_in_at = EXCLUDED.checked_in_at,
       canceled_at = NULL,
       cancel_reason = NULL,
       updated_at = NOW()
     RETURNING *`,
    [
      sessionId,
      gymMembershipId,
      userId,
      source,
      status,
      status === 'checked_in' ? new Date().toISOString() : null,
    ],
  );
  return { entry: upserted.rows[0] || null, session };
}

export async function markGymClassCheckIn({
  sessionId,
  gymMembershipId,
  userId = null,
  source = 'coach_portal',
}) {
  return reserveGymClassSessionForMembership({
    sessionId,
    gymMembershipId,
    userId,
    source,
    status: 'checked_in',
  });
}

export async function cancelGymClassCheckIn({
  sessionId,
  gymMembershipId,
  userId = null,
  source = 'coach_portal',
  reason = '',
}) {
  const sessionRes = await pool.query(
    `SELECT *
     FROM gym_class_sessions
     WHERE id = $1
     LIMIT 1`,
    [sessionId],
  );
  const session = sessionRes.rows[0] || null;
  if (!session) {
    return { error: 'Sessão não encontrada', code: 404 };
  }

  const updated = await pool.query(
    `INSERT INTO gym_class_checkins (
       session_id, gym_membership_id, user_id, source, status, checked_in_at, canceled_at, cancel_reason, updated_at
     )
     VALUES ($1,$2,$3,$4,'canceled',NULL,NOW(),$5,NOW())
     ON CONFLICT (session_id, gym_membership_id)
     DO UPDATE SET
       user_id = COALESCE(EXCLUDED.user_id, gym_class_checkins.user_id),
       source = EXCLUDED.source,
       status = 'canceled',
       checked_in_at = NULL,
       canceled_at = NOW(),
       cancel_reason = EXCLUDED.cancel_reason,
       updated_at = NOW()
     RETURNING *`,
    [sessionId, gymMembershipId, userId, source, String(reason || '').trim() || null],
  );

  return { entry: updated.rows[0] || null, session };
}

export async function findActiveGymMembership({ gymId, userId }) {
  const result = await pool.query(
    `SELECT *
     FROM gym_memberships
     WHERE gym_id = $1
       AND user_id = $2
       AND status = 'active'
     LIMIT 1`,
    [gymId, userId],
  );
  return result.rows[0] || null;
}

async function findDailyCancellationBlock({ gymId, gymMembershipId, sessionStartsAt }) {
  const result = await pool.query(
    `SELECT gc.id
     FROM gym_class_checkins gc
     JOIN gym_class_sessions gs ON gs.id = gc.session_id
     WHERE gs.gym_id = $1
       AND gc.gym_membership_id = $2
       AND gc.status = 'canceled'
       AND DATE(gs.starts_at AT TIME ZONE 'UTC') = DATE($3::timestamptz AT TIME ZONE 'UTC')
     LIMIT 1`,
    [gymId, gymMembershipId, sessionStartsAt],
  );
  return !!result.rows[0];
}

function isCheckInClosed(session) {
  const closeAt = session?.check_in_closes_at ? new Date(session.check_in_closes_at).getTime() : null;
  if (!Number.isFinite(closeAt)) return false;
  return Date.now() > closeAt;
}

function decorateSession(session, entries = []) {
  const checkedInCount = entries.filter((entry) => entry.status === 'checked_in').length;
  const reservedCount = entries.filter((entry) => entry.status === 'reserved').length;
  const canceledCount = entries.filter((entry) => entry.status === 'canceled').length;
  const activeEntries = entries.filter((entry) => entry.status === 'reserved' || entry.status === 'checked_in');

  return {
    ...session,
    entries,
    rules: {
      checkInClosed: isCheckInClosed(session),
      checkInClosesAt: session.check_in_closes_at || null,
      capacityReached: Number.isFinite(Number(session.capacity)) && session.capacity !== null
        ? activeEntries.length >= Number(session.capacity)
        : false,
    },
    summary: {
      totalEntries: entries.length,
      checkedInCount,
      reservedCount,
      canceledCount,
      availableSpots: Number.isFinite(session.capacity) && session.capacity !== null
        ? Math.max(0, Number(session.capacity) - activeEntries.length)
        : null,
    },
  };
}
