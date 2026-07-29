const API_BASE = "/api";

// ── Token storage ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  try { return localStorage.getItem("auth_token"); } catch { return null; }
}

export function setToken(token: string): void {
  try { localStorage.setItem("auth_token", token); } catch {}
}

export function removeToken(): void {
  try { localStorage.removeItem("auth_token"); } catch {}
}

// ── Core fetch ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    removeToken();
    window.location.href = "/login";
    throw new ApiError(401, "Unauthorized");
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, json.error ?? `Request failed (${res.status})`);
  }

  return json as T;
}

// ── API client ───────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ── Typed response wrapper ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
}
