import { v4 as uuidv4 } from "uuid";

// Mobile → web mapping (see Part 1):
//   AsyncStorage anonId            → localStorage anonId (UUID v4)
//   AsyncStorage referralCode      → localStorage referralCode
//   AsyncStorage lastOnboardingStep → localStorage lastOnboardingStep (int)
//   AsyncStorage pendingAnonMerge   → localStorage pendingAnonMerge (JSON, via middleware)

const K = {
  anonId: "epochlag.anonId",
  referralCode: "epochlag.referralCode",
  lastOnboardingStep: "epochlag.lastOnboardingStep",
  pendingAnonMerge: "epochlag.pendingAnonMerge",
} as const;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // quota / private mode — swallow
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ---- anonId ----
// Non-secret device identifier. Minted on first read, persisted forever
// (or until site-data-clear). Used for fresh-install detection.

export function getOrCreateAnonId(): string {
  const existing = safeGet(K.anonId);
  if (existing) return existing;
  const fresh = uuidv4();
  safeSet(K.anonId, fresh);
  return fresh;
}

export function peekAnonId(): string | null {
  return safeGet(K.anonId);
}

// ---- referralCode ----
// Single-use. Set by deep-link resolver on landing. Cleared post-signup after
// /api/referral/redeem fires.

export function setStoredReferralCode(code: string): void {
  safeSet(K.referralCode, code);
}

export function getStoredReferralCode(): string | null {
  return safeGet(K.referralCode);
}

export function clearStoredReferralCode(): void {
  safeRemove(K.referralCode);
}

// ---- lastOnboardingStep ----
// Monotonic. Only increases. Skips ValueProp1 + WhyEpochLag (< index 2 in
// PHASE_A_ORDER); WhatsALag = 0 in the resumable index.

export function getStoredLastOnboardingStep(): number | null {
  const raw = safeGet(K.lastOnboardingStep);
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function setStoredLastOnboardingStep(step: number): void {
  const prev = getStoredLastOnboardingStep();
  if (prev !== null && step <= prev) return; // monotonic
  safeSet(K.lastOnboardingStep, String(step));
}

export function clearStoredLastOnboardingStep(): void {
  safeRemove(K.lastOnboardingStep);
}

// ---- pendingAnonMerge (raw JSON blob for Redux persistence middleware) ----

export function readPersistedPendingAnonMerge(): unknown {
  const raw = safeGet(K.pendingAnonMerge);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writePersistedPendingAnonMerge(state: unknown): void {
  safeSet(K.pendingAnonMerge, JSON.stringify(state));
}

export function clearPersistedPendingAnonMerge(): void {
  safeRemove(K.pendingAnonMerge);
}

// ---- housekeeping ----

export async function clearAnonDraftLocalState(): Promise<void> {
  safeRemove(K.referralCode);
  safeRemove(K.lastOnboardingStep);
  safeRemove(K.pendingAnonMerge);
  // anonId is intentionally preserved — it's device-scoped, not draft-scoped.
}
