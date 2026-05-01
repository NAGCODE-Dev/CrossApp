import express from 'express';

import { authOptional, authRequired } from '../auth.js';
import { canManageMembership, getMembershipForUser } from '../access.js';
import {
  createBenchmarkResult,
  getBenchmarkBySlug,
  getBenchmarkLeaderboard,
  getViewerBenchmarkResult,
  searchBenchmarkLibrary,
} from '../queries/leaderboardQueries.js';
import { normalizeSportType } from '../utils/sportType.js';

export function createBenchmarkRouter({ resolveBenchmarkOrder }) {
  const router = express.Router();

  router.get('/', authOptional, async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();
    const officialSource = String(req.query.source || '').trim().toLowerCase();
    const sort = String(req.query.sort || 'year_desc').trim().toLowerCase();
    const orderBy = resolveBenchmarkOrder(sort);
    const payload = await searchBenchmarkLibrary({
      limit,
      page,
      q,
      category,
      officialSource,
      orderBy,
    });
    return res.json(payload);
  });

  router.get('/:slug', authOptional, async (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const sportType = normalizeSportType(req.query?.sportType);
    const requestedGymId = req.query?.gymId !== undefined && req.query?.gymId !== '' ? Number(req.query.gymId) : null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 30);

    if (!slug) {
      return res.status(400).json({ error: 'slug é obrigatório' });
    }

    let viewerMembership = null;
    let effectiveGymId = Number.isFinite(requestedGymId) ? requestedGymId : null;
    if (Number.isFinite(effectiveGymId) && req.user?.userId) {
      viewerMembership = await getMembershipForUser(effectiveGymId, req.user.userId);
      if (!viewerMembership) {
        return res.status(404).json({ error: 'Gym não encontrado para este usuário' });
      }
    } else if (Number.isFinite(effectiveGymId) && !req.user?.userId) {
      effectiveGymId = null;
    }

    const benchmark = await getBenchmarkBySlug(slug);
    if (!benchmark) {
      return res.status(404).json({ error: 'Benchmark não encontrado' });
    }

    const leaderboardPayload = await getBenchmarkLeaderboard({
      slug,
      sportType,
      gymId: effectiveGymId,
      limit,
      showPrivateAthleteData: canManageMembership(viewerMembership),
    });
    const latestResult = req.user?.userId
      ? await getViewerBenchmarkResult({
        slug,
        userId: req.user.userId,
        sportType,
        gymId: effectiveGymId,
      })
      : null;

    return res.json({
      benchmark,
      leaderboard: leaderboardPayload?.results || [],
      viewerLatestResult: latestResult,
      viewerContext: {
        gymId: Number.isFinite(effectiveGymId) ? effectiveGymId : null,
        scopedToGym: Number.isFinite(effectiveGymId),
        canManageGym: canManageMembership(viewerMembership),
        authenticated: !!req.user?.userId,
      },
    });
  });

  router.post('/:slug/results', authRequired, async (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const sportType = normalizeSportType(req.body?.sportType);
    const gymId = req.body?.gymId !== undefined && req.body?.gymId !== '' ? Number(req.body.gymId) : null;
    const scoreDisplay = String(req.body?.scoreDisplay || '').trim();
    const notes = String(req.body?.notes || '').trim();

    if (!slug || !scoreDisplay) {
      return res.status(400).json({ error: 'slug e scoreDisplay são obrigatórios' });
    }

    if (Number.isFinite(gymId)) {
      const membership = await getMembershipForUser(gymId, req.user.userId);
      if (!membership) {
        return res.status(404).json({ error: 'Gym não encontrado para este usuário' });
      }
    }

    const created = await createBenchmarkResult({
      slug,
      userId: req.user.userId,
      gymId,
      sportType,
      scoreDisplay,
      notes,
    });

    if (!created) {
      return res.status(404).json({ error: 'Benchmark não encontrado' });
    }

    return res.json(created);
  });

  return router;
}
