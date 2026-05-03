import { describe, expect, it, vi } from 'vitest';

vi.mock('../packages/shared-web/auth.js', () => ({
  applyAuthRedirectFromUrl: vi.fn(async () => ({
    handled: true,
    success: true,
    token: 'token-123',
    user: { email: 'coach@ryxen.app' },
  })),
}));

import { applyCoachAuthRedirectFromLocation, normalizeCoachReturnTo } from './authFlow';

describe('coach auth flow', () => {
  it('normaliza returnTo inválido para o fallback do coach', () => {
    expect(normalizeCoachReturnTo('')).toBe('/coach/');
    expect(normalizeCoachReturnTo('//evil.example')).toBe('/coach/');
    expect(normalizeCoachReturnTo('/coach/?tab=overview')).toBe('/coach/?tab=overview');
  });

  it('resolve o callback de auth de forma assíncrona', async () => {
    const result = await applyCoachAuthRedirectFromLocation();

    expect(result.handled).toBe(true);
    expect(result.success).toBe(true);
    expect(result.token).toBe('token-123');
    expect(result.user?.email).toBe('coach@ryxen.app');
  });
});
