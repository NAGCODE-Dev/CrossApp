import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, open, readFile, rm, stat } from 'node:fs/promises';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const lockFilePath = path.join(rootDir, '.playwright-web-server.lock');
const host = '127.0.0.1';
const port = 4173;
const serverUrl = `http://${host}:${port}`;
const lockRetryMs = 250;

let lockHandle = null;
let ownedServer = null;
let keepAliveTimer = null;

setupSignalHandlers();

try {
  if (await isServerReachable()) {
    console.log(`[playwright-web-server] reusing ${serverUrl}`);
    await waitUntilKilled();
  }

  const acquiredLock = await waitForBuildLock();
  if (!acquiredLock) {
    console.log(`[playwright-web-server] waiting on existing server ${serverUrl}`);
    await waitUntilKilled();
  }

  if (await isServerReachable()) {
    await releaseBuildLock();
    console.log(`[playwright-web-server] reusing ${serverUrl}`);
    await waitUntilKilled();
  }

  await runBuild();
  await ensureDistExists();
  ownedServer = await startStaticServer();
  console.log(`[playwright-web-server] serving dist on ${serverUrl}`);
  await releaseBuildLock();
  await waitUntilKilled();
} catch (error) {
  console.error('[playwright-web-server] failed', error);
  await shutdown(1);
}

async function waitForBuildLock() {
  while (true) {
    if (await isServerReachable()) {
      return false;
    }

    const acquired = await tryAcquireBuildLock();
    if (acquired) return true;

    await delay(lockRetryMs);
  }
}

async function tryAcquireBuildLock() {
  try {
    lockHandle = await open(lockFilePath, 'wx');
    await lockHandle.writeFile(JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    await cleanupStaleBuildLock();
    return false;
  }
}

async function cleanupStaleBuildLock() {
  try {
    const raw = await readFile(lockFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    const pid = Number(parsed?.pid);

    if (!Number.isFinite(pid) || pid <= 0 || !isProcessAlive(pid)) {
      await rm(lockFilePath, { force: true });
    }
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    await rm(lockFilePath, { force: true }).catch(() => {});
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

async function runBuild() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  await new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ['run', 'build'], {
      cwd: rootDir,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`build exited with code ${code}`));
    });
  });
}

async function ensureDistExists() {
  await access(distDir);
  const distStats = await stat(distDir);
  if (!distStats.isDirectory()) {
    throw new Error(`dist is not a directory: ${distDir}`);
  }
}

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      await handleRequest(request, response);
    } catch (error) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end(`internal error: ${error?.message || error}`);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  return server;
}

async function handleRequest(request, response) {
  const method = String(request.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) {
    response.statusCode = 405;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('method not allowed');
    return;
  }

  const url = new URL(request.url || '/', serverUrl);
  const filePath = await resolveFilePath(url.pathname);

  if (!filePath) {
    response.statusCode = 404;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
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
    response.on('close', resolve);
    response.on('finish', resolve);
    stream.pipe(response);
  });
}

async function resolveFilePath(pathname) {
  const decodedPath = decodeURIComponent(pathname || '/');
  const relativePath = decodedPath === '/'
    ? 'index.html'
    : decodedPath.replace(/^\/+/, '');
  const normalizedPath = path.normalize(relativePath);

  if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
    return null;
  }

  const directPath = path.join(distDir, normalizedPath);
  const directFile = await resolveIfFile(directPath);
  if (directFile) return directFile;

  if (!path.extname(normalizedPath)) {
    return resolveIfFile(path.join(distDir, normalizedPath, 'index.html'));
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
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.ico':
      return 'image/x-icon';
    case '.pdf':
      return 'application/pdf';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

async function isServerReachable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    const response = await fetch(serverUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupSignalHandlers() {
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      shutdown(0).catch((error) => {
        console.error('[playwright-web-server] shutdown error', error);
        process.exit(1);
      });
    });
  }
}

function waitUntilKilled() {
  return new Promise(() => {
    if (!keepAliveTimer) {
      keepAliveTimer = setInterval(() => {}, 1000);
    }
  });
}

async function releaseBuildLock() {
  if (!lockHandle) return;

  try {
    await lockHandle.close();
  } catch {
    // no-op
  } finally {
    lockHandle = null;
    await rm(lockFilePath, { force: true }).catch(() => {});
  }
}

async function shutdown(exitCode = 0) {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }

  if (ownedServer) {
    const server = ownedServer;
    ownedServer = null;
    await new Promise((resolve) => server.close(resolve));
  }

  await releaseBuildLock();
  process.exit(exitCode);
}
