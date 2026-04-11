import test from 'node:test';
import assert from 'node:assert/strict';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('runAppInitialization não bloqueia app:ready por restore de sessão lento', async () => {
  const lifecycle = await import(`../src/app/initLifecycle.js?slow-restore=${Date.now()}`);
  const calls = [];
  let resolveRestore;

  const restorePromise = new Promise((resolve) => {
    resolveRestore = resolve;
  });

  const result = await lifecycle.runAppInitialization({
    logDebug: () => {},
    checkDependencies: () => calls.push('check'),
    loadPersistedState: async () => calls.push('persist'),
    restoreSessionIfPossible: () => restorePromise.then(() => {
      calls.push('restore-finished');
      return { restored: true };
    }),
    setSessionRestoreStatus: () => {},
    updateCurrentDay: async () => calls.push('day'),
    loadSavedWeeks: async () => calls.push('weeks'),
    setupEventListeners: () => calls.push('listeners'),
    bindOnlineSyncListener: () => calls.push('online'),
    exposeDebugAPIs: () => calls.push('debug'),
    emit: (eventName) => calls.push(eventName),
    getState: () => ({ ok: true }),
  });

  assert.equal(result.success, true);
  assert.ok(calls.includes('app:ready'));
  assert.equal(calls.includes('restore-finished'), false);

  resolveRestore({ restored: true });
  await tick();
  assert.equal(calls.includes('restore-finished'), true);
});

test('restoreSessionIfPossible sinaliza falha sem lançar', async () => {
  const lifecycle = await import(`../src/app/initLifecycle.js?restore-status=${Date.now()}`);
  const statuses = [];
  const events = [];
  let signedOut = false;

  const result = await lifecycle.restoreSessionIfPossible({
    hasStoredSession: () => true,
    handleRefreshSession: async () => {
      throw new Error('timeout');
    },
    remoteHandlers: {
      handleSignOut: async () => {
        signedOut = true;
      },
    },
    logDebug: () => {},
    setSessionRestoreStatus: (status) => statuses.push(status),
    emit: (eventName) => events.push(eventName),
  });

  assert.equal(result.restored, false);
  assert.deepEqual(statuses, ['restoring', 'failed']);
  assert.deepEqual(events, ['auth:session-restoring', 'auth:session-failed']);
  assert.equal(signedOut, true);
});
