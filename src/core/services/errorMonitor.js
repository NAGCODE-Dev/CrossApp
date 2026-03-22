let sentryReady = false;
let sentryApi = null;
let sentryLoadPromise = null;

export async function initErrorMonitoring(config = {}) {
  const dsn = String(config?.dsn || '').trim();
  if (!dsn || dsn === '...' || sentryReady || !navigator.onLine) return false;

  const Sentry = await loadSentry();
  if (!Sentry) return false;

  Sentry.init({
    dsn,
    environment: String(config?.environment || 'development').trim(),
    release: String(config?.release || '').trim() || undefined,
    sampleRate: 1,
  });

  sentryReady = true;
  return true;
}

export function captureAppError(error, context = {}) {
  if (!sentryReady || !sentryApi) return;

  sentryApi.withScope((scope) => {
    const tags = context?.tags || {};
    Object.entries(tags).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        scope.setTag(key, String(value));
      }
    });

    const extra = { ...context };
    delete extra.tags;
    if (Object.keys(extra).length) {
      scope.setContext('app', sanitize(extra));
    }

    if (error instanceof Error) {
      sentryApi.captureException(error);
      return;
    }

    sentryApi.captureMessage(String(error || 'unknown_error'));
  });
}

export function setErrorMonitorUser(user = null) {
  if (!sentryReady || !sentryApi) return;
  if (!user?.email && !user?.id) {
    sentryApi.setUser(null);
    return;
  }

  sentryApi.setUser({
    id: user?.id ? String(user.id) : undefined,
    email: user?.email || undefined,
    username: user?.name || undefined,
  });
}

function sanitize(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch {
    return { note: 'unserializable_context' };
  }
}

async function loadSentry() {
  if (sentryApi) return sentryApi;
  if (sentryLoadPromise) return sentryLoadPromise;

  sentryLoadPromise = new Promise((resolve) => {
    const existing = window.Sentry;
    if (existing) {
      sentryApi = existing;
      resolve(existing);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/8.33.1/bundle.tracing.min.js';
    script.async = true;
    script.onload = () => {
      sentryApi = window.Sentry || null;
      resolve(sentryApi);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return sentryLoadPromise;
}
