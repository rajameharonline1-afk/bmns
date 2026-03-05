import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { clearCredentials, fetchProfile, hydrateAuth, loginWithPassword, setCredentials } from "./authSlice";
import { authService } from "./authService";
import { authStorage } from "./authStorage";
import { getTokenExpiry } from "./jwt";
import type { UserProfile, UserRole } from "./types";

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBootstrapping: boolean;
  error: string | null;
  hasRole: (roles: UserRole[]) => boolean;
  loginWithPassword: (username: string, password: string) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { token, refreshToken, user, status, error } = useAppSelector((state) => state.auth);
  const refreshTimer = useRef<number | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const storedToken = authStorage.getAccessToken();
    const storedRefreshToken = authStorage.getRefreshToken();
    const storedUser = authStorage.getUser() as UserProfile | null;

    if (storedToken && !token) {
      const expiry = getTokenExpiry(storedToken);
      if (expiry && expiry <= Date.now()) {
        authStorage.clear();
        dispatch(clearCredentials());
        setIsBootstrapping(false);
        return;
      }
      dispatch(hydrateAuth({ token: storedToken, refreshToken: storedRefreshToken, user: storedUser }));
      if (!storedUser) {
        setIsBootstrapping(true);
        dispatch(fetchProfile(storedToken))
          .unwrap()
          .catch(() => {
            authStorage.clear();
            dispatch(clearCredentials());
          })
          .finally(() => setIsBootstrapping(false));
      } else {
        setIsBootstrapping(false);
      }
    } else {
      setIsBootstrapping(false);
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }

    if (!token) return;

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const timeout = Math.max(expiry - Date.now() - 60_000, 0);
    refreshTimer.current = window.setTimeout(async () => {
      if (!refreshToken) {
        authStorage.clear();
        dispatch(clearCredentials());
        return;
      }

      try {
        const refreshed = await authService.refreshAccessToken(refreshToken);
        authStorage.setAccessToken(refreshed.access_token);
        authStorage.setRefreshToken(refreshed.refresh_token ?? refreshToken);
        const profile = await authService.fetchProfile(refreshed.access_token);
        authStorage.setUser(profile);
        dispatch(setCredentials({
          token: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? refreshToken,
          user: profile,
        }));
      } catch {
        authStorage.clear();
        dispatch(clearCredentials());
      }
    }, timeout);

    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
    };
  }, [dispatch, refreshToken, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isLoading: status === "loading",
      isBootstrapping,
      error,
      hasRole: (roles) => Boolean(user && roles.includes(user.role)),
      loginWithPassword: async (username, password) => {
        const result = await dispatch(loginWithPassword({ username, password })).unwrap();
        return result.user;
      },
      logout: () => {
        authStorage.clear();
        dispatch(clearCredentials());
      },
    }),
    [dispatch, error, status, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
