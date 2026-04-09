import { randomUUID } from 'node:crypto';

import { pool } from './db.js';
import { normalizeEmail } from './devAccess.js';

const SUPPORT_REQUEST_TTL_MS = 2 * 60 * 60 * 1000;

export async function createPasswordResetSupportRequest({ userId, email, error = null, source = 'email_delivery_failed', payload = {} }) {
  const normalizedEmail = normalizeEmail(email);
  if (!userId || !normalizedEmail) return null;

  const active = await pool.query(
    `SELECT id, user_id, email, request_key, status, source, last_error, payload, expires_at, approved_at, denied_at, completed_at, created_at, updated_at
     FROM password_reset_support_requests
     WHERE user_id = $1
       AND email = $2
       AND status IN ('pending', 'approved')
       AND completed_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, normalizedEmail],
  );

  const existing = active.rows[0] || null;
  const nextPayload = payload && typeof payload === 'object' ? payload : {};
  const lastError = error?.message || error?.code || null;

  if (existing?.status === 'pending') {
    const updated = await pool.query(
      `UPDATE password_reset_support_requests
       SET last_error = $2,
           payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, email, request_key, status, source, last_error, payload, expires_at, approved_at, denied_at, completed_at, created_at, updated_at`,
      [existing.id, lastError, JSON.stringify(nextPayload)],
    );
    return updated.rows[0] || existing;
  }

  const expiresAt = new Date(Date.now() + SUPPORT_REQUEST_TTL_MS).toISOString();
  const inserted = await pool.query(
    `INSERT INTO password_reset_support_requests (
        user_id,
        email,
        request_key,
        status,
        source,
        last_error,
        payload,
        expires_at
      )
      VALUES ($1, $2, $3, 'pending', $4, $5, $6::jsonb, $7)
      RETURNING id, user_id, email, request_key, status, source, last_error, payload, expires_at, approved_at, denied_at, completed_at, created_at, updated_at`,
    [userId, normalizedEmail, randomUUID(), source, lastError, JSON.stringify(nextPayload), expiresAt],
  );
  return inserted.rows[0] || null;
}

export async function getPasswordResetSupportRequestByKey({ email, requestKey }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedKey = String(requestKey || '').trim();
  if (!normalizedEmail || !normalizedKey) return null;

  const result = await pool.query(
    `SELECT id, user_id, email, request_key, status, source, last_error, payload, expires_at, approved_at, denied_at, completed_at, created_at, updated_at
     FROM password_reset_support_requests
     WHERE email = $1
       AND request_key = $2
     LIMIT 1`,
    [normalizedEmail, normalizedKey],
  );
  return result.rows[0] || null;
}

export async function approvePasswordResetSupportRequest({ requestId, approvedByUserId }) {
  const result = await pool.query(
    `UPDATE password_reset_support_requests
     SET status = 'approved',
         approved_by_user_id = $2,
         denied_by_user_id = NULL,
         approved_at = NOW(),
         denied_at = NULL,
         updated_at = NOW(),
         expires_at = GREATEST(expires_at, NOW() + INTERVAL '2 hours')
     WHERE id = $1
     RETURNING id, user_id, email, request_key, status, source, last_error, payload, expires_at, approved_at, denied_at, completed_at, created_at, updated_at`,
    [requestId, approvedByUserId || null],
  );
  return result.rows[0] || null;
}

export async function denyPasswordResetSupportRequest({ requestId, deniedByUserId }) {
  const result = await pool.query(
    `UPDATE password_reset_support_requests
     SET status = 'denied',
         denied_by_user_id = $2,
         approved_by_user_id = NULL,
         denied_at = NOW(),
         approved_at = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, user_id, email, request_key, status, source, last_error, payload, expires_at, approved_at, denied_at, completed_at, created_at, updated_at`,
    [requestId, deniedByUserId || null],
  );
  return result.rows[0] || null;
}

export async function completePasswordResetSupportRequest({ requestId }) {
  const result = await pool.query(
    `UPDATE password_reset_support_requests
     SET status = 'completed',
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, user_id, email, request_key, status, source, last_error, payload, expires_at, approved_at, denied_at, completed_at, created_at, updated_at`,
    [requestId],
  );
  return result.rows[0] || null;
}

export async function getRecentPasswordResetSupportRequests({ limit = 12, status = null } = {}) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
  const params = [];
  const where = [];

  if (status) {
    params.push(String(status));
    where.push(`status = $${params.length}`);
  }

  params.push(boundedLimit);
  const result = await pool.query(
    `SELECT req.id, req.user_id, req.email, req.request_key, req.status, req.source, req.last_error, req.payload, req.expires_at, req.approved_at, req.denied_at, req.completed_at, req.created_at, req.updated_at,
            user_row.name AS user_name,
            approver.email AS approved_by_email,
            denier.email AS denied_by_email
     FROM password_reset_support_requests req
     LEFT JOIN users user_row ON user_row.id = req.user_id
     LEFT JOIN users approver ON approver.id = req.approved_by_user_id
     LEFT JOIN users denier ON denier.id = req.denied_by_user_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY req.created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return result.rows;
}

export async function getPasswordResetSupportRequestStats() {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > NOW())::int AS pending,
       COUNT(*) FILTER (WHERE status = 'approved' AND expires_at > NOW())::int AS approved,
       COUNT(*) FILTER (WHERE status = 'denied')::int AS denied
     FROM password_reset_support_requests`,
  );
  return result.rows[0] || { pending: 0, approved: 0, denied: 0 };
}

export function getPasswordResetSupportRequestStatus(request) {
  if (!request) return 'missing';
  if (request.status === 'completed') return 'completed';
  if (request.status === 'denied') return 'denied';
  if (request.expires_at && new Date(request.expires_at).getTime() <= Date.now()) return 'expired';
  if (request.status === 'approved') return 'approved';
  return 'pending';
}
