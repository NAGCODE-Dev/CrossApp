import express from 'express';

import { adminRequired } from '../auth.js';
import { logAdminAuditEvent } from '../adminAudit.js';
import { pool } from '../db.js';
import { grantSubscriptionToUser, normalizeSubscriptionPlanId, reprocessBillingClaim } from '../utils/subscriptionBilling.js';
import { getMailerHealth, getRecentEmailJobs, retryEmailJob } from '../mailer.js';
import { getRecentOpsEvents, logOpsEvent } from '../opsEvents.js';
import { KIWIFY_WEBHOOK_TOKEN, KIWIFY_CLIENT_ID, KIWIFY_CLIENT_SECRET } from '../config.js';
import { generateResetCode, hashResetCode } from '../passwordReset.js';
import {
  approvePasswordResetSupportRequest,
  denyPasswordResetSupportRequest,
  getPasswordResetSupportRequestStats,
  getRecentPasswordResetSupportRequests,
  getPasswordResetSupportRequestStatus,
} from '../passwordResetSupport.js';
import {
  deleteUserAccountNow,
  getPendingDeletionSummary,
  renderAccountDeletionResponseHtml,
  requestAccountDeletion,
  respondToAccountDeletionToken,
} from '../accountDeletion.js';

export function createAdminOpsRouter({
  adminMiddleware = adminRequired,
  auditLogger = logAdminAuditEvent,
  logOpsEventFn = logOpsEvent,
  retryEmailJobFn = retryEmailJob,
  reprocessBillingClaimFn = reprocessBillingClaim,
} = {}) {
  const router = express.Router();

  router.get('/account-deletions/respond', async (req, res) => {
    try {
      const token = String(req.query?.token || '').trim();
      const action = String(req.query?.action || '').trim().toLowerCase();
      if (!token) {
        return res.status(400).type('html').send(renderAccountDeletionResponseHtml({
          title: 'Link inválido',
          message: 'O link de exclusão é inválido ou expirou.',
        }));
      }

      const result = await respondToAccountDeletionToken({ token, action });
      if (result.outcome === 'cancelled' || result.outcome === 'already_cancelled') {
        return res.type('html').send(renderAccountDeletionResponseHtml({
          title: 'Conta preservada',
          message: 'A exclusão foi cancelada. Sua conta continuará ativa.',
        }));
      }

      if (result.outcome === 'deleted' || result.outcome === 'already_deleted') {
        return res.type('html').send(renderAccountDeletionResponseHtml({
          title: 'Conta excluída',
          message: 'A conta e os dados vinculados foram excluídos permanentemente.',
        }));
      }

      return res.type('html').send(renderAccountDeletionResponseHtml({
        title: 'Solicitação processada',
        message: 'A solicitação de exclusão foi processada.',
      }));
    } catch (error) {
      return res.status(400).type('html').send(renderAccountDeletionResponseHtml({
        title: 'Não foi possível processar',
        message: error?.message || 'O link de exclusão é inválido ou expirou.',
      }));
    }
  });

  router.get('/admin/overview', adminMiddleware, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const q = String(req.query.q || '').trim().toLowerCase();
    const verify = String(req.query.verify || '').trim() === '1';
    const where = q ? `WHERE LOWER(email) LIKE $1 OR LOWER(COALESCE(name, '')) LIKE $1` : '';
    const params = q ? [`%${q}%`, limit] : [limit];
    const [usersCount, activeSubs, pendingClaims, pendingDeletionCount, latestUsers, recentBillingClaims, recentOps, recentEmailJobs, mailerHealth, supportRequestStats, recentPasswordResetSupportRequests] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM users`),
      pool.query(`SELECT COUNT(*)::int AS total FROM subscriptions WHERE status = 'active'`),
      pool.query(`SELECT COUNT(*)::int AS total FROM billing_claims WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*)::int AS total FROM account_deletion_requests WHERE status = 'pending_confirmation'`),
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
      pool.query(`
        SELECT id, provider, external_ref, email, plan_id, status, payload, created_at, updated_at
        FROM billing_claims
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 12
      `),
      getRecentOpsEvents({ limit: 20 }),
      getRecentEmailJobs({ kind: 'password_reset', limit: 12 }),
      getMailerHealth({ verify }),
      getPasswordResetSupportRequestStats(),
      getRecentPasswordResetSupportRequests({ limit: 12 }),
    ]);
    const deletionByUserId = await getPendingDeletionSummary((latestUsers.rows || []).map((row) => row.id));
    const enrichedUsers = (latestUsers.rows || []).map((row) => ({
      ...row,
      pendingDeletion: deletionByUserId.get(Number(row.id)) || null,
    }));

    return res.json({
      stats: {
        users: usersCount.rows[0]?.total || 0,
        activeSubscriptions: activeSubs.rows[0]?.total || 0,
        pendingBillingClaims: pendingClaims.rows[0]?.total || 0,
        pendingAccountDeletions: pendingDeletionCount.rows[0]?.total || 0,
        pendingPasswordResetSupportRequests: Number(supportRequestStats?.pending || 0),
      },
      users: enrichedUsers,
      ops: {
        mailer: mailerHealth,
        billing: {
          webhookConfigured: !!KIWIFY_WEBHOOK_TOKEN,
          apiConfigured: !!(KIWIFY_CLIENT_ID && KIWIFY_CLIENT_SECRET),
        },
        recentEmailJobs,
        recentBillingClaims: recentBillingClaims.rows,
        recentOps: recentOps,
        recentPasswordResetSupportRequests: recentPasswordResetSupportRequests.map((request) => ({
          ...request,
          supportStatus: getPasswordResetSupportRequestStatus(request),
        })),
      },
    });
  });

  router.get('/admin/ops/health', adminMiddleware, async (req, res) => {
    const verify = String(req.query.verify || '').trim() === '1';
    const startedAt = Date.now();
    const [dbCheck, mailer] = await Promise.allSettled([
      pool.query('SELECT 1 AS ok'),
      getMailerHealth({ verify }),
    ]);

    const dbOk = dbCheck.status === 'fulfilled';
    const db = dbOk
      ? { ok: true }
      : { ok: false, error: dbCheck.reason?.message || String(dbCheck.reason) };
    const mailerHealth = mailer.status === 'fulfilled'
      ? mailer.value
      : { ok: false, mode: 'unknown', verified: verify, error: mailer.reason?.message || String(mailer.reason) };

    return res.json({
      ok: db.ok && !!mailerHealth.ok,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      db,
      mailer: mailerHealth,
      billing: {
        webhookConfigured: !!KIWIFY_WEBHOOK_TOKEN,
        apiConfigured: !!(KIWIFY_CLIENT_ID && KIWIFY_CLIENT_SECRET),
      },
    });
  });

  router.post('/admin/billing/claims/:claimId/reprocess', adminMiddleware, async (req, res) => {
    const claimId = Number(req.params.claimId);
    if (!Number.isFinite(claimId) || claimId <= 0) {
      return res.status(400).json({ error: 'claimId inválido' });
    }

    const result = await reprocessBillingClaimFn(claimId, { force: true });
    if (!result?.claim) {
      return res.status(404).json({ error: 'Claim não encontrada' });
    }

    await logOpsEventFn({
      kind: 'billing_claim_reprocess',
      status: result.applied ? 'applied' : 'pending',
      email: result.claim.email,
      userId: result.claim.applied_user_id || null,
      payload: {
        claimId,
        externalRef: result.claim.external_ref,
        planId: result.claim.plan_id,
      },
    });
    await auditLogger({
      req,
      action: 'billing.claim.reprocess',
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      targetUserId: result.claim.applied_user_id || null,
      targetEmail: result.claim.email || '',
      payload: {
        claimId,
        externalRef: result.claim.external_ref,
        applied: !!result.applied,
      },
    });

    return res.json({
      success: true,
      claim: result.claim,
      subscription: result.subscription,
      applied: !!result.applied,
    });
  });

  router.post('/admin/email/jobs/:jobId/retry', adminMiddleware, async (req, res) => {
    const jobId = Number(req.params.jobId);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ error: 'jobId inválido' });
    }

    const result = await retryEmailJobFn(jobId);
    if (!result?.job) {
      return res.status(404).json({ error: 'Job de email não encontrado' });
    }

    await logOpsEventFn({
      kind: 'email_job_retry',
      status: result.job.status,
      email: result.job.email,
      userId: result.job.userId,
      payload: {
        jobId,
        kind: result.job.kind,
        provider: result.job.provider,
        retryCount: result.job.retryCount,
      },
    });
    await auditLogger({
      req,
      action: 'email.job.retry',
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      targetUserId: result.job.userId || null,
      targetEmail: result.job.email || '',
      payload: {
        jobId,
        kind: result.job.kind,
        provider: result.job.provider,
        retryCount: result.job.retryCount,
      },
    });

    return res.json({
      success: true,
      job: result.job,
      delivery: {
        provider: result.provider || null,
        messageId: result.messageId || null,
        previewUrl: result.previewUrl || null,
      },
    });
  });

  router.post('/admin/users/:userId/password-reset/manual', adminMiddleware, async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    const userRes = await pool.query(
      `SELECT id, email, name
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );

    const user = userRes.rows[0] || null;
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const code = generateResetCode();
    const codeHash = hashResetCode(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await pool.query(
      `UPDATE password_reset_tokens
       SET consumed_at = NOW()
       WHERE user_id = $1
         AND consumed_at IS NULL`,
      [user.id],
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, code_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, codeHash, expiresAt],
    );

    await logOpsEvent({
      kind: 'password_reset_manual_release',
      status: 'created',
      userId: user.id,
      email: user.email,
      payload: { expiresAt },
    });
    await auditLogger({
      req,
      action: 'user.password_reset.manual_release',
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      targetUserId: user.id,
      targetEmail: user.email || '',
      payload: { expiresAt },
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
      },
      reset: {
        code,
        expiresAt,
      },
    });
  });

  router.post('/admin/password-reset-requests/:requestId/approve', adminMiddleware, async (req, res) => {
    const requestId = Number(req.params.requestId);
    const durationMinutes = Math.min(Math.max(Number(req.body?.durationMinutes) || 120, 5), 120);
    if (!Number.isFinite(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'requestId inválido' });
    }

    const request = await approvePasswordResetSupportRequest({
      requestId,
      approvedByUserId: req.user.userId,
      durationMinutes,
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    await logOpsEvent({
      kind: 'password_reset_support_request',
      status: 'approved',
      userId: request.user_id,
      email: request.email,
      payload: {
        requestId: request.id,
        approvedByUserId: req.user.userId,
        durationMinutes,
      },
    });
    await auditLogger({
      req,
      action: 'password_reset_support_request.approve',
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      targetUserId: request.user_id || null,
      targetEmail: request.email || '',
      payload: {
        requestId: request.id,
        durationMinutes,
      },
    });

    return res.json({
      success: true,
      request: {
        ...request,
        supportStatus: getPasswordResetSupportRequestStatus(request),
      },
    });
  });

  router.post('/admin/password-reset-requests/:requestId/deny', adminMiddleware, async (req, res) => {
    const requestId = Number(req.params.requestId);
    if (!Number.isFinite(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'requestId inválido' });
    }

    const request = await denyPasswordResetSupportRequest({
      requestId,
      deniedByUserId: req.user.userId,
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    await logOpsEvent({
      kind: 'password_reset_support_request',
      status: 'denied',
      userId: request.user_id,
      email: request.email,
      payload: { requestId: request.id, deniedByUserId: req.user.userId },
    });
    await auditLogger({
      req,
      action: 'password_reset_support_request.deny',
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      targetUserId: request.user_id || null,
      targetEmail: request.email || '',
      payload: {
        requestId: request.id,
      },
    });

    return res.json({
      success: true,
      request: {
        ...request,
        supportStatus: getPasswordResetSupportRequestStatus(request),
      },
    });
  });

  router.post('/admin/subscriptions/activate', adminMiddleware, async (req, res) => {
    const userId = Number(req.body?.userId);
    const planId = normalizeSubscriptionPlanId(req.body?.planId);
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

    const subscription = await grantSubscriptionToUser({
      userId,
      planId,
      provider: 'kiwify_manual',
      renewDays,
    });
    await auditLogger({
      req,
      action: 'subscription.activate_manual',
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      targetUserId: user.id,
      targetEmail: user.email || '',
      payload: {
        planId,
        renewDays,
        subscriptionId: subscription.id,
      },
    });

    return res.json({
      success: true,
      user,
      subscription,
    });
  });

  router.post('/admin/users/:userId/account-deletion/request', adminMiddleware, async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    const result = await requestAccountDeletion({
      userId,
      requestedByUserId: req.user.userId,
      reason: 'admin_request',
    });
    await auditLogger({
      req,
      action: 'account_deletion.request',
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      targetUserId: result.user.id,
      targetEmail: result.user.email || '',
      payload: {
        requestId: result.request?.id || null,
        reused: !!result.reused,
      },
    });

    return res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name || null,
      },
      request: result.request,
      reused: !!result.reused,
    });
  });

  router.post('/admin/users/:userId/account-deletion/delete-now', adminMiddleware, async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    const result = await deleteUserAccountNow({
      userId,
      requestedByUserId: req.user.userId,
      source: 'admin_immediate',
    });
    await auditLogger({
      req,
      action: 'account_deletion.delete_now',
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      targetUserId: userId,
      targetEmail: result.deleted?.email || '',
      payload: {
        source: result.deleted?.source || 'admin_immediate',
      },
    });

    return res.json({
      success: true,
      deleted: result.deleted,
    });
  });

  return router;
}
