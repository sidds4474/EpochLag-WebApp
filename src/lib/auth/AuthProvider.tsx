"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "../../types/user";
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
} from "./storage";
import { setOnUnauthorized } from "../api/client";
import { setAuthTokenGetter } from "../onboarding/api/httpClient";
import {
  fetchMe,
  loginWithEmailPassword,
  loginWithGoogle,
  registerUser,
  verifyOtp,
  type RegisterPayload,
} from "./api";
import { useAppDispatch } from "../onboarding/store";
import {
  resetAuth as resetOnboardingAuth,
  saveToken as saveOnboardingToken,
} from "../onboarding/store/slices/authSlice";

type GoogleCredentialPayload = {
  email?: string;
  given_name?: string;
  family_name?: string;
};

function decodeJwtPayload(jwt: string): GoogleCredentialPayload | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof window === "undefined"
        ? Buffer.from(padded, "base64").toString("utf-8")
        : decodeURIComponent(
            atob(padded)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
    return JSON.parse(json) as GoogleCredentialPayload;
  } catch {
    return null;
  }
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogleCredential: (credential: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  verifyOtpAndSignIn: (
    email: string,
    otp: string,
    isPasswordReset?: boolean
  ) => Promise<void>;
  signOut: () => void;
  updateUser: (user: User) => void;
  // Low-level: flip to authenticated with an arbitrary token+user pair.
  // Used by new-flow screens (phone/social) that fetch their own token via
  // dedicated endpoints and need to complete the local auth handshake.
  applyAuth: (token: string, user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(() => {
    clearStoredAuth();
    dispatch(resetOnboardingAuth());
    // Wipe any residual anon-flow state so a signed-out user doesn't
    // resume a closed draft (which would 409 on save and render stale
    // content). Best-effort — storage failures are non-fatal.
    (async () => {
      try {
        const { clearDraftToken } = await import(
          "../onboarding/storage/secureTokenStore"
        );
        await clearDraftToken();
      } catch {}
      try {
        const { clearAnonDraftLocalState } = await import(
          "../onboarding/storage/localStore"
        );
        await clearAnonDraftLocalState();
      } catch {}
      try {
        const { resetAnonDraft } = await import(
          "../onboarding/store/slices/anonDraftSlice"
        );
        const { resetCreateALag } = await import(
          "../onboarding/store/slices/createALagSlice"
        );
        dispatch(resetAnonDraft());
        dispatch(resetCreateALag());
      } catch {}
    })();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/onboarding/welcome");
  }, [router, dispatch]);

  useEffect(() => {
    setOnUnauthorized(signOut);
  }, [signOut]);

  // Bridge the auth token into the onboarding HTTP client so authed endpoints
  // (merge, upload token, etc.) attach a Bearer without needing to route
  // through the legacy api/client wrapper.
  useEffect(() => {
    setAuthTokenGetter(() => getStoredToken());
    return () => setAuthTokenGetter(null);
  }, []);

  const applyAuth = useCallback(
    (token: string, next: User) => {
      setStoredAuth(token, next);
      dispatch(saveOnboardingToken(token));
      setUser(next);
      setStatus("authenticated");
    },
    [dispatch]
  );

  useEffect(() => {
    const token = getStoredToken();
    const cachedUser = getStoredUser();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }
    if (cachedUser) {
      // Rehydrate onboarding auth slice so orchestrators can fire.
      applyAuth(token, cachedUser);
    }
    fetchMe()
      .then((fresh) => {
        applyAuth(token, fresh);
      })
      .catch(() => {
        if (!cachedUser) {
          clearStoredAuth();
          setStatus("unauthenticated");
        }
      });
  }, [applyAuth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token, user: freshUser } = await loginWithEmailPassword(
        email,
        password
      );
      applyAuth(token, freshUser);
    },
    [applyAuth]
  );

  const signInWithGoogleCredential = useCallback(
    async (credential: string) => {
      const decoded = decodeJwtPayload(credential);
      const { token, user: freshUser } = await loginWithGoogle({
        idToken: credential,
        email: decoded?.email,
        firstName: decoded?.given_name,
        lastName: decoded?.family_name,
      });
      applyAuth(token, freshUser);
    },
    [applyAuth]
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    // Legacy email-signup path. Returns void because email register response
    // has no token — caller routes to /verify-otp. Phone signup uses
    // registerUser directly (imported from ./api) since it returns
    // { token, user } and needs the merge-then-ShareLag flow.
    await registerUser(payload);
  }, []);

  const verifyOtpAndSignIn = useCallback(
    async (email: string, otp: string, isPasswordReset = false) => {
      const { token, user: freshUser } = await verifyOtp(
        email,
        otp,
        isPasswordReset
      );
      applyAuth(token, freshUser);
    },
    [applyAuth]
  );

  const updateUser = useCallback((next: User) => {
    setUser(next);
    const token = getStoredToken();
    if (token) setStoredAuth(token, next);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        signIn,
        signInWithGoogleCredential,
        register,
        verifyOtpAndSignIn,
        signOut,
        updateUser,
        applyAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
