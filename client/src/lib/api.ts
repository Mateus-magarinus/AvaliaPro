import { clearAccessToken, getAccessToken } from "./auth";

type ApiOptions = Omit<RequestInit, "body"> & {
  auth?: boolean;
  body?: unknown;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (Array.isArray(obj.message)) return obj.message.join(", ");
    if (typeof obj.error === "string") return obj.error;
  }
  return fallback;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}) {
  const { auth = true, body, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl()}${normalizePath(path)}`, {
    ...requestOptions,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    if (response.status === 401) clearAccessToken();
    throw new ApiError(
      response.status,
      errorMessage(payload, "Não foi possível concluir a requisição."),
      payload,
    );
  }

  return payload as T;
}
