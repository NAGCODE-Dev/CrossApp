import express from 'express';

import { pool } from '../db.js';
import { adminRequired, authRequired } from '../auth.js';

export function createAdminSyncRouter() {
  const router = express.Router();

  function normalizePlanId(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'coach') return 'pro';
    return ['starter', 'pro', 'performance'].includes(raw) ? raw : '';
  }

  router.post('/sync/push', authRequired, async (req, res) => {
    const { payload } = req.body || {};
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'payload inválido' });
    }

    const inserted = await pool.query(
      `INSERT INTO sync_snapshots (user_id, payload) VALUES ($1,$2) RETURNING id, created_at`,
      [req.user.userId, payload],
    );

    return res.json({ snapshotId: inserted.rows[0].id, savedAt: inserted.rows[0].created_at });
  });

  router.get('/sync/pull', authRequired, async (req, res) => {
    const found = await pool.query(
      `SELECT id, payload, created_at FROM sync_snapshots WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.userId],
    );

    const row = found.rows[0];
    if (!row) return res.json({ payload: null, snapshotId: null, savedAt: null });
    return res.json({ payload: row.payload, snapshotId: row.id, savedAt: row.created_at });
  });

  router.get('/sync/snapshots', authRequired, async (req, res) => {
    const rows = await pool.query(
      `SELECT id, created_at FROM sync_snapshots WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId],
    );

    return res.json({ snapshots: rows.rows.map((r) => ({ id: r.id, savedAt: r.created_at })) });
  });

  router.get('/admin/overview', adminRequired, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const q = String(req.query.q || '').trim().toLowerCase();
    const where = q ? `WHERE LOWER(email) LIKE $1 OR LOWER(COALESCE(name, '')) LIKE $1` : '';
    const params = q ? [`%${q}%`, limit] : [limit];
    const [usersCount, activeSubs, latestUsers] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM users`),
      pool.query(`SELECT COUNT(*)::int AS total FROM subscriptions WHERE status = 'active'`),
      pool.query(`
        SELECT id, email, name, is_admin, created_at
             , sub.plan_id AS subscription_plan
             , sub.status AS subscription_status
             , sub.provider AS subscription_provider
             , sub.renew_at AS subscription_renew_at
             , sub.updated_at AS subscription_updated_at
        FROM users
        LEFT JOIN LATERAL (
          SELECT plan_id, status, provider, renew_at, updated_at
          FROM subscriptions
          WHERE user_id = users.id
          ORDER BY updated_at DESC
          LIMIT 1
        ) sub ON TRUE
        ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length}
      `, params),
    ]);

    return res.json({
      stats: {
        users: usersCount.rows[0]?.total || 0,
        activeSubscriptions: activeSubs.rows[0]?.total || 0,
      },
      users: latestUsers.rows,
    });
  });

  router.post('/admin/subscriptions/activate', adminRequired, async (req, res) => {
    const userId = Number(req.body?.userId);
    const planId = normalizePlanId(req.body?.planId);
    const renewDays = Math.min(Math.max(Number(req.body?.renewDays) || 30, 1), 365);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'planId inválido' });
    }

    const userRes = await pool.query(
      `SELECT id, email, name, is_admin
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );

    const user = userRes.rows[0] || null;
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const renewAt = new Date(Date.now() + renewDays * 24 * 60 * 60 * 1000).toISOString();
    const inserted = await pool.query(
      `INSERT INTO subscriptions (user_id, plan_id, status, provider, renew_at, updated_at)
       VALUES ($1,$2,'active','kiwify_manual',$3,NOW())
       RETURNING id, user_id, plan_id, status, provider, renew_at, updated_at`,
      [userId, planId, renewAt],
    );

    return res.json({
      success: true,
      user,
      subscription: inserted.rows[0],
    });
  });

  return router;
}
