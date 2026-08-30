"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type OnboardingStore } from "./store";
import { hydrateAnonDraft } from "./store/hydrateAnonDraft";
import { AnonMergeOrchestrator } from "./orchestrators/AnonMergeOrchestrator";
import { LateMediaOrchestrator } from "./orchestrators/LateMediaOrchestrator";
import { UploadProvider } from "./upload/UploadContext";

// Root provider for the onboarding Redux tree. Sits inside AuthProvider in
// layout.tsx. Kicks off hydration on mount and mounts the two orchestrators
// (which render null but watch state via effects).
//
// Intentionally does NOT gate rendering on `hydrated`. Screens that care
// about hydration use <HydrationGate> or <OnboardingRouteGuard>.

export function OnboardingStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<OnboardingStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    storeRef.current?.dispatch(hydrateAnonDraft());
  }, []);

  return (
    <Provider store={storeRef.current}>
      <UploadProvider>
        <AnonMergeOrchestrator />
        <LateMediaOrchestrator />
        {children}
      </UploadProvider>
    </Provider>
  );
}
