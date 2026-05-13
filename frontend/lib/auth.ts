// Simple JWT token storage using sessionStorage.
//
// Note: For production, httpOnly cookies are more secure (XSS protection).
// sessionStorage is fine for a portfolio project — keep it simple, ship it.

const TOKEN_KEY = 'finance_tracker_token';

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
