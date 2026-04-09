import { init } from '../../src/app.js';
import { getAppBridge } from '../../src/app/bridge.js';
import { initAuxiliaryBrowserLayer } from '../../src/app/auxiliaryBrowser.js';
import { initNativeBackHandling } from '../../src/app/nativeBack.js';
import { mountConsentBanner } from '../../src/ui/consent.js';
import { isDeveloperProfile } from '../../src/core/utils/devAccess.js';
import { applyAuthRedirectFromLocation, applyAuthRedirectFromUrl } from '../../src/core/services/authService.js';
import { renderDebugPlaceholder, renderError } from './bootstrapDiagnostics.js';
import { getCapacitorAppPlugin, wait } from './bootstrapEnvironment.js';
import {
  getBootMetricsSnapshot,
  markBootstrapStep,
  registerServiceWorker,
  reportAuthRedirectOutcome,
  reportBootstrapFailure,
  setupErrorMonitoring,
  setupGlobalTelemetryHandlers,
  setupVercelObservability,
  syncErrorMonitorUser,
  trackBootstrapSuccess,
} from './bootstrapObservability.js';

export async function runAthleteBootstrapFlow() {
  try {
    markBootstrapStep('start', { platform: getPlatformLabel() });
    initPreBootstrapLayers();

    const nativeAuthRedirect = await setupNativeAuthRedirects();
    if (nativeAuthRedirect?.handled) return;

    const authRedirect = applyAuthRedirectFromLocation();
    const initResult = await initApplication();
    if (!initResult.success) return;
    markBootstrapStep('init_ready');

    if (maybeRenderDeveloperDebug()) return;

    await mountAthleteUi();
    markBootstrapStep('ui_mounted');
    finalizeInit(authRedirect);
    scheduleDeferredPostInitLayers();
  } catch (error) {
    const message = error?.message || 'Falha ao carregar o app.';
    markBootstrapStep('failure', { message });
    reportBootstrapFailure(message);
    console.error('Falha no bootstrap do app:', error);
    renderError(message);
  }
}

function initPreBootstrapLayers() {
  initAuxiliaryBrowserLayer();
  initNativeBackHandling();
}

function initPostNativeLayers() {
  markBootstrapStep('deferred_layers_start');
  queueDeferredLayer(() => {
    setupErrorMonitoring();
    setupVercelObservability();
    setupGlobalTelemetryHandlers();
  }, 60);
  queueDeferredLayer(() => {
    registerServiceWorker();
    mountConsentBanner();
    markBootstrapStep('deferred_layers_end');
  }, 220);
}

function scheduleDeferredPostInitLayers() {
  const run = () => {
    try {
      initPostNativeLayers();
    } catch (error) {
      console.warn('Falha ao iniciar camadas adiadas do bootstrap', error);
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => run(), { timeout: 1200 });
    return;
  }

  window.setTimeout(run, 180);
}

async function initApplication() {
  const result = await withBootstrapTimeout(
    init(),
    12000,
    'A inicialização demorou demais. Tente recarregar o app.',
  );
  if (!result?.success) {
    reportBootstrapFailure(result?.error || 'init_failed');
    renderError(result?.error || 'Erro desconhecido');
    return { success: false };
  }
  return { success: true, result };
}

function finalizeInit(authRedirect) {
  trackBootstrapSuccess();
  reportAuthRedirectOutcome(authRedirect);
  syncErrorMonitorUser(getAppBridge()?.getProfile?.()?.data || null);
  window.__RYXEN_BOOT_METRICS__ = getBootMetricsSnapshot();
}

function maybeRenderDeveloperDebug() {
  const params = new URLSearchParams(window.location.search);
  const profile = getAppBridge()?.getProfile?.()?.data || null;
  if (params.get('debug') !== '1' || !isDeveloperProfile(profile)) return false;
  renderDebugPlaceholder();
  return true;
}

async function setupNativeAuthRedirects() {
  const appPlugin = getCapacitorAppPlugin();
  if (!appPlugin?.addListener) return null;

  appPlugin.addListener('appUrlOpen', ({ url } = {}) => {
    const result = applyAuthRedirectFromUrl(url || '');
    if (result?.handled) {
      redirectAfterNativeAuth(result);
    }
  });

  try {
    const launch = await appPlugin.getLaunchUrl?.();
    const result = applyAuthRedirectFromUrl(String(launch?.url || ''));
    if (result?.handled) {
      return result;
    }
  } catch {
    // no-op
  }

  return null;
}

function redirectAfterNativeAuth(result) {
  const returnTo = String(result?.returnTo || '/sports/cross/index.html').trim() || '/sports/cross/index.html';
  window.location.replace(returnTo);
}

async function mountAthleteUi() {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Elemento #app não encontrado.');
  }

  if (!getAppBridge()?.getState) {
    console.warn('⚠️ getAppBridge() ainda não está disponível. Tentando novamente...');
    await wait(0);
  }

  const { mountUI } = await import('./mountUi.js');
  await withBootstrapTimeout(
    mountUI({ root }),
    8000,
    'A interface demorou demais para montar. Tente recarregar o app.',
  );
}

function withBootstrapTimeout(promise, timeoutMs, message) {
  let timeoutId = null;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  });
}

function queueDeferredLayer(run, delayMs) {
  const execute = () => {
    try {
      run();
      window.__RYXEN_BOOT_METRICS__ = getBootMetricsSnapshot();
    } catch (error) {
      console.warn('Falha em camada adiada do bootstrap', error);
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => {
      window.setTimeout(execute, delayMs);
    }, { timeout: Math.max(1200, delayMs + 600) });
    return;
  }

  window.setTimeout(execute, delayMs);
}

function getPlatformLabel() {
  try {
    if (window.Capacitor?.isNativePlatform?.()) return 'native';
    return 'web';
  } catch {
    return 'web';
  }
}
