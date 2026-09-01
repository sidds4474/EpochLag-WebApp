import { getStoredToken, clearStoredAuth } from "../auth/storage";

// In the browser we hit same-origin /api/* and let Next.js `rewrites` proxy
// to the upstream — avoids CORS in dev and works transparently in prod.
// On the server (SSR / build) we go direct to the upstream since there is
// no Next.js rewrite layer in that context.
const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "https://dev.epochlag.com"
    : "";

export class ApiError extends Error {
  status: number;
  data: unknown;
  // Tagged by the paywall pass in request() when the server returns 403 with
  // an upgrade-shaped message. Callers (e.g. the free-trial handler) swallow
  // these silently so we don't stack a generic error toast on top of the
  // BE's upgrade message. Actual paywall UI wiring lands with web billing.
  isPaywallRedirect?: boolean;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type RequestOptions = {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
};

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers: extraHeaders = {}, auth = true } = options;

  const headers: Record<string, string> = { ...extraHeaders };
  let payload: BodyInit | undefined;

  const isFormData = body instanceof FormData;
  const isUrlSearchParams = body instanceof URLSearchParams;
  if (body !== undefined && body !== null) {
    if (isFormData) {
      // fetch sets multipart Content-Type with boundary automatically
      payload = body as FormData;
    } else if (isUrlSearchParams) {
      // fetch sets application/x-www-form-urlencoded automatically
      payload = body as URLSearchParams;
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      payload = JSON.stringify(body);
    }
  }

  if (auth) {
    const token = getStoredToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError("Network error. Please try again.", 0, null);
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

  // 401 on an authed request => session expired: sign the user out. 401 on
  // an unauthenticated request (login probe, phone-verify, etc.) is a normal
  // auth failure — surface it as an ApiError so the caller can react.
  if (res.status === 401 && auth) {
    clearStoredAuth();
    onUnauthorized?.();
    throw new ApiError("Session expired. Please sign in again.", 401, data);
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : null) || `Request failed with status ${res.status}`;
    const err = new ApiError(message, res.status, data);
    if (res.status === 403 && /subscribe|upgrade|paywall|unlimited/i.test(message)) {
      err.isPaywallRedirect = true;
    }
    throw err;
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};
