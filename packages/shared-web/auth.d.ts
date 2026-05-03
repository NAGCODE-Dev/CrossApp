export interface SharedAuthProfile {
  email?: string;
  name?: string;
}

export interface SharedAuthResult {
  handled?: boolean;
  success?: boolean;
  error?: string;
  token?: string;
  user?: SharedAuthProfile | null;
}

export function applyAuthRedirectFromLocation(): Promise<SharedAuthResult>;
export function applyAuthRedirectFromUrl(
  url: string,
  options?: Record<string, unknown>,
): Promise<SharedAuthResult>;
export function buildGoogleRedirectUrl(): URL;
export function confirmPasswordReset(payload?: Record<string, unknown>): Promise<unknown>;
export function confirmSignUp(payload?: Record<string, unknown>): Promise<unknown>;
export function getStoredProfile(): SharedAuthProfile | null;
export function hasStoredSession(): boolean;
export function refreshSession(): Promise<unknown>;
export function requestPasswordReset(payload?: Record<string, unknown>): Promise<unknown>;
export function requestSignUpVerification(payload?: Record<string, unknown>): Promise<unknown>;
export function signIn(payload?: Record<string, unknown>): Promise<unknown>;
export function signInWithGoogle(payload?: Record<string, unknown>): Promise<unknown>;
export function signOut(): Promise<void>;
export function signUp(payload?: Record<string, unknown>): Promise<unknown>;
export function startGoogleRedirect(options?: { returnTo?: string }): Promise<void>;
