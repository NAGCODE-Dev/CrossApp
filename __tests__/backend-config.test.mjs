import test from 'node:test';
import assert from 'node:assert/strict';

const config = await import(`../backend/src/config.js?backend-config-test=${Date.now()}`);

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

test('isAllowedOrigin aceita origins padrão do app nativo', () => {
  assert.equal(config.isAllowedOrigin('capacitor://localhost'), true);
  assert.equal(config.isAllowedOrigin('https://localhost'), true);
  assert.equal(config.isAllowedOrigin('http://localhost'), true);
});

test('validateConfig falha se EXPOSE_RESET_CODE estiver ativo em produção', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousExposeResetCode = process.env.EXPOSE_RESET_CODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousFrontendOrigin = process.env.FRONTEND_ORIGIN;

  process.env.NODE_ENV = 'production';
  process.env.EXPOSE_RESET_CODE = 'true';
  process.env.DATABASE_URL = 'postgres://example/test';
  process.env.JWT_SECRET = 'super-secret-production-value';
  process.env.FRONTEND_ORIGIN = 'https://app.example.com';

  try {
    const productionConfig = await import(`../backend/src/config.js?backend-config-production-test=${Date.now()}`);
    assert.throws(() => productionConfig.validateConfig(), /EXPOSE_RESET_CODE/);
  } finally {
    restoreEnv('NODE_ENV', previousNodeEnv);
    restoreEnv('EXPOSE_RESET_CODE', previousExposeResetCode);
    restoreEnv('DATABASE_URL', previousDatabaseUrl);
    restoreEnv('JWT_SECRET', previousJwtSecret);
    restoreEnv('FRONTEND_ORIGIN', previousFrontendOrigin);
  }
});

test('produção aceita apenas origins explícitas por padrão', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousFrontendOrigin = process.env.FRONTEND_ORIGIN;
  const previousFrontendOriginAliases = process.env.FRONTEND_ORIGIN_ALIASES;
  const previousNativeAppLinkOrigins = process.env.NATIVE_APP_LINK_ORIGINS;
  const previousNativeAppOrigins = process.env.NATIVE_APP_ORIGINS;
  const previousAllowLegacyOriginAliases = process.env.ALLOW_LEGACY_ORIGIN_ALIASES;

  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'postgres://example/test';
  process.env.JWT_SECRET = 'super-secret-production-value';
  process.env.FRONTEND_ORIGIN = 'https://app.example.com';
  delete process.env.FRONTEND_ORIGIN_ALIASES;
  delete process.env.NATIVE_APP_LINK_ORIGINS;
  delete process.env.NATIVE_APP_ORIGINS;
  delete process.env.ALLOW_LEGACY_ORIGIN_ALIASES;

  try {
    const productionConfig = await import(`../backend/src/config.js?backend-config-origin-test=${Date.now()}`);
    assert.equal(productionConfig.isAllowedOrigin('https://app.example.com'), true);
    assert.equal(productionConfig.isAllowedOrigin('http://localhost:8000'), false);
    assert.equal(productionConfig.isAllowedOrigin('capacitor://localhost'), false);
    assert.equal(productionConfig.isAllowedOrigin('https://cross-app-six.vercel.app'), false);
  } finally {
    restoreEnv('NODE_ENV', previousNodeEnv);
    restoreEnv('DATABASE_URL', previousDatabaseUrl);
    restoreEnv('JWT_SECRET', previousJwtSecret);
    restoreEnv('FRONTEND_ORIGIN', previousFrontendOrigin);
    restoreEnv('FRONTEND_ORIGIN_ALIASES', previousFrontendOriginAliases);
    restoreEnv('NATIVE_APP_LINK_ORIGINS', previousNativeAppLinkOrigins);
    restoreEnv('NATIVE_APP_ORIGINS', previousNativeAppOrigins);
    restoreEnv('ALLOW_LEGACY_ORIGIN_ALIASES', previousAllowLegacyOriginAliases);
  }
});
