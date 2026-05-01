import { flushTelemetry, trackError, trackEvent, trackPerf } from '../../src/core/services/telemetryService.js';
import { captureAppError, initErrorMonitoring, setErrorMonitorUser } from '../../src/core/services/errorMonitor.js';
import { getRuntimeConfig } from '../../src/config/runtime.js';
import { isNativePlatform } from './bootstrapEnvironment.js';

const BOOT_METRICS_KEY = '__RYXEN_BOOT_METRICS__';

function getBootMetricsStore() {
  const existing = window[BOOT_METRICS_KEY];
  if (existing && typeof existing === 'object') return existing;
  const next = {
    startedAt: performance.now(),
    steps: [],
    summary: {},
    lastFailure: '',
  };
  window[BOOT_METRICS_KEY] = next;
  return next;
}

export function markBootstrapStep(name, props = {}) {
  const store = getBootMetricsStore();
  const now = performance.now();
  const sinceStart = Number((now - store.startedAt).toFixed(1));
  const entry = {
    name: String(name || 'unknown'),
    at: new Date().toISOString(),
    sinceStartMs: sinceStart,
    props: props && typeof props === 'object' ? props : {},
  };
  store.steps.push(entry);
  store.summary[entry.name] = sinceStart;
  trackPerf(`bootstrap:${entry.name}`, sinceStart, entry.props);
  return entry;
}

export function getBootMetricsSnapshot() {
  const store = getBootMetricsStore();
  return {
    startedAt: store.startedAt,
    steps: [...store.steps],
    summary: { ...store.summary },
    lastFailure: store.lastFailure || '',
  };
}

export function setupErrorMonitoring() {
  const config = getRuntimeConfig();
  const sentry = config?.observability?.sentry || {};
  if (!String(sentry?.dsn || '').trim() || !navigator.onLine) return false;
  initErrorMonitoring(sentry);
  return true;
}

export function setupVercelObservability() {
  if (window.__RYXEN_VERCEL_OBSERVABILITY__ || !navigator.onLine || shouldSkipVercelObservability()) return;
  window.__RYXEN_VERCEL_OBSERVABILITY__ = true;
  injectVercelScript('/_vercel/insights/script.js');
  injectVercelScript('/_vercel/speed-insights/script.js');
}

function injectVercelScript(src) {
  if (!src) return;
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  script.dataset.ryxenObservability = 'true';
  document.head.appendChild(script);
}

function shouldSkipVercelObservability() {
  try {
    const hostname = String(window.location?.hostname || '').trim().toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function setupGlobalTelemetryHandlers() {
  window.addEventListener('error', (event) => {
    captureAppError(event?.error || event?.message || 'window_error', {
      tags: { layer: 'frontend', source: 'window.error' },
      source: event?.filename || null,
      line: event?.lineno || null,
      column: event?.colno || null,
    });
    trackError(event?.error || event?.message || 'window_error', {
      source: event?.filename || null,
      line: event?.lineno || null,
      column: event?.colno || null,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureAppError(event?.reason || 'unhandled_rejection', {
      tags: { layer: 'frontend', source: 'unhandledrejection' },
    });
    trackError(event?.reason || 'unhandled_rejection', { source: 'promise' });
  });
}

export function registerServiceWorker() {
  if (isNativePlatform()) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        trackEvent('service_worker_registered', { scope: registration.scope });
      })
      .catch((error) => {
        trackError(error, { stage: 'service_worker_register' });
        console.error('Erro no Service Worker:', error);
      });
  });
}

export function trackBootstrapSuccess() {
  const store = getBootMetricsStore();
  const uiMountedMs = Number(store.summary.ui_mounted || 0);
  trackEvent('app_initialized', { success: true });
  if (uiMountedMs > 0) {
    trackPerf('bootstrap:first_ui_ready', uiMountedMs, { platform: isNativePlatform() ? 'native' : 'web' });
  }
  flushTelemetry().catch(() => {});
}

export function reportBootstrapFailure(errorMessage) {
  const store = getBootMetricsStore();
  store.lastFailure = String(errorMessage || 'init_failed');
  trackError(errorMessage || 'init_failed', { stage: 'bootstrap' });
}

export function reportAuthRedirectOutcome(authRedirect) {
  if (!authRedirect?.handled) return;
  if (authRedirect.success) {
    trackEvent('auth_redirect_applied', { provider: 'google' });
    return;
  }
  if (authRedirect.error) {
    trackError(authRedirect.error, { stage: 'auth_redirect' });
    console.warn('Falha no retorno do Google:', authRedirect.error);
  }
}

export function syncErrorMonitorUser(profile) {
  setErrorMonitorUser(profile || null);
}
