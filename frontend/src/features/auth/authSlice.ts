import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authService } from "./authService";
import { authStorage } from "./authStorage";
import type { UserProfile } from "./types";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  status: "idle",
  error: null,
};

export const loginWithPassword = createAsyncThunk(
  "auth/login",
  async (payload: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await authService.loginWithPassword(payload.username, payload.password);
      authStorage.setAccessToken(result.token);
      authStorage.setRefreshToken(result.refreshToken);
      authStorage.setUser(result.user);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return rejectWithValue(message);
    }
  }
);

export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (token: string, { rejectWithValue }) => {
    try {
      const user = await authService.fetchProfile(token);
      authStorage.setUser(user);
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile fetch failed";
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(state, action: PayloadAction<{ token: string | null; refreshToken: string | null; user: UserProfile | null }>) {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.status = action.payload.token && action.payload.user ? "authenticated" : "idle";
      state.error = null;
    },
    clearCredentials(state) {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.status = "idle";
      state.error = null;
    },
    setCredentials(state, action: PayloadAction<{ token: string; refreshToken: string | null; user: UserProfile }>) {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.status = "authenticated";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginWithPassword.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginWithPassword.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.status = "authenticated";
      })
      .addCase(loginWithPassword.rejected, (state, action) => {
        state.status = "error";
        state.error = (action.payload as string) ?? "Login failed";
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        if (state.token) {
          state.status = "authenticated";
        }
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.status = "idle";
        state.user = null;
      });
  },
});

export const { clearCredentials, hydrateAuth, setCredentials } = authSlice.actions;
export default authSlice.reducer;
