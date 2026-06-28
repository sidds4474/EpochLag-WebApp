import { getStoredToken, clearStoredAuth } from "../auth/storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dev.epochlag.com";

export class ApiError extends Error {
  status: number;
  data: unknown;
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

  if (res.status === 401) {
    clearStoredAuth();
    onUnauthorized?.();
    throw new ApiError("Session expired. Please sign in again.", 401, null);
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
      (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : null) || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
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
