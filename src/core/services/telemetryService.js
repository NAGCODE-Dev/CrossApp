import { getRuntimeConfig } from '../../config/runtime.js';
import { getAuthToken } from './apiClient.js';

const CONSENT_KEY = 'ryxen-consent';
const QUEUE_KEY = 'ryxen-telemetry-queue';
const MAX_QUEUE = 200;
const MAX_STRING_LENGTH = 1000;

function getSessionStorageSafe() {
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch {
    // no-op
  }
  return null;
}

function getLocalStorageSafe() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // no-op
  }
  return null;
}

function getQueueStorage() {
  return getSessionStorageSafe() || getLocalStorageSafe();
}

function sanitizeTelemetryValue(value, depth = 0) {
  if (value == null) return value;
  if (depth > 3) return '[truncated]';
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => sanitizeTelemetryValue(entry, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 20)
        .map(([key, entry]) => [key, sanitizeTelemetryValue(entry, depth + 1)]),
    );
  }
  return String(value).slice(0, MAX_STRING_LENGTH);
}

export function trackEvent(name, props = {}) {
  enqueue({
    type: 'event',
    name: String(name || 'unknown').slice(0, 120),
    props: sanitizeTelemetryValue(props),
    ts: new Date().toISOString(),
  });
  flushTelemetry().catch(() => {});
}

export function trackError(error, context = {}) {
  enqueue({
    type: 'error',
    message: String(error?.message || error || 'unknown').slice(0, MAX_STRING_LENGTH),
    stack: String(error?.stack || '').slice(0, 4000) || null,
    context: sanitizeTelemetryValue(context),
    ts: new Date().toISOString(),
  });
  flushTelemetry().catch(() => {});
}

export function trackPerf(name, durationMs, props = {}) {
  enqueue({
    type: 'perf',
    name: String(name || 'unknown'),
    durationMs: Number.isFinite(Number(durationMs)) ? Number(durationMs) : null,
    props: sanitizeTelemetryValue(props),
    ts: new Date().toISOString(),
  });
  flushTelemetry().catch(() => {});
}

export async function flushTelemetry() {
  const cfg = getRuntimeConfig();
  if (!cfg.telemetryEnabled) return;
  if (!hasTelemetryConsent()) return;
  if (!cfg.apiBaseUrl) return;
  const authToken = getAuthToken();
  if (!authToken) return;

  const queue = readQueue();
  if (!queue.length) return;

  const url = `${cfg.apiBaseUrl.replace(/\/$/, '')}/telemetry/ingest`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
      body: JSON.stringify({ items: queue }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.ok) {
    writeQueue([]);
  } else if ([401, 403].includes(Number(response.status || 0))) {
    writeQueue([]);
  }
}

export function setTelemetryConsent(consented) {
  try {
    const serialized = JSON.stringify({ telemetry: !!consented });
    localStorage.setItem(CONSENT_KEY, serialized);
  } catch {
    // no-op
  }
}

export function hasTelemetryConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.telemetry === true;
  } catch {
    return false;
  }
}

function enqueue(item) {
  const queue = readQueue();
  queue.push(item);
  const pruned = queue.slice(-MAX_QUEUE);
  writeQueue(pruned);
}

function readQueue() {
  const queueStorage = getQueueStorage();
  const local = getLocalStorageSafe();
  try {
    const raw = queueStorage?.getItem(QUEUE_KEY)
      || local?.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  const queueStorage = getQueueStorage();
  const local = getLocalStorageSafe();
  try {
    const serialized = JSON.stringify(queue || []);
    queueStorage?.setItem(QUEUE_KEY, serialized);
    if (queueStorage !== local) {
      local?.removeItem(QUEUE_KEY);
    }
  } catch {
    // no-op
  }
}
