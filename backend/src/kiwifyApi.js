import {
  KIWIFY_ACCOUNT_ID,
  KIWIFY_CLIENT_ID,
  KIWIFY_CLIENT_SECRET,
} from './config.js';
import { fetchWithTimeout, safeReadJsonResponse } from './http.js';

const TOKEN_URL = 'https://public-api.kiwify.com/v1/oauth/token';
const SALES_URL = 'https://public-api.kiwify.com/v1/sales';
const KIWIFY_TIMEOUT_MS = 12000;

let tokenCache = {
  accessToken: '',
  expiresAt: 0,
};

export function isKiwifyNativeApiConfigured() {
  return !!(KIWIFY_ACCOUNT_ID && KIWIFY_CLIENT_ID && KIWIFY_CLIENT_SECRET);
}

export async function getKiwifySaleById(saleId) {
  const normalizedSaleId = String(saleId || '').trim();
  if (!normalizedSaleId) {
    throw new Error('saleId é obrigatório');
  }
  if (!isKiwifyNativeApiConfigured()) {
    throw new Error('API nativa da Kiwify não configurada');
  }

  const accessToken = await getKiwifyAccessToken();
  const response = await fetchWithTimeout(`${SALES_URL}/${encodeURIComponent(normalizedSaleId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-kiwify-account-id': KIWIFY_ACCOUNT_ID,
    },
  }, KIWIFY_TIMEOUT_MS);

  const data = await safeReadJsonResponse(response);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Falha ao consultar venda na Kiwify (${response.status})`);
  }

  return data?.data || data;
}

async function getKiwifyAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 15000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: KIWIFY_CLIENT_ID,
    client_secret: KIWIFY_CLIENT_SECRET,
  });
  body.set('grant_type', 'client_credentials');

  const response = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  }, KIWIFY_TIMEOUT_MS);

  const data = await safeReadJsonResponse(response);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.message || data?.error || `Falha ao autenticar na Kiwify (${response.status})`);
  }

  const expiresInSeconds = Number(data?.expires_in || 0);
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds * 1000 : 10 * 60 * 1000),
  };

  return tokenCache.accessToken;
}
