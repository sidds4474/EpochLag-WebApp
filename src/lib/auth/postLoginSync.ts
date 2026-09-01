import type { User } from "../../types/user";
import type { AppDispatch } from "../onboarding/store";
import { refreshSubscriptionState } from "../subscription/state";

// Called from every auth success path (login, register, verify-otp,
// social finalize, cold-boot rehydrate). Fetches the authoritative
// subscription state so the RequireAuth trial gate has fresh plan +
// hasUsedTrial to evaluate before rendering the app shell.
export async function postLoginSync(args: {
  profile: User;
  dispatch?: AppDispatch;
}): Promise<void> {
  if (args.dispatch) {
    await refreshSubscriptionState(args.dispatch);
  }
}
