const KEY = "referralCode";

export function setReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, code);
  } catch {}
}

export function getReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
