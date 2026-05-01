const DEFAULT_FETCH_TIMEOUT_MS = 15000;

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const safeTimeout = Math.max(1, Number(timeoutMs) || DEFAULT_FETCH_TIMEOUT_MS);
  const timer = setTimeout(() => controller.abort(), safeTimeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Requisição expirou após ${safeTimeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function safeReadJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
