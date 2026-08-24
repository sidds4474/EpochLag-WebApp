import { api } from "../api/client";
import { ApiError } from "../api/client";

// Landing-page newsletter subscribe. No auth. Send ONLY the documented
// keys — any extra key returns 422 (see Newsletter frontend spec doc).
// Copy for success is decided by the client (see the Figma "You're on
// the list" state); the server message is safe to render but we use a
// uniform static string so first-time and duplicate signups look
// identical either way — that's the same oracle-safety the backend
// enforces on `message`.

export type SubscribeInput = {
  email: string;
  source?: string;
  firstName?: string;
};

export type SubscribeResult =
  | { ok: true }
  | { ok: false; message: string };

export async function subscribeToNewsletter(
  input: SubscribeInput
): Promise<SubscribeResult> {
  const body: Record<string, string> = { email: input.email };
  if (input.source) body.source = input.source;
  if (input.firstName) body.firstName = input.firstName;

  try {
    await api.post("/api/newsletter/subscribe", body, { auth: false });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status >= 500) {
        return {
          ok: false,
          message: "Something went wrong. Please try again shortly.",
        };
      }
      return { ok: false, message: e.message };
    }
    return {
      ok: false,
      message: "Something went wrong. Please try again shortly.",
    };
  }
}
