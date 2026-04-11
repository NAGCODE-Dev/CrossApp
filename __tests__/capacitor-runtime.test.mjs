import test from 'node:test';
import assert from 'node:assert/strict';

test('getCapacitorAppPlugin aceita formato legado em window.Capacitor.Plugins.App', async () => {
  const originalWindow = globalThis.window;
  const appPlugin = { addListener: () => {} };

  globalThis.window = {
    Capacitor: {
      Plugins: {
        App: appPlugin,
      },
    },
  };

  try {
    const runtime = await import(`../src/app/capacitorRuntime.js?legacy-plugin=${Date.now()}`);
    assert.equal(runtime.getCapacitorAppPlugin(), appPlugin);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('getCapacitorAppPlugin aceita formato moderno em window.Capacitor.App', async () => {
  const originalWindow = globalThis.window;
  const appPlugin = { addListener: () => {}, exitApp: () => {} };

  globalThis.window = {
    Capacitor: {
      App: appPlugin,
    },
  };

  try {
    const runtime = await import(`../src/app/capacitorRuntime.js?modern-plugin=${Date.now()}`);
    assert.equal(runtime.getCapacitorAppPlugin(), appPlugin);
  } finally {
    globalThis.window = originalWindow;
  }
});
