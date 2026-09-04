// Username + 5-digit access code sign-in.
// Auth always needs an email/password pair internally, so the username is
// mapped to a deterministic internal address and the 5-digit code is expanded
// to a longer internal password.

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const CODE_PATTERN = /^[0-9]{5}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@oncotrack.local`;
}

export function codeToPassword(username: string, code: string): string {
  return `onco-${normalizeUsername(username)}-${code.trim()}`;
}
