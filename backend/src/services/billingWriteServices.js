import { pool } from '../db.js';
import { grantSubscriptionToUser } from '../utils/subscriptionBilling.js';

export async function createPendingCheckoutSubscription({ userId, planId, provider }) {
  const inserted = await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, status, provider, updated_at)
     VALUES ($1,$2,'pending',$3,NOW())
     RETURNING id, user_id, plan_id, status, provider, renew_at, updated_at`,
    [userId, String(planId), String(provider)],
  );
  return inserted.rows[0] || null;
}

export async function activateDeveloperSubscription({ userId, planId = 'coach', provider = 'mock' }) {
  return grantSubscriptionToUser({
    userId,
    planId,
    provider,
    renewDays: 30,
  });
}
