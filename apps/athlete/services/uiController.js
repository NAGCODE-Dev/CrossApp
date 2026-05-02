import { getAppBridge } from '../../../src/app/bridge.js';
import {
  createMeasurementSyncScheduler,
  getMeasurementSyncHash,
} from '../features/measurements/services.js';
import { normalizeAthleteUiState } from '../uiState.js';
import {
  buildUiSnapshotSignature,
  createAthleteEventLog,
  restoreUiStateFromAccount,
} from './uiControllerHelpers.js';

export { createAthleteEventLog };

export async function createAthleteUiStateController({ createStorage }) {
  const uiStorage = createStorage('ui-state', 5000);

  let uiState = normalizeAthleteUiState((await uiStorage.get('state')) || {});
  let uiSyncTimeout = null;
  let uiPersistTimeout = null;
  let remoteRestoreTimeout = null;
  const measurementSync = createMeasurementSyncScheduler({
    getAppBridge,
    initialHash: getMeasurementSyncHash(uiState?.athleteOverview?.measurements),
  });
  await uiStorage.set('state', uiState);

  bindSyncStatusListeners();
  queueRemoteUiRestore();

  function scheduleUiStatePersist(nextState) {
    clearTimeout(uiPersistTimeout);
    uiPersistTimeout = window.setTimeout(() => {
      void uiStorage.set('state', nextState);
    }, 80);
  }

  function scheduleUiStateSync(previous, next) {
    if (buildUiSnapshotSignature(previous) === buildUiSnapshotSignature(next)) {
      return;
    }

    clearTimeout(uiSyncTimeout);
    uiSyncTimeout = window.setTimeout(() => {
      getAppBridge()?.saveAppStateSnapshot?.({
        ui: {
          currentPage: next?.currentPage || 'today',
          accountView: next?.accountView || 'overview',
          historyView: next?.historyView || 'overview',
          bottomNavCollapsed: next?.bottomNavCollapsed === true,
          settings: next?.settings || {},
          wod: next?.wod || {},
          coachPortal: {
            selectedGymId: next?.coachPortal?.selectedGymId || null,
          },
        },
      });
    }, 300);
  }

  const getUiState = () => uiState;

  const setImportStatus = (nextStatus) => {
    uiState = normalizeAthleteUiState({
      ...uiState,
      importStatus: nextStatus && typeof nextStatus === 'object'
        ? { ...uiState.importStatus, ...nextStatus }
        : null,
    });
    scheduleUiStatePersist(uiState);
  };

  const setUiState = async (next) => {
    const previous = uiState;
    uiState = normalizeAthleteUiState({ ...uiState, ...(next || {}) });
    scheduleUiStatePersist(uiState);
    scheduleUiStateSync(previous, uiState);
    measurementSync.schedule(previous, uiState);
  };

  const patchUiState = async (fn) => {
    const current = uiState;
    const updated = normalizeAthleteUiState((fn && fn(current)) || current);
    uiState = updated;
    scheduleUiStatePersist(updated);
    scheduleUiStateSync(current, updated);
    measurementSync.schedule(current, updated);
  };

  return {
    getUiState,
    setImportStatus,
    setUiState,
    patchUiState,
    refreshSyncStatus,
    destroy() {
      clearTimeout(remoteRestoreTimeout);
      clearTimeout(uiSyncTimeout);
      clearTimeout(uiPersistTimeout);
      measurementSync.clear();
      window.removeEventListener('online', handleNetworkStatusChange);
      window.removeEventListener('offline', handleNetworkStatusChange);
      window.removeEventListener('ryxen:sync-status', handleSyncStatusEvent);
    },
  };

  function queueRemoteUiRestore() {
    clearTimeout(remoteRestoreTimeout);
    remoteRestoreTimeout = window.setTimeout(() => {
      void restoreRemoteUiState();
    }, 40);
  }

  async function restoreRemoteUiState() {
    try {
      const remoteUiState = await restoreUiStateFromAccount();
      if (!remoteUiState) return;
      uiState = normalizeAthleteUiState({ ...uiState, ...remoteUiState });
      await uiStorage.set('state', uiState);
    } catch {
      // no-op
    }
  }

  function bindSyncStatusListeners() {
    window.addEventListener('online', handleNetworkStatusChange);
    window.addEventListener('offline', handleNetworkStatusChange);
    window.addEventListener('ryxen:sync-status', handleSyncStatusEvent);
    void refreshSyncStatus();
  }

  function handleNetworkStatusChange() {
    void refreshSyncStatus({
      online: navigator.onLine !== false,
    });
  }

  function handleSyncStatusEvent(event) {
    void refreshSyncStatus(event?.detail || {});
  }

  async function refreshSyncStatus(seed = {}) {
    const bridge = getAppBridge?.();
    let remoteStatus = {};
    try {
      remoteStatus = await bridge?.getPendingSyncStatus?.() || {};
    } catch {
      remoteStatus = {};
    }

    uiState = normalizeAthleteUiState({
      ...uiState,
      syncStatus: {
        ...(uiState?.syncStatus || {}),
        online: navigator.onLine !== false,
        ...remoteStatus,
        ...seed,
      },
    });
    scheduleUiStatePersist(uiState);
  }
}
