export function createLocalSessionDomain({
  windowObject,
  clearAllStorages,
  PRESERVED_LOCAL_KEYS,
  AUTH_TOKEN_KEY,
  PROFILE_KEY,
  CHECKOUT_INTENT_KEY,
  PR_HISTORY_KEY,
  ATHLETE_USAGE_KEY,
  TELEMETRY_QUEUE_KEY,
  APP_STATE_SYNC_KEY,
  SYNC_OUTBOX_KEY,
}) {
  function normalizeKeys(keys = []) {
    return keys.flatMap((key) => (Array.isArray(key) ? key : [key])).filter(Boolean);
  }

  function getStorages() {
    const storages = [];
    try {
      if (windowObject?.sessionStorage) storages.push(windowObject.sessionStorage);
    } catch {
      // no-op
    }
    try {
      if (windowObject?.localStorage) storages.push(windowObject.localStorage);
    } catch {
      // no-op
    }
    return storages;
  }

  async function clearLocalUserData(options = {}) {
    const preserveAuth = options?.preserveAuth === true;
    const preserved = captureLocalValues([
      ...PRESERVED_LOCAL_KEYS,
      ...(preserveAuth ? [AUTH_TOKEN_KEY, PROFILE_KEY] : []),
    ]);

    await clearAllStorages();

    const sessionKeys = [
      CHECKOUT_INTENT_KEY,
      PR_HISTORY_KEY,
      ATHLETE_USAGE_KEY,
      TELEMETRY_QUEUE_KEY,
      APP_STATE_SYNC_KEY,
      SYNC_OUTBOX_KEY,
      ...(!preserveAuth ? [AUTH_TOKEN_KEY, PROFILE_KEY] : []),
    ];

    sessionKeys.forEach(removeLocalValue);
    restoreLocalValues(preserved);
  }

  function captureLocalValues(keys = []) {
    const snapshot = new Map();
    normalizeKeys(keys).forEach((key) => {
      for (const storage of getStorages()) {
        try {
          const value = storage.getItem(key);
          if (value !== null) {
            snapshot.set(key, value);
            break;
          }
        } catch {
          // no-op
        }
      }
    });
    return snapshot;
  }

  function restoreLocalValues(values) {
    values.forEach((value, key) => {
      for (const storage of getStorages()) {
        try {
          storage.setItem(key, value);
        } catch {
          // no-op
        }
      }
    });
  }

  function removeLocalValue(key) {
    normalizeKeys([key]).forEach((entry) => {
      for (const storage of getStorages()) {
        try {
          storage.removeItem(entry);
        } catch {
          // no-op
        }
      }
    });
  }

  return {
    clearLocalUserData,
  };
}
