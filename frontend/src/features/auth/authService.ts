import type { UserProfile } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const request = async (path: string, options: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") {
        message = payload.detail;
      } else if (typeof payload?.message === "string") {
        message = payload.message;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message || "Request failed");
  }
  return response;
};

const allowedRoles = ["admin", "manager", "employee", "reseller", "client"] as const;
type AllowedRole = (typeof allowedRoles)[number];

const normalizeRole = (value: unknown): AllowedRole => {
  if (typeof value !== "string") {
    return "client";
  }
  const normalized = value.toLowerCase() as AllowedRole;
  return allowedRoles.includes(normalized) ? normalized : "client";
};

const normalizeUser = (payload: any): UserProfile => {
  const roleSource = Array.isArray(payload?.roles) ? payload.roles[0] : payload?.role;
  return {
    id: String(payload?.id ?? ""),
    email: String(payload?.email ?? ""),
    name: String(payload?.name ?? payload?.username ?? ""),
    role: normalizeRole(roleSource),
  };
};

export const authService = {
  async loginWithPassword(username: string, password: string) {
    const body = new URLSearchParams({ username, password });
    const response = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await response.json()) as { access_token: string; refresh_token?: string };

    const profileResponse = await request("/api/users/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const user = normalizeUser(await profileResponse.json());

    return { token: data.access_token, refreshToken: data.refresh_token ?? null, user };
  },
  async fetchProfile(token: string) {
    const response = await request("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return normalizeUser(await response.json());
  },
  async refreshAccessToken(refreshToken: string) {
    const response = await request("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return (await response.json()) as { access_token: string; refresh_token?: string };
  },
};
