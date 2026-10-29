/** Server-only helpers for the cookie-based session. Tokens never reach browser JavaScript. */
export const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const API_BASE = `${API_URL}/api/v1`;

export const AT_COOKIE = 'pci_at';
export const RT_COOKIE = 'pci_rt';
export const ROLE_COOKIE = 'pci_role';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

const secure = process.env.NODE_ENV === 'production';

export function cookieOptions(expires: Date) {
  return { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', expires };
}

export const clearOptions = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge: 0 };
