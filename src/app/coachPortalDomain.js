function createTimedCache() {
  return { key: '', value: null, task: null, snapshotAt: 0, networkAt: 0 };
}

function isFresh(cache, key, maxAgeMs) {
  return cache.key === key && cache.value && (Date.now() - cache.networkAt) < maxAgeMs;
}

export function createCoachPortalDomain({
  measureAsync,
  emptyCoachPortal,
  getSubscriptionStatus,
  getEntitlements,
  getMyGyms,
}) {
  let coachCache = createTimedCache();

  function invalidateCoachCache() {
    coachCache = createTimedCache();
  }

  function buildCacheEntry(cacheKey, value) {
    return {
      key: cacheKey,
      value,
      task: null,
      snapshotAt: Date.now(),
      networkAt: Date.now(),
    };
  }

  async function loadCoachSnapshot(profileEmail, selectedGymId, { force = false } = {}) {
    const email = String(profileEmail || '').trim().toLowerCase();
    if (!email) {
      return { ...emptyCoachPortal(), status: 'ready', error: '' };
    }

    const cacheKey = `${email}::${selectedGymId || 'default'}`;
    if (!force && isFresh(coachCache, cacheKey, 20000)) return coachCache.value;
    if (!force && coachCache.key === cacheKey && coachCache.task) return coachCache.task;

    coachCache.key = cacheKey;
    coachCache.task = (async () => {
      const [subscriptionResult, entitlementsResult, gymsResult] = await Promise.all([
        measureAsync('account.subscription', () => getSubscriptionStatus()),
        measureAsync('account.entitlements', () => getEntitlements()),
        measureAsync('account.gyms', () => getMyGyms()),
      ]);

      const gyms = gymsResult?.data?.gyms || [];
      const value = {
        subscription: subscriptionResult?.data || null,
        entitlements: entitlementsResult?.data?.entitlements || [],
        gymAccess: entitlementsResult?.data?.gymAccess || [],
        gyms,
        selectedGymId: selectedGymId || gyms[0]?.id || null,
        status: 'ready',
        error: '',
      };
      coachCache = buildCacheEntry(cacheKey, value);
      return value;
    })();

    return coachCache.task;
  }

  return {
    invalidateCoachCache,
    loadCoachSnapshot,
    peekCoachSnapshot(profileEmail, selectedGymId) {
      const email = String(profileEmail || '').trim().toLowerCase();
      if (!email) return null;
      const cacheKey = `${email}::${selectedGymId || 'default'}`;
      return coachCache.key === cacheKey && coachCache.value ? coachCache.value : null;
    },
    isCoachSnapshotFresh(profileEmail, selectedGymId) {
      const email = String(profileEmail || '').trim().toLowerCase();
      if (!email) return false;
      const cacheKey = `${email}::${selectedGymId || 'default'}`;
      return isFresh(coachCache, cacheKey, 20000);
    },
  };
}
