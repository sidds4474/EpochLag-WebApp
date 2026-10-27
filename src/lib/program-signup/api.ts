import { api, ApiError } from "../api/client";

// Program-page signup. Separate list from the newsletter — do NOT reuse
// subscribeToNewsletter here. Backend spec: Program signups — Frontend
// guide (Oct 27, 2026).
//
// One endpoint for every program page; the only thing that varies is
// `source`, a kebab-case program name the backend uses as the list key.
// Any 2xx + success:true is a success — the server returns the same
// message whether the email is new, already signed up, or resubscribed
// (deliberate, so the form can't be used to probe who is on a list).

export type SubscribeProgramInput = {
  email: string;
  source: string;
  firstName?: string;
};

export type SubscribeProgramResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

type ServerBody = { success?: boolean; message?: string };

export async function subscribeToProgram(
  input: SubscribeProgramInput
): Promise<SubscribeProgramResult> {
  const trimmedName = input.firstName?.trim();
  const body: Record<string, string> = {
    email: input.email.trim(),
    source: input.source,
  };
  if (trimmedName) body.firstName = trimmedName;

  try {
    const res = await api.post<ServerBody>("/api/programs/subscribe", body, {
      auth: false,
    });
    // Spec: only a 2xx with success:true counts as success. Any 2xx body
    // without success:true (shouldn't happen) falls through to the generic
    // failure path.
    if (res?.success === true) {
      return {
        ok: true,
        message: res.message || "You’re signed up — thanks for joining!",
      };
    }
    return { ok: false, message: "Something went wrong, please try again." };
  } catch (e) {
    if (!(e instanceof ApiError)) {
      return { ok: false, message: "Something went wrong, please try again." };
    }
    // 429: rate limited.
    if (e.status === 429) {
      return {
        ok: false,
        message: "Too many attempts, please try again in a few minutes.",
      };
    }
    // 422 with an email-shaped message is user-fixable; everything else at
    // 422 (missing source, extra fields, bad source pattern) is a developer
    // bug per the spec — show a generic message rather than leak raw server
    // copy.
    if (e.status === 422) {
      const msg = (e.data as ServerBody | null)?.message || e.message || "";
      if (/email/i.test(msg)) {
        return { ok: false, message: "Please enter a valid email." };
      }
      return { ok: false, message: "Something went wrong, please try again." };
    }
    return { ok: false, message: "Something went wrong, please try again." };
  }
}
