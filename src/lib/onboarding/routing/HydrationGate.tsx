"use client";

import { type ReactNode } from "react";
import { useAppSelector } from "../store";

// Renders `fallback` (splash) until `anonDraft.hydrated` flips true. Wrap any
// screen that reads onboarding state and can't render usefully before
// hydration. The router guard uses this transparently — most screens don't
// need it directly.
//
// Kept intentionally minimal: no logo, no animation. Screens can bring their
// own splash by passing `fallback`.

export function HydrationGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hydrated = useAppSelector((s) => s.anonDraft.hydrated);
  if (!hydrated) return <>{fallback}</>;
  return <>{children}</>;
}
