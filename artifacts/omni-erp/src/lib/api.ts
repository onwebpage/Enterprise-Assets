/**
 * Origin of the backend. Empty on the website, where the API is same-origin
 * ("/api"). The Android build sets VITE_API_BASE_URL (e.g. https://zorvanierp.in)
 * because the app's pages are served from inside the APK, not from the server.
 */
export const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
export const API_BASE = `${API_ORIGIN}/api`;

// ── Token storage ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  try { return localStorage.getItem("auth_token"); } catch { return null; }
}

export function setToken(token: string): void {
  localStorage.setItem("auth_token", token);
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
  const isAuthEntry = path === "/auth/login" || path === "/auth/register";
  const token = isAuthEntry ? null : getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const organizationId = localStorage.getItem("active_organization_id");
    if (organizationId) headers["x-organization-id"] = organizationId;
  } catch {}

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    // fetch only rejects when the request never reached the server (offline, DNS, blocked).
    throw new ApiError(0, "Can't reach the server. Check your internet connection and try again.");
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = typeof json.error === "string" ? json.error : `Request failed (${res.status})`;
    // A bad password is an expected login response, not an expired session.
    // Preserve the API's useful message and keep the login form mounted.
    if (res.status === 401 && !isAuthEntry) {
      removeToken();
      window.dispatchEvent(new Event("auth-session-revoked"));
      if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
        window.location.assign("/login");
      }
    }
    throw new ApiError(res.status, message);
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
