"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  pickInitialRoute,
  urlForScreen,
  useAppDispatch,
  useAppSelector,
  markHydrated,
  setHasDraftToken,
  setLastStep,
  saveTokenOnly,
  saveToken,
  setAuthenticated,
  updateProfileFields,
  resetAuth,
  resetProfile,
  resetAnonDraft,
  type ScreenName,
  type InitialRouteDecision,
} from "../../../lib/onboarding";

type Fixture = {
  name: string;
  description: string;
  expected: InitialRouteDecision;
  apply: (dispatch: ReturnType<typeof useAppDispatch>) => void;
};

const FIXTURES: Fixture[] = [
  {
    name: "1. Fresh cold start",
    description: "Never visited. No token, no draft, no auth.",
    expected: "ValueProp1",
    apply: (d) => {
      d(resetAuth());
      d(resetProfile());
      d(resetAnonDraft());
      d(markHydrated());
      d(setHasDraftToken(false));
    },
  },
  {
    name: "2. Anon cold-resume mid-composer",
    description: "hasDraftToken + lastStep=3 (AddParticipants).",
    expected: "AddParticipants",
    apply: (d) => {
      d(resetAuth());
      d(resetProfile());
      d(resetAnonDraft());
      d(markHydrated());
      d(setHasDraftToken(true));
      d(setLastStep(3)); // resumable idx 3 = AddParticipants
    },
  },
  {
    name: "3. Authed, onboarding not complete, no trial",
    description: "isAuthenticated=true, hasUsedTrial=false → Phase C entry.",
    expected: "AddRelationship",
    apply: (d) => {
      d(resetAuth());
      d(resetProfile());
      d(resetAnonDraft());
      d(markHydrated());
      d(saveToken("mock-token"));
      d(setAuthenticated(true));
      d(
        updateProfileFields({
          onboardingCompletedAt: null,
          hasUsedTrial: false,
        })
      );
    },
  },
  {
    name: "4. Authed, trial done, not complete",
    description: "hasUsedTrial=true → resume Phase D2.",
    expected: "ReferralPitch",
    apply: (d) => {
      d(resetAuth());
      d(resetProfile());
      d(resetAnonDraft());
      d(markHydrated());
      d(saveToken("mock-token"));
      d(setAuthenticated(true));
      d(
        updateProfileFields({
          onboardingCompletedAt: null,
          hasUsedTrial: true,
        })
      );
    },
  },
  {
    name: "5. Authed, onboarding complete",
    description: "onboardingCompletedAt set → main app.",
    expected: "AppDrawer",
    apply: (d) => {
      d(resetAuth());
      d(resetProfile());
      d(resetAnonDraft());
      d(markHydrated());
      d(saveToken("mock-token"));
      d(setAuthenticated(true));
      d(
        updateProfileFields({
          onboardingCompletedAt: "2026-08-29T00:00:00Z",
        })
      );
    },
  },
  {
    name: "6. Splash (not yet hydrated)",
    description: "!hydrated → null (splash).",
    expected: null,
    apply: (d) => {
      d(resetAuth());
      d(resetProfile());
      d(resetAnonDraft());
      // Deliberately do NOT dispatch markHydrated — but resetAnonDraft
      // preserves hydration flag, so we need to bypass that by using a
      // trick. We'll set hydrated to false via replacing state; the reset
      // helper preserves hydrated=true intentionally, so simulate the
      // splash state via a fake toggle.
      //
      // NOTE: real splash only happens on initial boot. This fixture is
      // best-effort visualization only.
    },
  },
  {
    name: "7. Temp-authed (token but !isAuthenticated)",
    description: "During signup: token set, isAuthenticated=false.",
    expected: "ValueProp1", // treated as unauthed for routing purposes
    apply: (d) => {
      d(resetAuth());
      d(resetProfile());
      d(resetAnonDraft());
      d(markHydrated());
      d(saveTokenOnly("temp-token"));
      d(setHasDraftToken(false));
    },
  },
];

function renderDecision(d: InitialRouteDecision): string {
  if (d === null) return "null (splash)";
  if (d === "STAY") return "STAY";
  return d;
}

export default function RouterTestClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [lastApplied, setLastApplied] = useState<string | null>(null);

  const routingState = useAppSelector((s) => ({
    hydrated: s.anonDraft.hydrated,
    hasDraftToken: s.anonDraft.hasDraftToken,
    lastStep: s.anonDraft.lastStep,
    isAuthenticated: s.auth.isAuthenticated,
    token: s.auth.token,
    onboardingCompletedAt: s.profile.onboardingCompletedAt,
    hasUsedTrial: s.profile.hasUsedTrial,
  }));

  const currentDecision = useMemo<InitialRouteDecision>(
    () =>
      pickInitialRoute({
        anonHydrated: routingState.hydrated,
        anonHasDraftToken: routingState.hasDraftToken,
        anonLastStep: routingState.lastStep,
        isAuthenticated: routingState.isAuthenticated,
        onboardingCompletedAt: routingState.onboardingCompletedAt,
        hasUsedTrial: routingState.hasUsedTrial,
        firstStoryActiveStep: null,
      }),
    [routingState]
  );

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900 }}>
      <h1 style={{ marginBottom: 4 }}>Router test harness (dev)</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Verify pickInitialRoute across the five branches. Apply a fixture, then
        check that the &quot;pickInitialRoute&quot; row matches the expected
        value.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Current Redux (routing subset)</h2>
        <pre
          style={{
            background: "#f5f5f5",
            padding: 12,
            fontSize: 12,
            borderRadius: 6,
            overflow: "auto",
          }}
        >
          {JSON.stringify(routingState, null, 2)}
        </pre>
        <div
          style={{
            padding: 12,
            background: "#eef8ee",
            borderRadius: 6,
            marginTop: 8,
            fontSize: 14,
          }}
        >
          <strong>pickInitialRoute → </strong>
          <code>{renderDecision(currentDecision)}</code>
          {currentDecision && currentDecision !== "STAY" && (
            <button
              onClick={() => router.push(urlForScreen(currentDecision as ScreenName))}
              style={{ marginLeft: 12, padding: "4px 10px", cursor: "pointer" }}
            >
              Navigate → {urlForScreen(currentDecision as ScreenName)}
            </button>
          )}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Fixtures</h2>
        {FIXTURES.map((f) => (
          <div
            key={f.name}
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: 12,
              marginBottom: 8,
              background: lastApplied === f.name ? "#fffbe6" : "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{f.name}</strong>
                <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                  {f.description}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  Expected: <code>{renderDecision(f.expected)}</code>
                </div>
              </div>
              <button
                onClick={() => {
                  f.apply(dispatch);
                  setLastApplied(f.name);
                }}
                style={{ padding: "6px 12px", cursor: "pointer", height: 32 }}
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Reset</h2>
        <button
          onClick={() => {
            dispatch(resetAuth());
            dispatch(resetProfile());
            dispatch(resetAnonDraft());
            dispatch(markHydrated());
            setLastApplied(null);
          }}
          style={{ padding: "6px 12px", cursor: "pointer" }}
        >
          Reset all slices (hydrated=true)
        </button>
      </section>
    </div>
  );
}
