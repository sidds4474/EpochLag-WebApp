// Family-tree invite token — captured from /family-invite?token=… and forwarded
// on the next register or social-finalize call. Session-scoped so it doesn't
// bleed across accounts on shared browsers (spec §"Token persistence").
const KEY = "familyInviteToken";

export function storeFamilyInviteToken(token: string): void {
  if (typeof window === "undefined") return;
  if (!token) return;
  try {
    window.sessionStorage.setItem(KEY, token);
  } catch {}
}

export function peekFamilyInviteToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw && raw.trim() ? raw : undefined;
  } catch {
    return undefined;
  }
}

export function clearFamilyInviteToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
}
