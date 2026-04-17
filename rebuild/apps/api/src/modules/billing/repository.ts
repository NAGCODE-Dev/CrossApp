import {
  buildDefaultOwnerSubscription,
  buildEntitlements,
  buildGymMembershipContext,
  computeRenewAt,
  normalizeSubscriptionPlanId,
  serializeSubscriptionStatus,
} from "@ryxen/domain";
import { pool } from "../../lib/db";

type SubscriptionRow = {
  id: number;
  user_id: number;
  plan_id: string | null;
  status: string | null;
  provider: string | null;
  renew_at: string | null;
  updated_at: string | null;
};

type MembershipRow = {
  gym_id: number;
  role: string;
  status: string;
  gym_name: string | null;
  owner_user_id: number;
};

function mapSubscription(row: SubscriptionRow | null | undefined) {
  if (!row) return null;
  return {
    planId: row.plan_id,
    status: row.status,
    provider: row.provider,
    renewAt: row.renew_at,
    updatedAt: row.updated_at,
  };
}

export async function getLatestSubscription(userId: number) {
  const result = await pool.query<SubscriptionRow>(
    `SELECT id, user_id, plan_id, status, provider, renew_at, updated_at
     FROM subscriptions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId],
  );

  return mapSubscription(result.rows[0] || null);
}

export async function getEntitlementsSnapshot(userId: number) {
  const [subscription, gymContexts] = await Promise.all([
    getLatestSubscription(userId),
    getGymContextsForUser(userId),
  ]);

  return {
    entitlements: buildEntitlements({
      subscription,
      gymContexts,
    }),
    subscription: serializeSubscriptionStatus(subscription),
    gymAccess: gymContexts.map((context) => ({
      gymId: context.gymId,
      gymName: context.gymName,
      role: context.role,
      status: context.status,
      canCoachManage: context.canCoachManage,
      canAthletesUseApp: context.canAthletesUseApp,
      warning: context.warning,
      accessTier: context.ownerSubscription.accessTier,
      daysRemaining: context.ownerSubscription.daysRemaining,
    })),
  };
}

export async function getGymContextsForUser(userId: number) {
  const membershipsRes = await pool.query<MembershipRow>(
    `SELECT
       gm.gym_id,
       gm.role,
       gm.status,
       g.name AS gym_name,
       g.owner_user_id
     FROM gym_memberships gm
     JOIN gyms g ON g.id = gm.gym_id
     WHERE gm.user_id = $1
     ORDER BY gm.created_at ASC`,
    [userId],
  );

  const memberships = membershipsRes.rows;
  if (!memberships.length) return [];

  const ownerUserIds = Array.from(
    new Set(memberships.map((membership) => membership.owner_user_id).filter(Number.isFinite)),
  );

  const subscriptionsByOwnerId = new Map<number, ReturnType<typeof mapSubscription>>();
  if (ownerUserIds.length) {
    const subscriptionsRes = await pool.query<SubscriptionRow>(
      `SELECT DISTINCT ON (user_id)
         id,
         user_id,
         plan_id,
         status,
         provider,
         renew_at,
         updated_at
       FROM subscriptions
       WHERE user_id = ANY($1::int[])
       ORDER BY user_id, updated_at DESC`,
      [ownerUserIds],
    );

    for (const row of subscriptionsRes.rows) {
      subscriptionsByOwnerId.set(row.user_id, mapSubscription(row));
    }
  }

  return memberships.map((membership) =>
    buildGymMembershipContext({
      gymId: membership.gym_id,
      gymName: membership.gym_name,
      role: membership.role,
      status: membership.status,
      ownerSubscription:
        subscriptionsByOwnerId.get(membership.owner_user_id) || buildDefaultOwnerSubscription(),
    }),
  );
}

export async function grantMockSubscription(input: {
  userId: number;
  planId: string;
  provider?: string;
  renewDays?: number;
}) {
  const planId = normalizeSubscriptionPlanId(input.planId);
  if (!planId) {
    throw new Error("planId invalido");
  }

  const renewDays = input.renewDays ?? 30;
  const latestRes = await pool.query<{ renew_at: string | null }>(
    `SELECT renew_at
     FROM subscriptions
     WHERE user_id = $1
     ORDER BY COALESCE(renew_at, NOW()) DESC, updated_at DESC
     LIMIT 1`,
    [input.userId],
  );

  const renewAt = computeRenewAt({
    currentRenewAt: latestRes.rows[0]?.renew_at || null,
    renewDays,
  });

  await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, status, provider, renew_at, updated_at)
     VALUES ($1,$2,'active',$3,$4,NOW())`,
    [input.userId, planId, String(input.provider || "mock"), renewAt],
  );

  const subscription = await getLatestSubscription(input.userId);
  return serializeSubscriptionStatus(subscription);
}

export async function createCheckoutIntent(input: {
  userId: number;
  planId: string;
  provider?: string;
  successUrl?: string;
}) {
  const planId = normalizeSubscriptionPlanId(input.planId);
  if (!planId) {
    throw new Error("planId invalido");
  }

  const provider = String(input.provider || "mock").trim().toLowerCase();
  if (provider !== "mock") {
    return {
      error:
        "Provider nao suportado no backend novo ainda. Use kiwify_link no frontend ou mock em desenvolvimento.",
    };
  }

  const renewAt = computeRenewAt({ renewDays: 30 });
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, status, provider, renew_at, updated_at)
     VALUES ($1,$2,'pending',$3,$4,NOW())`,
    [input.userId, planId, provider, renewAt],
  );

  return {
    checkoutUrl: input.successUrl || "http://localhost:8000",
    mode: provider,
  };
}

export async function getBillingStatusSnapshot(userId: number) {
  const subscription = await getLatestSubscription(userId);
  return serializeSubscriptionStatus(subscription);
}
