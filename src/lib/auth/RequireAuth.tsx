"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useAppSelector } from "../onboarding/store";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();
  // Read directly from the profile slice — populated by applyAuth (from
  // /me) and then reconciled by postLoginSync's /api/subscription fetch.
  const subscriptionPlan = useAppSelector((s) => s.profile.subscriptionPlan);
  const hasUsedTrial = useAppSelector((s) => s.profile.hasUsedTrial);
  // Only evaluate the trial gate once /api/subscription has answered at
  // least once. Otherwise the reads are seeded from initialState
  // (plan: "free", hasUsedTrial: false) which is exactly the combo the
  // gate matches on — every returning user would be misrouted.
  const subscriptionReconciledAt = useAppSelector(
    (s) => s.profile.subscriptionReconciledAt
  );

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/onboarding/welcome");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !subscriptionReconciledAt) return;
    if (
      hasUsedTrial === false &&
      subscriptionPlan !== "free_trial" &&
      subscriptionPlan !== "unlimited"
    ) {
      router.replace("/onboarding/free-trial");
    }
  }, [
    status,
    subscriptionReconciledAt,
    hasUsedTrial,
    subscriptionPlan,
    router,
  ]);

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-warm-cream flex items-center justify-center">
        <p className="font-montserrat text-primary-blue text-[14px] opacity-70">
          Loading…
        </p>
      </main>
    );
  }
  return <>{children}</>;
}
