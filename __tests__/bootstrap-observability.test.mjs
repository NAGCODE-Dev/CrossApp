import test from 'node:test';
import assert from 'node:assert/strict';

const originalWindow = globalThis.window;
const originalNavigator = globalThis.navigator;
const originalPerformance = globalThis.performance;

function createPerformanceMock() {
  let now = 0;
  return {
    now() {
      now += 25;
      return now;
    },
  };
}

test('markBootstrapStep registra marcos e expõe snapshot debug', async (t) => {
  globalThis.performance = createPerformanceMock();
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: false },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
    __RYXEN_CONFIG__: {
      telemetryEnabled: false,
    },
    },
  });

  t.after(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    globalThis.performance = originalPerformance;
  });

  const mod = await import(`../apps/athlete/bootstrapObservability.js?test=${Date.now()}`);
  mod.markBootstrapStep('start', { platform: 'web' });
  mod.markBootstrapStep('init_ready');
  mod.markBootstrapStep('ui_mounted');

  const snapshot = mod.getBootMetricsSnapshot();
  assert.equal(snapshot.steps.length >= 3, true);
  assert.equal(snapshot.steps[0].name, 'start');
  assert.equal(snapshot.summary.init_ready > 0, true);
  assert.equal(snapshot.summary.ui_mounted > snapshot.summary.init_ready, true);
});
