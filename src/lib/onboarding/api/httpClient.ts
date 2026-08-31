// Low-level HTTP wrapper for onboarding flows.
//
// Two auth modes:
//   • token       — Bearer for authed endpoints. Passed explicitly OR read
//                   from an injected token getter (see setAuthTokenGetter).
//   • draftToken  — anon endpoint credential. Passed via X-Draft-Token header.
//                   Read from IndexedDB (SecureStore equivalent) unless
//                   explicitly overridden.
//
// This layers cleanly on top of the existing src/lib/api/client.ts (which
// reads legacy localStorage token). We intentionally do NOT reuse that
// client: the onboarding flow needs (a) Redux-sourced tokens during signup
// before localStorage is populated, and (b) explicit draftToken plumbing.

import { getDraftToken as readDraftTokenFromSecureStore } from "../storage/secureTokenStore";

const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "https://dev.epochlag.com"
    : "";

export class OnboardingApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Redux-sourced auth token getter. M8 wires this to state.auth.token so
// during signup we can hit authed endpoints with a token that only exists
// in Redux (not localStorage). Until then, callers pass token explicitly.
type TokenGetter = () => string | null;
let authTokenGetter: TokenGetter | null = null;

export function setAuthTokenGetter(fn: TokenGetter | null): void {
  authTokenGetter = fn;
}

export function resolveAuthToken(explicit?: string | null): string | null {
  if (explicit) return explicit;
  if (authTokenGetter) return authTokenGetter();
  return null;
}

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type RequestOptions = {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  // Auth mode:
  //   'authed' (default)   — attach Bearer from token param or getter
  //   'draft'              — attach X-Draft-Token
  //   'authed+draft'       — attach BOTH (used by merge endpoint)
  //   'none'               — no auth headers
  auth?: "authed" | "draft" | "authed+draft" | "none";
  // Explicit token overrides.
  token?: string | null;
  draftToken?: string | null;
  signal?: AbortSignal;
};

async function resolveDraftToken(explicit?: string | null): Promise<string | null> {
  if (explicit !== undefined) return explicit;
  try {
    return await readDraftTokenFromSecureStore();
  } catch {
    return null;
  }
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    headers: extraHeaders = {},
    auth = "authed",
    token,
    draftToken,
    signal,
  } = options;

  const headers: Record<string, string> = { ...extraHeaders };

  let payload: BodyInit | undefined;
  const isFormData = body instanceof FormData;
  const isUrlSearchParams = body instanceof URLSearchParams;
  if (body !== undefined && body !== null) {
    if (isFormData) {
      payload = body as FormData;
    } else if (isUrlSearchParams) {
      payload = body as URLSearchParams;
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      payload = JSON.stringify(body);
    }
  }

  if (auth === "authed" || auth === "authed+draft") {
    const t = resolveAuthToken(token);
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  if (auth === "draft" || auth === "authed+draft") {
    const dt = await resolveDraftToken(draftToken);
    if (dt) headers["X-Draft-Token"] = dt;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: payload,
      signal,
    });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    throw new OnboardingApiError("Network error. Please try again.", 0, null);
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data &&
      typeof data === "object" &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : null) || `Request failed with status ${res.status}`;
    throw new OnboardingApiError(message, res.status, data);
  }

  return data as T;
}

export const http = {
  get: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(path, { ...opts, method: "POST", body }),
  put: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(
    path: string,
    opts?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(path, { ...opts, method: "DELETE" }),
};
