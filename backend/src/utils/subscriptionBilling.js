import { pool } from '../db.js';
import { normalizeEmail } from '../devAccess.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeSubscriptionPlanId(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'coach') return 'pro';
  if (raw === 'athlete plus' || raw === 'athlete-plus' || raw === 'athleteplus' || raw === 'plus') {
    return 'athlete_plus';
  }
  if (['starter', 'pro', 'performance', 'athlete_plus'].includes(raw)) return raw;
  return '';
}

export function normalizeCoachPlanId(value) {
  const normalized = normalizeSubscriptionPlanId(value);
  return ['starter', 'pro', 'performance'].includes(normalized) ? normalized : '';
}

export function computeRenewAt({ currentRenewAt = null, renewDays = 30 } = {}) {
  const now = Date.now();
  const currentTime = currentRenewAt ? new Date(currentRenewAt).getTime() : 0;
  const baseTime = Number.isFinite(currentTime) && currentTime > now ? currentTime : now;
  return new Date(baseTime + renewDays * DAY_MS).toISOString();
}

export async function grantSubscriptionToUser({
  userId,
  planId,
  provider,
  renewDays = 30,
  claimId = null,
  client = null,
}) {
  const normalizedPlanId = normalizeSubscriptionPlanId(planId);
  if (!normalizedPlanId) {
    throw new Error('planId inválido');
  }

  const db = client || pool;
  const latestRes = await db.query(
    `SELECT renew_at
     FROM subscriptions
     WHERE user_id = $1
     ORDER BY COALESCE(renew_at, NOW()) DESC, updated_at DESC
     LIMIT 1`,
    [userId],
  );

  const renewAt = computeRenewAt({
    currentRenewAt: latestRes.rows[0]?.renew_at || null,
    renewDays,
  });

  const inserted = await db.query(
    `INSERT INTO subscriptions (user_id, plan_id, status, provider, renew_at, updated_at)
     VALUES ($1,$2,'active',$3,$4,NOW())
     RETURNING id, user_id, plan_id, status, provider, renew_at, updated_at`,
    [userId, normalizedPlanId, String(provider || 'manual'), renewAt],
  );

  const subscription = inserted.rows[0];

  if (claimId) {
    await db.query(
      `UPDATE billing_claims
       SET status = 'applied',
           applied_user_id = $2,
           applied_subscription_id = $3,
           renew_at = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [claimId, userId, subscription.id, renewAt],
    );
  }

  return subscription;
}

export async function attachPendingBillingClaimsToUser(userId, email, client = null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const db = client || pool;
  const pendingRes = await db.query(
    `SELECT id, plan_id, renew_days
     FROM billing_claims
     WHERE email = $1 AND status = 'pending'
     ORDER BY created_at ASC`,
    [normalized],
  );

  const applied = [];
  for (const claim of pendingRes.rows) {
    const subscription = await grantSubscriptionToUser({
      userId,
      planId: claim.plan_id,
      provider: 'kiwify_webhook',
      renewDays: Number(claim.renew_days) || 30,
      claimId: claim.id,
      client: db,
    });
    applied.push(subscription);
  }

  return applied;
}

export async function queueBillingClaim({
  provider,
  externalRef,
  email,
  planId,
  renewDays = 30,
  payload = {},
}) {
  const normalized = normalizeEmail(email);
  const normalizedPlanId = normalizeSubscriptionPlanId(planId);
  if (!normalized) {
    throw new Error('email inválido');
  }
  if (!normalizedPlanId) {
    throw new Error('planId inválido');
  }
  if (!externalRef) {
    throw new Error('externalRef é obrigatório');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      `SELECT *
       FROM billing_claims
       WHERE provider = $1 AND external_ref = $2
       LIMIT 1`,
      [provider, externalRef],
    );

    const duplicate = !!existingRes.rows[0];
    let claim = existingRes.rows[0] || null;

    if (!claim) {
      const insertedRes = await client.query(
        `INSERT INTO billing_claims (
           provider, external_ref, email, plan_id, renew_days, payload, status, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,'pending',NOW())
         RETURNING *`,
        [provider, externalRef, normalized, normalizedPlanId, renewDays, JSON.stringify(payload || {})],
      );
      claim = insertedRes.rows[0];
    }

    let appliedSubscription = null;

    if (claim.status !== 'applied') {
      const userRes = await client.query(
        `SELECT id
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [normalized],
      );

      const user = userRes.rows[0] || null;
      if (user) {
        appliedSubscription = await grantSubscriptionToUser({
          userId: user.id,
          planId: claim.plan_id,
          provider: 'kiwify_webhook',
          renewDays: Number(claim.renew_days) || renewDays,
          claimId: claim.id,
          client,
        });
      }
    }

    await client.query('COMMIT');
    return {
      claim,
      subscription: appliedSubscription,
      applied: !!appliedSubscription || claim.status === 'applied',
      duplicate,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
