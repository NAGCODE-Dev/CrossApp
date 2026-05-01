/**
 * Runtime configuration for integrations.
 * Prefers session-scoped overrides plus the static window config injected at build time.
 */

const STORAGE_KEY = 'ryxen-runtime-config';

function getSessionStorageSafe() {
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch {
    // no-op
  }
  return null;
}

function getLocalStorageSafe() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // no-op
  }
  return null;
}

const defaults = {
  apiBaseUrl: '/api',
  nativeApiBaseUrl: '',
  native: {
    target: 'device',
    emulatorApiBaseUrl: 'http://10.0.2.2:8787',
  },
  telemetryEnabled: true,
  auth: {
    googleClientId: '',
  },
  observability: {
    sentry: {
      dsn: '',
      environment: 'development',
      release: '',
    },
  },
  app: {
    sport: 'cross',
    appName: 'Cross',
    appLabel: 'Ryxen Cross',
    hubUrl: '/index.html',
    rollout: {
      coreSports: ['cross'],
      betaSports: ['running', 'strength'],
      showBetaSports: false,
      athleteReactShell: false,
    },
    sports: {
      cross: '/sports/cross/index.html',
      running: '/sports/running/index.html',
      strength: '/sports/strength/index.html',
    },
  },
  billing: {
    provider: 'kiwify_link',
    successUrl: '',
    cancelUrl: '',
    links: {
      athlete_plus: '',
      starter: '',
      pro: '',
      coach: '',
      performance: '',
    },
  },
};

export function getRuntimeConfig() {
  const fromWindow = safeWindowConfig();
  const fromAppContext = safeAppContext();
  const fromStorage = safeStorageConfig();
  const merged = deepMerge(defaults, deepMerge(deepMerge(fromWindow, fromAppContext), fromStorage));
  return {
    ...merged,
    apiBaseUrl: resolveApiBaseUrl(merged),
  };
}

export function setRuntimeConfig(nextConfig) {
  const current = getRuntimeConfig();
  const merged = deepMerge(current, nextConfig || {});
  safeSetStorage(merged);
  return merged;
}

function safeWindowConfig() {
  try {
    return window.__RYXEN_CONFIG__ || {};
  } catch {
    return {};
  }
}

function safeAppContext() {
  try {
    const context = window.__RYXEN_APP_CONTEXT__ || {};
    if (!context || typeof context !== 'object') return {};
    return { app: context };
  } catch {
    return {};
  }
}

function safeStorageConfig() {
  const session = getSessionStorageSafe();
  const local = getLocalStorageSafe();
  try {
    const raw = session?.getItem(STORAGE_KEY)
      || local?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function safeSetStorage(value) {
  const session = getSessionStorageSafe();
  const local = getLocalStorageSafe();
  try {
    const serialized = JSON.stringify(value || {});
    if (session) {
      session.setItem(STORAGE_KEY, serialized);
      local?.removeItem(STORAGE_KEY);
      return;
    }
    local?.setItem(STORAGE_KEY, serialized);
  } catch {
    // no-op
  }
}

function deepMerge(base, override) {
  const output = { ...base };
  Object.keys(override || {}).forEach((key) => {
    const a = output[key];
    const b = override[key];
    if (isObject(a) && isObject(b)) {
      output[key] = deepMerge(a, b);
    } else {
      output[key] = b;
    }
  });
  return output;
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function resolveApiBaseUrl(config) {
  const rawApiBaseUrl = String(config?.apiBaseUrl || '').trim();
  const nativeApiBaseUrl = String(config?.nativeApiBaseUrl || '').trim();

  if (isNativePlatform()) {
    if (nativeApiBaseUrl) return nativeApiBaseUrl;
    if (isAbsoluteUrl(rawApiBaseUrl)) return rawApiBaseUrl;
    if (rawApiBaseUrl === '/api') {
      const nativeTarget = String(config?.native?.target || '').trim().toLowerCase();
      const emulatorApiBaseUrl = String(config?.native?.emulatorApiBaseUrl || '').trim();
      if (nativeTarget === 'emulator' && isAbsoluteUrl(emulatorApiBaseUrl)) {
        return emulatorApiBaseUrl;
      }
      return '';
    }
  }

  return rawApiBaseUrl;
}

function isAbsoluteUrl(value) {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(String(value || '').trim());
}

function isNativePlatform() {
  try {
    if (window.Capacitor?.isNativePlatform?.()) return true;
    const protocol = String(window.location?.protocol || '').toLowerCase();
    return protocol === 'capacitor:' || protocol === 'file:' || protocol === 'https:' && window.location?.hostname === 'localhost';
  } catch {
    return false;
  }
}
