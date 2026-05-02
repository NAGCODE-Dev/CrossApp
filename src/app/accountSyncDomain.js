export function createAccountSyncDomain({
  getState,
  setState,
  windowObject,
  navigatorObject,
  prefsStorage,
  activeWeekStorage,
  pdfStorage,
  pdfMetaStorage,
  dayOverrideStorage,
  PDF_KEY,
  METADATA_KEY,
  APP_STATE_SYNC_KEY,
  SYNC_OUTBOX_KEY,
  handleGetProfile,
  handleGetAppStateSnapshot,
  handleSaveAppStateSnapshot,
  handleGetImportedPlanSnapshot,
  handleSaveImportedPlanSnapshot,
  remoteHandleSyncAthleteMeasurementsSnapshot,
  remoteHandleSyncAthletePrSnapshot,
  loadParsedWeeks,
  selectActiveWeek,
  setCustomDay,
  resetToAutoDay,
  logDebug,
}) {
  let appStateSyncTimer = null;
  let onlineSyncListenerBound = false;
  let syncStatusEmitterBound = false;
  let lastSyncError = '';
  let lastSuccessfulSyncAt = '';
  let flushingPendingSync = false;

  function normalizeStorageKeys(keys) {
    return Array.isArray(keys) ? keys.filter(Boolean) : [keys].filter(Boolean);
  }

  function readLocalJson(keys, fallbackValue) {
    try {
      for (const key of normalizeStorageKeys(keys)) {
        const raw = windowObject.localStorage.getItem(key);
        if (!raw) continue;
        return JSON.parse(raw);
      }
      return fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  function writeLocalJson(keys, value) {
    try {
      const serialized = JSON.stringify(value);
      normalizeStorageKeys(keys).forEach((key) => {
        windowObject.localStorage.setItem(key, serialized);
      });
    } catch {
      // no-op
    }
  }

  async function syncImportedPlanToAccount(weeks, metadata = {}) {
    const profile = handleGetProfile()?.data || null;
    if (!profile?.id || !Array.isArray(weeks) || !weeks.length) {
      return { success: false, skipped: true };
    }

    try {
      const currentState = getState();
      await handleSaveImportedPlanSnapshot({
        weeks,
        metadata,
        activeWeekNumber: currentState.activeWeekNumber || weeks[0]?.weekNumber || null,
      });
      return { success: true };
    } catch (error) {
      console.warn('Falha ao sincronizar plano importado para a conta:', error?.message || error);
      return { success: false, error };
    }
  }

  function bindOnlineSyncListener() {
    if (onlineSyncListenerBound || !windowObject) return;
    onlineSyncListenerBound = true;
    windowObject.addEventListener('online', () => {
      Promise.allSettled([
        flushPendingAppStateSync(),
        flushPendingSyncOutbox(),
      ])
        .catch(() => {})
        .finally(() => {
          emitSyncStatus();
        });
    });
  }

  function scheduleAppStateSync(partial = null) {
    clearTimeout(appStateSyncTimer);
    appStateSyncTimer = setTimeout(() => {
      saveRemoteAppStateSnapshot(partial).catch((error) => {
        console.warn('Falha ao sincronizar estado do app:', error?.message || error);
      });
    }, 350);
  }

  function buildCurrentAppStateSnapshot(partial = null) {
    const state = getState();
    const normalizedPartial = partial && typeof partial === 'object' ? partial : {};
    return {
      core: {
        activeWeekNumber: state.activeWeekNumber || null,
        currentDay: state.currentDay || null,
        daySource: hasCustomDayOverride() ? 'manual' : 'auto',
        preferences: {
          showLbsConversion: state.preferences?.showLbsConversion !== false,
          autoConvertLbs: state.preferences?.autoConvertLbs !== false,
          showEmojis: state.preferences?.showEmojis !== false,
          showGoals: state.preferences?.showGoals !== false,
          showNyxHints: state.preferences?.showNyxHints !== false,
          nyxGuideCompleted: state.preferences?.nyxGuideCompleted === true,
          workoutPriority: String(state.preferences?.workoutPriority || 'uploaded'),
          theme: String(state.preferences?.theme || 'dark'),
          accentTone: String(state.preferences?.accentTone || 'blue'),
          interfaceDensity: String(state.preferences?.interfaceDensity || 'comfortable'),
          reduceMotion: state.preferences?.reduceMotion === true,
        },
      },
      ...(normalizedPartial.ui && typeof normalizedPartial.ui === 'object'
        ? { ui: normalizedPartial.ui }
        : {}),
    };
  }

  async function saveRemoteAppStateSnapshot(partial = null) {
    const profile = handleGetProfile()?.data || null;
    const snapshot = mergeAppStateSnapshot(loadLocalAppStateEnvelope()?.snapshot || {}, buildCurrentAppStateSnapshot(partial));
    const envelope = {
      snapshot,
      updatedAt: new Date().toISOString(),
      pendingSync: true,
    };

    persistLocalAppStateEnvelope(envelope);
    emitSyncStatus();

    if (!profile?.id || !navigatorObject?.onLine) {
      return { success: false, queued: true, requiresAuth: !profile?.id };
    }

    const result = await handleSaveAppStateSnapshot(envelope);
    lastSyncError = '';
    lastSuccessfulSyncAt = result?.data?.appState?.updatedAt || new Date().toISOString();
    persistLocalAppStateEnvelope({
      snapshot: mergeAppStateSnapshot(snapshot, result?.data?.appState?.snapshot || {}),
      updatedAt: lastSuccessfulSyncAt || envelope.updatedAt,
      pendingSync: false,
    });
    emitSyncStatus();
    return { success: true };
  }

  async function restoreAppStateFromAccount(options = {}) {
    const profile = handleGetProfile()?.data || null;
    if (!profile?.id) {
      return { success: false, skipped: true };
    }

    const localEnvelope = loadLocalAppStateEnvelope();

    try {
      const response = await handleGetAppStateSnapshot();
      const remoteAppState = response?.data?.appState || null;

      if (!remoteAppState?.snapshot) {
        if (localEnvelope?.snapshot && navigatorObject?.onLine) {
          await flushPendingAppStateSync();
        }
        return { success: true, restored: false };
      }

      const localUpdatedAt = Date.parse(localEnvelope?.updatedAt || 0);
      const remoteUpdatedAt = Date.parse(remoteAppState.updatedAt || 0);
      const shouldRestore = options.force === true
        || !localEnvelope?.snapshot
        || (Number.isFinite(remoteUpdatedAt) && remoteUpdatedAt >= localUpdatedAt);

      if (!shouldRestore) {
        await flushPendingAppStateSync();
        return { success: true, restored: false, keptLocal: true };
      }

      await applyRemoteAppStateSnapshot(remoteAppState.snapshot || {});
      persistLocalAppStateEnvelope({
        snapshot: mergeAppStateSnapshot(localEnvelope?.snapshot || {}, remoteAppState.snapshot || {}),
        updatedAt: remoteAppState.updatedAt || new Date().toISOString(),
        pendingSync: false,
      });
      lastSyncError = '';
      lastSuccessfulSyncAt = remoteAppState.updatedAt || new Date().toISOString();
      emitSyncStatus();
      return { success: true, restored: true };
    } catch (error) {
      lastSyncError = error?.message || 'Falha ao restaurar estado da conta';
      emitSyncStatus();
      console.warn('Falha ao restaurar estado sincronizado da conta:', error?.message || error);
      return { success: false, error };
    }
  }

  async function applyRemoteAppStateSnapshot(snapshot = {}) {
    const core = snapshot?.core && typeof snapshot.core === 'object' ? snapshot.core : {};
    const preferences = core.preferences && typeof core.preferences === 'object' ? core.preferences : null;

    if (preferences) {
      const mergedPreferences = {
        ...getState().preferences,
        ...preferences,
      };
      setState({ preferences: mergedPreferences });
      await prefsStorage.set('preferences', mergedPreferences);
    }

    const remoteWeek = Number(core.activeWeekNumber) || null;
    if (remoteWeek) {
      await activeWeekStorage.set('active-week', remoteWeek);
      if (getState().weeks?.length) {
        await selectActiveWeek(remoteWeek);
      } else {
        setState({ activeWeekNumber: remoteWeek });
      }
    }

    const remoteDay = String(core.currentDay || '').trim();
    const daySource = String(core.daySource || 'auto').trim().toLowerCase();
    if (daySource === 'manual' && remoteDay) {
      await setCustomDay(remoteDay);
    } else if (daySource === 'auto') {
      await resetToAutoDay();
    }
  }

  async function flushPendingAppStateSync() {
    const profile = handleGetProfile()?.data || null;
    if (!profile?.id || !navigatorObject?.onLine) return { success: false, skipped: true };
    const envelope = loadLocalAppStateEnvelope();
    if (!envelope?.snapshot) return { success: false, skipped: true };

    try {
      const result = await handleSaveAppStateSnapshot(envelope);
      lastSyncError = '';
      lastSuccessfulSyncAt = result?.data?.appState?.updatedAt || new Date().toISOString();
      persistLocalAppStateEnvelope({
        snapshot: mergeAppStateSnapshot(envelope.snapshot, result?.data?.appState?.snapshot || {}),
        updatedAt: lastSuccessfulSyncAt || envelope.updatedAt,
        pendingSync: false,
      });
      emitSyncStatus();
      return { success: true };
    } catch (error) {
      lastSyncError = error?.message || 'Falha ao sincronizar estado do app';
      persistLocalAppStateEnvelope({
        ...envelope,
        pendingSync: true,
      });
      emitSyncStatus();
      throw error;
    }
  }

  async function syncAthletePrSnapshotWithQueue(prs) {
    const profile = handleGetProfile()?.data || null;
    if (!profile?.id) return { success: false, skipped: true };
    const payload = prs && typeof prs === 'object' ? prs : {};

    if (!navigatorObject?.onLine) {
      queueSyncOutboxItem('pr_snapshot', payload);
      emitSyncStatus();
      return { success: false, queued: true };
    }

    try {
      const result = await remoteHandleSyncAthletePrSnapshot(payload);
      dequeueSyncOutboxItem('pr_snapshot');
      lastSyncError = '';
      lastSuccessfulSyncAt = new Date().toISOString();
      emitSyncStatus();
      return result;
    } catch (error) {
      recordSyncOutboxFailure('pr_snapshot', payload, error);
      lastSyncError = error?.message || 'Falha ao sincronizar PRs';
      emitSyncStatus();
      return { success: false, queued: true, error };
    }
  }

  async function syncAthleteMeasurementsSnapshotWithQueue(measurements) {
    const profile = handleGetProfile()?.data || null;
    if (!profile?.id) return { success: false, skipped: true };
    const payload = Array.isArray(measurements) ? measurements : [];

    if (!navigatorObject?.onLine) {
      queueSyncOutboxItem('measurement_snapshot', payload);
      emitSyncStatus();
      return { success: false, queued: true };
    }

    try {
      const result = await remoteHandleSyncAthleteMeasurementsSnapshot(payload);
      dequeueSyncOutboxItem('measurement_snapshot');
      lastSyncError = '';
      lastSuccessfulSyncAt = new Date().toISOString();
      emitSyncStatus();
      return result;
    } catch (error) {
      recordSyncOutboxFailure('measurement_snapshot', payload, error);
      lastSyncError = error?.message || 'Falha ao sincronizar medidas';
      emitSyncStatus();
      return { success: false, queued: true, error };
    }
  }

  async function flushPendingSyncOutbox() {
    const profile = handleGetProfile()?.data || null;
    if (!profile?.id || !navigatorObject?.onLine) return { success: false, skipped: true };

    const outbox = readSyncOutbox();
    const prSnapshot = outbox.find((item) => item.kind === 'pr_snapshot');
    const measurementSnapshot = outbox.find((item) => item.kind === 'measurement_snapshot');

    if (!prSnapshot && !measurementSnapshot) {
      return { success: false, skipped: true };
    }

    const failures = [];

    if (prSnapshot) {
      try {
        await remoteHandleSyncAthletePrSnapshot(prSnapshot.payload || {});
        dequeueSyncOutboxItem('pr_snapshot');
      } catch (error) {
        recordSyncOutboxFailure('pr_snapshot', prSnapshot.payload || {}, error);
        failures.push({ kind: 'pr_snapshot', error });
      }
    }

    if (measurementSnapshot) {
      try {
        await remoteHandleSyncAthleteMeasurementsSnapshot(Array.isArray(measurementSnapshot.payload) ? measurementSnapshot.payload : []);
        dequeueSyncOutboxItem('measurement_snapshot');
      } catch (error) {
        recordSyncOutboxFailure('measurement_snapshot', Array.isArray(measurementSnapshot.payload) ? measurementSnapshot.payload : [], error);
        failures.push({ kind: 'measurement_snapshot', error });
      }
    }

    if (failures.length) {
      lastSyncError = failures[0]?.error?.message || 'Falha ao sincronizar pendências';
      emitSyncStatus();
      return { success: false, queued: true, failures };
    }

    lastSyncError = '';
    lastSuccessfulSyncAt = new Date().toISOString();
    emitSyncStatus();
    return { success: true };
  }

  async function restoreImportedPlanFromAccount(options = {}) {
    const profile = handleGetProfile()?.data || null;
    if (!profile?.id) {
      return { success: false, skipped: true };
    }

    try {
      const response = await handleGetImportedPlanSnapshot();
      const importedPlan = response?.data?.importedPlan || null;
      if (!importedPlan?.weeks?.length) {
        return { success: true, restored: false };
      }

      const localResult = await loadParsedWeeks();
      const localMetadata = localResult.success ? (localResult.data?.metadata || {}) : {};
      const localUpdatedAt = Date.parse(localMetadata?.uploadedAt || 0);
      const remoteUpdatedAt = Date.parse(importedPlan.updatedAt || importedPlan.metadata?.uploadedAt || 0);
      const shouldRestore = options.force === true
        || !localResult.success
        || (Number.isFinite(remoteUpdatedAt) && remoteUpdatedAt > localUpdatedAt);

      if (!shouldRestore) {
        return { success: true, restored: false, skipped: true };
      }

      const metadata = {
        ...(importedPlan.metadata || {}),
        uploadedAt: importedPlan.updatedAt || importedPlan.metadata?.uploadedAt || new Date().toISOString(),
        source: importedPlan.metadata?.source || 'account-sync',
        remoteSynced: true,
      };

      await pdfStorage.set(PDF_KEY, importedPlan.weeks);
      await pdfMetaStorage.set(METADATA_KEY, metadata);

      const preferredWeek = importedPlan.activeWeekNumber || importedPlan.weeks[0]?.weekNumber || null;
      if (preferredWeek) {
        await activeWeekStorage.set('active-week', preferredWeek);
      } else {
        await activeWeekStorage.remove('active-week');
      }

      setState({
        weeks: importedPlan.weeks,
        activeWeekNumber: preferredWeek,
      });

      if (getState().currentDay) {
        await selectActiveWeek(preferredWeek || importedPlan.weeks[0]?.weekNumber);
      }

      return { success: true, restored: true };
    } catch (error) {
      console.warn('Falha ao restaurar plano importado da conta:', error?.message || error);
      return { success: false, error };
    }
  }

  function readSyncOutbox() {
    const parsed = readLocalJson(SYNC_OUTBOX_KEY, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function writeSyncOutbox(items) {
    writeLocalJson(SYNC_OUTBOX_KEY, Array.isArray(items) ? items : []);
  }

  function queueSyncOutboxItem(kind, payload) {
    const previous = readSyncOutbox().find((item) => item?.kind === kind);
    const items = readSyncOutbox().filter((item) => item?.kind !== kind);
    const isSamePayload = previous && getSyncPayloadSignature(previous?.payload) === getSyncPayloadSignature(payload);
    items.push({
      kind,
      payload,
      updatedAt: isSamePayload && previous?.updatedAt ? previous.updatedAt : new Date().toISOString(),
      attempts: isSamePayload && Number.isFinite(Number(previous?.attempts)) ? Number(previous.attempts) : 0,
      lastFailedAt: isSamePayload && typeof previous?.lastFailedAt === 'string' ? previous.lastFailedAt : '',
      lastFailureMessage: isSamePayload && typeof previous?.lastFailureMessage === 'string' ? previous.lastFailureMessage : '',
    });
    writeSyncOutbox(items);
  }

  function dequeueSyncOutboxItem(kind) {
    const items = readSyncOutbox().filter((item) => item?.kind !== kind);
    writeSyncOutbox(items);
  }

  function loadLocalAppStateEnvelope() {
    return readLocalJson(APP_STATE_SYNC_KEY, null);
  }

  function persistLocalAppStateEnvelope(envelope) {
    writeLocalJson(APP_STATE_SYNC_KEY, envelope || {});
  }

  function recordSyncOutboxFailure(kind, payload, error) {
    const normalizedKind = String(kind || '').trim();
    if (!normalizedKind) return;
    const previous = readSyncOutbox().find((item) => item?.kind === normalizedKind);
    const items = readSyncOutbox().filter((item) => item?.kind !== normalizedKind);
    items.push({
      kind: normalizedKind,
      payload,
      updatedAt: previous?.updatedAt || new Date().toISOString(),
      attempts: (Number.isFinite(Number(previous?.attempts)) ? Number(previous.attempts) : 0) + 1,
      lastFailedAt: new Date().toISOString(),
      lastFailureMessage: error?.message || 'Falha ao sincronizar item',
    });
    writeSyncOutbox(items);
  }

  function getPendingSyncStatus() {
    const profile = handleGetProfile()?.data || null;
    const envelope = loadLocalAppStateEnvelope();
    const outbox = readSyncOutbox();
    const pendingAppState = envelope?.pendingSync === true;
    const pendingOutboxCount = outbox.length;
    const pendingItems = outbox
      .map(describePendingSyncItem)
      .filter(Boolean)
      .sort(comparePendingSyncItemsByAge)
      .map((item, index) => ({
        ...item,
        isOldest: index === 0,
      }));

    return {
      online: navigatorObject?.onLine !== false,
      isAuthenticated: !!profile?.id,
      pendingAppState,
      pendingOutboxCount,
      pendingTotal: (pendingAppState ? 1 : 0) + pendingOutboxCount,
      pendingKinds: outbox.map((item) => String(item?.kind || '')).filter(Boolean),
      pendingItems,
      oldestPendingAt: pendingItems[0]?.updatedAt || '',
      lastSyncAt: lastSuccessfulSyncAt || envelope?.updatedAt || '',
      lastError: lastSyncError,
      flushing: flushingPendingSync,
    };
  }

  async function retryPendingSync() {
    flushingPendingSync = true;
    emitSyncStatus();
    try {
      const results = await Promise.allSettled([
        flushPendingAppStateSync(),
        flushPendingSyncOutbox(),
      ]);
      const failures = results.flatMap((result) => {
        if (result.status === 'rejected') {
          return [result.reason].filter(Boolean);
        }
        if (result.value?.success === false && result.value?.skipped !== true) {
          return [result.value];
        }
        return [];
      });
      if (failures.length) {
        lastSyncError = failures[0]?.message || 'Falha ao sincronizar pendências';
        return { success: false, failures };
      }
      return { success: true };
    } finally {
      flushingPendingSync = false;
      emitSyncStatus();
    }
  }

  async function retryPendingSyncItem(kind) {
    const normalizedKind = String(kind || '').trim();
    if (!normalizedKind) {
      return { success: false, error: 'Tipo de pendência inválido' };
    }

    const profile = handleGetProfile()?.data || null;
    if (!profile?.id || !navigatorObject?.onLine) {
      return { success: false, skipped: true };
    }

    const item = readSyncOutbox().find((entry) => String(entry?.kind || '') === normalizedKind);
    if (!item) {
      return { success: false, skipped: true };
    }

    try {
      if (normalizedKind === 'pr_snapshot') {
        await remoteHandleSyncAthletePrSnapshot(item.payload || {});
      } else if (normalizedKind === 'measurement_snapshot') {
        await remoteHandleSyncAthleteMeasurementsSnapshot(Array.isArray(item.payload) ? item.payload : []);
      } else {
        return { success: false, skipped: true };
      }

      dequeueSyncOutboxItem(normalizedKind);
      lastSyncError = '';
      lastSuccessfulSyncAt = new Date().toISOString();
      emitSyncStatus();
      return { success: true, synced: normalizedKind };
    } catch (error) {
      recordSyncOutboxFailure(normalizedKind, item.payload, error);
      lastSyncError = error?.message || 'Falha ao sincronizar item pendente';
      emitSyncStatus();
      return { success: false, queued: true, error };
    }
  }

  function dismissPendingSyncItem(kind) {
    const normalizedKind = String(kind || '').trim();
    if (!normalizedKind) {
      return { success: false, error: 'Tipo de pendência inválido' };
    }

    const before = readSyncOutbox();
    const after = before.filter((item) => String(item?.kind || '') !== normalizedKind);
    if (after.length === before.length) {
      return { success: false, skipped: true };
    }

    writeSyncOutbox(after);
    emitSyncStatus();
    return { success: true, removed: normalizedKind };
  }

  function emitSyncStatus() {
    if (!windowObject?.dispatchEvent || typeof windowObject.dispatchEvent !== 'function') return;
    bindSyncStatusEmitter();
    try {
      windowObject.dispatchEvent(new windowObject.CustomEvent('ryxen:sync-status', {
        detail: getPendingSyncStatus(),
      }));
    } catch {
      // no-op
    }
  }

  function bindSyncStatusEmitter() {
    if (syncStatusEmitterBound || !windowObject?.addEventListener) return;
    syncStatusEmitterBound = true;
    windowObject.addEventListener('offline', () => {
      emitSyncStatus();
    });
  }

  function mergeAppStateSnapshot(base = {}, override = {}) {
    const output = { ...(base || {}) };
    Object.keys(override || {}).forEach((key) => {
      const baseValue = output[key];
      const nextValue = override[key];
      if (isPlainObject(baseValue) && isPlainObject(nextValue)) {
        output[key] = mergeAppStateSnapshot(baseValue, nextValue);
      } else {
        output[key] = nextValue;
      }
    });
    return output;
  }

  function hasCustomDayOverride() {
    try {
      return windowObject.localStorage.getItem('day-override:custom-day') !== null;
    } catch {
      return false;
    }
  }

  function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function describePendingSyncItem(item) {
    const kind = String(item?.kind || '').trim();
    if (!kind) return null;
    const payload = item?.payload;
    const updatedAt = typeof item?.updatedAt === 'string' ? item.updatedAt : '';

    if (kind === 'pr_snapshot') {
      const names = Object.keys(payload && typeof payload === 'object' ? payload : {}).filter(Boolean);
      const preview = names.slice(0, 3).join(', ');
      return {
        kind,
        label: 'PRs',
        count: names.length,
        preview,
        detail: names.length
          ? `${names.length} movimento(s) aguardando sync${preview ? `: ${preview}` : ''}`
          : 'PRs aguardando sync',
        updatedAt,
        attempts: Number.isFinite(Number(item?.attempts)) ? Number(item.attempts) : 0,
        lastFailedAt: typeof item?.lastFailedAt === 'string' ? item.lastFailedAt : '',
        lastFailureMessage: typeof item?.lastFailureMessage === 'string' ? item.lastFailureMessage : '',
        isOldest: false,
      };
    }

    if (kind === 'measurement_snapshot') {
      const entries = Array.isArray(payload) ? payload : [];
      const preview = entries.slice(0, 3).map((entry) => {
        const label = String(entry?.label || entry?.type || 'medida').trim();
        const value = entry?.value == null || entry?.value === ''
          ? ''
          : ` ${String(entry.value)}${entry?.unit ? String(entry.unit) : ''}`;
        return `${label}${value}`.trim();
      }).join(', ');
      return {
        kind,
        label: 'Medidas',
        count: entries.length,
        preview,
        detail: entries.length
          ? `${entries.length} medida(s) aguardando sync${preview ? `: ${preview}` : ''}`
          : 'Medidas aguardando sync',
        updatedAt,
        attempts: Number.isFinite(Number(item?.attempts)) ? Number(item.attempts) : 0,
        lastFailedAt: typeof item?.lastFailedAt === 'string' ? item.lastFailedAt : '',
        lastFailureMessage: typeof item?.lastFailureMessage === 'string' ? item.lastFailureMessage : '',
        isOldest: false,
      };
    }

    return {
      kind,
      label: kind,
      count: 1,
      preview: '',
      detail: 'Pendência local aguardando sync',
      updatedAt,
      attempts: Number.isFinite(Number(item?.attempts)) ? Number(item.attempts) : 0,
      lastFailedAt: typeof item?.lastFailedAt === 'string' ? item.lastFailedAt : '',
      lastFailureMessage: typeof item?.lastFailureMessage === 'string' ? item.lastFailureMessage : '',
      isOldest: false,
    };
  }

  function comparePendingSyncItemsByAge(a, b) {
    const aTime = Date.parse(a?.updatedAt || '');
    const bTime = Date.parse(b?.updatedAt || '');
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (aValid && bValid) return aTime - bTime;
    if (aValid) return -1;
    if (bValid) return 1;
    return String(a?.label || '').localeCompare(String(b?.label || ''));
  }

  function getSyncPayloadSignature(payload) {
    try {
      return JSON.stringify(payload ?? null);
    } catch {
      return '';
    }
  }

  return {
    syncImportedPlanToAccount,
    bindOnlineSyncListener,
    scheduleAppStateSync,
    saveRemoteAppStateSnapshot,
    restoreAppStateFromAccount,
    applyRemoteAppStateSnapshot,
    flushPendingAppStateSync,
    syncAthletePrSnapshotWithQueue,
    syncAthleteMeasurementsSnapshotWithQueue,
    flushPendingSyncOutbox,
    getPendingSyncStatus,
    retryPendingSync,
    retryPendingSyncItem,
    dismissPendingSyncItem,
    restoreImportedPlanFromAccount,
  };
}
