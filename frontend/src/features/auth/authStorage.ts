const ACCESS_TOKEN_KEY = "bmns.access_token";
const REFRESH_TOKEN_KEY = "bmns.refresh_token";
const USER_KEY = "bmns.user";

const local = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
};

const session = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage;
};

export const authStorage = {
  getAccessToken(): string | null {
    return session()?.getItem(ACCESS_TOKEN_KEY) ?? null;
  },
  setAccessToken(token: string) {
    session()?.setItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return local()?.getItem(REFRESH_TOKEN_KEY) ?? null;
  },
  setRefreshToken(token: string | null) {
    const storage = local();
    if (!storage) return;
    if (token) {
      storage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      storage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
  getUser(): unknown | null {
    const raw = local()?.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: unknown | null) {
    const storage = local();
    if (!storage) return;
    if (!user) {
      storage.removeItem(USER_KEY);
      return;
    }
    storage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    session()?.removeItem(ACCESS_TOKEN_KEY);
    local()?.removeItem(REFRESH_TOKEN_KEY);
    local()?.removeItem(USER_KEY);
  },
};
