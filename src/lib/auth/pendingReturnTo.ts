// Short-lived "where to send the user after they finish signing up" slot,
// used to round-trip users from public pages (e.g. /story/<code>) through
// the signup → verify-otp → onboarding chain and back to the originating URL.
//
// URL-based returnTo handles the direct existing-user paths. This sessionStorage
// slot is for the new-user path, where threading a query param through 6+
// onboarding screens would be fragile. Terminal screens (currently just
// /onboarding/complete) consume this to override their default /home redirect.

const KEY = "epochlag.pendingReturnTo";

export function setPendingReturnTo(path: string): void {
  if (typeof window === "undefined") return;
  if (!path.startsWith("/") || path.startsWith("//")) return;
  try {
    window.sessionStorage.setItem(KEY, path);
  } catch {}
}

export function consumePendingReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(KEY);
    if (v) window.sessionStorage.removeItem(KEY);
    return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingReturnTo(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
}
