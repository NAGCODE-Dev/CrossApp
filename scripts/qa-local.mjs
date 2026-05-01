import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const rootDir = process.cwd();
const qaVerbose = process.argv.includes('--verbose') || process.env.RYXEN_QA_VERBOSE === '1';
const artifactRootDir = path.join(rootDir, '.qa-artifacts');
const artifactRunId = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(artifactRootDir, artifactRunId);
const repoStaticPort = Number(process.env.RYXEN_QA_FRONTEND_PORT || 4100);
const distStaticPort = Number(process.env.RYXEN_QA_COACH_PORT || 4173);
const backendPort = Number(process.env.RYXEN_QA_BACKEND_PORT || 8790);
const repoStaticOrigin = `http://127.0.0.1:${repoStaticPort}`;
const distStaticOrigin = `http://127.0.0.1:${distStaticPort}`;
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const testCoach = {
  email: String(process.env.RYXEN_QA_COACH_EMAIL || 'coach1.1@crossapp.local').trim().toLowerCase(),
  password: String(process.env.RYXEN_QA_COACH_PASSWORD || 'CoachTrial123').trim(),
};
const testAthlete = {
  email: String(process.env.RYXEN_QA_ATHLETE_EMAIL || 'athlete1.1@crossapp.local').trim().toLowerCase(),
  password: String(process.env.RYXEN_QA_ATHLETE_PASSWORD || 'Athlete123').trim(),
};

const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
const { default: pg } = await import(backendRequire.resolve('pg'));
const bcrypt = backendRequire('bcryptjs');

const managedResources = [];

try {
  const env = await loadSupabaseEnv();
  const runtimeEnv = buildRuntimeEnv(env);
  if (qaVerbose) {
    await mkdir(artifactDir, { recursive: true });
  }

  await runCommand('npm', ['run', 'build:coach'], { cwd: rootDir, env: process.env });
  const repoServer = await startStaticServer({
    root: rootDir,
    port: repoStaticPort,
    label: 'repo-static',
  });
  const distServer = await startStaticServer({
    root: path.join(rootDir, 'dist'),
    port: distStaticPort,
    label: 'dist-static',
  });
  const backend = await startManagedProcess({
    command: 'node',
    args: ['backend/src/server.js'],
    cwd: rootDir,
    env: runtimeEnv,
    label: 'backend',
    readyUrl: `${backendOrigin}/health`,
  });

  managedResources.push(repoServer, distServer, backend);

  await ensureLocalPasswords(runtimeEnv.DATABASE_URL);
  await runSmoke(runtimeEnv);

  const athleteAuth = await apiSignin(testAthlete.email, testAthlete.password);
  const coachAuth = await apiSignin(testCoach.email, testCoach.password);

  const athleteResult = await runAthleteQa(athleteAuth);
  const coachResult = await runCoachQa();
  const hasErrors = [athleteResult, coachResult].some((result) => result.errors.length || result.badResponses.length);

  const summary = {
    ok: !hasErrors,
    verbose: qaVerbose,
    artifactDir: qaVerbose ? artifactDir : null,
    backendOrigin,
    repoStaticOrigin,
    distStaticOrigin,
    athlete: athleteResult,
    coach: coachResult,
  };

  if (qaVerbose) {
    await writeFile(path.join(artifactDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify(summary, null, 2));
  if (hasErrors) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error('[qa-local] failed', error);
  process.exitCode = 1;
} finally {
  await shutdownManagedResources();
}

async function loadSupabaseEnv() {
  const envPath = path.join(rootDir, '.env.supabase');
  await access(envPath);
  const raw = await readFile(envPath, 'utf8');
  const parsed = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function buildRuntimeEnv(env) {
  const next = { ...process.env, ...env };
  const frontendOrigins = [
    repoStaticOrigin,
    distStaticOrigin,
    `http://localhost:${repoStaticPort}`,
    `http://localhost:${distStaticPort}`,
  ];
  next.PORT = String(backendPort);
  next.FRONTEND_ORIGIN = frontendOrigins.join(',');
  next.EXPOSE_RESET_CODE = next.EXPOSE_RESET_CODE || 'true';
  next.DEV_EMAILS = next.DEV_EMAILS || next.SUPPORT_EMAIL || 'nagcode.contact@gmail.com';
  next.JWT_SECRET = next.JWT_SECRET || 'dev-local-secret-123';
  next.DATABASE_URL = applyLocalSslOverride(String(next.DATABASE_URL || ''));
  return next;
}

function applyLocalSslOverride(databaseUrl) {
  const raw = String(databaseUrl || '').trim();
  if (!raw) {
    throw new Error('DATABASE_URL ausente em .env.supabase');
  }
  if (/sslmode=no-verify/i.test(raw)) return raw;
  if (/sslmode=require/i.test(raw)) {
    return raw.replace(/sslmode=require/gi, 'sslmode=no-verify');
  }
  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}sslmode=no-verify`;
}

async function runCommand(command, args, { cwd, env }) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function startManagedProcess({ command, args, cwd, env, label, readyUrl }) {
  if (await isUrlReachable(readyUrl)) {
    return {
      type: 'process',
      label: `${label}:reused`,
      stop: async () => {},
    };
  }

  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  let stdout = '';
  child.stdout.on('data', (chunk) => {
    const text = String(chunk);
    stdout += text;
    process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = String(chunk);
    stderr += text;
    process.stderr.write(text);
  });
  let exitedEarly = false;
  child.once('exit', () => {
    exitedEarly = true;
  });

  const resource = {
    type: 'process',
    label,
    stop: async () => {
      if (child.killed) return;
      child.kill('SIGTERM');
      await new Promise((resolve) => {
        child.once('exit', resolve);
        setTimeout(resolve, 1500);
      });
    },
  };

  await waitForUrl(readyUrl, 20000, async () => {
    if (child.exitCode !== null) {
      if (exitedEarly && /EADDRINUSE/.test(stderr) && await isUrlReachable(readyUrl)) {
        return;
      }
      throw new Error(`[${label}] exited early with code ${child.exitCode}\n${stderr || stdout}`);
    }
  });

  return resource;
}

async function waitForUrl(url, timeoutMs = 15000, onTick = async () => {}) {
  const started = Date.now();
  while ((Date.now() - started) < timeoutMs) {
    await onTick();
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await delay(400);
  }
  throw new Error(`timeout waiting for ${url}`);
}

async function startStaticServer({ root, port, label }) {
  if (await isUrlReachable(`http://127.0.0.1:${port}`)) {
    return {
      type: 'server',
      label: `${label}:reused`,
      stop: async () => {},
    };
  }

  const server = http.createServer(async (request, response) => {
    try {
      await handleStaticRequest({ request, response, root });
    } catch (error) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end(`internal error: ${error?.message || error}`);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return {
    type: 'server',
    label,
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function isUrlReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function handleStaticRequest({ request, response, root }) {
  const method = String(request.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) {
    response.statusCode = 405;
    response.end('method not allowed');
    return;
  }

  const base = `http://${request.headers.host || '127.0.0.1'}`;
  const url = new URL(request.url || '/', base);
  const filePath = await resolveStaticFile(root, url.pathname);

  if (!filePath) {
    response.statusCode = 404;
    response.end('not found');
    return;
  }

  const fileStats = await stat(filePath);
  response.statusCode = 200;
  response.setHeader('Content-Type', getContentType(filePath));
  response.setHeader('Content-Length', String(fileStats.size));
  if (method === 'HEAD') {
    response.end();
    return;
  }

  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    response.on('finish', resolve);
    response.on('close', resolve);
    stream.pipe(response);
  });
}

async function resolveStaticFile(root, pathname) {
  const decoded = decodeURIComponent(pathname || '/');
  const relativePath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return null;

  const direct = path.join(root, normalized);
  const directFile = await resolveIfFile(direct);
  if (directFile) return directFile;
  if (!path.extname(normalized)) {
    return resolveIfFile(path.join(root, normalized, 'index.html'));
  }
  return null;
}

async function resolveIfFile(filePath) {
  try {
    const fileStats = await stat(filePath);
    return fileStats.isFile() ? filePath : null;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function getContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

async function ensureLocalPasswords(databaseUrl) {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const updates = [
      [testCoach.email, testCoach.password],
      [testAthlete.email, testAthlete.password],
    ];
    for (const [email, password] of updates) {
      const hash = await bcrypt.hash(password, 12);
      await pool.query('UPDATE users SET password_hash = $2 WHERE lower(email) = lower($1)', [email, hash]);
    }
  } finally {
    await pool.end();
  }
}

async function runSmoke(env) {
  const smokeEnv = {
    ...env,
    RYXEN_API_BASE_URL: backendOrigin,
    RYXEN_COACH_EMAIL: testCoach.email,
    RYXEN_COACH_PASSWORD: testCoach.password,
    RYXEN_ATHLETE_EMAIL: testAthlete.email,
    RYXEN_ATHLETE_PASSWORD: testAthlete.password,
  };
  await runCommand('node', ['scripts/smoke-coach-trial.mjs'], { cwd: rootDir, env: smokeEnv });
}

async function apiSignin(email, password) {
  const response = await fetch(`${backendOrigin}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
  return data;
}

async function runAthleteQa(auth) {
  const pageUrl = `${repoStaticOrigin}/sports/cross/index.html`;
  return runBrowserScenario({
    name: 'athlete',
    url: pageUrl,
    initScriptData: { token: auth.token, user: auth.user },
    buildSteps: (page) => [
      ['dismiss consent', async () => {
        const decline = page.locator('#consent-decline');
        if (await decline.count()) {
          await decline.click();
          await page.waitForTimeout(200);
        }
      }],
      ['go account', async () => { await page.locator('#ui-bottomNav [data-page="account"]').click(); await page.waitForTimeout(900); }],
      ['account tabs', async () => {
        for (const selector of ['[data-account-view="profile"]', '[data-account-view="checkins"]', '[data-account-view="preferences"]', '[data-account-view="data"]']) {
          const target = page.locator(selector).first();
          if (await target.count()) {
            await target.click();
            await page.waitForTimeout(250);
          }
        }
      }],
      ['history benchmark search', async () => {
        await page.locator('#ui-bottomNav [data-page="history"]').click();
        await page.waitForTimeout(700);
        await page.locator('input').first().fill('Cindy');
        await page.getByRole('button', { name: /^buscar$/i }).click();
        await page.waitForTimeout(1300);
      }],
      ['today', async () => { await page.locator('#ui-bottomNav [data-page="today"]').click(); await page.waitForTimeout(600); }],
    ],
  });
}

async function runCoachQa() {
  const pageUrl = `${distStaticOrigin}/coach/index.html`;
  return runBrowserScenario({
    name: 'coach',
    url: pageUrl,
    initScriptData: null,
    buildSteps: (page, log) => [
      ['login', async () => {
        await page.locator('input[type="email"]').fill(testCoach.email);
        await page.locator('input[type="password"]').fill(testCoach.password);
        await page.getByRole('button', { name: /^entrar$/i }).click();
        await page.waitForTimeout(2200);
      }],
      ['collect headings', async () => {
        const texts = await page.locator('h1,h2,h3').evaluateAll((els) => els.map((el) => el.textContent?.trim()).filter(Boolean));
        log.push(`headings: ${texts.join(' | ')}`);
      }],
    ],
  });
}

async function runBrowserScenario({ name, url, initScriptData, buildSteps }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  const warnings = [];
  const badResponses = [];
  const log = [];
  const artifacts = {
    screenshot: null,
    html: null,
    report: null,
  };

  page.on('console', (msg) => {
    const line = `[console:${msg.type()}] ${msg.text()}`;
    if (msg.type() === 'error') errors.push(line);
    if (msg.type() === 'warning') warnings.push(line);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => errors.push(`[requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'unknown'}`));
  page.on('response', (res) => {
    if (res.status() >= 400 && /127\.0\.0\.1|localhost/.test(res.url())) {
      badResponses.push(`[response:${res.status()}] ${res.request().method()} ${res.url()}`);
    }
  });

  await page.addInitScript(({ backendOrigin, payload }) => {
    const cfg = JSON.stringify({ apiBaseUrl: backendOrigin, telemetryEnabled: false });
    sessionStorage.setItem('ryxen-runtime-config', cfg);
    localStorage.setItem('ryxen-runtime-config', cfg);
    if (payload?.token && payload?.user) {
      sessionStorage.setItem('ryxen-auth-token', payload.token);
      sessionStorage.setItem('ryxen-user-profile', JSON.stringify(payload.user));
      localStorage.removeItem('ryxen-auth-token');
      localStorage.removeItem('ryxen-user-profile');
    }
  }, { backendOrigin, payload: initScriptData });

  async function step(label, fn) {
    try {
      await fn();
      log.push(`ok: ${label}`);
    } catch (error) {
      log.push(`fail: ${label} :: ${error.message}`);
      errors.push(`[step:${label}] ${error.message}`);
      await captureScenarioScreenshot({ page, name, label, errors, badResponses, warnings, log, artifacts });
      await captureScenarioHtmlDump({ page, name, label, warnings, log, artifacts });
    }
  }

  await step('goto', async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  });

  const steps = buildSteps(page, log);
  for (const [label, fn] of steps) {
    await step(label, fn);
  }

  if (qaVerbose) {
    artifacts.report = await writeScenarioReport({
      name,
      url,
      log,
      errors,
      warnings,
      badResponses,
      currentUrl: page.url(),
      screenshot: artifacts.screenshot,
      html: artifacts.html,
    });
  }

  await browser.close();
  return { log, errors, warnings, badResponses, artifacts };
}

async function shutdownManagedResources() {
  while (managedResources.length) {
    const resource = managedResources.pop();
    try {
      await resource.stop();
    } catch {
      // ignore cleanup failures
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScenarioScreenshot({ page, name, label, errors, badResponses, warnings, log, artifacts }) {
  if (!qaVerbose || artifacts.screenshot) return;
  try {
    await mkdir(artifactDir, { recursive: true });
    const filename = `${sanitizeArtifactName(name)}--${sanitizeArtifactName(label)}.png`;
    const outputPath = path.join(artifactDir, filename);
    await page.screenshot({ path: outputPath, fullPage: true });
    artifacts.screenshot = outputPath;
  } catch (error) {
    const message = error?.message || String(error);
    log.push(`warn: screenshot :: ${message}`);
    warnings.push(`[artifact:screenshot] ${message}`);
  }
}

async function captureScenarioHtmlDump({ page, name, label, warnings, log, artifacts }) {
  if (!qaVerbose || artifacts.html) return;
  try {
    await mkdir(artifactDir, { recursive: true });
    const filename = `${sanitizeArtifactName(name)}--${sanitizeArtifactName(label)}.html`;
    const outputPath = path.join(artifactDir, filename);
    const html = await page.content();
    await writeFile(outputPath, html, 'utf8');
    artifacts.html = outputPath;
  } catch (error) {
    const message = error?.message || String(error);
    log.push(`warn: html-dump :: ${message}`);
    warnings.push(`[artifact:html] ${message}`);
  }
}

async function writeScenarioReport({ name, url, log, errors, warnings, badResponses, currentUrl, screenshot, html }) {
  if (!qaVerbose) return null;
  await mkdir(artifactDir, { recursive: true });
  const outputPath = path.join(artifactDir, `${sanitizeArtifactName(name)}.json`);
  const report = {
    name,
    url,
    currentUrl,
    ok: errors.length === 0 && badResponses.length === 0,
    screenshot,
    html,
    log,
    errors,
    warnings,
    badResponses,
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

function sanitizeArtifactName(value) {
  return String(value || 'artifact')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'artifact';
}
