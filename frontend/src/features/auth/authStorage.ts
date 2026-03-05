const ACCESS_TOKEN_KEY = "bmns.access_token";
const REFRESH_TOKEN_KEY = "bmns.refresh_token";
const USER_KEY = "bmns.user";

const safeStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
};

export const authStorage = {
  getAccessToken(): string | null {
    return safeStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
  },
  setAccessToken(token: string) {
    safeStorage()?.setItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return safeStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
  },
  setRefreshToken(token: string | null) {
    const storage = safeStorage();
    if (!storage) return;
    if (token) {
      storage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      storage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
  getUser(): unknown | null {
    const raw = safeStorage()?.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: unknown | null) {
    const storage = safeStorage();
    if (!storage) return;
    if (!user) {
      storage.removeItem(USER_KEY);
      return;
    }
    storage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    const storage = safeStorage();
    storage?.removeItem(ACCESS_TOKEN_KEY);
    storage?.removeItem(REFRESH_TOKEN_KEY);
    storage?.removeItem(USER_KEY);
  },
};
