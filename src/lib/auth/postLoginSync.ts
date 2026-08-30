import type { User } from "../../types/user";

export async function postLoginSync(_args: { profile: User }): Promise<void> {
  // TODO(subscription-web): reconcile with Stripe plan state when web billing lands.
  // Called from every auth success path so wiring is a single edit later.
  return;
}
