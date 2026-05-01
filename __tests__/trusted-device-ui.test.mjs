import test from 'node:test';
import assert from 'node:assert/strict';

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;

function createStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test('trusted device ui suaviza o texto para conta reconhecida', async (t) => {
  const storage = createStorageMock();
  storage.setItem('ryxen-last-auth-email', 'athlete@example.com');
  storage.setItem('ryxen-trusted-device-id', 'device-123');
  storage.setItem('ryxen-trusted-device-map', JSON.stringify({
    'athlete@example.com': {
      trustedToken: 'grant-123',
      deviceId: 'device-123',
      expiresAt: '2099-01-01T00:00:00.000Z',
      label: 'browser:test',
    },
  }));

  globalThis.localStorage = storage;
  globalThis.sessionStorage = createStorageMock();
  globalThis.window = {
    localStorage: storage,
    sessionStorage: globalThis.sessionStorage,
    navigator: { userAgent: 'UnitTestBrowser/1.0' },
  };

  t.after(() => {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
    globalThis.sessionStorage = originalSessionStorage;
  });

  const { getTrustedDeviceUiState } = await import(`../apps/athlete/features/account/trustedDeviceUi.js?test=${Date.now()}`);
  const ui = getTrustedDeviceUiState('athlete@example.com');

  assert.equal(ui.isTrusted, true);
  assert.equal(ui.submitLabel, 'Continuar');
  assert.equal(ui.trustedSubmitLabel, 'Continuar neste aparelho');
  assert.match(ui.hintBody, /validado|disponível/i);
  assert.doesNotMatch(ui.hintBody, /sem senha/i);
});
