import { applyAuthRedirectFromUrl } from '../packages/shared-web/auth.js';
import type { CoachAuthRedirectResult } from './types';

export const DEFAULT_COACH_RETURN_TO = '/coach/';

export async function applyCoachAuthRedirectFromLocation(): Promise<CoachAuthRedirectResult> {
  return (await applyAuthRedirectFromUrl(window.location.href, {
    cleanupCurrentLocation: true,
  })) as CoachAuthRedirectResult;
}

export function normalizeCoachReturnTo(
  value: string,
  fallback = DEFAULT_COACH_RETURN_TO,
): string {
  const raw = String(value || '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return fallback;
  }
  return raw;
}
