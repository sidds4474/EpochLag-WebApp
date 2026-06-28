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
import {
  fetchMe,
  loginWithEmailPassword,
  loginWithGoogle,
  registerUser,
  verifyOtp,
  type RegisterPayload,
} from "./api";

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
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    setOnUnauthorized(signOut);
  }, [signOut]);

  useEffect(() => {
    const token = getStoredToken();
    const cachedUser = getStoredUser();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }
    if (cachedUser) {
      setUser(cachedUser);
      setStatus("authenticated");
    }
    fetchMe()
      .then((fresh) => {
        setUser(fresh);
        setStoredAuth(token, fresh);
        setStatus("authenticated");
      })
      .catch(() => {
        // 401 already handled via setOnUnauthorized; other errors keep cached user.
        if (!cachedUser) {
          clearStoredAuth();
          setStatus("unauthenticated");
        }
      });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token, user: freshUser } = await loginWithEmailPassword(
        email,
        password
      );
      setStoredAuth(token, freshUser);
      setUser(freshUser);
      setStatus("authenticated");
    },
    []
  );

  const signInWithGoogleCredential = useCallback(async (credential: string) => {
    const decoded = decodeJwtPayload(credential);
    const { token, user: freshUser } = await loginWithGoogle({
      idToken: credential,
      email: decoded?.email,
      firstName: decoded?.given_name,
      lastName: decoded?.family_name,
    });
    setStoredAuth(token, freshUser);
    setUser(freshUser);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerUser(payload);
    // Intentionally NOT signing in here — register returns no token.
    // Caller must route to /verify-otp.
  }, []);

  const verifyOtpAndSignIn = useCallback(
    async (email: string, otp: string, isPasswordReset = false) => {
      const { token, user: freshUser } = await verifyOtp(
        email,
        otp,
        isPasswordReset
      );
      setStoredAuth(token, freshUser);
      setUser(freshUser);
      setStatus("authenticated");
    },
    []
  );

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
