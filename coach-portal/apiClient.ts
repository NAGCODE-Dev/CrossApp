import { getRuntimeConfig } from '../packages/shared-web/runtime.js';
import type { CoachApiError, CoachApiRequest, CoachApiRequestOptions } from './types';

export function createCoachApiRequest({
  readToken,
}: {
  readToken: () => string;
}): CoachApiRequest {
  return async function apiRequest(path: string, options: CoachApiRequestOptions = {}) {
    const cfg = getRuntimeConfig() as { apiBaseUrl?: string; billing?: { links?: Record<string, string> } };
    const base = String(cfg.apiBaseUrl || '').trim();
    if (!base) {
      throw new Error('API base URL não configurada');
    }

    const url = `${base.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
    const token = options.token !== undefined ? options.token : readToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 15000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      if ((error as Error | undefined)?.name === 'AbortError') {
        throw new Error('O backend demorou demais para responder.');
      }
      throw new Error('Falha de rede ao falar com o backend.');
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    if (looksLikeHtml(text)) {
      const error = new Error(
        'Resposta inesperada do servidor. Verifique autenticação, apiBaseUrl ou a rota do backend.',
      ) as CoachApiError;
      error.status = response.status || 500;
      error.kind = 'html_response';
      error.raw = text;
      throw error;
    }

    const data = safeParse(text);

    if (!response.ok) {
      const error = new Error(
        (data as { error?: string } | null)?.error || `Erro API (${response.status})`,
      ) as CoachApiError;
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  };
}

export async function coachRequestOptional(
  apiRequest: CoachApiRequest,
  path: string,
  fallback: unknown = null,
  options: CoachApiRequestOptions = {},
): Promise<unknown> {
  try {
    return await apiRequest(path, options);
  } catch (error) {
    if ([403, 404, 405, 501].includes(Number((error as CoachApiError | undefined)?.status || 0))) {
      return fallback;
    }
    throw error;
  }
}

export function resolveCoachKiwifyCheckoutUrl(planId: string): string {
  const cfg = getRuntimeConfig() as { billing?: { links?: Record<string, string> } };
  const links = cfg?.billing?.links || {};
  const raw = String(planId || 'coach').trim().toLowerCase();
  const normalized = normalizeBillingPlanId(raw);
  return links[normalized] || links[raw] || '';
}

function normalizeBillingPlanId(planId: string): string {
  if (planId === 'coach') return 'pro';
  if (['athlete_plus', 'starter', 'pro', 'performance'].includes(planId)) return planId;
  return '';
}

function safeParse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function looksLikeHtml(text: string): boolean {
  const raw = String(text || '').trim().toLowerCase();
  return raw.startsWith('<!doctype html') || raw.startsWith('<html');
}
